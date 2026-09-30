/**
 * Environment Fingerprint Engine - Phase 5.5
 * Creates a high-level characterization of the accounting environment.
 * 
 * Combines Baseline, Population, and Control Environment data.
 */

import { ControlEnvironmentEngine } from './control-environment-engine.js';
import { BehaviorPopulationEngine } from './behavior-population-engine.js';
import { BASELINE_CLASSIFICATIONS } from './behavior-baseline-engine.js';

export class EnvironmentFingerprintEngine {

    /**
     * Generates a complete Environment Fingerprint.
     */
    static generateFingerprint(allRecords = []) {
        if (!allRecords || allRecords.length === 0) return null;

        const populations = BehaviorPopulationEngine.analyzePopulations(allRecords);
        const controlEnv = ControlEnvironmentEngine.analyzeControlEnvironment(allRecords);
        
        // Calculate Behavior Variability (Standard Deviation of commonality scores)
        const commonalities = Object.values(populations).map(p => p.metrics.commonality);
        const behaviorVariability = this.calculateVariability(commonalities);

        const scores = {
            ...controlEnv.scores,
            behaviorVariability
        };

        const classifications = this.determineClassifications(scores, populations);
        const behaviors = this.identifyBehaviorSegments(populations);

        return {
            timestamp: new Date().toISOString(),
            recordCount: allRecords.length,
            scores,
            fingerprintClassifications: classifications,
            behaviorSegments: behaviors,
            environmentSummary: this.generateSummary(classifications, scores)
        };
    }

    static calculateVariability(values) {
        if (values.length === 0) return 0;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(avgSquareDiff);
        
        // Scale stdDev to a 0-100 score. High stdDev means high variability.
        return Math.min(100, Math.round(stdDev * 10));
    }

    static determineClassifications(scores, populations) {
        const classes = [];

        if (scores.processConsistency > 80 && scores.manualIntervention < 20) {
            classes.push('Highly Standardized');
        } else if (scores.processConsistency > 50) {
            classes.push('Moderately Standardized');
        }

        if (scores.manualIntervention > 60) classes.push('Highly Manual');
        if (scores.intercompanyDependency > 50) classes.push('Intercompany Intensive');
        
        // Reconciliation Intensive (Settlements + ONQ)
        const settlementCount = populations.SETTLEMENT?.metrics?.count || 0;
        const onqCount = populations.ONQ_HILTON?.metrics?.count || 0;
        if ((settlementCount + onqCount) / populations.COMPUTER_CHECKS?.metrics?.count > 0.5) {
            classes.push('Reconciliation Intensive');
        }

        if (scores.settlementStability < 40) classes.push('Settlement Intensive');
        
        const backoutCount = populations.BACKOUT_JE?.metrics?.count || 0;
        if (backoutCount / (populations.COMPUTER_CHECKS?.metrics?.count || 1) > 0.3) {
            classes.push('Correction Intensive');
        }

        return classes;
    }

    static identifyBehaviorSegments(populations) {
        const segments = {
            dominant: [],
            rare: [],
            persistent: [],
            emerging: []
        };

        Object.values(populations).forEach(p => {
            if (p.classification === BASELINE_CLASSIFICATIONS.COMMON) segments.dominant.push(p.label);
            if (p.classification === BASELINE_CLASSIFICATIONS.RARE) segments.rare.push(p.label);
            if (p.classification === BASELINE_CLASSIFICATIONS.PERSISTENT) segments.persistent.push(p.label);
            if (p.classification === BASELINE_CLASSIFICATIONS.EMERGING) segments.emerging.push(p.label);
        });

        return segments;
    }

    static generateSummary(classifications, scores) {
        let summary = "This accounting environment is ";
        
        if (classifications.length > 0) {
            summary += classifications.join(' and ') + " in nature. ";
        } else {
            summary += "characterized by balanced behavioral patterns. ";
        }

        if (scores.manualIntervention > 50) {
            summary += "It shows significant reliance on manual adjustments and interventions. ";
        } else {
            summary += "It demonstrates a lower density of manual interventions. ";
        }

        if (scores.persistenceRisk > 70) {
            summary += "High persistence risks indicate that transactions tend to remain open across multiple periods.";
        }

        return summary;
    }
}
