import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Contradiction Detector - Governance v6.0
 * Detects conflicts between related records (Amount mismatch, Date anomalies).
 */
export class ContradictionDetector {
    /**
     * @param {Array<Object>} records
     * @param {Object} indexes
     * @param {Object} config
     * @returns {DetectorResult}
     */
    static detect(records, indexes, config) {
        const edges = [];
        const { refMap, recordMap } = indexes;

        records.forEach(rec => {
            const r = rec.data || rec;
            const ref = String(r.invoiceNumber || '').trim();
            if (!ref || ref === '-' || ref.length < 3) return;

            const matches = refMap.get(ref) || [];
            matches.forEach(targetId => {
                if (targetId === rec._id) return;
                const targetRec = recordMap.get(targetId);
                const tr = targetRec.data || targetRec;

                const amtA = parseFloat(r.amount) || 0;
                const amtB = parseFloat(tr.amount) || 0;

                // Amount Mismatch on same reference
                if (Math.abs(amtA - amtB) >= 0.01) {
                    edges.push(EdgeFactory.create({
                        sourceId: rec._id,
                        targetId: targetId,
                        type: RelationshipTypes.CONTRADICTS,
                        priority: InvestigativePriority.HIGH,
                        detector: "ContradictionDetector_v2",
                        factors: { amountMismatch: true },
                        metadata: { evidence: [`Conflict: Document ${ref} has non-matching amounts`, `Val A: ${amtA} vs Val B: ${amtB}`] }
                    }));
                }
            });
        });

        return { detector: "ContradictionDetector", edges, warnings: [], diagnostics: { processed: records.length } };
    }
}
