import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Correction Detector - Governance v6.0
 * Detects re-entries or minor adjustments to existing vouchers.
 */
export class CorrectionDetector {
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
            const voucher = String(r.voucherNumber || r.journalEntry || '').trim();
            if (!voucher || voucher === '-' || voucher.startsWith('JE')) return;

            const matches = refMap.get(voucher) || [];
            matches.forEach(targetId => {
                if (targetId === rec._id) return;
                const tr = recordMap.get(targetId).data || recordMap.get(targetId);

                // Same Account + Same Voucher + Different Amount = Correction/Adjustment
                if (r.accountNumber === tr.accountNumber && r.amount !== tr.amount) {
                    edges.push(EdgeFactory.create({
                        sourceId: rec._id,
                        targetId: targetId,
                        type: RelationshipTypes.CORRECTION_OF,
                        priority: InvestigativePriority.HIGH,
                        detector: "CorrectionDetector_v2",
                        factors: { refMatch: true, acctMatch: true, amountVariance: true },
                        metadata: { evidence: [`Voucher ${voucher} correction detected`, `Amount adjusted from ${tr.amount} to ${r.amount}`] }
                    }));
                }
            });
        });

        return { detector: "CorrectionDetector", edges, warnings: [], diagnostics: { processed: records.length } };
    }
}
