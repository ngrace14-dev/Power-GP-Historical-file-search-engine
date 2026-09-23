/**
 * RREDCO Accounting Intelligence Platform
 * AI Governance & Forensic Safeguards Engine - Charter v6.0
 * 
 * Enforces non-negotiable rules for AI reasoning, entity isolation,
 * relationship tier classification, source precedence, and evidence integrity.
 */

export class AIGovernanceEngine {
    static CHARTER_VERSION = "6.0";

    // Managed Corporate Entity Domains
    static MANAGED_ENTITIES = new Set([
        'POMCO', 'RRCLLC', 'RRCSCO', 'RRDLLC', 'RREDCO', 'RRELLC', 
        'RREVMCO', 'RRH2ECO', 'RRICO', 'RRKOLLC', 'RRSDLLC', 'RRSDRBLLC', 
        'RRUCO', 'WRGCC', 'WRHCO', 'WRMM', 'RR-KR3 JV'
    ]);

    // Source Trust Hierarchy Authority (1 = Highest Authority)
    static TRUST_HIERARCHY = {
        LEVEL_1_NATIVE_SYSTEM: 1,  // Dynamics GP Export, Bank DB
        LEVEL_2_SOURCE_DOC: 2,     // Original e-Invoice / File
        LEVEL_3_SOURCE_PDF: 3,     // PDF Document Scan
        LEVEL_4_OCR_EXTRACTION: 4, // Raw OCR Text Payload
        LEVEL_5_AI_INTERPRETATION: 5 // Gemini / LLM Reasoning
    };

