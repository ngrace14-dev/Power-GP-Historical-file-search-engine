// modules/gemini-service.js

/**
 * AI Financial Reasoning Engine (Gemini Service)
 * Phase 7 Roadmap Requirement & System Governance Charter v5.0
 * Routes natural language accounting queries securely through Firebase Cloud Functions.
 */

export class GeminiService {
    constructor() {
        // Pointing directly to your deployed Firebase Function
        this.cloudFunctionUrl = "https://askgemini-4pcpoe2u2a-uc.a.run.app";
    }

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

    async queryEvidence(query, records = [], entityContext = 'UNKNOWN') {
        const isolatedRecords = records.filter(r => {
            const entity = r._location || r._provenance?.entityContext;
            return !entityContext || entityContext === 'ALL' || entity === entityContext;
        }).slice(0, 100);

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
        return await this.#callCloudFunction(prompt);
    }

    async #callCloudFunction(prompt) {
        try {
            const response = await fetch(this.cloudFunctionUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Cloud Function Error: ${err.error || response.statusText}`);
            }

            const data = await response.json();
            return data.result || "No AI reasoning returned.";
        } catch (error) {
            console.error("Gemini Reasoning Engine Failure:", error);
            throw new Error(`AI Financial Reasoning Engine error: ${error.message}`);
        }
    }
}
