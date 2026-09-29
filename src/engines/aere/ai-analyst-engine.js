/**
 * RREDCO Accounting Intelligence Platform
 * AI Forensic Analyst Engine - Phase 3.0 Implementation
 * 
 * Purpose: Provide Level 5 AI Interpretation of reconstructed AccountingEvents.
 * Governance: AI MUST NOT perform math, change classifications, or alter statuses.
 */

import { GeminiService } from '../../../gemini-service.js';
import { AIGovernanceEngine } from '../../../ai-governance.js';

export class AiAnalystEngine {
    /**
     * Analyzes an AccountingEvent and generates a forensic interpretation
     * @param {AccountingEvent} event - The reconstructed event to analyze
     * @returns {Promise<Object>} AI Analyst Opinion
     */
    static async analyzeEvent(event) {
        const gemini = new GeminiService();
        
        // Construct the payload for the AI
        const eventData = {
            eventId: event.eventId,
            eventIntent: event.eventIntent,
            status: event.finalEconomicState.status,
            narrative: event.eventNarrative,
            metrics: {
                grossActivity: event.grossActivity,
                netEconomicImpact: event.netEconomicImpact,
                lineCount: event.lineCount,
                varianceContribution: event.varianceAnalysis.contributionAmount
            },
            anchor: event.anchor,
            nodes: event.nodes.map(n => ({
                role: n.lifecycleRole,
                amount: n.amount,
                date: (n.data || n).transactionDate || (n.data || n).doc_date,
                voucher: (n.data || n).voucherNumber || (n.data || n).voucher,
                reference: (n.data || n).Reference || (n.data || n).referenceNumber || ''
            })),
            timelineSummary: event.eventNarrative,
            entity: event.anchor.entityContext
        };

        const prompt = this.constructAnalystPrompt(eventData);
        
        try {
            const analysis = await gemini.queryAnalyst(prompt, eventData);
            return analysis;
        } catch (err) {
            console.error("AI Analyst Error:", err);
            return {
                interpretation: "Analysis temporarily unavailable.",
                confidence: "N/A",
                recommendedNextStep: "Review manual ledger entries for this document.",
                hypotheses: [],
                warnings: []
            };
        }
    }

    /**
     * Constructs the specific analyst prompt following Phase 3.0 rules
     */
    static constructAnalystPrompt(eventData) {
        return `
[AI FORENSIC ANALYST ROLE - CHARTER V6.0]
You are an AI Forensic Analyst interpreting a reconstructed AccountingEvent.

HARD RESTRICTIONS:
1. DO NOT recalculate balances.
2. DO NOT change classifications.
3. DO NOT change statuses.
4. DO NOT override math.
5. ACT ONLY AS INTERPRETER.

EVENT DATA:
- ID: ${eventData.eventId}
- Intent: ${eventData.eventIntent}
- Status: ${eventData.status}
- Narrative: ${eventData.narrative}
- Entity: ${eventData.entity}
- Metrics: Gross $${eventData.metrics.grossActivity}, Net $${eventData.metrics.netEconomicImpact}, Lines: ${eventData.metrics.lineCount}
- Anchor: ${eventData.anchor.vendorName} (Doc: ${eventData.anchor.docNumber})

YOUR RESPONSIBILITIES:
1. INTERPRETATION: What is the most likely accounting explanation? (e.g., month-end recon, intercompany allocation, partial extraction).
2. AUDITOR GUIDANCE: Why should an auditor care?
3. HYPOTHESIS GENERATION: List possible explanations ranked by confidence (High, Medium, Low).
4. CONTRADICTION DETECTION: Compare status, metrics, narrative, and timeline. Flag internal consistency warnings if found.
5. INVESTIGATION RECOMMENDATIONS: Specific next steps (bullet points).

RESPONSE FORMAT (JSON):
{
  "interpretation": "...",
  "auditorGuidance": "...",
  "confidence": "High/Medium/Low",
  "hypotheses": [{"explanation": "...", "confidence": "..."}],
  "warnings": ["..."],
  "recommendations": ["..."]
}
        `.trim();
    }
}
