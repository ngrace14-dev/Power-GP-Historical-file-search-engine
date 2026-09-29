import { ChainOfCustody } from '../../../../chain-of-custody.js';

/**
 * Relationship Audit Integration - Governance v6.0
 */
export class RelationshipAudit {
    /**
     * Logs relationship events to the immutable Chain of Custody
     * @param {string} event - Event type (RELATIONSHIP_CREATED, etc)
     * @param {Object} details - Payload for the audit block
     */
    static async log(event, details) {
        await ChainOfCustody.recordEvent(event, {
            ...details,
            subsystem: "Forensic_Relationship_Engine",
            engineVersion: "2.0.0-modular"
        });
        
        // Emit for real-time UI monitoring
        window.dispatchEvent(new CustomEvent(`relationship:${event.toLowerCase()}`, { detail: details }));
    }
}
