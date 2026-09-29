import { ChainOfCustody } from '../../chain-of-custody.js';

/**
 * Finding Lifecycle Service - Governance v6.0
 */
export class FindingService {
    /**
     * Records a new forensic finding within a case
     * @param {string} caseId
     * @param {Object} data - Finding details
     * @param {string} user
     * @returns {Promise<ForensicFinding>}
     */
    static async recordFinding(caseId, data, user) {
        const finding = {
            findingId: `FIND_${Date.now()}`,
            caseId,
            type: data.type || 'OBSERVATION',
            title: data.title,
            description: data.description,
            impact: data.impact || 'MINOR',
            supportingEvidenceIds: data.supportingEvidenceIds || [],
            contradictingEvidenceIds: data.contradictingEvidenceIds || [],
            auditorCommentary: "",
            isResolved: false
        };

        await ChainOfCustody.recordEvent('FINDING_RECORDED', {
            findingId: finding.findingId,
            caseId: finding.caseId,
            type: finding.type,
            impact: finding.impact
        }, user);

        return finding;
    }
}
