import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Adjustment Detector - Governance v6.0
 * Detects accounting adjustments and reclassifications.
 */
export class AdjustmentDetector {
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
            const je = String(r.journalEntry || '').trim();
            if (!je || je === '-' || !je.startsWith('JE')) return;

            const matches = refMap.get(je) || [];
            matches.forEach(targetId => {
                if (targetId === rec._id) return;
                const tr = recordMap.get(targetId).data || recordMap.get(targetId);

                // Same JE + Different Account = Potential Reclassification
                if (r.accountNumber !== tr.accountNumber && Math.abs(r.amount) === Math.abs(tr.amount)) {
                    edges.push(EdgeFactory.create({
                        sourceId: rec._id,
                        targetId: targetId,
                        type: RelationshipTypes.ADJUSTMENT_TO,
                        priority: InvestigativePriority.HIGH,
                        detector: "AdjustmentDetector_v2",
                        factors: { refMatch: true, symmetryMatch: true },
                        metadata: { evidence: [`JE ${je} reclassification detected`, `Shift from ${tr.accountNumber} to ${r.accountNumber}`] }
                    }));
                }
            });
        });

        return { detector: "AdjustmentDetector", edges, warnings: [], diagnostics: { processed: records.length } };
    }
}
