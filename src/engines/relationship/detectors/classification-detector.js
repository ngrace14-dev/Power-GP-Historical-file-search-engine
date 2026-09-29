import { RelationshipTypes, InvestigativePriority } from '../relationship-types.js';
import { EdgeFactory } from '../graph/edge-factory.js';

/**
 * Classification Detector - Governance v6.0
 * Informational similarity detection (Low Priority).
 */
export class ClassificationDetector {
    static detect(records, indexes, config) {
        const edges = [];
        const { vendorMap } = indexes;

        records.forEach(rec => {
            const r = rec.data || rec;
            const vendor = String(r.vendor || '').trim().toLowerCase();

            if (!vendor || vendor === 'unknown') return;

            // Only link if no high-priority forensic edges are present for this record
            // (Controlled by the Coordinator later, but we cap noise here)
            const candidates = (vendorMap.get(vendor) || []).slice(0, config.maxClassificationEdges);

            candidates.forEach(targetId => {
                if (targetId === rec._id) return;
                
                edges.push(EdgeFactory.create({
                    sourceId: rec._id,
                    targetId: targetId,
                    type: RelationshipTypes.SAME_VENDOR,
                    priority: InvestigativePriority.LOW,
                    detector: "ClassificationDetector_v2",
                    factors: { vendorMatch: true },
                    metadata: { evidence: [`Shared Vendor Context: ${r.vendor}`] }
                }));
            });
        });

        return { detector: "ClassificationDetector", edges, warnings: [], diagnostics: { recordsProcessed: records.length } };
    }
}
