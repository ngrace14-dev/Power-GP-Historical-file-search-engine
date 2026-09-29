/**
 * Accounting Event Model
 * Represents the "Final Economic Reality" derived from a sequence of transactions.
 * Designed for forensic reconstruction of corporate ledgers.
 */
export class AccountingEvent {
    constructor(data = {}) {
        this.eventId = data.eventId || `AE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Anchor: The unifying business context
        this.anchor = {
            docNumber: data.anchor?.docNumber || 'UNKNOWN',
            vendorId: data.anchor?.vendorId || 'UNKNOWN',
            vendorName: data.anchor?.vendorName || 'UNKNOWN',
            entityContext: data.anchor?.entityContext || 'UNKNOWN'
        };

        // Final Economic State: The "Truth" derived from the noise
        this.finalEconomicState = {
            amount: data.finalEconomicState?.amount || 0,
            status: data.finalEconomicState?.status || 'OPEN', // OPEN, SETTLED, VOIDED, CORRECTED, VOLATILE, UNRESOLVED
            determinedFrom: data.finalEconomicState?.determinedFrom || 0,
            methodology: data.finalEconomicState?.methodology || 'NET_IMPACT_ANALYSIS'
        };

        // Aggregated Metrics
        this.grossActivity = data.grossActivity || 0;
        this.netEconomicImpact = data.netEconomicImpact || 0;

        // Human-readable narrative for Findings and Memorandums
        this.eventNarrative = data.eventNarrative || '';

        // Variance Separation: Distinct from Ledger-wide contradictions
        this.varianceAnalysis = {
            contributesToLedgerVariance: data.varianceAnalysis?.contributesToLedgerVariance || false,
            contributionAmount: data.varianceAnalysis?.contributionAmount || 0,
            type: data.varianceAnalysis?.type || 'NONE'
        };

        // Confidence Matrix: Transparency for auditors
        this.confidence = {
            total: data.confidence?.total || 0,
            anchorConfidence: data.confidence?.anchorConfidence || 0,
            chronologyConfidence: data.confidence?.chronologyConfidence || 0,
            relationshipConfidence: data.confidence?.relationshipConfidence || 0
        };

        // The Chain: Chronologically sorted raw nodes
        this.nodes = data.nodes || [];

        // Scoped Contradictions
        this.eventFlags = data.eventFlags || [];   // Findings specific to this anchor lifecycle
        this.ledgerFlags = data.ledgerFlags || []; // Injected ledger-wide systemic findings
    }

    /**
     * Serializes the event for storage or transport
     */
    toJSON() {
        return {
            eventId: this.eventId,
            anchor: this.anchor,
            finalEconomicState: this.finalEconomicState,
            grossActivity: this.grossActivity,
            netEconomicImpact: this.netEconomicImpact,
            eventNarrative: this.eventNarrative,
            varianceAnalysis: this.varianceAnalysis,
            confidence: this.confidence,
            nodes: this.nodes,
            eventFlags: this.eventFlags,
            ledgerFlags: this.ledgerFlags
        };
    }
}
