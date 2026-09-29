/**
 * Investigation State Manager - Governance v6.0
 */
export class InvestigationState {
    static activeInvestigation = null;

    /**
     * Sets the global investigation state for the current session
     * @param {Object} context
     */
    static setActive(context) {
        this.activeInvestigation = context;
        window.dispatchEvent(new CustomEvent('investigation:state_changed', { detail: context }));
    }

    /**
     * Returns the active investigation context
     * @returns {Object|null}
     */
    static getActive() {
        return this.activeInvestigation;
    }

    /**
     * Resets the active investigation
     */
    static reset() {
        this.activeInvestigation = null;
    }
}
