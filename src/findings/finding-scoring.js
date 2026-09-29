/**
 * Finding Scoring Engine - Governance v6.0
 * Calculates finding confidence without hardcoded forensic declarations.
 */

export class FindingScoring {
    /**
     * Calculates combined confidence for a finding or theory.
     * @param {Object} metrics 
     * @returns {number} 0-100 score
     */
    static calculateConfidence(metrics) {
        const {
            evidenceStrength = 0,    // Weighted confidence of records
            corroborationLevel = 1,  // Number of independent sources
            contradictionCount = 0,  // Number of conflicting edges
            materialityScore = 50,   // Impact weight
            riskWeight = 0          // Forensic risk indicator
        } = metrics;

        // Base score starts at evidence strength
        let score = evidenceStrength;

        // Corroboration Multiplier (Phase 4 Logic)
        if (corroborationLevel >= 3) score += 20;
        else if (corroborationLevel === 2) score += 10;

        // Contradiction Penalty (Phase 5 Logic)
        score -= (contradictionCount * 15);

        // Risk adjustment
        score += (riskWeight / 4);

        return Math.min(100, Math.max(0, score));
    }
}
