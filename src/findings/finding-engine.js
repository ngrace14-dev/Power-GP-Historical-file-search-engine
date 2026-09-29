import { FindingScoring } from './finding-scoring.js';
import { TheoryStatus, FindingTypes } from './finding-taxonomy.js';
import { ChainOfCustody } from '../chain-of-custody.js';

/**
 * Finding Engine - Governance v6.0
 * Transforms raw Evidence Packages into Governed Forensic Findings.
 */
export class FindingEngine {
    /**
     * Generates a forensic observation based on an Evidence Package
     * @param {Object} evidencePackage
     * @param {Object} context - Risk, Materiality, and Authority data
     * @returns {Object} Governed Observation
     */
    static generateObservation(evidencePackage, context) {
        const confidence = FindingScoring.calculateConfidence({
            evidenceStrength: evidencePackage.aggregateConfidence,
            corroborationLevel: context.corroboration?.sourceCount || 1,
            contradictionCount: context.contradictions?.length || 0,
            materialityScore: context.materiality?.score || 50,
            riskWeight: context.risk?.riskScore || 0
        });

        const observation = {
            id: `OBS_${Date.now()}`,
            packageId: evidencePackage.packageId,
            type: FindingTypes.OBSERVATION,
            confidence,
            summary: `Automated observation of ${evidencePackage.recordIds.length} records.`,
            metrics: {
                riskScore: context.risk?.riskScore || 0,
                impact: context.materiality?.materialityLevel || 'MINOR'
            },
            timestamp: new Date().toISOString()
        };

        return observation;
    }

    /**
     * Promotes an observation to an Investigation Theory
     * @param {Object} observation
     * @param {Array<string>} supportingIds
     * @param {Array<string>} contradictingIds
     * @returns {Object} InvestigationTheory
     */
    static async deriveTheory(observation, supportingIds = [], contradictingIds = []) {
        const theory = {
            theoryId: `THEORY_${Date.now()}`,
            title: `Investigation Theory based on ${observation.id}`,
            supportingEvidence: supportingIds,
            contradictingEvidence: contradictingIds,
            confidence: observation.confidence,
            status: contradictingIds.length > 0 ? TheoryStatus.CONTRADICTED : TheoryStatus.PROPOSED,
            governance: {
                draftedAt: new Date().toISOString(),
                requiresHumanReview: observation.confidence < 75 || contradictingIds.length > 0
            }
        };

        await ChainOfCustody.recordEvent('THEORY_DERIVED', {
            theoryId: theory.theoryId,
            confidence: theory.confidence,
            status: theory.status
        }, "FindingEngine_v1");

        return theory;
    }
}
