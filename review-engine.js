// modules/review-engine.js

/**
 * Review & Override Engine
 * Enforces RREDCO System Governance Charter v5.0 - Rule 8
 * Manages human-in-the-loop triage, field overrides, and resolution sign-offs.
 */

export const ESCALATION_REASONS = Object.freeze({
    LOW_CONFIDENCE: 'Low OCR / Parsing Confidence Score (<70%)',
    VALIDATION_FAILURE: 'Phase 4 Accounting Tie-Out Failure',
    CONTRADICTION_FLAG: 'Critical Contradiction / Cross-Entity Bleed'
});

export class ReviewEngine {

    /**
     * Determines if a record requires escalation to the Human Review Queue.
     * @param {Object} record - Staged record containing _provenance and _validation
     * @returns {Object} { needsReview: Boolean, reasons: Array }
     */
    static evaluateEscalation(record) {
        const reasons = [];
        const prov = record._provenance || {};
        const val = record._validation || {};
        const conf = prov.confidenceMetrics || {};

        // Trigger 1: Low Confidence Scores
        if (conf.parsingConfidence < 70 || conf.ocrConfidence < 70) {
            reasons.push(ESCALATION_REASONS.LOW_CONFIDENCE);
        }

        // Trigger 2: Phase 4 Validation Failure
        if (val.tieOutStatus === 'FAIL') {
            reasons.push(`${ESCALATION_REASONS.VALIDATION_FAILURE}: ${val.message}`);
        }

        return {
            needsReview: reasons.length > 0,
            reasons: reasons
        };
    }

    /**
     * Applies a human override to a record, updating fields and logging resolution metadata.
     * @param {Object} record - The original record
     * @param {Object} correctedData - Key-value map of corrected fields
     * @param {String} managerNote - Mandatory justification for the override
     * @param {String} reviewedByEmail - User email performing the sign-off
     * @returns {Object} Enriched record with resolution audit trail
     */
    static applyOverride(record, correctedData, managerNote, reviewedByEmail) {
        if (!managerNote || managerNote.trim().length === 0) {
            throw new Error("Governance Violation: Human overrides require a written justification note.");
        }

        // Update record payload
        const updatedData = { ...record.data, ...correctedData };

        // Append resolution metadata
        const resolutionStamp = {
            status: 'Accepted_With_Override',
            reviewedBy: reviewedByEmail,
            reviewedAt: new Date().toISOString(),
            note: managerNote,
            overriddenFields: Object.keys(correctedData)
        };

        return {
            ...record,
            data: updatedData,
            _evidenceState: {
                ...record._evidenceState,
                status: 'Accepted',
                verificationLevel: 'Validated'
            },
            _reviewResolution: resolutionStamp
        };
    }
}
