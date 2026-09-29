import { ChainOfCustody } from '../chain-of-custody.js';

/**
 * Review Workbench - Governance v6.0
 */
export class ReviewWorkbench {
    /**
     * Records a final review decision on a finding
     * @param {string} findingId
     * @param {boolean} sustained
     * @param {string} rationale
     * @param {string} user
     */
    static async recordDecision(findingId, sustained, rationale, user) {
        const decision = {
            findingId,
            decision: sustained ? 'SUSTAINED' : 'OVERRULED',
            rationale,
            decidedBy: user,
            timestamp: new Date().toISOString()
        };

        await ChainOfCustody.recordEvent('REVIEW_DECISION_RECORDED', decision, user);
        return decision;
    }
}
