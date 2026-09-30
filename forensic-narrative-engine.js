/**
 * Forensic Narrative Synthesis Engine - Phase 6.0
 * Synthesizes cross-engine analysis into high-fidelity forensic narratives.
 * 
 * Objectives:
 * - Combine Behavioral, Structural, and Economic analysis into a unified perspective.
 * - Enforce Governance v6.0 neutrality standards.
 * - Support tiered reporting (Executive, Investigator, Legal).
 */

import { AEREEngine } from './src/engines/aere/aere-engine.js';
import { AiAnalystEngine } from './src/engines/aere/ai-analyst-engine.js';
import { BehaviorPatternEngine } from './behavior-pattern-engine.js';
import { BehaviorBaselineEngine } from './behavior-baseline-engine.js';
import { BehaviorPopulationEngine } from './behavior-population-engine.js';
import { ControlEnvironmentEngine } from './control-environment-engine.js';
import { EnvironmentFingerprintEngine } from './environment-fingerprint-engine.js';
import { AccountingDebtEngine } from './accounting-debt-engine.js';
import { CorrectionPathEngine } from './correction-path-engine.js';
import { DecisionConsistencyEngine } from './decision-consistency-engine.js';
import { CorroborationEngine } from './corroboration-engine.js';

export class ForensicNarrativeEngine {

    /**
     * Synthesizes a comprehensive forensic report for a dataset or case.
     * @param {Array} records - The records to analyze.
     * @param {Object} context - Reporting context (e.g., target audience, scope).
     */
    static async synthesize(records = [], context = {}) {
        if (!records || records.length === 0) return null;

        // 1. Structural & Lifecycle Reconstruction
        const events = AEREEngine.reconstruct(records);
        const correctionPaths = CorrectionPathEngine.analyzePaths(records);
        const accountingDebt = AccountingDebtEngine.analyzeDebt(records);

        // 2. Behavioral & Population Analysis
        const behavioralAnalysis = BehaviorPatternEngine.analyzePattern(records);
        const globalBaseline = BehaviorBaselineEngine.generateGlobalBaseline(records);
        const baselineComparison = BehaviorBaselineEngine.evaluateAgainstBaseline(records, globalBaseline);
        const populations = BehaviorPopulationEngine.analyzePopulations(records);

        // 3. Environmental & Control Fingerprinting
        const fingerprint = EnvironmentFingerprintEngine.generateFingerprint(records);
        const controlEnv = ControlEnvironmentEngine.analyzeControlEnvironment(records);
        const decisionConsistency = DecisionConsistencyEngine.analyzeDecisionConsistency(records);

        // 4. Corroboration & Integrity
        const corroboration = CorroborationEngine.evaluateDataset(records);

        // 5. Narrative Synthesis Logic
        const executiveSummary = this.generateExecutiveSummary(events, behavioralAnalysis, accountingDebt, fingerprint);
        const enginePerspectives = this.compileEnginePerspectives({
            events, behavioralAnalysis, accountingDebt, decisionConsistency, correctionPaths, 
            populations, fingerprint, controlEnv, corroboration
        });

        return {
            timestamp: new Date().toISOString(),
            scope: context.scope || 'Full Dataset Forensic Review',
            executiveSummary,
            enginePerspectives,
            metadata: {
                recordCount: records.length,
                eventCount: events.length,
                entityCount: new Set(records.map(r => r._provenance?.entityContext || r._location)).size
            }
        };
    }

    /**
     * Generates a high-level executive summary of the forensic landscape.
     */
    static generateExecutiveSummary(events, behavior, debt, fingerprint) {
        const topIntent = events.reduce((acc, e) => {
            acc[e.eventIntent] = (acc[e.eventIntent] || 0) + 1;
            return acc;
        }, {});
        const dominantIntent = Object.keys(topIntent).reduce((a, b) => topIntent[a] > topIntent[b] ? a : b, 'UNKNOWN');

        return {
            headline: `Forensic synthesis identified ${events.length} economic events, with a dominant ${dominantIntent.replace('_', ' ')} profile.`,
            behavioralProfile: behavior.behaviorPattern,
            systemicRisk: debt.classification,
            environmentSignature: fingerprint.signature,
            keyFinding: `The environment demonstrates a ${debt.classification.toLowerCase()} level of accounting debt, and ${fingerprint.observedPhenomena.length} distinct system phenomena.`
        };
    }

    /**
     * Compiles detailed perspectives from each specialized engine.
     */
    static compileEnginePerspectives(data) {
        const { 
            events, behavioralAnalysis, accountingDebt, decisionConsistency, correctionPaths, 
            populations, fingerprint, controlEnv, corroboration 
        } = data;

        return [
            {
                engine: 'Structural Lifecycle (AERE)',
                summary: `Reconstructed ${events.length} lifecycles. Net Economic Impact: $${events.reduce((sum, e) => sum + e.netEconomicImpact, 0).toLocaleString()}.`,
                findings: events.filter(e => e.eventFlags.length > 0).flatMap(e => e.eventFlags.map(f => f.description)).slice(0, 5)
            },
            {
                engine: 'Behavioral Pattern',
                summary: `Pattern: ${behavioralAnalysis.behaviorPattern}.`,
                explanations: behavioralAnalysis.explanations.filter(ex => ex.confidence !== 'Low').map(ex => `${ex.class}: ${ex.supportingEvidence.join(', ')}`)
            },
            {
                engine: 'Accounting Debt & Path Efficiency',
                summary: `Debt Score: ${accountingDebt.debtScore}/100. Path count: ${correctionPaths.pathCount}.`,
                findings: accountingDebt.observedFacts
            },
            {
                engine: 'Environment Fingerprint',
                summary: `Signature: ${fingerprint.signature}. Density: ${fingerprint.density.toFixed(2)} entries/day.`,
                phenomena: fingerprint.observedPhenomena
            },
            {
                engine: 'Control Environment & Consistency',
                summary: `Consistency: ${decisionConsistency.consistencyScore}%. Control Trust: ${controlEnv.overallControlTrust}.`,
                findings: controlEnv.flags.map(f => f.description)
            },
            {
                engine: 'Population Dynamics',
                summary: `Identified ${Object.keys(populations).length} distinct behavior populations.`,
                notable: Object.values(populations).filter(p => p.classification === 'RARE').map(p => p.label)
            },
            {
                engine: 'Corroboration Integrity',
                summary: `Confidence Avg: ${(corroboration.metrics.averageConfidence * 100).toFixed(1)}%.`,
                status: `Cross-foot validation: ${corroboration.metrics.crossFootSuccessRate}% success.`
            }
        ];
    }
}

