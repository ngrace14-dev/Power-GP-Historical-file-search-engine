/**
 * Chief Forensic Reasoning Engine - Phase 6.1
 * Coordinating Reasoning Layer (PRO 3 Reasoning Model)
 * 
 * Objectives:
 * - Resolve conflicts between specialized engine outputs.
 * - Identify cross-engine consensus.
 * - Establish evidence hierarchy.
 * - Transform engine outputs into coordinated forensic reasoning.
 */

import { GeminiService } from './gemini-service.js';
import { AIGovernanceEngine } from './ai-governance.js';

export class ChiefForensicReasoner {

    /**
     * Executes the PRO 3 Reasoning Layer on a synthesis payload.
     * @param {Object} synthesis - The output from ForensicNarrativeEngine.
     * @param {Object} context - Investigative context.
     */
    static async reason(synthesis, context = {}) {
        if (!synthesis) return null;

        const gemini = new GeminiService();
        const prompt = this.constructReasoningPrompt(synthesis, context);

        try {
            // Citing PRO 3 Reasoning Model implementation via GeminiService
            const reasoningOutput = await gemini.queryEvidence(prompt, [], context.entityContext || 'GLOBAL');
            return this.formatReasoningOutput(reasoningOutput, synthesis);
        } catch (err) {
            console.error("Chief Reasoning Error:", err);
            return this.generateFallbackReasoning(synthesis);
        }
    }

    /**
     * Constructs the chief reasoning prompt.
     */
    static constructReasoningPrompt(synthesis, context) {
        return `
[PRO 3 CHIEF FORENSIC REASONER - CHARTER V6.1]
You are the coordinating reasoning layer for the Lighthouse Forensic Platform.

REASONING CONSTRAINTS:
1. DO NOT access raw ledger data.
2. DO NOT replace engine conclusions.
3. DO NOT invent evidence.
4. RESOLVE conflicts between engine outputs.
5. IDENTIFY consensus across engines.

ENGINE OUTPUTS TO ANALYZE:
${JSON.stringify(synthesis.enginePerspectives, null, 2)}

EXECUTIVE CONTEXT:
${JSON.stringify(synthesis.executiveSummary, null, 2)}

REQUIRED SECTIONS:
1. EXECUTIVE HEADLINE: Single high-fidelity synthesis of state.
2. KNOWN FACTS: Conclusions supported by 2+ specialized engines.
3. SUPPORTED INTERPRETATIONS: Evidence-backed but not proven.
4. OPEN QUESTIONS: Unresolved items requiring additional evidence.
5. ENGINE CONFLICTS: Contradictory conclusions between engines.
6. PRIORITY INVESTIGATIONS: Ranked by evidence strength and impact.
7. RECOMMENDED NEXT ACTION: Single highest-value forensic step.

GOVERNANCE:
- Explaining significance is MANDATORY.
- Prioritizing investigations is MANDATORY.
- Inferring fraud or motive is STRICTLY FORBIDDEN.
        `.trim();
    }

    /**
     * Formats the reasoning output for UI consumption.
     */
    static formatReasoningOutput(reasoning, synthesis) {
        // If reasoning is a string, we might need to parse or structure it.
        // For Phase 6.1, we assume a structured Markdown or JSON response from Gemini.
        return {
            timestamp: new Date().toISOString(),
            reasoningBody: reasoning,
            synthesisMetadata: synthesis.metadata
        };
    }

    /**
     * Fallback reasoning logic for offline/error states.
     */
    static generateFallbackReasoning(synthesis) {
        return {
            timestamp: new Date().toISOString(),
            reasoningBody: `### CHIEF REASONER FALLBACK\nConsensus identified for ${synthesis.executiveSummary.headline}. Review Engine Perspectives for detailed breakdown.`,
            synthesisMetadata: synthesis.metadata
        };
    }
}
