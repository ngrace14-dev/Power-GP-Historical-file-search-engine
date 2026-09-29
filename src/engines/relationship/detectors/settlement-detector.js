import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Settlement Detector - Governance v6.0
 * Connects Invoices to Payments and Credit Memos.
 */
export class SettlementDetector {
    static detect(records, indexes, config) {
        const edges = [];
        const { refMap, recordMap } = indexes;

        records.forEach(rec => {
            const r = rec.data || rec;
            const type = String(r.type || '').toUpperCase();
            const ref = String(r.invoiceNumber || '').trim();

            if (!ref || ref === '-' || !type.includes('INVOICE')) return;

            const candidates = refMap.get(ref) || [];
            candidates.forEach(targetId => {
                if (targetId === rec._id) return;
                const targetRec = recordMap.get(targetId);
                const tr = targetRec.data || targetRec;
                const tType = String(tr.type || '').toUpperCase();

                if (tType.includes('PAYMENT') || tType.includes('CREDIT') || tType.includes('CHECK')) {
                    edges.push(EdgeFactory.create({
                        sourceId: rec._id,
                        targetId: targetId,
                        type: RelationshipTypes.SETTLEMENT_OF,
                        priority: InvestigativePriority.HIGH,
                        detector: "SettlementDetector_v2",
                        factors: {
                            exactRefMatch: true,
                            vendorMatch: r.vendor === tr.vendor,
                            logicalFlow: true
                        },
                        metadata: {
                            evidence: [`Invoice ${ref} settled by ${tType}`]
                        }
                    }));
                }
            });
        });

        return { detector: "SettlementDetector", edges, warnings: [], diagnostics: { recordsProcessed: records.length } };
    }
}
