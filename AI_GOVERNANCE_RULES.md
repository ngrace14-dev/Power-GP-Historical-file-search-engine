/**
 * RREDCO Accounting Intelligence Platform
 * AI Governance & Forensic Safeguards Engine - Charter v6.0
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
     * Relationship Transparency Rule Enforcement
     */
    static validateRelationshipTransparency(edge = {}) {
        const { tier, score, reasons, timestamp } = edge;
        if (!tier || score === undefined || !Array.isArray(reasons) || reasons.length === 0 || !timestamp) {
            throw new Error("Governance Violation (Relationship Transparency Rule): Relationship edge is missing required transparency metadata (Tier, Score, Reasons, or Timestamp). Cannot be treated as evidence.");
        }
        return true;
    }

    /**
     * Prompt Shortcut Refusal Check
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

    /**
     * Tri-Evidence Anti-Suppression Logger
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
     * Wraps Gemini / LLM Prompts in Governance System Directives
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
