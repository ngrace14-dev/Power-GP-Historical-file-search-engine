import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Transfer Detector - Governance v6.0
 * Detects intercompany transfers between entities.
 */
export class TransferDetector {
    /**
     * @param {Array<Object>} records
     * @param {Object} indexes
     * @param {Object} config
     * @returns {DetectorResult}
     */
    static detect(records, indexes, config) {
        const edges = [];
        const { amountMap, recordMap } = indexes;

        records.forEach(rec => {
            const r = rec.data || rec;
            const amt = parseFloat(r.amount) || 0;
            const srcEntity = (rec._provenance?.entityContext || '').toUpperCase();
            if (amt === 0 || !srcEntity) return;

            const absAmtStr = Math.abs(amt).toFixed(2);
            const candidates = amountMap.get(absAmtStr) || [];

            candidates.forEach(targetId => {
                if (targetId === rec._id) return;
                const targetRec = recordMap.get(targetId);
                const tgtEntity = (targetRec._provenance?.entityContext || '').toUpperCase();
                
                if (tgtEntity && srcEntity !== tgtEntity) {
                    const tr = targetRec.data || targetRec;
                    // Symmetry check: Source Cr (+) matches Target Dr (-) or vice versa
                    if (tr.transactionDate === r.transactionDate && (parseFloat(tr.amount) + amt === 0)) {
                        edges.push(EdgeFactory.create({
                            sourceId: rec._id,
                            targetId: targetId,
                            type: RelationshipTypes.TRANSFER_TO,
                            priority: InvestigativePriority.HIGH,
                            detector: "TransferDetector_v2",
                            factors: { symmetryMatch: true, dateMatch: true, crossEntity: true },
                            metadata: { evidence: [`Intercompany transfer: ${srcEntity} ↔ ${tgtEntity}`, `Value: ${absAmtStr}`] }
                        }));
                    }
                }
            });
        });

        return { detector: "TransferDetector", edges, warnings: [], diagnostics: { processed: records.length } };
    }
}
