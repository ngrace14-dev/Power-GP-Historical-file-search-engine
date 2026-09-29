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

        // 1. Initial Broad Grouping
        const initialGroups = this.groupByAnchor(records);
        
        // 2. Phase 2.6: Refined Partitioning (Collision Prevention)
        const refinedGroups = [];
        Object.values(initialGroups).forEach(members => {
            const partitions = this.partitionGroup(members);
            refinedGroups.push(...partitions);
        });

        // 3. Process each group into an Event
        return refinedGroups.map(members => {
            return this.buildEvent(members);
        });
    }

    /**
     * Phase 2.6: Partitions a broad group into distinct events if collisions are detected
     */
    static partitionGroup(members) {
        const doc = this.normalizeDoc((members[0].data || members[0]).invoiceNumber || (members[0].data || members[0]).doc_number || 'UNKNOWN');
        const quality = this.calculateAnchorQuality(doc);

        // Scenario 1: Stable High-Quality Anchor -> Keep together
        if (quality === 'HIGH') return [members];

        // Scenario 2: Generic Anchor -> Partition by Voucher first
        const voucherGroups = {};
        members.forEach(node => {
            const v = (node.data || node).voucherNumber || (node.data || node).voucher || 'NO_VCH';
            if (!voucherGroups[v]) voucherGroups[v] = [];
            voucherGroups[v].push(node);
        });

        // Scenario 3: Temporal Windowing (90 Day Gap)
        const finalPartitions = [];
        Object.values(voucherGroups).forEach(vNodes => {
            const sorted = [...vNodes].sort((a, b) => {
                const da = new Date((a.data || a).transactionDate || (a.data || a).doc_date);
                const db = new Date((b.data || b).transactionDate || (b.data || b).doc_date);
                return da - db;
            });

            let currentPartition = [sorted[0]];
            for (let i = 1; i < sorted.length; i++) {
                const prevDate = new Date((sorted[i-1].data || sorted[i-1]).transactionDate || (sorted[i-1].data || sorted[i-1]).doc_date);
                const currDate = new Date((sorted[i].data || sorted[i]).transactionDate || (sorted[i].data || sorted[i]).doc_date);
                
                const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
                
                if (diffDays > 90) {
                    finalPartitions.push(currentPartition);
                    currentPartition = [sorted[i]];
                } else {
                    currentPartition.push(sorted[i]);
                }
            }
            finalPartitions.push(currentPartition);
        });

        return finalPartitions;
    }

    /**
     * Phase 2.6: Scoring Anchor Uniqueness
     */
    static calculateAnchorQuality(doc) {
        const blacklist = ['RECON', 'RECONCILIATION', 'PAYMENT', 'VOID', 'INTEREST', 'BALANCE', 'ADJUSTMENT', 'MONTH END', 'YEAR END', '-', 'UNKNOWN'];
        if (blacklist.includes(doc) || doc.length < 4) return 'LOW';
        
        const hasNumbers = /\d/.test(doc);
        const hasLetters = /[A-Z]/.test(doc);
        if (hasNumbers && hasLetters && doc.length > 6) return 'HIGH';
        
        return 'MEDIUM';
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

        const anchorQuality = this.calculateAnchorQuality(this.normalizeDoc(anchor.docNumber));
        const collisionRisk = anchorQuality === 'LOW' ? 0.8 : (anchorQuality === 'MEDIUM' ? 0.3 : 0.05);

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
            anchorQuality: anchorQuality,
            collisionRisk: collisionRisk,
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
