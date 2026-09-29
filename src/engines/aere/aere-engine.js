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
     * Phase 4.1F: Classifies anchors into IDENTITY, PROCESS, or CATEGORY
     */
    static classifyAnchor(doc) {
        const docUpper = String(doc || '').toUpperCase();
        
        // Blacklists for CATEGORY and PROCESS
        const categories = ['SHIPPING', 'UTILITIES', 'MAINTENANCE', 'SUPPLIES', 'ADVERTISING', 'TRAVEL', 'MEALS', 'EXPENSE', 'MISC'];
        const processes = ['COMPUTER CHECKS', 'PAYROLL', 'PAYMENT', 'VOID', 'INTEREST', 'BALANCE', 'RECON', 'RECONCILIATION'];
        
        if (categories.some(c => docUpper.includes(c))) return 'CATEGORY';
        if (processes.some(p => docUpper.includes(p))) return 'PROCESS';
        
        // Identity logic: High entropy usually means IDENTITY
        const quality = this.calculateAnchorQuality(docUpper);
        if (quality === 'HIGH' || quality === 'MEDIUM') return 'IDENTITY';
        
        return 'CATEGORY'; // Default to category for very low-quality anchors
    }

    /**
     * Phase 2.6: Partitions a broad group into distinct events if collisions are detected
     * Refined in Phase 4.1F to support IDENTITY/PROCESS/CATEGORY logic
     */
    static partitionGroup(members) {
        const doc = (members[0].data || members[0]).invoiceNumber || (members[0].data || members[0]).doc_number || 'UNKNOWN';
        const anchorType = this.classifyAnchor(doc);
        const quality = this.calculateAnchorQuality(this.normalizeDoc(doc));

        // IDENTITY with HIGH quality -> Keep as a single lifecycle
        if (anchorType === 'IDENTITY' && quality === 'HIGH') return [members];

        // PROCESS anchors -> Always partition by Voucher (Batch Separation)
        if (anchorType === 'PROCESS') {
            return this.splitByVoucher(members);
        }

        // CATEGORY anchors -> 
        // 1. For "EXPENSE_SERIES" we could keep them together, 
        // 2. But for Forensic accuracy we split by Voucher.
        // We will split by Voucher to prevent AI "Lifecycle" hallucinations.
        if (anchorType === 'CATEGORY') {
            return this.splitByVoucher(members);
        }

        // Default: Partition by Voucher for safety
        return this.splitByVoucher(members);
    }

    /**
     * Helper to split a group by Voucher Number
     */
    static splitByVoucher(members) {
        const voucherGroups = {};
        members.forEach(node => {
            const v = (node.data || node).voucherNumber || (node.data || node).voucher || 'NO_VCH';
            if (!voucherGroups[v]) voucherGroups[v] = [];
            voucherGroups[v].push(node);
        });
        return Object.values(voucherGroups);
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

        // Phase 2.7: Intent Detection
        const intent = this.determineIntent(sortedNodes);

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

            // Suppress lifecycle roles for compound entries
            const role = (intent === 'COMPOUND_ENTRY') 
                ? 'ACCOUNT_LINE' 
                : this.determineRole(amount, index, sortedNodes);
            
            return {
                ...node,
                lifecycleRole: role,
                amount: amount
            };
        });

        // Determine Final Economic State
        const status = (intent === 'COMPOUND_ENTRY') 
            ? (Math.abs(net) < 0.01 ? 'BALANCED' : 'UNBALANCED')
            : this.determineStatus(classifiedNodes, net);

        // Phase 4.1G Fix: Ensure finalAmount for COMPOUND_ENTRY is the net imbalance
        const finalAmount = (intent === 'COMPOUND_ENTRY')
            ? net
            : (status === 'VOIDED' ? 0 : (classifiedNodes[classifiedNodes.length - 1].amount || net));

        // Generate Narrative
        const narrative = this.generateNarrative(anchor, classifiedNodes, finalAmount, status, intent);

        // Calculate Confidence
        const confidence = ConfidenceModel.calculate({
            anchor,
            nodes: classifiedNodes
        });

        const anchorQuality = this.calculateAnchorQuality(this.normalizeDoc(anchor.docNumber));
        let collisionRisk = anchorQuality === 'LOW' ? 0.8 : (anchorQuality === 'MEDIUM' ? 0.3 : 0.05);

        // Phase 2.8: Intent-Aware Risk Tuning
        if (intent === 'ACCRUAL_CYCLE' || intent === 'PAYROLL_PACKAGE') {
            collisionRisk = Math.min(collisionRisk, 0.2); // Lower risk for expected reversals
        } else if (intent === 'CONTROLLER_ADJUSTMENT' || intent === 'CAPITALIZATION_EVENT') {
            collisionRisk = Math.max(collisionRisk, 0.7); // Elevate risk for manual interventions
        }

        // Variance Separation (Example logic for Phase 1)
        const varianceContribution = this.calculateVarianceContribution(classifiedNodes, net);

        return new AccountingEvent({
            anchor,
            finalEconomicState: {
                amount: finalAmount,
                status: status,
                determinedFrom: classifiedNodes.length,
                methodology: intent === 'COMPOUND_ENTRY' ? 'BALANCE_VALIDATION' : 'NET_IMPACT_ANALYSIS'
            },
            grossActivity: gross,
            netEconomicImpact: net,
            eventNarrative: narrative,
            anchorQuality: anchorQuality,
            collisionRisk: collisionRisk,
            eventIntent: intent,
            lineCount: classifiedNodes.length,
            varianceAnalysis: varianceContribution,
            confidence: confidence,
            nodes: classifiedNodes,
            eventFlags: this.extractEventFlags(classifiedNodes, intent),
            ledgerFlags: this.extractLedgerFlags(classifiedNodes)
        });
    }

    /**
     * Phase 2.7: Detects if a cluster is a single Compound Entry vs a Lifecycle
     * Refined in 4.1F to include EXPENSE_SERIES
     */
    static determineIntent(nodes) {
        const uniqueVouchers = new Set(nodes.map(n => (n.data || n).voucherNumber || (node.data || node).voucher));
        const uniqueDates = new Set(nodes.map(n => (n.data || n).transactionDate || (n.data || n).doc_date));
        const sources = new Set(nodes.map(n => (n.data || n)['Originating TRX Source'] || ''));
        const refs = nodes.map(n => String((n.data || n).Reference || (n.data || n).referenceNumber || '').toUpperCase());
        const descriptions = nodes.map(n => String((n.data || n).Description || (n.data || n).description || '').toUpperCase());
        const doc = (nodes[0].data || nodes[0]).invoiceNumber || (nodes[0].data || nodes[0]).doc_number || 'UNKNOWN';
        const anchorType = this.classifyAnchor(doc);

        // 1. SETTLEMENT_PACKAGE (Payments/Checks)
        if (sources.has('PMCHK') || sources.has('PMPAY') || refs.some(r => r.includes('COMPUTER CHECKS') || r.includes('PAYMENT ENTRY'))) {
            return 'SETTLEMENT_PACKAGE';
        }

        // 2. PAYROLL_PACKAGE (CMTRX / Payroll Refs)
        if (sources.has('CMTRX') || refs.some(r => r.includes('PAYROLL') || r.includes('PAY PERIOD')) || descriptions.some(d => d.includes('PAYROLL'))) {
            return 'PAYROLL_PACKAGE';
        }

        // 3. ACCRUAL_CYCLE (GLTRX/GLREV Pattern)
        if ((sources.has('GLTRX') && sources.has('GLREV')) || descriptions.some(d => d.includes('ACCRUE'))) {
            return 'ACCRUAL_CYCLE';
        }

        // 4. CAPITALIZATION_EVENT (Fixed Asset Focus)
        if (descriptions.some(d => d.includes('CAPITALIZE') || d.includes('FIXED ASSET') || d.includes('CIP '))) {
            return 'CAPITALIZATION_EVENT';
        }

        // 5. CONTROLLER_ADJUSTMENT (Manual Correction Keywords)
        if (descriptions.some(d => d.includes('BACK OUT') || d.includes('RCL ') || d.includes('RECLASS') || d.includes('DUPLICATE'))) {
            return 'CONTROLLER_ADJUSTMENT';
        }

        // 6. COMPOUND_ENTRY (Standard Balanced Entry)
        if (uniqueVouchers.size === 1 && uniqueDates.size === 1) {
            return 'COMPOUND_ENTRY';
        }

        // 7. RECON_PACKAGE (Generic broad clusters)
        if (['RECON', 'RECONCILIATION', 'MONTH END', 'BALANCE'].includes(doc.toUpperCase())) return 'RECON_PACKAGE';

        // 8. EXPENSE_SERIES (Phase 4.1F: High-level category aggregation)
        if (anchorType === 'CATEGORY' && nodes.length > 3) {
            return 'EXPENSE_SERIES';
        }

        return 'INVOICE_LIFECYCLE';
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
    static generateNarrative(anchor, nodes, finalAmount, status, intent = 'INVOICE_LIFECYCLE') {
        const count = nodes.length;

        if (intent === 'COMPOUND_ENTRY') {
            const balanceNote = status === 'BALANCED' ? 'The entry is balanced.' : `The entry is UNBALANCED by $${Math.abs(finalAmount).toLocaleString()}.`;
            return `${count}-Line Journal Entry recorded on ${(nodes[0].data || nodes[0]).transactionDate || 'unknown date'}. ${balanceNote}`;
        }

        if (intent === 'ACCRUAL_CYCLE') {
            return `Accrual cycle identified: An accrual was recorded and subsequently reversed. Net economic impact is zero.`;
        }

        if (intent === 'PAYROLL_PACKAGE') {
            return `Payroll processing package containing ${count} individual distributions.`;
        }

        if (intent === 'SETTLEMENT_PACKAGE') {
            return `Accounts payable settlement activity: Liability satisfaction via check or electronic transfer.`;
        }

        if (intent === 'CONTROLLER_ADJUSTMENT') {
            return `Manual accounting intervention detected. Entry description identifies this as a reclassification, back-out, or manual adjustment.`;
        }

        if (intent === 'CAPITALIZATION_EVENT') {
            return `Asset treatment transition: Expenditure identified for capitalization as Fixed Asset or CIP.`;
        }

        if (intent === 'EXPENSE_SERIES') {
            return `Expense series identified: This cluster represents a sequence of related ${anchor.docNumber.toLowerCase()} expenditures captured under a common category anchor.`;
        }

        const startAmount = parseFloat((nodes[0].data || nodes[0]).amount || 0).toLocaleString();
        const endAmount = finalAmount.toLocaleString();
        
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
    static extractEventFlags(nodes, intent = 'INVOICE_LIFECYCLE') {
        const flags = [];
        
        // Phase 4.1G Fix: Suppress Churn diagnostics for COMPOUND_ENTRY
        if (intent !== 'COMPOUND_ENTRY' && nodes.length > 8) {
            flags.push({
                category: 'CONTRADICTION',
                severity: 'HIGH',
                description: 'Excessive Transaction Churn: Anchor Document underwent 8+ revisions.'
            });
        }

        // Add Account-Line diagnostics for COMPOUND_ENTRY
        if (intent === 'COMPOUND_ENTRY' && nodes.length > 50) {
            flags.push({
                category: 'COMPLEXITY',
                severity: 'MEDIUM',
                description: 'High-Density Journal Entry: 50+ individual account distributions detected.'
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
