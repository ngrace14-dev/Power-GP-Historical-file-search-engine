// modules/gemini-service.js

/**
 * AI Financial Reasoning Engine (Gemini Service)
 * Phase 7 Roadmap Requirement & System Governance Charter v5.0
 * Provides multi-document evidence synthesis, automated variance explanations,
 * and natural language accounting queries grounded in cited provenance.
 */

export class GeminiService {

    /**
     * Initializes the Gemini AI reasoning service.
     * @param {String} apiKey - Google Gemini API Key
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    }

    /**
     * System Prompt enforcing Governance Charter v5.0 compliance.
     */
    static #getGovernanceSystemPrompt() {
        return `You are an expert Forensic Accounting & Audit Reasoning AI operating under RREDCO System Governance Charter v5.0.
Your task is to analyze financial evidence, journal entries, vendor records, and variances.

STRICT GOVERNANCE RULES:
1. Every assertion or finding MUST explicitly cite the supporting evidence source file, row ID/invoice number, and trust level.
2. Respect Entity Isolation: Never blend financial facts between different corporate entities unless evaluating an explicit cross-entity contradiction.
3. Do NOT hallucinate figures, dates, or accounts. If evidence is missing or inconclusive, explicitly state that the evidence is incomplete.
4. Structure your response clearly using markdown formatting:
   - **Executive Summary**
   - **Evidence Synthesis & Provenance Citations**
   - **Accounting Risk & Variance Analysis**
   - **Auditor Recommendations**`;
    }

    /**
     * Executes a natural language query over a set of staged financial evidence records.
     * @param {String} query - User audit prompt
     * @param {Array} records - Staged IndexedDB evidence records
     * @param {String} entityContext - Corporate entity boundary (e.g. POMCO, RREDCO)
     * @returns {Promise<String>} AI reasoning response with source citations
     */
    async queryEvidence(query, records = [], entityContext = 'UNKNOWN') {
        if (!this.apiKey) {
            throw new Error("Governance Error: Gemini API key is required to execute AI reasoning.");
        }

        // Rule 4 Enforcement: Filter records by active entity context before sending to AI
        const isolatedRecords = records.filter(r => {
            const entity = r._location || r._provenance?.entityContext;
            return !entityContext || entityContext === 'ALL' || entity === entityContext;
        }).slice(0, 100); // Cap context window payload for low latency

        const evidencePayload = isolatedRecords.map(r => ({
            recordId: r._id,
            entity: r._location || r._provenance?.entityContext,
            sourceFile: r._sourceFile || r._provenance?.sourceFile,
            trustLevel: r._trustLevel || r._provenance?.trustLevel,
            evidenceState: r._state || r._evidenceState?.status,
            vendor: r['Originating Master Name'] || r.data?.vendor,
            invoiceNumber: r['Invoice Number'] || r.data?.invoiceNumber,
            voucher: r['Journal Entry'] || r.data?.voucherNumber,
            amount: r['Debit Amount'] || r['Credit Amount'] || r.data?.amount,
            date: r['TRX Date'] || r.data?.transactionDate,
            description: r['Description'] || r.data?.description,
            validation: r._validation
        }));

        const prompt = `
${GeminiService.#getGovernanceSystemPrompt()}

ACTIVE ENTITY BOUNDARY: ${entityContext}
USER AUDIT QUERY: "${query}"

EVIDENCE DATASET (${evidencePayload.length} records in context):
${JSON.stringify(evidencePayload, null, 2)}
`;

        return await this.#callGeminiApi(prompt);
    }

    /**
     * Generates an automated variance analysis for a specific financial anomaly.
     * @param {Object} record - Anomaly record flagged by Validation or Contradiction Engine
     * @returns {Promise<String>} Variance explanation report
     */
    async analyzeVariance(record) {
        if (!this.apiKey) {
            throw new Error("Governance Error: Gemini API key is required for variance analysis.");
        }

        const rData = record.data || record;
        const prov = record._provenance || {};

        const prompt = `
${GeminiService.#getGovernanceSystemPrompt()}

TASK: Perform an automated variance analysis and root-cause audit report for the following flagged anomaly.

RECORD METADATA:
- Entity Context: ${record._location || prov.entityContext || 'UNKNOWN'}
- Source File: ${record._sourceFile || prov.sourceFile || 'Local Upload'}
- Trust Level: ${record._trustLevel || prov.trustLevel || 'Level 1'}
- Document #: ${rData['Invoice Number'] || rData.invoiceNumber || '-'}
- Vendor/Master: ${rData['Originating Master Name'] || rData.vendor || '-'}
- Amount: $${rData['Debit Amount'] || rData.amount || 0}
- Validation Details: ${JSON.stringify(record._validation || {})}

Provide a concise, 3-paragraph root cause analysis explaining why this variance occurred and detailing specific step-by-step procedures an auditor should perform to resolve it.
`;

        return await this.#callGeminiApi(prompt);
    }

    /**
     * Internal API call handler
     */
    async #callGeminiApi(prompt) {
        const endpoint = `${this.baseUrl}?key=${this.apiKey}`;
        const requestBody = {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.2, // Low temperature for factual audit consistency
                maxOutputTokens: 1024
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Gemini API Error: ${err.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "No AI reasoning returned.";
        } catch (error) {
            console.error("Gemini Reasoning Engine Failure:", error);
            throw new Error(`AI Financial Reasoning Engine error: ${error.message}`);
        }
    }
}
