/**
 * Findings Models - Governance v6.0
 */

/**
 * @typedef {('OBSERVATION'|'ISSUE'|'DRAFT_FINDING'|'PROCEDURE_GAP')} FindingType
 */

/**
 * @typedef {('CRITICAL'|'SIGNIFICANT'|'MINOR'|'IMMATERIAL')} ImpactLevel
 */

/**
 * @typedef {Object} ForensicFinding
 * @property {string} findingId - Unique finding identifier
 * @property {string} caseId - Parent Case ID
 * @property {FindingType} type - Classification of finding
 * @property {string} title - Summary statement
 * @property {string} description - Detailed forensic narrative
 * @property {ImpactLevel} impact - Materiality assessment
 * @property {Array<string>} supportingEvidenceIds - Pointers to EvidencePackages
 * @property {Array<string>} contradictingEvidenceIds - Pointers to Refuting Evidence
 * @property {string} auditorCommentary - Human-added forensic context
 * @property {boolean} isResolved - Review status
 */

export const FindingSchema = {};
