/**
 * Correction Path Analysis Engine - Phase 5.7
 * Traces chains of related transactions to identify resolution paths.
 * 
 * Logic: Traces "Previous State -> Correction Tool -> Resulting State"
 */

import { BehaviorPopulationEngine } from './behavior-population-engine.js';

export class CorrectionPathEngine {

    /**
     * Analyzes correction paths across the dataset.
     */
    static analyzePaths(allRecords = []) {
        if (!allRecords || allRecords.length === 0) return null;

        // 1. Group records by related identifiers (JE or Doc Number)
        const groups = this.groupRelatedRecords(allRecords);
        
        // 2. Build chains for groups containing corrections
        const chains = [];
        Object.values(groups).forEach(group => {
            if (group.some(r => this.isCorrectionTool(r))) {
                chains.push(this.buildChain(group));
            }
        });

        // 3. Analyze path metrics
        const pathAnalysis = this.analyzePathMetrics(chains);

        return {
            timestamp: new Date().toISOString(),
            totalChains: chains.length,
            paths: pathAnalysis.commonPaths,
            metrics: {
                avgLength: pathAnalysis.avgLength,
                maxLength: pathAnalysis.maxLength,
                deadEnds: pathAnalysis.deadEnds
            },
            classifications: pathAnalysis.classifications
        };
    }

    static groupRelatedRecords(records) {
        const groups = {};
        records.forEach(r => {
            // Use JE and Invoice/Doc Number as primary keys for grouping
            const keys = [
                r['Journal Entry'],
                r['Invoice Number'],
                r['Document Number'],
                r['Reference']?.match(/JE-?(\d+)/)?.[0]
            ].filter(Boolean);

            keys.forEach(key => {
                if (!groups[key]) groups[key] = [];
                groups[key].push(r);
            });
        });
        
        // De-duplicate items within groups (since one record might have multiple keys)
        Object.keys(groups).forEach(k => {
            groups[k] = [...new Map(groups[k].map(item => [item._id, item])).values()];
        });

        return groups;
    }

    static buildChain(group) {
        // Sort by date then by amount/type
        const sorted = [...group].sort((a, b) => {
            const dateA = new Date(a['Transaction Date'] || 0);
            const dateB = new Date(b['Transaction Date'] || 0);
            return dateA - dateB;
        });

        const steps = sorted.map(r => ({
            id: r._id,
            date: r['Transaction Date'],
            tool: this.identifyState(r),
            account: r['Account Number'] || r['Account Description'],
            amount: BehaviorPopulationEngine.getAmount(r)
        }));

        return {
            id: sorted[0]['Journal Entry'] || sorted[0]['Document Number'],
            length: steps.length,
            steps,
            pathString: steps.map(s => s.tool).join(' → ')
        };
    }

    static identifyState(r) {
        if (BehaviorPopulationEngine.isBackOut(r)) return 'Back Out';
        if (BehaviorPopulationEngine.getFilter('VOID_HIST')(r)) return 'Void (Hist)';
        if (BehaviorPopulationEngine.getFilter('VOID_OPEN')(r)) return 'Void (Open)';
        if (BehaviorPopulationEngine.getFilter('DUE_TO')(r)) return 'Due To Adj';
        if (BehaviorPopulationEngine.getFilter('DUE_FROM')(r)) return 'Due From Adj';
        if (BehaviorPopulationEngine.getFilter('INTERCOMPANY')(r)) return 'IC Transfer';
        if (BehaviorPopulationEngine.isCorrection(r)) return 'Manual Reclass';
        if (BehaviorPopulationEngine.getFilter('SETTLEMENT')(r)) return 'Settlement';
        
        // If not a correction tool, it's an operational state
        const desc = (r['Account Description'] || '').toUpperCase();
        if (desc.includes('PAYABLE')) return 'AP State';
        if (desc.includes('RECEIVABLE')) return 'AR State';
        if (desc.includes('CASH')) return 'Cash State';
        
        return 'Original Entry';
    }

    static isCorrectionTool(r) {
        return BehaviorPopulationEngine.isBackOut(r) || 
               BehaviorPopulationEngine.isCorrection(r) ||
               (r['Description'] || '').toUpperCase().includes('VOID');
    }

    static analyzePathMetrics(chains) {
        const pathCounts = {};
        let totalLen = 0;
        let maxLen = 0;
        let deadEnds = 0;
        const classifications = {
            'Operational Correction': 0,
            'Settlement Correction': 0,
            'Intercompany Correction': 0,
            'Historical Cleanup': 0
        };

        chains.forEach(c => {
            pathCounts[c.pathString] = (pathCounts[c.pathString] || 0) + 1;
            totalLen += c.length;
            maxLen = Math.max(maxLen, c.length);
            
            // Classification based on tools used in chain
            if (c.pathString.includes('IC Transfer') || c.pathString.includes('Due')) {
                classifications['Intercompany Correction']++;
            } else if (c.pathString.includes('Settlement')) {
                classifications['Settlement Correction']++;
            } else if (c.pathString.includes('Void (Hist)')) {
                classifications['Historical Cleanup']++;
            } else {
                classifications['Operational Correction']++;
            }

            // Dead end if it ends in a reversal without a re-entry
            const lastStep = c.steps[c.steps.length - 1].tool;
            if (lastStep === 'Back Out' || lastStep.includes('Void')) {
                deadEnds++;
            }
        });

        const commonPaths = Object.entries(pathCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([path, count]) => ({ path, count }));

        return {
            commonPaths,
            avgLength: chains.length > 0 ? (totalLen / chains.length).toFixed(2) : 0,
            maxLength: maxLen,
            deadEnds,
            classifications
        };
    }
}
