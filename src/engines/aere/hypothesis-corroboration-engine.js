/**
 * Hypothesis Corroboration Engine - Phase 4.0
 * Purpose: Deterministically evaluate AI hypotheses against factual event metadata.
 */

export class HypothesisCorroborationEngine {
    /**
     * Evaluates AI hypotheses for an AccountingEvent
     * @param {AccountingEvent} event - The reconstructed event
     * @param {Object} aiOpinion - The analysis from AiAnalystEngine
     * @returns {Object} Corroboration results for hypotheses
     */
    static corroborate(event, aiOpinion) {
        if (!aiOpinion || !aiOpinion.mostLikely) return null;

        const results = {
            mostLikely: this.evaluateHypothesis(event, aiOpinion.mostLikely),
            alternative: aiOpinion.alternative ? this.evaluateHypothesis(event, aiOpinion.alternative) : null
        };

        return results;
    }

    /**
     * Deterministically tests a hypothesis against event evidence
     */
    static evaluateHypothesis(event, hypothesis) {
        const hText = (hypothesis.explanation || '').toUpperCase();
        const supporting = [];
        const contradicting = [];

        // 1. Intercompany Fragment Test
        if (hText.includes('INTERCOMPANY') || hText.includes('FRAGMENT')) {
            if (event.eventIntent === 'COMPOUND_ENTRY') supporting.push('Intent: COMPOUND_ENTRY');
            if (Math.abs(event.netEconomicImpact) > 0.01) supporting.push('Metric: Unbalanced Net Impact');
            
            const hasDueToFrom = event.nodes.some(n => {
                const desc = ((n.data || n).AccountDescription || '').toUpperCase();
                const num = ((n.data || n).AccountNumber || '').toUpperCase();
                return desc.includes('DUE TO') || desc.includes('DUE FROM') || desc.includes('INTERCOMPANY') || num.startsWith('1250') || num.startsWith('2250');
            });
            if (hasDueToFrom) supporting.push('Account: Intercompany/Due-To Account detected');
            else contradicting.push('Account: No Intercompany/Due-To Account keywords in lines');
        }

        // 2. Settlement Cycle Test
        if (hText.includes('SETTLEMENT') || hText.includes('PAYMENT')) {
            if (event.eventIntent === 'SETTLEMENT_PACKAGE') supporting.push('Intent: SETTLEMENT_PACKAGE');
            if (event.finalEconomicState.status === 'SETTLED') supporting.push('Status: SETTLED');
            
            const sources = event.nodes.map(n => (n.data || n)['Originating TRX Source'] || '');
            if (sources.includes('PMCHK') || sources.includes('PMPAY')) supporting.push('Source: Payment/Check Source (PMCHK/PMPAY)');
        }

        // 3. Controller Adjustment / Back Out Test
        if (hText.includes('CORRECTION') || hText.includes('BACK OUT') || hText.includes('RECLASSIFICATION')) {
            if (event.eventIntent === 'CONTROLLER_ADJUSTMENT') supporting.push('Intent: CONTROLLER_ADJUSTMENT');
            
            const refs = event.nodes.map(n => String((n.data || n).Reference || (n.data || n).referenceNumber || '').toUpperCase());
            if (refs.some(r => r.includes('BACK OUT') || r.includes('RCL') || r.includes('CORRECT'))) supporting.push('Reference: Adjustment keywords detected');
            
            const hasReversal = event.nodes.some(n => n.lifecycleRole === 'REVERSAL');
            if (hasReversal) supporting.push('Timeline: Transaction reversal identified');
        }

        // 4. Fixed Asset / Capitalization Test
        if (hText.includes('FIXED ASSET') || hText.includes('CAPITALIZATION')) {
            if (event.eventIntent === 'CAPITALIZATION_EVENT') supporting.push('Intent: CAPITALIZATION_EVENT');
            
            const accounts = event.nodes.map(n => String((n.data || n).AccountNumber || ''));
            if (accounts.some(a => a.startsWith('1500') || a.startsWith('1600'))) supporting.push('Account: Fixed Asset/CIP Account range (15xx-16xx)');
        }

        // 5. Month-End Reconciliation Test
        if (hText.includes('RECONCILIATION') || hText.includes('MONTH-END')) {
            if (event.eventIntent === 'RECON_PACKAGE') supporting.push('Intent: RECON_PACKAGE');
            if (event.anchor.docNumber.toUpperCase().includes('RECON')) supporting.push('Reference: Recon identifier in anchor');
        }

        // Scoring Logic
        const score = supporting.length - contradicting.length;
        let status = 'NOT SUPPORTED';
        if (supporting.length >= 2 && contradicting.length === 0) status = 'SUPPORTED';
        else if (supporting.length >= 1) status = 'PARTIALLY SUPPORTED';

        return {
            explanation: hypothesis.explanation,
            status,
            score,
            supporting,
            contradicting
        };
    }
}
