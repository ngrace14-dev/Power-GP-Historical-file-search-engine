// modules/contradiction-engine.js

/**
 * Contradiction Engine
 * Enforces RREDCO System Governance Charter v5.0
 * Requirement: Attempt self-disproof by finding conflicting or duplicate evidence.
 */

export const CONTRADICTION_TYPES = Object.freeze({
    DUPLICATE_EVIDENCE: 'Duplicate Evidence Detected',
    AMOUNT_MISMATCH: 'Conflicting Financial Totals',
    CROSS_ENTITY_BLEED: 'Cross-Entity Relationship Detected'
});

export class ContradictionEngine {
    
    /**
     * Scans a dataset for internal contradictions.
     * @param {Array} records - The fully staged IndexedDB records
     * @returns {Array} An array of flagged contradiction objects
     */
    static analyzeDataset(records) {
        if (!records || records.length === 0) return [];
        
        const flags = [];
        const invoiceMap = new Map();

        records.forEach(record => {
            // Normalize extraction paths based on where the data came from (Ledger vs Lighthouse)
            const entity = record._location || record._provenance?.entityContext || 'UNKNOWN';
            const invoiceNum = record['Invoice Number'] || record.data?.doc_number || '-';
            const amount = parseFloat(record['Debit Amount'] || record.data?.doc_amount || 0);
            const source = record._sourceFile || record._provenance?.sourceFile || 'Unknown Source';

            // Skip records without a distinct invoice or document number
            if (invoiceNum === '-' || invoiceNum === 'INV-CLK') return;

            const trackingKey = `${entity}::${invoiceNum}`;

            if (invoiceMap.has(trackingKey)) {
                const existing = invoiceMap.get(trackingKey);

                // Check 1: Conflicting Amounts for the same document
                if (Math.abs(existing.amount - amount) > 0.05) {
                    flags.push({
                        type: CONTRADICTION_TYPES.AMOUNT_MISMATCH,
                        severity: 'HIGH',
                        entity: entity,
                        targetDocument: invoiceNum,
                        description: `Invoice ${invoiceNum} shows conflicting amounts: $${existing.amount.toFixed(2)} in ${existing.source} vs $${amount.toFixed(2)} in ${source}.`
                    });
                } 
                // Check 2: Duplicate Evidence Across Different Sources
                else if (existing.source !== source) {
                    flags.push({
                        type: CONTRADICTION_TYPES.DUPLICATE_EVIDENCE,
                        severity: 'MEDIUM',
                        entity: entity,
                        targetDocument: invoiceNum,
                        description: `Duplicate record for Invoice ${invoiceNum} found in both ${existing.source} and ${source}.`
                    });
                }
            } else {
                invoiceMap.set(trackingKey, { amount, source, entity });
            }
        });

        // Check 3: Cross-Entity Bleed (Same Invoice Number spanning multiple entities)
        const globalInvoiceMap = new Map();
        records.forEach(record => {
            const invoiceNum = record['Invoice Number'] || record.data?.doc_number || '-';
            const entity = record._location || record._provenance?.entityContext || 'UNKNOWN';
            
            if (invoiceNum === '-' || invoiceNum === 'INV-CLK') return;

            if (globalInvoiceMap.has(invoiceNum)) {
                const existingEntity = globalInvoiceMap.get(invoiceNum);
                if (existingEntity !== entity) {
                    // Only flag once per crossing pair
                    const bleedFlag = `Invoice ${invoiceNum} exists in both ${existingEntity} and ${entity}.`;
                    if (!flags.some(f => f.description === bleedFlag)) {
                        flags.push({
                            type: CONTRADICTION_TYPES.CROSS_ENTITY_BLEED,
                            severity: 'CRITICAL', // Directly challenges Entity Isolation rules
                            entity: `${existingEntity} & ${entity}`,
                            targetDocument: invoiceNum,
                            description: bleedFlag
                        });
                    }
                }
            } else {
                globalInvoiceMap.set(invoiceNum, entity);
            }
        });

        return flags;
    }
}
