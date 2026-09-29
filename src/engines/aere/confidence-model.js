/**
 * Confidence Model for Accounting Event Reconstruction
 * Provides deterministic scoring based on data quality and relationship strength.
 */
export class ConfidenceModel {
    /**
     * Calculates the confidence scores for a reconstructed event
     * @param {Object} eventData - The components of the event being built
     * @returns {Object} Confidence matrix
     */
    static calculate(eventData) {
        const { anchor, nodes, relationships } = eventData;

        // 1. Anchor Confidence: How unique is the document identifier?
        let anchorScore = 0.5; // Baseline
        if (anchor.docNumber && anchor.docNumber !== 'UNKNOWN') anchorScore += 0.3;
        if (anchor.vendorId && anchor.vendorId !== 'UNKNOWN') anchorScore += 0.2;
        if (anchor.docNumber.length < 3) anchorScore -= 0.4; // Generic numbers like "1" or "INV"

        // 2. Chronology Confidence: How clear is the date sequence?
        let chronologyScore = 1.0;
        const dates = nodes.map(n => new Date(n.transactionDate || n.doc_date).getTime());
        const hasDivergentDates = dates.some((d, i) => i > 0 && d < dates[i-1]);
        if (hasDivergentDates) chronologyScore -= 0.3; // Out-of-order sequence detected
        if (nodes.length > 5) chronologyScore -= 0.2;  // High complexity reduces clarity

        // 3. Relationship Confidence: Strength of links between nodes
        let relationshipScore = 0.6;
        const hasVoucherContinuity = this.checkVoucherContinuity(nodes);
        if (hasVoucherContinuity) relationshipScore += 0.4;

        // Ensure bounds [0, 1]
        const clamp = (val) => Math.min(Math.max(val, 0), 1);
        
        anchorScore = clamp(anchorScore);
        chronologyScore = clamp(chronologyScore);
        relationshipScore = clamp(relationshipScore);

        // Weighted Total
        const total = (anchorScore * 0.4) + (chronologyScore * 0.3) + (relationshipScore * 0.3);

        return {
            total: parseFloat(total.toFixed(2)),
            anchorConfidence: anchorScore,
            chronologyConfidence: chronologyScore,
            relationshipConfidence: relationshipScore
        };
    }

    /**
     * Checks if voucher numbers follow a logical system sequence
     */
    static checkVoucherContinuity(nodes) {
        if (nodes.length < 2) return false;
        const vouchers = nodes.map(n => String(n.voucherNumber || n.voucher || ''));
        // Logic: Same prefix or sequential numbers
        const prefixes = vouchers.map(v => v.replace(/[0-9]/g, ''));
        const allSamePrefix = prefixes.every(p => p === prefixes[0] && p !== '');
        return allSamePrefix;
    }
}
