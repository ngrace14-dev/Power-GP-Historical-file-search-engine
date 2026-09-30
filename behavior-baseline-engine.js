/**
 * Behavior Baseline Engine - Phase 5.2
 * Establishes behavioral norms within the Dynamics GP environment.
 * 
 * Objective: 
 * Determine "What is normal here?" by analyzing frequency, concentration, 
 * and persistence across the entire historical dataset.
 */

export const BASELINE_CLASSIFICATIONS = Object.freeze({
    COMMON: 'COMMON',
    UNCOMMON: 'UNCOMMON',
    RARE: 'RARE',
    EMERGING: 'EMERGING',
    PERSISTENT: 'PERSISTENT'
});

export class BehaviorBaselineEngine {

    /**
     * Generates a global behavior baseline from the entire available dataset.
     * @param {Array} allRecords - The full population of records.
     * @returns {Object} Global baseline profile.
     */
    static generateGlobalBaseline(allRecords = []) {
        if (!allRecords || allRecords.length === 0) return null;

        const profiles = {
            BACKOUT: this.profileCategory(allRecords, r => this.isBackOut(r)),
            VOID_HIST: this.profileCategory(allRecords, r => this.isVoid(r, true)),
            VOID_OPEN: this.profileCategory(allRecords, r => this.isVoid(r, false)),
            IC: this.profileCategory(allRecords, r => this.isIntercompany(r)),
            DUETO: this.profileCategory(allRecords, r => this.isDueToFrom(r)),
            CORRECT: this.profileCategory(allRecords, r => this.isCorrection(r)),
            SETTLE: this.profileCategory(allRecords, r => this.isSettlement(r))
        };

        return {
            populationSize: allRecords.length,
            profiles,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Profiles a specific category of records within the population.
     */
    static profileCategory(records, filterFn) {
        const matches = records.filter(filterFn);
        if (matches.length === 0) {
            return { count: 0, frequency: 0, entities: new Set(), ageSpanDays: 0 };
        }

        const entities = new Set(matches.map(r => r._location));
        const dates = matches.map(r => new Date(r['Transaction Date'] || r.data?.date)).filter(d => !isNaN(d));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const ageSpanDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

        return {
            count: matches.length,
            frequency: matches.length / Math.max(1, ageSpanDays / 30), // matches per month
            entityCount: entities.size,
            ageSpanDays,
            volume: matches.reduce((sum, r) => sum + Math.abs(parseFloat(r['Amount'] || r['Debit Amount'] || r['Credit Amount'] || 0)), 0),
            persistence: ageSpanDays > 365 ? 'High' : 'Low'
        };
    }

    /**
     * Evaluates a subset of records (e.g. from a case) against the global baseline.
     */
    static evaluateAgainstBaseline(subsetRecords, globalBaseline) {
        if (!globalBaseline) return null;

        const results = [];
        const categories = [
            { id: 'BACKOUT', label: 'Back Out Journal Entries', fn: r => this.isBackOut(r) },
            { id: 'VOID_HIST', label: 'Void Historical Trx', fn: r => this.isVoid(r, true) },
            { id: 'IC', label: 'Intercompany Activity', fn: r => this.isIntercompany(r) },
            { id: 'DUETO', label: 'Due To / Due From', fn: r => this.isDueToFrom(r) },
            { id: 'CORRECT', label: 'Correct Journal Entries', fn: r => this.isCorrection(r) }
        ];

        categories.forEach(cat => {
            const matches = subsetRecords.filter(cat.fn);
            if (matches.length === 0) return;

            const globalProfile = globalBaseline.profiles[cat.id];
            const localCount = matches.length;
            
            // Logic for classification
            let classification = BASELINE_CLASSIFICATIONS.COMMON;
            let commonalityScore = 0;

            if (globalProfile.count > 0) {
                const ratio = localCount / globalProfile.count;
                commonalityScore = Math.min(100, Math.round((1 - ratio) * 100));

                if (ratio > 0.5) classification = BASELINE_CLASSIFICATIONS.PERSISTENT;
                else if (ratio > 0.2) classification = BASELINE_CLASSIFICATIONS.COMMON;
                else if (ratio > 0.05) classification = BASELINE_CLASSIFICATIONS.UNCOMMON;
                else classification = BASELINE_CLASSIFICATIONS.RARE;
            } else {
                classification = BASELINE_CLASSIFICATIONS.EMERGING;
                commonalityScore = 0;
            }

            results.push({
                category: cat.label,
                classification,
                commonalityScore,
                observedFrequency: localCount,
                populationSize: globalProfile.count,
                observedEntityConcentration: new Set(matches.map(r => r._location)).size,
                persistence: globalProfile.persistence
            });
        });

        return results;
    }

    // Helper Filter Functions
    static isBackOut(r) {
        const desc = (r['Description'] || r['Reference'] || '').toUpperCase();
        return desc.includes('BACK OUT') || desc.includes('BACKOUT');
    }

    static isVoid(r, historical = true) {
        const desc = (r['Description'] || r['Reference'] || '').toUpperCase();
        const isVoid = desc.includes('VOID');
        if (!isVoid) return false;
        if (historical) {
            const date = new Date(r['Transaction Date'] || r.data?.date);
            return date.getFullYear() < new Date().getFullYear();
        }
        return true;
    }

    static isIntercompany(r) {
        const desc = (r['Description'] || r['Account Description'] || '').toUpperCase();
        return desc.includes('IC ') || desc.includes('INTERCOMPANY') || desc.includes('ICTRX');
    }

    static isDueToFrom(r) {
        const desc = (r['Account Description'] || '').toUpperCase();
        return desc.includes('DUE TO') || desc.includes('DUE FROM');
    }

    static isCorrection(r) {
        const desc = (r['Description'] || r['Reference'] || '').toUpperCase();
        return desc.includes('CORRECT') || desc.includes('RECLASS');
    }

    static isSettlement(r) {
        const desc = (r['Description'] || r['Reference'] || '').toUpperCase();
        return desc.includes('SETTLE') || desc.includes('RECON');
    }
}
