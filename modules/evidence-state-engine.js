
// modules/evidence-state-engine.js

/**
 * Evidence State Engine
 * Enforces RREDCO System Governance Charter v5.0 - Rule 5
 * Tracks evidence lifecycle and resolution states.
 */

export const EVIDENCE_STATES = Object.freeze({
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    UNRESOLVED: 'Unresolved'
});

export const LIFECYCLE_PHASES = Object.freeze({
    DETECTED: 'Detected',
    VALIDATED: 'Validated',
    CORROBORATED: 'Corroborated',
    ARCHIVED: 'Archived'
});

export class EvidenceStateEngine {
    
    /**
     * Initializes the default state for newly ingested records.
     * Raw OCR or newly pulled Cloud data always starts as 'Detected'.
     * @param {Object} extractionMetrics - Context to determine initial resolution state.
     * @returns {Object} State tracking object
     */
    static initializeState(extractionMetrics = {}) {
        // If the parsing engine already detected a variance (like a cross-foot failure), 
        // flag it immediately as Unresolved. Otherwise, default to Accepted.
        const initialState = extractionMetrics.hasVariance 
            ? EVIDENCE_STATES.UNRESOLVED 
            : EVIDENCE_STATES.ACCEPTED;

        return {
            status: initialState,
            lifecyclePhase: LIFECYCLE_PHASES.DETECTED,
            history: [
                {
                    phase: LIFECYCLE_PHASES.DETECTED,
                    timestamp: new Date().toISOString(),
                    note: "Initial ingestion."
                }
            ]
        };
    }

    /**
     * Transitions an evidence record to a new phase.
     * @param {Object} record - The staged record (must contain an _evidenceState object)
     * @param {String} newPhase - One of LIFECYCLE_PHASES
     * @param {String} note - Justification for the transition
     */
    static transitionPhase(record, newPhase, note = "Phase transition") {
        if (!Object.values(LIFECYCLE_PHASES).includes(newPhase)) {
            throw new Error(`Governance Violation: Invalid lifecycle phase '${newPhase}'.`);
        }

        if (!record._evidenceState) {
            throw new Error("Governance Violation: Record is missing evidence state metadata.");
        }

        record._evidenceState.lifecyclePhase = newPhase;
        record._evidenceState.history.push({
            phase: newPhase,
            timestamp: new Date().toISOString(),
            note: note
        });

        return record;
    }

    /**
     * Updates the acceptance status of an evidence record.
     * @param {Object} record - The staged record
     * @param {String} newStatus - One of EVIDENCE_STATES
     * @param {String} justification - Required by governance for rejection/unresolved
     */
    static updateStatus(record, newStatus, justification) {
        if (!Object.values(EVIDENCE_STATES).includes(newStatus)) {
            throw new Error(`Governance Violation: Invalid evidence state '${newStatus}'.`);
        }
        
        if ((newStatus === EVIDENCE_STATES.REJECTED || newStatus === EVIDENCE_STATES.UNRESOLVED) && !justification) {
            throw new Error("Governance Violation: Justification required to reject or flag evidence as unresolved.");
        }

        record._evidenceState.status = newStatus;
        record._evidenceState.history.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: justification || "Status updated."
        });

        return record;
    }
}
