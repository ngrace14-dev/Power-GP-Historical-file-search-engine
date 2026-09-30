/**
 * Behavior Pattern Analysis Engine - Phase 5.0
 * Evaluates accounting behavior patterns without inferring intent.
 * 
 * Objectives:
 * - Classify accounting behavior patterns based on GP environment activity.
 * - Evaluate multiple competing explanations for observed facts.
 * - Avoid conclusions of fraud, misconduct, or malicious intent.
 */

export const EXPLANATION_CLASSES = Object.freeze({
    NORMAL_ACCOUNTING: 'NORMAL ACCOUNTING PROCESS',
    PROCESS_BREAKDOWN: 'PROCESS BREAKDOWN',
    CONTROL_WEAKNESS: 'CONTROL WEAKNESS',
    SYSTEM_BOUNDARY: 'SYSTEM / DATA BOUNDARY EFFECT',
    MANAGEMENT_INTERVENTION: 'MANAGEMENT INTERVENTION PATTERN'
});

export class BehaviorPatternEngine {

    /**
     * Analyzes a set of records (typically a related cluster or a case) to identify behavior patterns.
     * @param {Array} records - The records to analyze.
     * @param {Object} context - Optional context about the case/investigation.
     * @returns {Object} Behavior analysis output.
     */
    static analyzePattern(records = [], context = {}) {
        if (!Array.isArray(records) || records.length === 0) {
            return null;
        }

        const observedFacts = this.extractObservedFacts(records);
        const behaviorPattern = this.identifyBehaviorPattern(observedFacts, records);
        const explanations = this.evaluateCompetingExplanations(observedFacts, behaviorPattern, records);

        return {
            observedFacts,
            behaviorPattern,
            explanations,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extracts objective facts from the records.
     */
    static extractObservedFacts(records) {
        const facts = [];
        
        // Date range
        const dates = records.map(r => new Date(r['Transaction Date'] || r.data?.date)).filter(d => !isNaN(d));
        if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
            const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
            facts.push(`Activity spans ${minDate} to ${maxDate}`);
        }

        // Transaction types
        const types = new Set();
        records.forEach(r => {
            const ref = (r['Reference ID'] || r.data?.reference || '').toUpperCase();
            const source = (r['Originating TRX Source'] || '').toUpperCase();
            const desc = (r['Description'] || r['Account Description'] || '').toUpperCase();

            if (ref.includes('BACK OUT') || desc.includes('BACK OUT')) types.add('Back Out Journal Entry');
            if (ref.includes('VOID') || desc.includes('VOID')) types.add('Void Transaction');
            if (ref.includes('CORRECT') || desc.includes('CORRECT')) types.add('Correct Journal Entry');
            if (ref.includes('IC') || desc.includes('INTERCOMPANY') || desc.includes('ICTRX')) types.add('Intercompany Activity');
            if (desc.includes('DUE TO') || desc.includes('DUE FROM')) types.add('Due To / Due From Balance');
        });

        types.forEach(t => facts.push(`Contains ${t}`));

        // Repetitive patterns
        const jeCounts = {};
        records.forEach(r => {
            const je = r['Journal Entry'] || r.data?.journal_entry;
            if (je) jeCounts[je] = (jeCounts[je] || 0) + 1;
        });

        const repeatedJEs = Object.keys(jeCounts).filter(je => jeCounts[je] > 1);
        if (repeatedJEs.length > 0) {
            facts.push(`Repeated activity involving ${repeatedJEs.length} specific Journal Entries`);
        }

        // Reversal detection
        let reversalCount = 0;
        const amounts = records.map(r => parseFloat(r['Amount'] || 0));
        for (let i = 0; i < amounts.length; i++) {
            for (let j = i + 1; j < amounts.length; j++) {
                if (amounts[i] !== 0 && amounts[i] === -amounts[j]) {
                    reversalCount++;
                }
            }
        }
        if (reversalCount > 0) {
            facts.push(`Contains ${reversalCount} potential reversal pairs`);
        }

        return facts;
    }

    /**
     * Identifies the primary behavior pattern based on facts.
     */
    static identifyBehaviorPattern(facts, records) {
        const factStr = facts.join(' ').toUpperCase();
        
        if (factStr.includes('INTERCOMPANY') || factStr.includes('DUE TO')) {
            return 'Intercompany Settlement Cycle';
        }
        if (factStr.includes('BACK OUT') || factStr.includes('CORRECT')) {
            return 'Correction and Reclassification Cycle';
        }
        if (factStr.includes('VOID')) {
            return 'Historical Transaction Voiding Pattern';
        }
        if (factStr.includes('REPEATED ACTIVITY') || factStr.includes('REVERSAL')) {
            return 'Recursive Adjustment Pattern';
        }
        if (facts.length > 3 && factStr.includes('SPANS')) {
            return 'Long-Lived Settlement Cycle';
        }

        return 'Complex Journal Entry Activity';
    }

    /**
     * Evaluates multiple explanations for the behavior.
     */
    static evaluateCompetingExplanations(facts, pattern, records) {
        const factStr = facts.join(' ').toUpperCase();
        const explanations = [];

        // 1. Normal Accounting Process
        const normal = {
            class: EXPLANATION_CLASSES.NORMAL_ACCOUNTING,
            confidence: 'Low',
            supportingEvidence: [],
            contradictingEvidence: []
        };
        if (factStr.includes('INTERCOMPANY')) {
            normal.supportingEvidence.push('Intercompany activity is a standard monthly reconciliation requirement.');
            normal.confidence = 'Medium';
        }
        if (factStr.includes('REVERSAL')) {
            normal.supportingEvidence.push('Accrual reversals are standard accounting practice.');
            normal.confidence = 'Medium';
        }
        if (factStr.includes('BACK OUT') || factStr.includes('CORRECT')) {
            normal.contradictingEvidence.push('High volume of corrections exceeds typical monthly adjustment thresholds.');
        }
        explanations.push(normal);

        // 2. Process Breakdown
        const breakdown = {
            class: EXPLANATION_CLASSES.PROCESS_BREAKDOWN,
            confidence: 'Low',
            supportingEvidence: [],
            contradictingEvidence: []
        };
        if (factStr.includes('SPANS') && factStr.includes('REPEATED')) {
            breakdown.supportingEvidence.push('Balances remain unresolved across multiple periods indicating a breakdown in settlement.');
            breakdown.confidence = 'Medium-High';
        }
        if (factStr.includes('VOID')) {
            breakdown.supportingEvidence.push('Frequent voiding of historical transactions suggests upstream process errors.');
            breakdown.confidence = 'Medium';
        }
        explanations.push(breakdown);

        // 3. Control Weakness
        const control = {
            class: EXPLANATION_CLASSES.CONTROL_WEAKNESS,
            confidence: 'Low',
            supportingEvidence: [],
            contradictingEvidence: []
        };
        if (factStr.includes('CORRECT') || factStr.includes('BACK OUT')) {
            control.supportingEvidence.push('Heavy reliance on correcting entries indicates a potential weakness in front-end data entry controls.');
            control.confidence = 'Medium-High';
        }
        if (records.some(r => r['User Who Posted'] === records[0]['User Who Posted'])) {
            control.supportingEvidence.push('Activity concentrated with specific user profile without visible secondary review markers.');
        }
        explanations.push(control);

        // 4. System / Data Boundary Effect
        const system = {
            class: EXPLANATION_CLASSES.SYSTEM_BOUNDARY,
            confidence: 'Low',
            supportingEvidence: [],
            contradictingEvidence: []
        };
        if (factStr.includes('INTERCOMPANY') && records.length < 5) {
            system.supportingEvidence.push('Incomplete intercompany legs may suggest extraction fragmentation or missing counterparty data.');
            system.confidence = 'Medium';
        }
        explanations.push(system);

        // 5. Management Intervention Pattern
        const management = {
            class: EXPLANATION_CLASSES.MANAGEMENT_INTERVENTION,
            confidence: 'Low',
            supportingEvidence: [],
            contradictingEvidence: []
        };
        if (factStr.includes('RECLASSIFICATION') || factStr.includes('REPEATED ACTIVITY')) {
            management.supportingEvidence.push('Persistent cleanup cycles and reallocation behavior patterns.');
            management.confidence = 'Medium';
        }
        explanations.push(management);

        return explanations;
    }
}
