/**
 * RREDCO Accounting Intelligence Platform
 * AI Governance & Forensic Safeguards Engine - Charter v6.0
 * 
 * Enforces non-negotiable rules for AI reasoning, entity isolation,
 * relationship tier classification, source precedence, and relationship transparency.
 */

export class AIGovernanceEngine {
    static CHARTER_VERSION = "6.0";

    static MANAGED_ENTITIES = new Set([
        'POMCO', 'RRCLLC', 'RRCSCO', 'RRDLLC', 'RREDCO', 'RRELLC', 
        'RREVMCO', 'RRH2ECO', 'RRICO', 'RRKOLLC', 'RRSDLLC', 'RRSDRBLLC', 
        'RRUCO', 'WRGCC', 'WRHCO', 'WRMM', 'RR-KR3 JV'
    ]);

    static TRUST_HIERARCHY = {
        LEVEL_1_NATIVE_SYSTEM: 1,  // Dynamics GP Export, Bank DB
        LEVEL_2_SOURCE_DOC: 2,     // Original e-Invoice / File
        LEVEL_3_SOURCE_PDF: 3,     // PDF Document Scan
        LEVEL_4_OCR_EXTRACTION: 4, // Raw OCR Text Payload
        LEVEL_5_AI_INTERPRETATION: 5 // Gemini / LLM Reasoning
    };

    /**
     * Relationship Transparency Rule:
     * Every relationship created by the platform must be explainable.
     * The platform shall record: Tier, Score, Matching Factors, Supporting Fields, and Timestamp.
     */
    static validatePrompt(userPrompt = "") {
        const lower = userPrompt.toLowerCase();
        const prohibitedShortcuts = [
            'skip sources', 'just give bottom line', 'no evidence', 
            'ignore variances', 'ignore entity', 'merge entities', 'make up data'
        ];

        for (const phrase of prohibitedShortcuts) {
            if (lower.includes(phrase)) {
                return {
                    allowed: false,
                    reason: `Governance Violation (Rule 1): Refusal to execute prompt. Supporting verifiable evidence is strictly required by Governance Charter v${this.CHARTER_VERSION}. Cannot bypass source checks.`
                };
            }
        }
        return { allowed: true };
    }

    /**
     * Materiality Classification Rule
     */
    static classifyMateriality(amount = 0, variance = 0, threshold = 1000) {
        const absVar = Math.abs(parseFloat(variance) || 0);
        const absAmt = Math.abs(parseFloat(amount) || 0);

        if (absVar >= 5000) {
            return { level: 'CRITICAL', label: 'Critical Discrepancy', isMaterial: true };
        }
        if (absVar >= threshold) {
            return { level: 'SIGNIFICANT', label: 'Significant Discrepancy', isMaterial: true };
        }
        if (absVar > 0) {
            return { level: 'MODERATE', label: 'Moderate Discrepancy', isMaterial: false };
        }
        if (absAmt >= 25000) {
            return { level: 'HIGH_SCOPE', label: 'High Scope Exposure', isMaterial: false };
        }
        return { level: 'IMMATERIAL', label: 'Immaterial', isMaterial: false };
    }

    /**
     * Tier Classification with Tightened 3-Dimensional Corroboration & Explanation Array
     */
    static classifyRelationshipTier(matchFactors = {}) {
        const { 
            hasExactInvoice, hasExactVoucher, hasExactCheck, hasExactDeposit, 
            hasVendor, hasAmount, hasDate, hasAccount 
        } = matchFactors;

        const reasons = [];

        // Tier 1: Evidence Relationship (Exact Primary Transaction Identifiers)
        if (hasExactInvoice) reasons.push("Exact Invoice Number Match");
        if (hasExactVoucher) reasons.push("Exact Journal Entry / Voucher Match");
        if (hasExactCheck) reasons.push("Exact Check Number Match");
        if (hasExactDeposit) reasons.push("Exact Deposit Identifier Match");

        if (reasons.length > 0) {
            return {
                tier: 1,
                label: "Evidence Relationship",
                canCreateGraphEdge: true,
                score: 95,
                confidence: "Very High",
                reasons
            };
        }

        // Tier 2: Corroborating Relationship (Requires 3 Dimensions: Vendor + Amount + Date/Invoice/Voucher)
        const has3DMatch = hasVendor && hasAmount && (hasDate || hasExactInvoice || hasExactVoucher);
        if (has3DMatch) {
            if (hasVendor) reasons.push("Vendor Name Match");
            if (hasAmount) reasons.push("Exact Dollar Amount Match");
            if (hasDate) reasons.push("Transaction Date Match");

            return {
                tier: 2,
                label: "Corroborating Relationship",
                canCreateGraphEdge: true,
                score: 80,
                confidence: "High",
                reasons
            };
        }

        // Tier 3: Associative Relationship (Operational Context Only - Vendor or Contract Only)
        if (hasVendor) {
            return {
                tier: 3,
                label: "Associative Relationship",
                canCreateGraphEdge: false, // STORED AS CONTEXT ONLY, NOT EVIDENCE EDGE
                score: 45,
                confidence: "Moderate",
                reasons: ["Shared Vendor Operational Context"]
            };
        }

        // Tier 4: Contextual Relationship (Classification Only - GL Account / Entity / Period)
        if (hasAccount) reasons.push("Shared GL Account Code");

        return {
            tier: 4,
            label: "Contextual Relationship",
            canCreateGraphEdge: false, // CAN NEVER BE DRAWN AS EVIDENCE EDGE
            score: 15,
            confidence: "Low",
            reasons: reasons.length > 0 ? reasons : ["Shared Reporting Period / Domain"]
        };
    }

    /**
     * Entity Preservation Enforcement
     */
    static enforceEntityIsolation(sourceEntity = "", targetEntity = "", hasIntercompanyProof = false) {
        if (!sourceEntity || !targetEntity) return true;
        const src = sourceEntity.toUpperCase().trim();
        const tgt = targetEntity.toUpperCase().trim();

        if (src !== tgt && !hasIntercompanyProof) {
            throw new Error(`Governance Violation (Rule 6): Entities '${src}' and '${tgt}' represent isolated evidence domains. Cross-entity merging is strictly prohibited without independently verifiable intercompany proof.`);
        }
        return true;
    }
}
