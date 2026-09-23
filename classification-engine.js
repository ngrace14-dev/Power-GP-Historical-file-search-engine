// modules/classification-engine.js

/**
 * Document Classification Engine
 * Phase 2 Roadmap Requirement
 * Automatically identifies financial document types before extraction.
 */

export const DOCUMENT_TYPES = Object.freeze({
    GL_EXPORT: 'General Ledger Export',
    TRIAL_BALANCE: 'Trial Balance',
    INVOICE: 'Invoice',
    VENDOR_STATEMENT: 'Vendor Statement',
    AP_AGING: 'AP Aging',
    AR_AGING: 'AR Aging',
    BANK_REC: 'Bank Reconciliation',
    UNKNOWN: 'Unknown Document'
});

export class ClassificationEngine {
    
    /**
     * Analyzes raw text and filenames to determine the document type.
     * @param {String} rawText - The raw text extracted via OCR or parsing.
     * @param {String} filename - The original filename (optional).
     * @returns {Object} { documentType: String, confidence: Number }
     */
    static classifyDocument(rawText = '', filename = '') {
        const textToAnalyze = (rawText + ' ' + filename).toLowerCase();
        
        // Weighted keyword dictionaries for heuristic scoring
        const profiles = [
            {
                type: DOCUMENT_TYPES.GL_EXPORT,
                keywords: ['general ledger', 'journal entry', 'je number', 'debit', 'credit', 'actnumst', 'jrnentry', 'ytd balance'],
                threshold: 3
            },
            {
                type: DOCUMENT_TYPES.TRIAL_BALANCE,
                keywords: ['trial balance', 'beginning balance', 'ending balance', 'assets', 'liabilities', 'equity', 'ytd debit', 'ytd credit'],
                threshold: 3
            },
            {
                type: DOCUMENT_TYPES.INVOICE,
                keywords: ['invoice number', 'bill to', 'remit to', 'due date', 'subtotal', 'tax', 'freight', 'po number', 'terms'],
                threshold: 3
            },
            {
                type: DOCUMENT_TYPES.VENDOR_STATEMENT,
                keywords: ['statement of account', 'vendor statement', 'amount enclosed', 'statement date', 'payments received', 'balance forward'],
                threshold: 3
            },
            {
                type: DOCUMENT_TYPES.AP_AGING,
                keywords: ['accounts payable aging', 'ap aging', 'payables', 'vendor balance', 'current', '31-60', '61-90', '91 and over'],
                threshold: 3
            },
            {
                type: DOCUMENT_TYPES.AR_AGING,
                keywords: ['accounts receivable aging', 'ar aging', 'receivables', 'customer balance', 'current', '31-60', '61-90', '91 and over'],
                threshold: 3
            },
            {
                type: DOCUMENT_TYPES.BANK_REC,
                keywords: ['bank reconciliation', 'cleared balance', 'uncleared transactions', 'statement ending balance', 'register balance', 'deposits in transit'],
                threshold: 3
            }
        ];

        let bestMatch = { type: DOCUMENT_TYPES.UNKNOWN, score: 0 };

        // Score the document against each profile
        profiles.forEach(profile => {
            let score = 0;
            profile.keywords.forEach(keyword => {
                // Count occurrences of the keyword, cap at 3 per keyword to prevent spam skewing
                const regex = new RegExp(keyword, 'g');
                const matches = (textToAnalyze.match(regex) || []).length;
                score += Math.min(matches, 3); 
            });

            if (score > bestMatch.score) {
                bestMatch = { type: profile.type, score: score, threshold: profile.threshold };
            }
        });

        // Calculate confidence (capped at 0.99 for heuristics)
        if (bestMatch.score >= bestMatch.threshold) {
            let confidence = Math.min(0.99, (bestMatch.score / (bestMatch.threshold * 2.5)));
            return {
                documentType: bestMatch.type,
                confidence: parseFloat(confidence.toFixed(2))
            };
        }

        return { documentType: DOCUMENT_TYPES.UNKNOWN, confidence: 0.0 };
    }
}
