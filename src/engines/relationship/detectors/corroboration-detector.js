import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Corroboration Detector - Governance v6.0
 * Detects multiple independent sources verifying the same transaction.
 */
export class CorroborationDetector {
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
            const srcFile = rec._provenance?.sourceFile || '';
            if (!ref || ref === '-' || ref.length < 3) return;

            const matches = refMap.get(ref) || [];
            matches.forEach(targetId => {
                if (targetId === rec._id) return;
                const targetRec = recordMap.get(targetId);
                const tr = targetRec.data || targetRec;
                const tgtFile = targetRec._provenance?.sourceFile || '';

                // Independent Source Check
                if (srcFile !== tgtFile && srcFile !== '' && tgtFile !== '') {
                    const amtA = parseFloat(r.amount) || 0;
                    const amtB = parseFloat(tr.amount) || 0;

                    if (Math.abs(amtA - amtB) < 0.01) {
                        edges.push(EdgeFactory.create({
                            sourceId: rec._id,
                            targetId: targetId,
                            type: RelationshipTypes.CORROBORATES,
                            priority: InvestigativePriority.HIGH,
                            detector: "CorroborationDetector_v2",
                            factors: { independentSource: true, exactMatch: true, timeMatch: r.transactionDate === tr.transactionDate },
                            metadata: { evidence: [`Independent verification of document ${ref}`, `Source A: ${srcFile}`, `Source B: ${tgtFile}`] }
                        }));
                    }
                }
            });
        });

        return { detector: "CorroborationDetector", edges, warnings: [], diagnostics: { processed: records.length } };
    }
}
