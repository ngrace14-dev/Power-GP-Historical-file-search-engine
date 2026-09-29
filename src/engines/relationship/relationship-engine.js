import { RelationshipIndexer } from './indexing/relationship-indexer.js';
import { RelationshipConfig } from './config/relationship-config.js';
import { RelationshipTypes, InvestigativePriority } from './relationship-types.js';

// Detectors
import { ReversalDetector } from './detectors/reversal-detector.js';
import { SettlementDetector } from './detectors/settlement-detector.js';
import { ClassificationDetector } from './detectors/classification-detector.js';

/**
 * Relationship Engine (Coordinator) - Governance v6.0
 */
export class RelationshipEngine {
    
    /**
     * Orchestrates the relationship detection pipeline
     */
    static async buildRelationships(records = []) {
        if (!Array.isArray(records) || records.length === 0) return records;

        // Initialize relationship structure on records
        records.forEach(rec => {
            rec._relationships = {
                forensicEdges: [],
                anomalyEdges: [],
                classificationEdges: [],
                hasLinks: false,
                allEdges: []
            };
        });

        this.#emit('relationship:started', { count: records.length });

        try {
            // 1. Build O(1) Index Matrix
            const indexes = RelationshipIndexer.build(records);

            // 2. Load Detector Pipeline
            const detectors = [
                ReversalDetector,
                SettlementDetector,
                ClassificationDetector
            ];

            // 3. Execute Detection Pass
            for (const Detector of detectors) {
                try {
                    const result = await Detector.detect(records, indexes, RelationshipConfig);
                    this.#processDetectorResult(records, result);
                    this.#emit('relationship:detected', { detector: result.detector, edgeCount: result.edges.length });
                } catch (err) {
                    this.#handleError(Detector.name, err);
                }
            }

            // 4. Finalize Edges & Metadata
            this.#finalize(records);
            this.#emit('relationship:completed', { count: records.length });

        } catch (fatalErr) {
            this.#handleError('RelationshipEngine_Core', fatalErr);
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
