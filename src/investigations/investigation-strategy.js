import { ChainOfCustody } from '../chain-of-custody.js';

/**
 * Investigation Strategy Service - Governance v6.0
 * Manages the top-down planning lifecycle.
 */
export class InvestigationStrategy {
    /**
     * Initializes a formal investigative objective
     * @param {string} caseId
     * @param {string} question
     * @param {string} type
     * @param {string} user
     */
    static async setObjective(caseId, question, type = 'FORENSIC', user) {
        const objective = {
            id: `OBJ_${Date.now()}`,
            caseId,
            question,
            type,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };

        await ChainOfCustody.recordEvent('OBJECTIVE_SET', {
            objectiveId: objective.id,
            question,
            type
        }, user);

        return objective;
    }

    /**
     * Outlines the investigative procedures for an objective
     */
    static async draftPlan(objectiveId, steps = [], entities = [], user) {
        const plan = {
            id: `PLAN_${Date.now()}`,
            objectiveId,
            steps,
            targetEntities: entities,
            targetAccounts: [],
            status: 'DRAFT'
        };

        await ChainOfCustody.recordEvent('PLAN_DRAFTED', {
            planId: plan.id,
            objectiveId,
            stepCount: steps.length
        }, user);

        return plan;
    }
}
