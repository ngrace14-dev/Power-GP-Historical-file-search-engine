/**
 * Evidence Workbench - Governance v6.0
 * Service for managing the comparison and selection of evidence.
 */
export class EvidenceWorkbench {
    /**
     * Staging area for records before they are "pinned" to a case
     */
    static staging = new Set();

    /**
     * Toggles a record in the workbench staging area
     * @param {string} recordId
     */
    static toggleStaging(recordId) {
        if (this.staging.has(recordId)) {
            this.staging.delete(recordId);
        } else {
            this.staging.add(recordId);
        }
        window.dispatchEvent(new CustomEvent('workbench:staging_updated', { detail: Array.from(this.staging) }));
    }

    /**
     * Clears the workbench
     */
    static clear() {
        this.staging.clear();
        window.dispatchEvent(new CustomEvent('workbench:staging_updated', { detail: [] }));
    }
}
