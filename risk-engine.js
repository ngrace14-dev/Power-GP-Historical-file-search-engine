/**
 * Risk Engine - Phase 2 (Governance v6.0 Compliant)
 * Generates a composite 0-100 Forensic Risk Score by evaluating weighted indicators:
 * - Materiality Level (Max 35 pts)
 * - Validation & Tie-Out Failures (Max 25 pts)
 * - Cross-Entity Collisions & Contradictions (Max 25 pts)
 * - Corroboration & Source Independence Deficits (Max 15 pts)
 * - Parsing & OCR Confidence Deficits (Max 10 pts)
 */

export class RiskEngine {

    /**
     * Evaluates a single record and calculates a transparent Forensic Risk Score
     */
    static calculateRisk(record) {
        let score = 0;
        const factors = [];
        const data = record.data || record;

        // 1. Materiality Risk Assessment (Max 35 pts)
        const mat = record._materiality || {};
        if (mat.materialityLevel === 'CRITICAL') {
            score += 35;
            factors.push({ indicator: 'Critical Material Variance', points: 35 });
        } else if (mat.materialityLevel === 'SIGNIFICANT') {
            score += 25;
            factors.push({ indicator: 'Significant Material Variance', points: 25 });
        } else if (mat.materialityLevel === 'MODERATE') {
            score += 15;
            factors.push({ indicator: 'Moderate Discrepancy', points: 15 });
        } else if (mat.materialityLevel === 'HIGH_SCOPE') {
            score += 10;
            factors.push({ indicator: 'High Scope Dollar Exposure (>= $25,000)', points: 10 });
        }

        // 2. Math Validation & Tie-Out Failure (Max 25 pts)
        const val = record._validation || {};
        if (val.tieOutStatus === 'FAIL') {
            score += 25;
            factors.push({ indicator: 'Math Tie-Out Validation Failure', points: 25 });
        }

        // 3. Contradictions & Cross-Entity Collisions (Max 25 pts)
        const rel = record._relationships || {};
        const tier1 = rel.tier1Edges || [];
        const hasCollision = tier1.some(e => e.label === "Cross-Entity Invoice Collision");
        
        if (hasCollision) {
            score += 25;
            factors.push({ indicator: 'Cross-Entity Invoice Boundary Collision', points: 25 });
        }

        // 4. Corroboration & Independence Deficit (Max 15 pts)
        const corr = record._corroboration || {};
        if (corr.corroborationLevel === 'A' && !rel.hasLinks) {
            score += 15;
            factors.push({ indicator: 'Uncorroborated Single-Source Record', points: 15 });
        } else if (!corr.isIndependent) {
            score += 5;
            factors.push({ indicator: 'Same-Source Duplicate Matches Only', points: 5 });
        }

        // 5. Parsing & OCR Confidence Deficit (Max 10 pts)
        const prov = record._provenance || {};
        const parseConf = prov.confidenceMetrics?.parsingConfidence || 100;
        if (parseConf < 70) {
            const points = Math.min(10, Math.floor((100 - parseConf) / 3));
            score += points;
            factors.push({ indicator: `Low Parsing Confidence (${parseConf.toFixed(0)}%)`, points });
        }

        // Score Cap at 100
        const finalScore = Math.min(100, score);

        let riskClass = 'LOW';
        let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

        if (finalScore >= 80) {
            riskClass = 'CRITICAL';
            badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        } else if (finalScore >= 50) {
            riskClass = 'ELEVATED';
            badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        } else if (finalScore >= 25) {
            riskClass = 'MODERATE';
            badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
        }

        return {
            riskScore: finalScore,
            riskClass,
            badgeColor,
            riskFactors: factors
        };
    }

    /**
     * Evaluates a dataset and appends risk scoring metadata
     */
    static evaluateDataset(records = []) {
        if (!Array.isArray(records) || records.length === 0) {
            return { records: [], elevatedRiskCount: 0 };
        }

        let elevatedRiskCount = 0;
        const processed = records.map(rec => {
            const risk = this.calculateRisk(rec);
            if (risk.riskScore >= 50) elevatedRiskCount++;
            rec._risk = risk;
            return rec;
        });

        return {
            records: processed,
            elevatedRiskCount
        };
    }
}
