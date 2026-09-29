import { AccountingEvent } from './accounting-event.js';
import { ConfidenceModel } from './confidence-model.js';

/**
 * Accounting Event Reconstruction Engine (AERE)
 * Phase 1 Implementation
 * Purpose: Group fragmented ledger entries into meaningful economic events.
 */
export class AEREEngine {
    /**
     * Entry point for reconstruction
     * @param {Array} records - Array of graph-enriched records
     * @returns {Array} Array of AccountingEvent objects
     */
    static reconstruct(records) {
        if (!records || records.length === 0) return [];

        // 1. Group records by Anchor
        const groups = this.groupByAnchor(records);
        
        // 2. Process each group into an Event
        return Object.values(groups).map(members => {
            return this.buildEvent(members);
        });
    }

    /**
     * Groups records by Entity, Vendor, and Normalized Document Number
     */
    static groupByAnchor(records) {
        const groups = {};
        
        records.forEach(record => {
            const r = record.data || record;
            const prov = record._provenance || {};
            
            const entity = prov.entityContext || 'UNK';
            const vendor = r.vendor_id || r.vendor || 'UNK';
            const doc = this.normalizeDoc(r.invoiceNumber || r.doc_number || 'UNKNOWN');
            
            const key = `${entity}|${vendor}|${doc}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(record);
        });
        
        return groups;
    }

    /**
     * Normalizes document numbers for fuzzy matching (strips non-alphanumeric)
     */
    static normalizeDoc(doc) {
        if (!doc) return 'UNKNOWN';
        return String(doc).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    /**
     * Transforms a group of records into a single AccountingEvent
     */
    static buildEvent(members) {
        // Sort chronologically
        const sortedNodes = [...members].sort((a, b) => {
            const dateA = new Date((a.data || a).transactionDate || (a.data || a).doc_date);
            const dateB = new Date((b.data || b).transactionDate || (b.data || b).doc_date);
            return dateA - dateB;
        });

        // Extract anchor metadata from the first node
        const first = sortedNodes[0].data || sortedNodes[0];
        const prov = sortedNodes[0]._provenance || {};
        
        const anchor = {
            docNumber: first.invoiceNumber || first.doc_number || 'UNKNOWN',
            vendorId: first.vendor_id || 'UNKNOWN',
            vendorName: first.vendor || first.vendor_name || 'UNKNOWN',
            entityContext: prov.entityContext || 'UNKNOWN'
        };

        // Classify node roles and calculate impact
        let gross = 0;
        let net = 0;
        const classifiedNodes = sortedNodes.map((node, index) => {
            const r = node.data || node;
            const amount = parseFloat(r.amount || r.doc_amount || 0);
            
            gross += Math.abs(amount);
            net += amount;

            const role = this.determineRole(amount, index, sortedNodes);
            
            return {
                ...node,
                lifecycleRole: role,
                amount: amount
            };
        });

        // Determine Final Economic State
        const status = this.determineStatus(classifiedNodes, net);
        const finalAmount = status === 'VOIDED' ? 0 : (classifiedNodes[classifiedNodes.length - 1].amount || net);

        // Generate Narrative
        const narrative = this.generateNarrative(anchor, classifiedNodes, finalAmount, status);

        // Calculate Confidence
        const confidence = ConfidenceModel.calculate({
            anchor,
            nodes: classifiedNodes
        });

        // Variance Separation (Example logic for Phase 1)
        const varianceContribution = this.calculateVarianceContribution(classifiedNodes, net);

        return new AccountingEvent({
            anchor,
            finalEconomicState: {
                amount: finalAmount,
                status: status,
                determinedFrom: classifiedNodes.length,
                methodology: 'NET_IMPACT_ANALYSIS'
            },
            grossActivity: gross,
            netEconomicImpact: net,
            eventNarrative: narrative,
            varianceAnalysis: varianceContribution,
            confidence: confidence,
            nodes: classifiedNodes,
            eventFlags: this.extractEventFlags(classifiedNodes),
            ledgerFlags: this.extractLedgerFlags(classifiedNodes)
        });
    }

    /**
     * Determines the role of an entry in the lifecycle chain
     */
    static determineRole(amount, index, chain) {
        if (index === 0) return 'ORIGINAL_ENTRY';
        
        const prevNodes = chain.slice(0, index);
        const prevRecord = prevNodes[prevNodes.length - 1].data || prevNodes[prevNodes.length - 1];
        const prevAmount = parseFloat(prevRecord.amount || prevRecord.doc_amount || 0);

        // Logic: Perfect Offset
        if (Math.abs(amount + prevAmount) < 0.01) return 'REVERSAL';
        
        // Logic: Identical to Original after a Reversal
        const originalAmount = parseFloat((chain[0].data || chain[0]).amount || (chain[0].data || chain[0]).doc_amount || 0);
        const hasReversal = prevNodes.some(n => (n.lifecycleRole === 'REVERSAL'));
        if (hasReversal && Math.abs(amount - originalAmount) < 0.01) return 'RE_ENTRY';

        // Logic: Last entry
        if (index === chain.length - 1) return 'FINAL_ENTRY';

        return 'CORRECTION';
    }

    /**
     * Determines the final status of the event
     */
    static determineStatus(nodes, net) {
        if (nodes.length > 5) return 'VOLATILE';
        if (Math.abs(net) < 0.01) return 'VOIDED';
        
        const hasCorrections = nodes.some(n => n.lifecycleRole === 'CORRECTION');
        const hasReversals = nodes.some(n => n.lifecycleRole === 'REVERSAL');
        
        if (hasCorrections || hasReversals) return 'CORRECTED';
        
        // Check for payment links (mock for Phase 1)
        const hasPayment = nodes.some(n => n._relationships?.hasLinks);
        if (hasPayment) return 'SETTLED';

        return 'OPEN';
    }

    /**
     * Generates a human-readable event narrative
     */
    static generateNarrative(anchor, nodes, finalAmount, status) {
        const startAmount = parseFloat((nodes[0].data || nodes[0]).amount || 0).toLocaleString();
        const endAmount = finalAmount.toLocaleString();
        const count = nodes.length;

        let narrative = `Document ${anchor.docNumber} was originally recorded for $${startAmount}. `;
        
        if (count > 1) {
            const corrections = nodes.filter(n => n.lifecycleRole === 'CORRECTION').length;
            const reversals = nodes.filter(n => n.lifecycleRole === 'REVERSAL').length;
            narrative += `It underwent ${reversals} reversal(s) and ${corrections} correction(s) over ${count} entries. `;
        }

        if (status === 'VOIDED') {
            narrative += `The economic impact was ultimately nullified (VOIDED).`;
        } else {
            narrative += `The final economic reality is a settled state of $${endAmount}.`;
        }

        return narrative;
    }

    /**
     * Identifies how this specific event contributes to general ledger noise
     */
    static calculateVarianceContribution(nodes, net) {
        const original = parseFloat((nodes[0].data || nodes[0]).amount || 0);
        const delta = Math.abs(net - original);
        
        return {
            contributesToLedgerVariance: delta > 0.01,
            contributionAmount: delta,
            type: delta > 0 ? 'LIFECYCLE_SKEW' : 'NONE'
        };
    }

    /**
     * Extracts only findings specific to this event lifecycle
     */
    static extractEventFlags(nodes) {
        const flags = [];
        // Example: Detect duplicate final states or excessive churn
        if (nodes.length > 8) {
            flags.push({
                category: 'CONTRADICTION',
                severity: 'HIGH',
                description: 'Excessive Transaction Churn: Anchor Document underwent 8+ revisions.'
            });
        }
        return flags;
    }

    /**
     * Extracts or filters ledger-wide systemic findings
     */
    static extractLedgerFlags(nodes) {
        // Phase 1 Placeholder: This would be populated by systemic checks like footing fails
        return [];
    }
}
