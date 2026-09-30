/**
 * Role-Based Intelligence Engine - Phase 6.2
 * Generates specialized intelligence briefs for different stakeholders.
 * 
 * Agents:
 * - Controller Transition (Inheritance)
 * - Audit Planning (Prioritization)
 * - Acquisition Due Diligence (Hidden Complexity)
 * - Executive Briefing (Significance)
 */

import { GeminiService } from './gemini-service.js';

export class RoleIntelligenceEngine {

    static ROLES = {
        CONTROLLER: 'CONTROLLER_TRANSITION',
        AUDITOR: 'AUDIT_PLANNING',
        M_AND_A: 'ACQUISITION_DUE_DILIGENCE',
        EXECUTIVE: 'EXECUTIVE_BRIEFING'
    };

    /**
     * Generates a role-specific brief using the synthesis and reasoning context.
     * @param {string} role - One of RoleIntelligenceEngine.ROLES.
     * @param {Object} synthesis - Output from ForensicNarrativeEngine.
     * @param {Object} reasoning - Output from ChiefForensicReasoner.
     */
    static async generateBrief(role, synthesis, reasoning) {
        if (!synthesis || !reasoning) return null;

        const gemini = new GeminiService();
        const prompt = this.constructRolePrompt(role, synthesis, reasoning);

        try {
            // Using Gemini to synthesize the final role-based brief
            const brief = await gemini.queryEvidence(prompt, [], 'GLOBAL');
            return brief;
        } catch (err) {
            console.error(`Role Intelligence Error (${role}):`, err);
            return `Error generating ${role.replace('_', ' ')} brief.`;
        }
    }

    /**
     * Constructs the prompt for the specific intelligence agent.
     */
    static constructRolePrompt(role, synthesis, reasoning) {
        let roleInstructions = '';

        switch (role) {
            case this.ROLES.CONTROLLER:
                roleInstructions = `
[ROLE: CONTROLLER TRANSITION AGENT]
QUESTION: "What did I inherit?"
FOCUS:
- Primary Dependencies & Risks.
- Accounting Debt Sources.
- Dominant Behaviors.
- Top Investigations.
                `;
                break;
            case this.ROLES.AUDITOR:
                roleInstructions = `
[ROLE: AUDIT PLANNING AGENT]
QUESTION: "What deserves attention?"
FOCUS:
- High-Risk Populations.
- High-Debt Areas.
- Intercompany Hotspots.
- Testing Recommendations.
                `;
                break;
            case this.ROLES.M_AND_A:
                roleInstructions = `
[ROLE: ACQUISITION DUE DILIGENCE AGENT]
QUESTION: "What operational complexity is hidden?"
FOCUS:
- Environment Fingerprint & Signature.
- Debt & Dependency Metrics.
- Unusual Behaviors.
- Latent Risk Areas.
                `;
                break;
            case this.ROLES.EXECUTIVE:
                roleInstructions = `
[ROLE: EXECUTIVE BRIEFING AGENT]
QUESTION: "What matters?"
FOCUS:
- 10-Bullet Executive Summary.
- Major Dependencies & Risks.
- Major Operational Characteristics.
                `;
                break;
        }

        return `
${roleInstructions}

[CONTEXT: CHIEF REASONER OUTPUT]
${reasoning.reasoningBody}

[CONTEXT: SYNTHESIS SUMMARY]
${JSON.stringify(synthesis.executiveSummary, null, 2)}

[GOVERNANCE CONSTRAINTS]
- Reference Known Facts, Supported Interpretations, and Open Questions.
- Synthesize and prioritize.
- DO NOT invent evidence.
- DO NOT infer fraud or motive.
        `.trim();
    }
}
