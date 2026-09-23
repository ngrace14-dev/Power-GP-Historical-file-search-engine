/**
 * Materiality Engine - Phase 1
 * Evaluates financial variances, document amounts, and entity cross-footings
 * against configurable materiality thresholds to distinguish trivial rounding from material audit risk.
 */

export class MaterialityEngine {
    static DEFAULT_THRESHOLDS = {
        lineItemMateriality: 1000,      // Variances >= $1,000 trigger Elevated Materiality
        entityVarianceThreshold: 5000,  // Aggregate variances >= $5,000 trigger Critical Materiality
        overallScopeThreshold: 25000    // High-value exposure threshold
    };

    /**
     * Evaluates a single record against materiality thresholds
     */
    static evaluateRecord(record, customThresholds = {}) {
        const config = { ...this.DEFAULT_THRESHOLDS, ...customThresholds };
        const data = record.data || record;
        
        // Extract variance and total amounts
        const variance = Math.abs(parseFloat(record._validation?.variance || data.variance || 0));
        const amount = Math.abs(parseFloat(data.amount || data.doc_amount || data['Debit Amount'] || data['Credit Amount'] || 0));

        let materialityLevel = 'IMMATERIAL';
        let isMaterial = false;
        let reason = 'Variance is below reporting threshold.';

        if (variance >= config.entityVarianceThreshold) {
            materialityLevel = 'CRITICAL';
            isMaterial = true;
            reason = `Material variance ($${variance.toFixed(2)}) exceeds entity threshold ($${config.entityVarianceThreshold.toFixed(2)}).`;
        } else if (variance >= config.lineItemMateriality) {
            materialityLevel = 'ELEVATED';
            isMaterial = true;
            reason = `Variance ($${variance.toFixed(2)}) exceeds line-item threshold ($${config.lineItemMateriality.toFixed(2)}).`;
        } else if (amount >= config.overallScopeThreshold) {
            materialityLevel = 'HIGH_EXPOSURE';
            isMaterial = false; // Significant exposure, but no balance variance
            reason = `High-value exposure transaction ($${amount.toFixed(2)}).`;
        }

        return {
            isMaterial,
            materialityLevel,
            varianceAmount: variance,
            recordAmount: amount,
            reason,
            thresholdsUsed: config
        };
    }

    /**
     * Evaluates an entire dataset and appends materiality metadata
     */
    static evaluateDataset(records = [], customThresholds = {}) {
        if (!Array.isArray(records) || records.length === 0) {
            return { records: [], totalMaterialCount: 0 };
        }

        let totalMaterialCount = 0;
        const processed = records.map(rec => {
            const materiality = this.evaluateRecord(rec, customThresholds);
            if (materiality.isMaterial) totalMaterialCount++;
            
            rec._materiality = materiality;
            return rec;
        });

        return {
            records: processed,
            totalMaterialCount
        };
    }
}
