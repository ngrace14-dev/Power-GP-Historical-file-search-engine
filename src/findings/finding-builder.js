import { FindingTypes, ImpactTiers } from './finding-taxonomy.js';

/**
 * Finding Builder - Governance v6.0
 * Structured assembly of forensic findings.
 */
export class FindingBuilder {
    /**
     * Initializes a standard finding draft
     */
    static createDraft(caseId, title, theory) {
        return {
            findingId: `FIND_DRAFT_${Date.now()}`,
            caseId,
            theoryId: theory.theoryId,
            type: FindingTypes.DRAFT_FINDING,
            title,
            impact: ImpactTiers.MINOR,
            description: "",
            recommendations: [],
            isGovernedDraft: true,
            reviewRecommendation: theory.governance.requiresHumanReview ? "PRIORITY_REVIEW" : "STANDARD_REVIEW"
        };
    }
}