    /**
     * Rule 1: Precedence & Shortcut Refusal Check
     * Blocks user prompts attempting to bypass source evidence or entity constraints.
     */
    static validatePrompt(userPrompt = "") {
        const lower = userPrompt.toLowerCase();
        const prohibitedShortcuts = [
            'skip sources', 
            'just give bottom line', 
            'no evidence', 
            'ignore variances', 
            'ignore entity',
            'merge entities',
            'make up data'
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
     * Rule 3: Source Trust Hierarchy Enforcement
     * Guarantees lower-trust sources NEVER override higher-trust sources.
     */
    static validateTrustOverride(existingTrustLevel = 5, incomingTrustLevel = 5) {
        if (incomingTrustLevel > existingTrustLevel) {
            return {
                canOverride: false,
                reason: `Governance Violation (Rule 3): Trust Level ${incomingTrustLevel} (lower authority) cannot override Trust Level ${existingTrustLevel} (higher authority) source evidence.`
            };
        }
        return { canOverride: true };
    }

    /**
     * Rule 4 & Forensic Integrity Rule: Tiered Relationship Classification
     * Prevents over-linking by strictly requiring Tier 1/2 criteria (Score >= 80) for Evidence Graph edges.
     */
    static classifyRelationshipTier(score = 0, matchFactors = {}) {
        const { hasExactInvoice, hasExactVoucher, hasExactCheck, hasExactDeposit, hasVendor, hasAmount } = matchFactors;

        // Tier 1: Evidence Relationship (Score 90-100) - Exact Primary Identifiers
        if (score >= 90 || hasExactInvoice || hasExactVoucher || hasExactCheck || hasExactDeposit) {
            return {
                tier: 1,
                label: "Evidence Relationship",
                canCreateGraphEdge: true, // Rendered in Evidence Graph
                weight: Math.max(score, 90),
                confidence: "Very High",
                action: "LINK_EVIDENCE_EDGE"
            };
        }

        // Tier 2: Corroborating Relationship (Score 70-89) - Compound Identifiers
        if (score >= 70 || (hasVendor && hasAmount)) {
            return {
                tier: 2,
                label: "Corroborating Relationship",
                canCreateGraphEdge: true, // Rendered in Evidence Graph
                weight: score,
                confidence: "High",
                action: "LINK_CORROBORATING_EDGE"
            };
        }

        // Tier 3: Associative Relationship (Score 30-69) - Operational Context
        if (score >= 30) {
            return {
                tier: 3,
                label: "Associative Relationship",
                canCreateGraphEdge: false, // STORED AS CONTEXT ONLY, NOT EVIDENCE EDGE
                weight: score,
                confidence: "Moderate",
                action: "STORE_CONTEXT_ONLY"
            };
        }

        // Tier 4: Contextual Relationship (Score < 30) - Classification Matches Only (Entity, GL, Date)
        return {
            tier: 4,
            label: "Contextual Relationship",
            canCreateGraphEdge: false, // PROHIBITED FROM BECOMING GRAPH EDGES
            weight: 15,
            confidence: "Low",
            action: "FILTER_ONLY"
        };
    }

    /**
     * Rule 6: Entity Preservation Enforcement
     * Guarantees entities are treated as isolated evidence domains.
     */
    static enforceEntityIsolation(sourceEntity = "", targetEntity = "", hasIntercompanyProof = false) {
        if (!sourceEntity || !targetEntity) return true;
        const src = sourceEntity.toUpperCase().trim();
        const tgt = targetEntity.toUpperCase().trim();

        if (src !== tgt && !hasIntercompanyProof) {
            throw new Error(`Governance Violation (Rule 6): Entities '${src}' and '${tgt}' represent isolated evidence domains. Cross-entity merging or linking is strictly prohibited without independently verifiable intercompany proof.`);
        }
        return true;
    }

    /**
     * Rule 8: Anti-Suppression Verification
     * Ensures contradictory or unresolved evidence is preserved alongside supporting data.
     */
    static formatTriEvidencePayload(records = []) {
        const supporting = [];
        const contradicting = [];
        const unresolved = [];

        records.forEach(rec => {
            const state = rec._evidenceState?.status || rec.state || 'Unresolved';
            const hasVariance = rec._validation?.tieOutStatus === 'FAIL' || rec._materiality?.isMaterial;

            if (hasVariance || state === 'Unresolved') {
                contradicting.push(rec);
            } else if (state === 'Accepted') {
                supporting.push(rec);
            } else {
                unresolved.push(rec);
            }
        });

        return {
            supportingEvidence: supporting,
            contradictingEvidence: contradicting,
            unresolvedEvidence: unresolved,
            totalAuditCount: records.length,
            isAntiSuppressionCompliant: true
        };
    }

    /**
     * Rule 3 & 9: Wraps Gemini / LLM Prompts in Governance System Directives
     */
    static constructSystemPrompt(userQuery = "", entityDomain = "SINGLE_ENTITY_DOMAIN") {
        const promptCheck = this.validatePrompt(userQuery);
        if (!promptCheck.allowed) {
            throw new Error(promptCheck.reason);
        }

        return `
[SYSTEM GOVERNANCE CHARTER V6.0 ACTIVE]
Subsystem: RREDCO Forensic Intelligence Platform
Active Entity Boundary: ${entityDomain.toUpperCase()}

MANDATORY EXECUTION CONSTRAINTS:
1. PRIME DIRECTIVE: Every statement or conclusion MUST be reconstructed backwards to the provided Level 1-4 source records. Never fabricate facts.
2. PRESERVE UNCERTAINTY: If source evidence is incomplete or ambiguous, explicitly state that evidence is insufficient. Do NOT manufacture certainty.
3. AI EVIDENCE RULE: Your output is classified strictly as 'AI Interpretation' (Level 5 Trust). You may explain, compare, and summarize evidence, but you cannot establish unbacked facts or final accounting opinions.
4. ENTITY ISOLATION: Treat '${entityDomain.toUpperCase()}' as an isolated evidence domain. Do not merge or attribute transactions to other corporate entities without explicit intercompany documentation.
5. ANTI-SUPPRESSION: You MUST highlight all material variances, out-of-balance cross-footings, and contradictory evidence. Never suppress negative findings.

AUDIT SCOPE QUERY:
"${userQuery}"
        `.trim();
    }
}
