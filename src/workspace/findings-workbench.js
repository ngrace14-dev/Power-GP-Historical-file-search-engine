/**
 * Findings Workbench - Governance v6.0
 */
export class FindingsWorkbench {
    /**
     * Prepares a finding draft with supporting evidence
     * @param {Array<string>} evidencePackageIds
     * @param {string} title
     * @param {string} impact
     */
    static prepareFinding(evidencePackageIds, title, impact) {
        return {
            title,
            impact,
            supportingEvidenceIds: evidencePackageIds,
            description: "",
            type: 'DRAFT_FINDING'
        };
    }
}
