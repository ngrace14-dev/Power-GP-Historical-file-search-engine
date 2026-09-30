/**
 * Behavior Population Engine - Phase 5.3
 * Moves from event analysis to population analysis.
 */

import { BASELINE_CLASSIFICATIONS } from './behavior-baseline-engine.js';

export class BehaviorPopulationEngine {

    static POPULATIONS = {
        COMPUTER_CHECKS: 'Computer Checks',
        BACKOUT_JE: 'Back Out Journal Entry',
        VOID_HIST: 'Void Historical Trx',
        VOID_OPEN: 'Void Open Trx',
        DUE_TO: 'Due To',
        DUE_FROM: 'Due From',
        INTERCOMPANY: 'Intercompany',
        ONQ_HILTON: 'ONQ Hilton Recon',
        SETTLEMENT: 'Settlement Packages'
    };

    /**
     * Analyzes all defined populations within the record set.
     */
    static analyzePopulations(allRecords = []) {
        const results = {};
        
        Object.entries(this.POPULATIONS).forEach(([key, label]) => {
            const filterFn = this.getFilter(key);
            const matches = allRecords.filter(filterFn);
            results[key] = this.profilePopulation(label, matches, allRecords);
        });

        return results;
    }

    /**
     * Profiles a specific population of records.
     */
    static profilePopulation(label, matches, allRecords) {
        if (matches.length === 0) {
            return {
                label,
                classification: BASELINE_CLASSIFICATIONS.RARE,
                frequency: 0,
                commonality: 0,
                metrics: this.getEmptyMetrics()
            };
        }

        const metrics = this.calculateMetrics(matches, allRecords);
        const classification = this.classify(metrics, allRecords.length);

        return {
            label,
            classification,
            metrics
        };
    }

    static calculateMetrics(matches, allRecords) {
        const entities = new Set(matches.map(r => r._location || r.Entity));
        const dates = matches.map(r => new Date(r['Transaction Date'] || r.data?.date)).filter(d => !isNaN(d));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const spanDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;

        // Calculate Lifespans (requires identifying related pairs, e.g. Orig vs Reversal)
        // For now, we use the span of the population as a proxy or look for related events
        const lifespans = this.calculateLifespans(matches, allRecords);

        const gross = matches.reduce((sum, r) => sum + Math.abs(this.getAmount(r)), 0);
        const net = matches.reduce((sum, r) => sum + this.getAmount(r), 0);

        const reversalCount = matches.filter(r => this.isReversal(r)).length;
        const correctionCount = matches.filter(r => this.isCorrection(r)).length;

        return {
            frequency: matches.length / Math.max(1, spanDays / 30), // per month
            commonality: (matches.length / allRecords.length) * 100,
            averageLifespan: lifespans.avg,
            longestLifespan: lifespans.max,
            reversalDensity: (reversalCount / matches.length) * 100,
            correctionDensity: (correctionCount / matches.length) * 100,
            entityConcentration: entities.size,
            grossActivity: gross,
            netActivity: net,
            count: matches.length,
            spanDays
        };
    }

    static calculateLifespans(matches, allRecords) {
        // Simple implementation: look for TRX pairs (e.g. Doc Number match)
        const docGroups = {};
        matches.forEach(r => {
            const doc = r['Document Number'] || r['Journal Entry'];
            if (!doc) return;
            if (!docGroups[doc]) docGroups[doc] = [];
            docGroups[doc].push(r);
        });

        const lifespans = [];
        Object.values(docGroups).forEach(group => {
            if (group.length > 1) {
                const dates = group.map(r => new Date(r['Transaction Date'] || r.data?.date)).filter(d => !isNaN(d));
                const span = Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
                lifespans.push(span);
            }
        });

        return {
            avg: lifespans.length > 0 ? lifespans.reduce((a, b) => a + b, 0) / lifespans.length : 0,
            max: lifespans.length > 0 ? Math.max(...lifespans) : 0
        };
    }

    static classify(metrics, totalCount) {
        const freq = metrics.frequency;
        const comm = metrics.commonality;

        if (comm > 10) return BASELINE_CLASSIFICATIONS.COMMON;
        if (comm > 2) return BASELINE_CLASSIFICATIONS.UNCOMMON;
        if (metrics.spanDays > 365 && freq > 0.5) return BASELINE_CLASSIFICATIONS.PERSISTENT;
        if (metrics.spanDays < 90 && freq > 5) return BASELINE_CLASSIFICATIONS.EMERGING;
        
        return BASELINE_CLASSIFICATIONS.RARE;
    }

    static getAmount(r) {
        return parseFloat(r['Amount'] || r['Debit Amount'] || 0) - parseFloat(r['Credit Amount'] || 0);
    }

    static getFilter(key) {
        const filters = {
            COMPUTER_CHECKS: r => (r['Document Type'] || '').includes('Check') || (r['Description'] || '').includes('CHK'),
            BACKOUT_JE: r => (r['Description'] || r['Reference'] || '').toUpperCase().includes('BACK OUT'),
            VOID_HIST: r => (r['Description'] || '').toUpperCase().includes('VOID') && this.isHistorical(r),
            VOID_OPEN: r => (r['Description'] || '').toUpperCase().includes('VOID') && !this.isHistorical(r),
            DUE_TO: r => (r['Account Description'] || '').toUpperCase().includes('DUE TO'),
            DUE_FROM: r => (r['Account Description'] || '').toUpperCase().includes('DUE FROM'),
            INTERCOMPANY: r => (r['Description'] || r['Account Description'] || '').toUpperCase().includes('IC ') || (r['Description'] || '').toUpperCase().includes('ICTRX'),
            ONQ_HILTON: r => (r['Description'] || '').toUpperCase().includes('ONQ') || (r['Description'] || '').toUpperCase().includes('HILTON'),
            SETTLEMENT: r => (r['Description'] || '').toUpperCase().includes('SETTLE') || (r['Description'] || '').toUpperCase().includes('RECON')
        };
        return filters[key] || (() => false);
    }

    static isHistorical(r) {
        const date = new Date(r['Transaction Date'] || r.data?.date);
        return !isNaN(date) && date.getFullYear() < 2024; // Simple threshold
    }

    static isReversal(r) {
        const desc = (r['Description'] || r['Reference'] || '').toUpperCase();
        return desc.includes('REV') || desc.includes('BACK OUT');
    }

    static isCorrection(r) {
        const desc = (r['Description'] || r['Reference'] || '').toUpperCase();
        return desc.includes('CORRECT') || desc.includes('RECLASS') || desc.includes('ADJ');
    }

    static getEmptyMetrics() {
        return {
            frequency: 0,
            commonality: 0,
            averageLifespan: 0,
            longestLifespan: 0,
            reversalDensity: 0,
            correctionDensity: 0,
            entityConcentration: 0,
            grossActivity: 0,
            netActivity: 0,
            count: 0,
            spanDays: 0
        };
    }
}
