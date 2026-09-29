/**
 * Evidence Models - Governance v6.0
 */

/**
 * @typedef {('SUPPORTING'|'REFUTING'|'CONTEXTUAL'|'UNVERIFIED')} EvidenceRole
 */

/**
 * @typedef {Object} EvidencePackage
 * @property {string} packageId - Unique package identifier
 * @property {string} caseId - Parent Case ID
 * @property {string} title - Descriptive title of the evidence set
 * @property {Array<string>} recordIds - List of Lighthouse record IDs
 * @property {EvidenceRole} role - Intent of this package
 * @property {number} aggregateConfidence - Weighted average confidence
 * @property {Object} rationale - Forensic justification for inclusion
 */

/**
 * @typedef {Object} EvidenceCitation
 * @property {string} citationId - Unique citation handle
 * @property {string} caseId - Source Case
 * @property {string} recordId - Source Record
 * @property {string} locator - Formal coordinate (e.g. CASE-01:REC-99)
 * @property {string} timestamp - Selection timestamp
 */

export const EvidenceSchema = {};
