import { FindingScoring } from '../findings/finding-scoring.js';

/**
 * Theory Evaluator - Governance v6.0
 * Performs the mathematical weighing of evidence for a theory.
 */
export class TheoryEvaluator {
    /**
     * Evaluates the strength of a hypothesis based on attached evidence
     * @param {Object} hypothesis
     * @param {Array<Object>} allPackages - The full evidence packages lookup
     */
    static evaluate(hypothesis, allPackages) {
        const supporting = allPackages.filter(p => hypothesis.supportingEvidencePackages.includes(p.packageId));
        const contradicting = allPackages.filter(p => hypothesis.contradictingEvidencePackages.includes(p.packageId));

        const avgSupportConfidence = supporting.length > 0 
            ? supporting.reduce((acc, p) => acc + p.aggregateConfidence, 0) / supporting.length 
            : 0;

        const confidence = FindingScoring.calculateConfidence({
            evidenceStrength: avgSupportConfidence,
            corroborationLevel: supporting.length,
            contradictionCount: contradicting.length,
            materialityScore: 75, // Default for theory evaluation
            riskWeight: 0
        });

        hypothesis.confidence = confidence;

        if (contradicting.length > 0 && confidence < 50) {
            hypothesis.status = 'CONTRADICTED';
        } else if (confidence >= 80) {
            hypothesis.status = 'SUPPORTED';
        } else {
            hypothesis.status = 'ACTIVE';
        }

        return hypothesis;
    }
}
