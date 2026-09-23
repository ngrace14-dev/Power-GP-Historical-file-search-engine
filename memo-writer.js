/**
 * Memo Writer Engine - Phase 6 (Governance v6.0 Compliant)
 * Generates evidence-derived, non-opinionated accounting audit memorandums.
 * Compiles case facts, corroboration scores, ASC/GASB citations, and contradiction flags
 * strictly from traceable Level 1-4 source records.
 */

import { AIGovernanceEngine } from './ai-governance.js';

export class MemoWriter {

    /**
     * Formats structured record payloads into a governed audit memo data object
     */
    static generateMemoPayload(records = [], scopeTitle = "Forensic Audit Evidence Memorandum") {
        const triEvidence = AIGovernanceEngine.formatTriEvidencePayload(records);
        
        const facts = records.map(r => {
            const data = r.data || r;
            return {
                id: r._id,
                entity: r._provenance?.entityContext || r._location || 'UNKNOWN',
                vendor: data.vendor || data.vendor_name || data['Originating Master Name'] || 'Unknown Vendor',
                invoice: data.invoiceNumber || data.doc_number || data['Invoice Number'] || '-',
                voucher: data.voucherNumber || data.voucher || data['Journal Entry'] || '-',
                amount: parseFloat(data.amount || data.doc_amount || data['Debit Amount'] || data['Credit Amount'] || 0),
                date: data.transactionDate || data.doc_date || data['TRX Date'] || '-',
                authority: r._authority?.primaryCitation || 'ASC 205',
                authorityTopic: r._authority?.topic || 'General Ledger Accounting',
                riskScore: r._risk?.riskScore || 0,
                riskClass: r._risk?.riskClass || 'LOW',
                corroborationLevel: r._corroboration?.corroborationLevel || 'A',
                corroborationStatus: r._corroboration?.corroborationStatus || 'Detected',
                sourceCount: r._corroboration?.sourceCount || 1,
                contradictions: (r._contradictions?.flags || []).map(f => f.description)
            };
        });

        return {
            title: scopeTitle,
            generatedAt: new Date().toISOString(),
            dateFormatted: new Date().toLocaleDateString(),
            totalRecordsAnalyzed: records.length,
            supportingCount: triEvidence.supportingEvidence.length,
            contradictingCount: triEvidence.contradictingEvidence.length,
            unresolvedCount: triEvidence.unresolvedEvidence.length,
            evidenceSummary: facts
        };
    }

    /**
     * Constructs a system prompt for Gemini LLM to draft a structured Markdown memo
     */
    static constructMemoPrompt(payload) {
        return `
[GOVERNANCE CHARTER V6.0 - FORENSIC AUDIT MEMORANDUM GENERATOR]

Generate a formal, evidence-derived Accounting Audit Memorandum based STRICTLY on the structured facts below.

MANDATORY GOVERNANCE & FORMATTING CONSTRAINTS:
1. ABSOLUTE PROHIBITION ON OPINIONS: Do NOT generate accounting opinions, legal judgments, or management decisions.
2. TRACEABILITY REQUIREMENT: Every statement must cite underlying Invoice #, Voucher #, Entity Code, and Dollar Amount.
3. REQUIRED SECTIONS:
   - Executive Evidence Summary
   - Transaction Scope & Provenance Detail
   - Corroboration & Independent Source Verification Analysis
   - Materiality & Contradiction Findings
   - Governing Accounting Authority Context (ASC / GASB references)
   - Open Audit Questions & Items Requiring Human Review
4. PRESERVE UNCERTAINTY: Highlight unresolved or contradictory line items without attempting to reconcile them artificially.

STRUCTURED EVIDENCE PAYLOAD:
${JSON.stringify(payload, null, 2)}
        `.trim();
    }
}
