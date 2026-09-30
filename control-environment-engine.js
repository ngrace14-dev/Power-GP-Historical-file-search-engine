/**
 * Control Environment Analysis Engine - Phase 5.4
 * Characterizes the accounting environment based on behavioral patterns.
 * 
 * Focuses on system behavior, not individuals.
 */

import { BASELINE_CLASSIFICATIONS } from './behavior-baseline-engine.js';
import { BehaviorPopulationEngine } from './behavior-population-engine.js';

export class ControlEnvironmentEngine {

    /**
     * Generates a Control Environment Profile based on the full population.
     */
    static analyzeControlEnvironment(allRecords = []) {
        if (!allRecords || allRecords.length === 0) return null;

        const populations = BehaviorPopulationEngine.analyzePopulations(allRecords);
        
        const consistency = this.calculateProcessConsistency(allRecords, populations);
        const intervention = this.calculateManualIntervention(allRecords, populations);
        const dependency = this.calculateIntercompanyDependency(allRecords, populations);
        const stability = this.calculateSettlementStability(populations);
        const persistence = this.calculatePersistenceRisk(populations);

        return {
            timestamp: new Date().toISOString(),
            recordCount: allRecords.length,
            scores: {
                processConsistency: consistency.score,
                manualIntervention: intervention.score,
                intercompanyDependency: dependency.score,
                settlementStability: stability.score,
                persistenceRisk: persistence.score
            },
            classifications: {
                processConsistency: this.getClassification(consistency.score, true),
                manualIntervention: this.getClassification(intervention.score),
                intercompanyDependency: this.getClassification(dependency.score),
                settlementStability: this.getClassification(stability.score, true),
                persistenceRisk: this.getClassification(persistence.score)
            },
            details: {
                consistency,
                intervention,
                dependency,
                stability,
                persistence
            }
        };
    }

    static calculateProcessConsistency(records, pops) {
        // Measure unique description patterns for corrections and settlements
        const correctionMatches = records.filter(r => BehaviorPopulationEngine.isCorrection(r));
        const settlementMatches = records.filter(r => BehaviorPopulationEngine.getFilter('SETTLEMENT')(r));
        
        const correctionPatterns = new Set(correctionMatches.map(r => this.normalizePattern(r['Description'] || r['Reference'])));
        const settlementPatterns = new Set(settlementMatches.map(r => this.normalizePattern(r['Description'] || r['Reference'])));

        const totalPatterns = correctionPatterns.size + settlementPatterns.size;
        const totalItems = correctionMatches.length + settlementMatches.length;

        // Higher pattern count per item = Lower consistency
        const variance = totalItems > 0 ? (totalPatterns / totalItems) : 0;
        const score = Math.max(0, Math.min(100, Math.round((1 - variance) * 100)));

        return { score, uniquePatterns: totalPatterns, totalObserved: totalItems };
    }

    static calculateManualIntervention(records, pops) {
        const manualPops = ['BACKOUT_JE', 'VOID_HIST', 'VOID_OPEN'];
        const totalManual = manualPops.reduce((sum, key) => sum + (pops[key]?.metrics?.count || 0), 0);
        
        // Scale: 5% of records being manual intervention is considered "High"
        const density = (totalManual / records.length) * 100;
        const score = Math.min(100, Math.round(density * 20)); 

        return { score, totalManual, density: density.toFixed(2) + '%' };
    }

    static calculateIntercompanyDependency(records, pops) {
        const icPops = ['DUE_TO', 'DUE_FROM', 'INTERCOMPANY'];
        const totalIC = icPops.reduce((sum, key) => sum + (pops[key]?.metrics?.count || 0), 0);
        
        const density = (totalIC / records.length) * 100;
        const score = Math.min(100, Math.round(density * 10)); // 10% density = 100 score

        return { score, totalIC, density: density.toFixed(2) + '%' };
    }

    static calculateSettlementStability(pops) {
        // Based on reversal and correction density across all populations
        let totalRev = 0;
        let totalCorr = 0;
        let count = 0;

        Object.values(pops).forEach(p => {
            if (p.metrics.count > 0) {
                totalRev += p.metrics.reversalDensity;
                totalCorr += p.metrics.correctionDensity;
                count++;
            }
        });

        const avgInstability = count > 0 ? (totalRev + totalCorr) / count : 0;
        const score = Math.max(0, Math.min(100, Math.round(100 - avgInstability)));

        return { score, avgReversalDensity: (totalRev/count || 0).toFixed(2) + '%', avgCorrectionDensity: (totalCorr/count || 0).toFixed(2) + '%' };
    }

    static calculatePersistenceRisk(pops) {
        // Based on average lifespan of populations
        let totalAvgLife = 0;
        let maxLife = 0;
        let count = 0;

        Object.values(pops).forEach(p => {
            if (p.metrics.count > 0 && p.metrics.averageLifespan > 0) {
                totalAvgLife += p.metrics.averageLifespan;
                maxLife = Math.max(maxLife, p.metrics.longestLifespan);
                count++;
            }
        });

        const avgLife = count > 0 ? totalAvgLife / count : 0;
        // Scale: 180 days average lifespan = 100 risk
        const score = Math.min(100, Math.round((avgLife / 180) * 100));

        return { score, avgLifespan: avgLife.toFixed(1) + ' days', longestChain: maxLife + ' days' };
    }

    static getClassification(score, inverted = false) {
        const s = inverted ? (100 - score) : score;
        if (s > 75) return 'VERY HIGH';
        if (s > 50) return 'HIGH';
        if (s > 25) return 'MODERATE';
        return 'LOW';
    }

    static normalizePattern(desc = '') {
        return desc.toUpperCase()
            .replace(/[0-9]/g, '#') // Replace numbers
            .replace(/JE[- ]?#+/g, 'JE-####') // Normalize JE refs
            .replace(/VOUCHER[- ]?#+/g, 'VOUCHER-####')
            .trim();
    }
}
