import { ChainOfCustody } from '../../chain-of-custody.js';

/**
 * Evidence Orchestration Service - Governance v6.0
 */
export class EvidenceService {
    /**
     * Assembles a collection of records into a curated Evidence Package
     * @param {string} caseId
     * @param {Array<Object>} records - Digitized records
     * @param {string} rationale - Forensic justification
     * @param {string} user
     * @returns {Promise<EvidencePackage>}
     */
    static async assemblePackage(caseId, records, rationale, user) {
        const avgConfidence = records.reduce((acc, r) => acc + (r._provenance?.trustLevel || 0), 0) / records.length;

        const pkg = {
            packageId: `PKG_${Date.now()}`,
            caseId,
            title: `Evidence Set: ${records.length} Records`,
            recordIds: records.map(r => r._id),
            role: 'SUPPORTING',
            aggregateConfidence: parseFloat(avgConfidence.toFixed(2)),
            rationale: {
                text: rationale,
                timestamp: new Date().toISOString(),
                author: user
            }
        };

        await ChainOfCustody.recordEvent('EVIDENCE_PACKAGE_CREATED', {
            packageId: pkg.packageId,
            caseId: pkg.caseId,
            recordCount: records.length
        }, user);

        return pkg;
    }
}
