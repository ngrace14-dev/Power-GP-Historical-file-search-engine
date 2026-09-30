/**
 * Accounting Debt Analysis Engine - Phase 5.8
 * Measures unresolved accounting work and reconciliation burden.
 * 
 * Logic: Analyzes chain length, age, persistence, and correction loops.
 */

import { CorrectionPathEngine } from './correction-path-engine.js';
import { BehaviorPopulationEngine } from './behavior-population-engine.js';

export class AccountingDebtEngine {

    /**
     * Analyzes accounting debt across the dataset.
     */
    static analyzeDebt(allRecords = []) {
        if (!allRecords || allRecords.length === 0) return null;

        const groups = CorrectionPathEngine.groupRelatedRecords(allRecords);
        const chains = [];
        Object.values(groups).forEach(group => {
            chains.push(CorrectionPathEngine.buildChain(group));
        });

        const debtMetrics = this.calculateDebtMetrics(chains);
        const score = this.calculateDebtScore(debtMetrics);
        const classification = this.getClassification(score);

        return {
            timestamp: new Date().toISOString(),
            debtScore: score,
            classification,
            metrics: debtMetrics,
            topSources: this.identifyTopSources(chains),
            observedFacts: this.generateFacts(debtMetrics, classification)
        };
    }

    static calculateDebtMetrics(chains) {
        let totalSteps = 0;
        let crossYearCount = 0;
        let loops = 0;
        let maxLen = 0;
        let icChains = 0;
        let unresolvedCount = 0;

        chains.forEach(c => {
            totalSteps += c.length;
            maxLen = Math.max(maxLen, c.length);

            // Cross-Year Detection
            const startYear = new Date(c.steps[0].date).getFullYear();
            const endYear = new Date(c.steps[c.steps.length - 1].date).getFullYear();
            if (startYear !== endYear && !isNaN(startYear) && !isNaN(endYear)) {
                crossYearCount++;
            }

            // Loop Detection (e.g., A -> Back Out -> A -> Back Out)
            if (c.length >= 3) {
                const tools = c.steps.map(s => s.tool);
                for (let i = 0; i < tools.length - 2; i++) {
                    if (tools[i] === tools[i+2] && (tools[i+1] === 'Back Out' || tools[i+1] === 'Manual Reclass')) {
                        loops++;
                        break;
                    }
                }
            }

            // Unresolved Detection (Ends in a correction/reversal tool)
            const lastTool = c.steps[c.steps.length - 1].tool;
            if (['Back Out', 'Void (Hist)', 'Void (Open)', 'Due To Adj', 'Due From Adj', 'IC Transfer', 'Manual Reclass'].includes(lastTool)) {
                unresolvedCount++;
            }

            if (c.pathString.includes('IC Transfer') || c.pathString.includes('Due')) {
                icChains++;
            }
        });

        return {
            totalChains: chains.length,
            avgChainLength: chains.length > 0 ? (totalSteps / chains.length).toFixed(2) : 0,
            maxChainLength: maxLen,
            crossYearChains: crossYearCount,
            loops,
            unresolvedChains: unresolvedCount,
            intercompanyChains: icChains
        };
    }

    static calculateDebtScore(metrics) {
        if (metrics.totalChains === 0) return 0;

        // Weighted components of debt
        const lenComponent = Math.min(25, (metrics.avgChainLength / 5) * 25);
        const unresolvedComponent = Math.min(25, (metrics.unresolvedChains / metrics.totalChains) * 25);
        const loopComponent = Math.min(25, (metrics.loops / Math.max(1, metrics.totalChains * 0.1)) * 25);
        const crossYearComponent = Math.min(25, (metrics.crossYearChains / Math.max(1, metrics.totalChains * 0.2)) * 25);

        return Math.round(lenComponent + unresolvedComponent + loopComponent + crossYearComponent);
    }

    static getClassification(score) {
        if (score > 75) return 'CRITICAL';
        if (score > 50) return 'HIGH';
        if (score > 25) return 'MODERATE';
        return 'LOW';
    }

    static identifyTopSources(chains) {
        const sources = {};
        chains.forEach(c => {
            const primaryTool = c.steps.find(s => s.tool !== 'Original Entry')?.tool || 'Operational';
            if (!sources[primaryTool]) sources[primaryTool] = { count: 0, totalSteps: 0 };
            sources[primaryTool].count++;
            sources[primaryTool].totalSteps += c.length;
        });

        return Object.entries(sources)
            .map(([name, data]) => ({
                name,
                populationContribution: data.count,
                debtContribution: data.totalSteps
            }))
            .sort((a, b) => b.debtContribution - a.debtContribution)
            .slice(0, 5);
    }

    static generateFacts(m, classification) {
        const facts = [
            `Average chain length of ${m.avgChainLength} steps per resolved event.`,
            `${m.unresolvedChains} chains (${Math.round(m.unresolvedChains/m.totalChains*100)}%) remained in a corrective state.`,
            `${m.crossYearChains} accounting chains persisted across fiscal year boundaries.`
        ];
        if (m.loops > 0) facts.push(`${m.loops} instances of correction loops (repeated reversal/repost) detected.`);
        if (classification === 'CRITICAL' || classification === 'HIGH') {
            facts.push(`Environment demonstrates significant unresolved reconciliation burden.`);
        }
        return facts;
    }
}
