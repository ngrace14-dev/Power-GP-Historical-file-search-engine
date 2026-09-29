import { RelationshipIndexer } from './indexing/relationship-indexer.js';
import { RelationshipConfig } from './config/relationship-config.js';
import { RelationshipTypes, InvestigativePriority } from './relationship-types.js';
import { RelationshipAudit } from './governance/relationship-audit.js';

// Detectors
import { ReversalDetector } from './detectors/reversal-detector.js';
import { SettlementDetector } from './detectors/settlement-detector.js';
import { CorrectionDetector } from './detectors/correction-detector.js';
import { AdjustmentDetector } from './detectors/adjustment-detector.js';
import { TransferDetector } from './detectors/transfer-detector.js';
import { CorroborationDetector } from './detectors/corroboration-detector.js';
import { ContradictionDetector } from './detectors/contradiction-detector.js';
import { ClassificationDetector } from './detectors/classification-detector.js';

/**
 * Relationship Engine (Coordinator) - Governance v6.0
 */
export class RelationshipEngine {
    
    /**
     * Orchestrates the forensic relationship detection pipeline
     * @param {Array<Object>} records - The full digitized dataset
     * @returns {Promise<Array<Object>>} Enriched records
     */
    static async buildRelationships(records = []) {
        if (!Array.isArray(records) || records.length === 0) return records;

        // Initialize forensic structure
        records.forEach(rec => {
            rec._relationships = {
                forensicEdges: [],
                anomalyEdges: [],
                classificationEdges: [],
                hasLinks: false,
                allEdges: []
            };
        });

        await RelationshipAudit.log('STARTED', { count: records.length });

        try {
            const indexes = RelationshipIndexer.build(records);

            const detectors = [
                ReversalDetector,
                SettlementDetector,
                CorrectionDetector,
                AdjustmentDetector,
                TransferDetector,
                CorroborationDetector,
                ContradictionDetector,
                ClassificationDetector
            ];

            for (const Detector of detectors) {
                try {
                    const result = await Detector.detect(records, indexes, RelationshipConfig);
                    this.#processDetectorResult(records, result);
                    await RelationshipAudit.log('DETECTED', { detector: result.detector, edgeCount: result.edges.length });
                } catch (err) {
                    await RelationshipAudit.log('ERROR', { source: Detector.name, message: err.message });
                    console.error(`[RelationshipEngine] ${Detector.name} Failure:`, err);
                }
            }

            this.#finalize(records);
            await RelationshipAudit.log('COMPLETED', { count: records.length });

        } catch (fatalErr) {
            await RelationshipAudit.log('ERROR', { source: 'RelationshipEngine_Core', message: fatalErr.message });
            console.error('[RelationshipEngine] Core Failure:', fatalErr);
        }

        return records;
    }

    static #processDetectorResult(records, result) {
        result.edges.forEach(edge => {
            const source = records.find(r => r._id === edge.sourceNode);
            if (!source) return;

            source._relationships.allEdges.push(edge);

            if (edge.investigativePriority === InvestigativePriority.HIGH) {
                source._relationships.forensicEdges.push(edge);
            } else if (edge.investigativePriority === InvestigativePriority.MEDIUM) {
                source._relationships.anomalyEdges.push(edge);
            } else {
                source._relationships.classificationEdges.push(edge);
            }
        });
    }

    static #finalize(records) {
        records.forEach(rec => {
            const rel = rec._relationships;
            rel.hasLinks = rel.allEdges.length > 0;
            
            // Populate legacy counts for UI backward compatibility
            rel.evidenceCount = rel.forensicEdges.length;
            rel.corroboratingCount = rel.anomalyEdges.length;
            rel.associativeCount = rel.classificationEdges.length;
            
            // Legacy tier mapping for evidence-graph.js
            rel.tier1Edges = rel.forensicEdges;
            rel.tier2Edges = rel.anomalyEdges;
            rel.tier3Edges = rel.classificationEdges;
        });
    }

    static #emit(name, detail) {
        window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    static #handleError(source, err) {
        console.error(`[RelationshipEngine] Error in ${source}:`, err);
        this.#emit('relationship:error', { source, message: err.message });
    }
}
