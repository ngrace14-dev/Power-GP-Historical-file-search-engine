/**
 * Materiality Engine - Governance v6.0 Compliant
 * Combines Absolute Dollar Thresholds with Relative Percentage Exposure
 * to prevent false alarms on high-volume account balances.
 */

export class MaterialityEngine {
    static DEFAULT_THRESHOLDS = {
        absCriticalThreshold: 5000,      // $5,000 dollar variance
        absSignificantThreshold: 1000,   // $1,000 dollar variance
        relCriticalPercent: 5.0,         // 5.0% relative variance
        relSignificantPercent: 1.0,     // 1.0% relative variance
        highScopeAmount: 25000           // High-value audit scope threshold
    };

    /**
     * Evaluates a single record using compound Absolute + Relative Materiality
     */
    static evaluateRecord(record, customThresholds = {}) {
        const config = { ...this.DEFAULT_THRESHOLDS, ...customThresholds };
        const data = record.data || record;
        
        const variance = Math.abs(parseFloat(record._validation?.variance || data.variance || 0));
        const amount = Math.abs(parseFloat(data.amount || data.doc_amount || data['Debit Amount'] || data['Credit Amount'] || 0));

        const baseAmount = amount > 0 ? amount : 1;
        const variancePercent = (variance / baseAmount) * 100;

        let materialityLevel = 'IMMATERIAL';
        let isMaterial = false;
        let reason = 'Variance is below reporting and relative threshold.';

        // Compound Check: Requires BOTH Dollar Variance AND Relative % Variance
        if (variance >= config.absCriticalThreshold && variancePercent >= config.relCriticalPercent) {
            materialityLevel = 'CRITICAL';
            isMaterial = true;
            reason = `Critical: Variance ($${variance.toFixed(2)}) is ${variancePercent.toFixed(1)}% of base amount ($${amount.toFixed(2)}).`;
        } else if (variance >= config.absSignificantThreshold && variancePercent >= config.relSignificantPercent) {
            materialityLevel = 'SIGNIFICANT';
            isMaterial = true;
            reason = `Significant: Variance ($${variance.toFixed(2)}) is ${variancePercent.toFixed(1)}% of base amount ($${amount.toFixed(2)}).`;
        } else if (variancePercent >= 10.0 && variance >= 100) {
            materialityLevel = 'MODERATE';
            isMaterial = true;
            reason = `Relative Discrepancy: Variance ($${variance.toFixed(2)}) represents ${variancePercent.toFixed(1)}% of transaction total ($${amount.toFixed(2)}).`;
        } else if (amount >= config.highScopeAmount) {
            materialityLevel = 'HIGH_SCOPE';
            isMaterial = false; // High exposure transaction, but no balance variance
            reason = `High-value exposure scope ($${amount.toFixed(2)}).`;
        }

        return {
            isMaterial,
            materialityLevel,
            varianceAmount: variance,
            variancePercent: parseFloat(variancePercent.toFixed(2)),
            recordAmount: amount,
            reason,
            thresholdsUsed: config
        };
    }

    /**
     * Evaluates a dataset and appends materiality metadata
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
