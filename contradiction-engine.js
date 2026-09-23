/**
 * Contradiction Engine - Phase 5 (Governance v6.0 Compliant)
 * Identifies, categorizes, and scores forensic dataset contradictions across 4 core domains:
 * 1. Financial Contradiction: Linked records with non-zero amount discrepancies or cross-foot math failures.
 * 2. Temporal Contradiction: Payment or posting dates preceding the invoice or document date.
 * 3. Entity Contradiction: Intercompany leaks where evidence references Entity A but posts to Entity B GL.
 * 4. Documentation Contradiction: Unbacked journal entries or records with zero supporting document edges.
 */

import { AIGovernanceEngine } from './ai-governance.js';

export class ContradictionEngine {

    /**
     * Evaluates a single record for contradiction flags against the full dataset
     */
    static evaluateRecordContradictions(record, allRecords = []) {
        const contradictions = [];
        const data = record.data || record;
        const srcEntity = (record._provenance?.entityContext || record._location || '').toUpperCase();
        
        const docDateStr = data.transactionDate || data.doc_date || data['TRX Date'];
        const docDate = docDateStr && docDateStr !== '-' ? new Date(docDateStr) : null;
        const amount = Math.abs(parseFloat(data.amount || data.doc_amount || data['Debit Amount'] || data['Credit Amount'] || 0));

        // 1. FINANCIAL CONTRADICTIONS
        const val = record._validation || {};
        if (val.tieOutStatus === 'FAIL') {
            contradictions.push({
                type: 'FINANCIAL_MATH_MISMATCH',
                category: 'Financial Contradiction',
                severity: 'CRITICAL',
                targetDocument: data.invoiceNumber || data.doc_number || data['Invoice Number'] || record._id,
                description: `Cross-foot math validation failed with a variance of $${parseFloat(val.variance || 0).toFixed(2)}.`
            });
        }

        const rel = record._relationships || {};
        const validEdges = [...(rel.tier1Edges || []), ...(rel.tier2Edges || [])];

        validEdges.forEach(edge => {
            const targetRec = allRecords.find(r => r._id === edge.targetId);
            if (!targetRec) return;
            const targetData = targetRec.data || targetRec;
            const targetAmt = Math.abs(parseFloat(targetData.amount || targetData.doc_amount || targetData['Debit Amount'] || targetData['Credit Amount'] || 0));

            // Check linked record amount discrepancies
            if (amount > 0 && targetAmt > 0 && Math.abs(amount - targetAmt) > 0.05) {
                contradictions.push({
                    type: 'FINANCIAL_AMOUNT_DISCREPANCY',
                    category: 'Financial Contradiction',
                    severity: 'CRITICAL',
                    targetDocument: targetData.invoiceNumber || targetData.doc_number || targetData['Invoice Number'] || targetRec._id,
                    description: `Linked record amount ($${targetAmt.toFixed(2)}) conflicts with source record amount ($${amount.toFixed(2)}).`
                });
            }

            // 2. TEMPORAL CONTRADICTIONS
            const targetDateStr = targetData.transactionDate || targetData.doc_date || targetData['TRX Date'];
            const targetDate = targetDateStr && targetDateStr !== '-' ? new Date(targetDateStr) : null;

            if (docDate && targetDate && !isNaN(docDate) && !isNaN(targetDate)) {
                // If payment/posting date is earlier than invoice issuing date by > 1 day
                if (targetDate < docDate && (docDate - targetDate) > (1000 * 60 * 60 * 24)) {
                    contradictions.push({
                        type: 'TEMPORAL_SEQUENCE_ANOMALY',
                        category: 'Temporal Contradiction',
                        severity: 'SIGNIFICANT',
                        targetDocument: targetData.invoiceNumber || targetData.doc_number || targetData['Invoice Number'] || targetRec._id,
                        description: `Posting/Payment date (${targetDate.toLocaleDateString()}) precedes underlying Invoice date (${docDate.toLocaleDateString()}).`
                    });
                }
            }

            // 3. ENTITY CONTRADICTIONS (Boundary Leaks)
            const tgtEntity = (targetRec._provenance?.entityContext || targetRec._location || '').toUpperCase();
            if (srcEntity !== '' && tgtEntity !== '' && srcEntity !== tgtEntity) {
                contradictions.push({
                    type: 'ENTITY_BOUNDARY_LEAK',
                    category: 'Entity Contradiction',
                    severity: 'CRITICAL',
                    targetDocument: targetData.invoiceNumber || targetData.doc_number || targetData['Invoice Number'] || targetRec._id,
                    description: `Transaction boundary leak detected: Evidence originating in Entity ${srcEntity} was posted into Entity ${tgtEntity} without intercompany authorization.`
                });
            }
        });

        // 4. DOCUMENTATION CONTRADICTIONS (Unbacked Journal Entries)
        const isJournalEntry = String(data.type || data['Account Description'] || '').toLowerCase().includes('general ledger') || 
                               String(data.voucher || data['Journal Entry'] || '').startsWith('JE');

        if (isJournalEntry && validEdges.length === 0 && amount >= 5000) {
            contradictions.push({
                type: 'DOCUMENTATION_MISSING_SUPPORT',
                category: 'Documentation Contradiction',
                severity: 'SIGNIFICANT',
                targetDocument: data.voucher || data['Journal Entry'] || record._id,
                description: `High-value Journal Entry ($${amount.toFixed(2)}) has 0 supporting document edges in the Evidence Graph.`
            });
        }

        return contradictions;
    }

    /**
     * Evaluates a full dataset and appends contradiction metadata
     */
    static analyzeDataset(records = []) {
        if (!Array.isArray(records) || records.length === 0) {
            return [];
        }

        const allDatasetFlags = [];

        records.forEach(rec => {
            const contradictions = this.evaluateRecordContradictions(rec, records);
            rec._contradictions = {
                hasContradictions: contradictions.length > 0,
                count: contradictions.length,
                flags: contradictions
            };

            contradictions.forEach(flag => {
                allDatasetFlags.push({
                    ...flag,
                    sourceRecordId: rec._id,
                    sourceEntity: rec._provenance?.entityContext || rec._location || 'UNKNOWN'
                });
            });
        });

        return allDatasetFlags;
    }
}
