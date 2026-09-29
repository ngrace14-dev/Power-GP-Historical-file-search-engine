import { RelationshipIndexer } from './indexing/relationship-indexer.js';
import { RelationshipTypes } from './relationship-types.js';
import { ReversalDetector } from './detectors/reversal-detector.js';
import { SettlementDetector } from './detectors/settlement-detector.js';
import { ClassificationDetector } from './detectors/classification-detector.js';
import { RelationshipAudit } from './governance/relationship-audit.js';

/**
 * Forensic Relationship Engine (Coordinator) - Governance v6.0
 * Orchestrates pure detector modules and aggregates forensic lifecycle edges.
 */
export class RelationshipEngine {
    
    /**
     * Executes the relationship detection pipeline.
     * @param {Array<Object>} records - Standardized Lighthouse records
     * @returns {Promise<Array<Object>>} Enriched records
     */
    static async buildRelationships(records = []) {
        if (!Array.isArray(records) || records.length === 0) return records;

        // Reset state
        records.forEach(rec => {
            rec._relationships = { forensicEdges: [], anomalyEdges: [], classificationEdges: [], hasLinks: false };
        });

        await RelationshipAudit.log('STARTED', { count: records.length });

        try {
            // 1. Build O(1) Index Matrix
            const indexes = RelationshipIndexer.build(records);

            // 2. Define Pipeline
            const detectors = [
                ReversalDetector,
                SettlementDetector,
                ClassificationDetector
            ];

            // 3. Orchestrate Stateless Passes
            for (const Detector of detectors) {
                try {
                    const result = await Detector.detect(records, indexes, { reversalWindowDays: 60 });
                    this.#mapEdgesToRecords(records, result.edges);
                    await RelationshipAudit.log('DETECTED', { detector: result.detector, edgeCount: result.edges.length });
                } catch (err) {
                    await RelationshipAudit.log('ERROR', { source: Detector.name, message: err.message });
                }
            }

            // 4. Post-Process Metadata
            this.#finalizeMetadata(records);
            await RelationshipAudit.log('COMPLETED', { count: records.length });

        } catch (fatal) {
            console.error("[RelationshipEngine] Fatal Core Exception:", fatal);
        }

        return records;
    }

    static #mapEdgesToRecords(records, edges) {
        edges.forEach(edge => {
            const source = records.find(r => r._id === edge.sourceNode);
            if (!source) return;

            if (edge.investigativePriority === 'HIGH') source._relationships.forensicEdges.push(edge);
            else if (edge.investigativePriority === 'MEDIUM') source._relationships.anomalyEdges.push(edge);
            else source._relationships.classificationEdges.push(edge);
        });
    }

    static #finalizeMetadata(records) {
        records.forEach(rec => {
            const rel = rec._relationships;
            rel.hasLinks = (rel.forensicEdges.length + rel.anomalyEdges.length + rel.classificationEdges.length) > 0;
            
            // Backward compatibility for legacy UI
            rel.tier1Edges = rel.forensicEdges;
            rel.tier2Edges = rel.anomalyEdges;
            rel.tier3Edges = rel.classificationEdges;
        });
    }
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
