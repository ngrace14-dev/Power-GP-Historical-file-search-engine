/**
 * Decision Consistency Engine - Phase 5.6
 * Distinguishes Mechanical Consistency (tools/descriptions) 
 * from Accounting Decision Consistency (application logic).
 */

import { BehaviorPopulationEngine } from './behavior-population-engine.js';

export class DecisionConsistencyEngine {

    /**
     * Analyzes decision consistency across specific manual populations.
     */
    static analyzeDecisionConsistency(allRecords = []) {
        if (!allRecords || allRecords.length === 0) return null;

        const populations = {
            BACKOUT: allRecords.filter(r => BehaviorPopulationEngine.isBackOut(r)),
            IC: allRecords.filter(r => BehaviorPopulationEngine.getFilter('INTERCOMPANY')(r) || BehaviorPopulationEngine.getFilter('DUE_TO')(r) || BehaviorPopulationEngine.getFilter('DUE_FROM')(r)),
            RECLASS: allRecords.filter(r => BehaviorPopulationEngine.isCorrection(r))
        };

        const profiles = {};
        Object.entries(populations).forEach(([key, matches]) => {
            profiles[key] = this.profileDecisions(matches);
        });

        // Global Scores
        const mechanicalConsistency = this.calculateGlobalMechanical(profiles);
        const decisionConsistency = this.calculateGlobalDecision(profiles);
        const resolutionDiversity = this.calculateGlobalDiversity(profiles);

        return {
            timestamp: new Date().toISOString(),
            profiles,
            scores: {
                mechanicalConsistency,
                decisionConsistency,
                resolutionDiversity,
                variabilityIndex: Math.round((100 - decisionConsistency + resolutionDiversity) / 2)
            }
        };
    }

    static profileDecisions(matches) {
        if (matches.length === 0) return this.getEmptyProfile();

        const descs = new Set(matches.map(r => (r['Description'] || '').toUpperCase().trim()));
        const accounts = new Set(matches.map(r => r['Account Number'] || r['Account Description']));
        const entities = new Set(matches.map(r => r._location || r['Entity']));
        
        // Group by Description to see how many different accounts one tool addresses
        const toolMapping = {};
        matches.forEach(r => {
            const d = (r['Description'] || '').toUpperCase().trim();
            if (!toolMapping[d]) toolMapping[d] = new Set();
            toolMapping[d].add(r['Account Number'] || r['Account Description']);
        });

        const avgAccountsPerTool = Object.values(toolMapping).reduce((sum, set) => sum + set.size, 0) / Object.keys(toolMapping).length;

        return {
            count: matches.length,
            uniqueDescriptions: descs.size,
            uniqueAccounts: accounts.size,
            uniqueEntities: entities.size,
            avgAccountsPerTool: avgAccountsPerTool.toFixed(2),
            mechanicalScore: Math.round((1 - (descs.size / matches.length)) * 100),
            decisionScore: Math.round((1 - (avgAccountsPerTool / accounts.size)) * 100)
        };
    }

    static calculateGlobalMechanical(profiles) {
        const scores = Object.values(profiles).filter(p => p.count > 0).map(p => p.mechanicalScore);
        return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    }

    static calculateGlobalDecision(profiles) {
        // High Decision Consistency means the same tools are used for the same accounts
        const scores = Object.values(profiles).filter(p => p.count > 0).map(p => p.decisionScore);
        return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    }

    static calculateGlobalDiversity(profiles) {
        // Measures how many different accounts/entities are touched by these mechanisms
        // High diversity suggests the mechanisms are being used to "solve" many different types of problems
        const entities = Object.values(profiles).reduce((sum, p) => sum + p.uniqueEntities, 0);
        const accounts = Object.values(profiles).reduce((sum, p) => sum + p.uniqueAccounts, 0);
        return Math.min(100, Math.round((entities + accounts) / 2));
    }

    static getEmptyProfile() {
        return { count: 0, uniqueDescriptions: 0, uniqueAccounts: 0, uniqueEntities: 0, avgAccountsPerTool: 0, mechanicalScore: 0, decisionScore: 0 };
    }
}
