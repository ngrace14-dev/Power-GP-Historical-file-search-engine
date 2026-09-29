import { FindingScoring } from '../findings/finding-scoring.js';
import { ChainOfCustody } from '../chain-of-custody.js';

/**
 * Hypothesis Engine - Governance v6.0
 * Manages the generation and tracking of investigative theories.
 */
export class HypothesisEngine {
    /**
     * Creates a new hypothesis (Theory) to address an objective step
     * @param {string} objectiveId
     * @param {string} statement - The core hypothesis (e.g. "Vendor A and B are related")
     */
    static createHypothesis(objectiveId, statement) {
        return {
            id: `HYP_${Date.now()}`,
            objectiveId,
            statement,
            supportingEvidencePackages: [],
            contradictingEvidencePackages: [],
            confidence: 0,
            status: 'PROPOSED'
        };
    }

    /**
     * Attaches evidence to a hypothesis and triggers re-scoring
     */
    static async linkEvidence(hypothesis, packageId, isSupporting = true, user) {
        if (isSupporting) {
            hypothesis.supportingEvidencePackages.push(packageId);
        } else {
            hypothesis.contradictingEvidencePackages.push(packageId);
        }

        await ChainOfCustody.recordEvent('HYPOTHESIS_EVIDENCE_LINKED', {
            id: hypothesis.id,
            packageId,
            isSupporting
        }, user);
    }
}
