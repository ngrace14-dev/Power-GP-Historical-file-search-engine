import { RelationshipTypes } from '../relationship-types.js';

/**
 * Relationship Confidence Engine - Governance v6.0
 */
export class RelationshipConfidence {
    static TIERS = {
        AUTHORITATIVE: { min: 90, max: 100, label: "Authoritative" },
        STRONG: { min: 75, max: 89, label: "Strong" },
        PROBABLE: { min: 60, max: 74, label: "Probable" },
        WEAK: { min: 40, max: 59, label: "Weak" },
        UNRELIABLE: { min: 0, max: 39, label: "Unreliable" }
    };

    /**
     * Calculates score and tier based on forensic factors.
     */
    static calculate(type, factors = {}) {
        let score = 0;
        const explanation = [];

        switch (type) {
            case RelationshipTypes.REVERSAL_OF:
                if (factors.amountMatch) { score += 40; explanation.push("Amount match detected (+40)"); }
                if (factors.accountMatch) { score += 20; explanation.push("Account segment match (+20)"); }
                if (factors.oppositeSign) { score += 25; explanation.push("Opposite sign/direction match (+25)"); }
                if (factors.dateProximity) { score += 15; explanation.push("Temporal proximity match (+15)"); }
                break;
            
            case RelationshipTypes.SETTLEMENT_OF:
                if (factors.exactRefMatch) { score += 60; explanation.push("Exact reference match (+60)"); }
                if (factors.vendorMatch) { score += 20; explanation.push("Vendor match (+20)"); }
                if (factors.logicalFlow) { score += 20; explanation.push("Logical accounting flow (+20)"); }
                break;

            case RelationshipTypes.CORROBORATES:
                if (factors.independentSource) { score += 50; explanation.push("Independent source verification (+50)"); }
                if (factors.exactMatch) { score += 40; explanation.push("Exact attribute symmetry (+40)"); }
                if (factors.timeMatch) { score += 10; explanation.push("Timestamp alignment (+10)"); }
                break;

            case RelationshipTypes.CONTRADICTS:
                score = 100; // Contradictions are definitive flags
                explanation.push("Irreconcilable data variance detected");
                break;

            default:
                score = 40; // Default weak score for generic classification
                explanation.push("Generic similarity detection");
        }

        const tier = Object.values(this.TIERS).find(t => score >= t.min && score <= t.max) || this.TIERS.UNRELIABLE;

        return {
            score: Math.min(100, score),
            tier: tier.label,
            factors,
            explanation
        };
    }
}
