/**
 * Edge Factory - Governance v6.0
 */
import { RelationshipConfidence } from '../confidence/relationship-confidence.js';
import { RelationshipProvenance } from '../governance/relationship-provenance.js';

export class EdgeFactory {
    /**
     * Creates a standardized Relationship Edge object
     */
    static create({ sourceId, targetId, type, priority, detector, factors, metadata = {} }) {
        const confidence = RelationshipConfidence.calculate(type, factors);
        const provenance = RelationshipProvenance.stamp(detector);

        return {
            edgeId: `EDGE_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            sourceNode: sourceId,
            targetNode: targetId,
            relationshipType: type,
            investigativePriority: priority,
            confidence: confidence.score,
            confidenceTier: confidence.tier,
            confidenceExplanation: confidence.explanation,
            detectedBy: detector,
            evidence: metadata.evidence || [],
            metadata: { ...metadata, factors },
            provenance
        };
    }
}
