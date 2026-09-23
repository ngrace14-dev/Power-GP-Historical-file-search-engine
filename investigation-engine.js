// modules/investigation-engine.js

/**
 * Investigation Engine
 * Enforces RREDCO System Governance Charter v5.0 - Rule 5
 * Tracks investigation lifecycles and preserves case history.
 */

export const INVESTIGATION_STATES = Object.freeze({
    OPEN: 'Open',
    GATHERING: 'Evidence Gathering',
    VALIDATION: 'Validation',
    CORROBORATION: 'Corroboration',
    ESCALATED: 'Escalated',
    RESOLVED: 'Resolved',
    ARCHIVED: 'Archived'
});

export class InvestigationEngine {
    
    /**
     * Initializes a new investigation case.
     * @param {String} title - Name of the investigation (e.g., "POMCO Missing Vendor Search")
     * @param {String} entityContext - The entity boundary this investigation operates within
     * @param {String} initiatedBy - User email or ID
     * @returns {Object} A structured investigation case object
     */
    static createInvestigation(title, entityContext, initiatedBy) {
        if (!entityContext) {
            throw new Error("Governance Violation: Investigations must be bound to a specific entity context.");
        }

        return {
            caseId: `INV_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            title: title,
            entityContext: entityContext,
            state: INVESTIGATION_STATES.OPEN,
            initiatedBy: initiatedBy,
            createdAt: new Date().toISOString(),
            evidenceLog: [],
            stateHistory: [
                {
                    state: INVESTIGATION_STATES.OPEN,
                    timestamp: new Date().toISOString(),
                    user: initiatedBy,
                    note: "Investigation opened."
                }
            ]
        };
    }

    /**
     * Attaches a validated evidence record to the investigation.
     * @param {Object} investigation - The current case object
     * @param {Object} evidenceRecord - The fully stamped provenance record
     * @param {String} linkRationale - Why this evidence matters to the case
     */
    static attachEvidence(investigation, evidenceRecord, linkRationale) {
        if (investigation.entityContext !== evidenceRecord._provenance?.entityContext) {
            throw new Error(`Governance Violation: Cannot attach ${evidenceRecord._provenance?.entityContext} evidence to a ${investigation.entityContext} investigation.`);
        }

        // Auto-transition to Gathering state if it's currently Open
        if (investigation.state === INVESTIGATION_STATES.OPEN) {
            this.transitionState(investigation, INVESTIGATION_STATES.GATHERING, "First piece of evidence attached.", "System Auto-Trigger");
        }

        investigation.evidenceLog.push({
            attachedAt: new Date().toISOString(),
            rationale: linkRationale || "No rationale provided.",
            recordId: evidenceRecord.data?.row_id || "UNKNOWN_ID",
            source: evidenceRecord._provenance?.sourceFile
        });

        return investigation;
    }

    /**
     * Transitions the investigation to a new phase in the lifecycle.
     * @param {Object} investigation - The current case object
     * @param {String} newState - One of INVESTIGATION_STATES
     * @param {String} justification - Required for state changes
     * @param {String} user - User making the change
     */
    static transitionState(investigation, newState, justification, user) {
        if (!Object.values(INVESTIGATION_STATES).includes(newState)) {
            throw new Error(`Governance Violation: Invalid investigation state '${newState}'.`);
        }
        if (!justification) {
            throw new Error("Governance Violation: State transitions require a written justification.");
        }

        investigation.state = newState;
        investigation.stateHistory.push({
            state: newState,
            timestamp: new Date().toISOString(),
            user: user,
            note: justification
        });

        return investigation;
    }
}
