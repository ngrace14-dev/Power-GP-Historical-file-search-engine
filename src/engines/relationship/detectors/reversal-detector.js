import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Reversal Detector - Governance v6.0
 * Detects offsetting accounting entries.
 */
export class ReversalDetector {
    static detect(records, indexes, config) {
        const edges = [];
        const { accountMap, recordMap } = indexes;

        records.forEach(rec => {
            const r = rec.data || rec;
            const amt = parseFloat(r.amount) || 0;
            const acct = r.accountNumber;

            if (!acct || acct === '-' || amt === 0) return;

            const absAmtStr = Math.abs(amt).toFixed(2);
            const candidates = accountMap.get(acct) || [];

            candidates.forEach(targetId => {
                if (targetId === rec._id) return;
                const targetRec = recordMap.get(targetId);
                const tr = targetRec.data || targetRec;
                const tAmt = parseFloat(tr.amount) || 0;

                if (Math.abs(tAmt).toFixed(2) === absAmtStr && (amt * tAmt < 0)) {
                    const d1 = new Date(r.transactionDate);
                    const d2 = new Date(tr.transactionDate);
                    const dateDiff = Math.abs(d1 - d2) / 86400000;

                    if (dateDiff <= config.reversalWindowDays) {
                        edges.push(EdgeFactory.create({
                            sourceId: rec._id,
                            targetId: targetId,
                            type: RelationshipTypes.REVERSAL_OF,
                            priority: InvestigativePriority.HIGH,
                            detector: "ReversalDetector_v2",
                            factors: {
                                amountMatch: true,
                                accountMatch: true,
                                oppositeSign: true,
                                dateProximity: dateDiff <= 30
                            },
                            metadata: {
                                evidence: [`Matched Account ${acct}`, `Opposite Signs`, `Temporal Delta: ${dateDiff.toFixed(0)} days`]
                            }
                        }));
                    }
                }
            });
        });

        return { detector: "ReversalDetector", edges, warnings: [], diagnostics: { recordsProcessed: records.length } };
    }
}
