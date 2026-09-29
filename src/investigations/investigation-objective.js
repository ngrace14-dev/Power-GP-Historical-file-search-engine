/**
 * Investigation Objective Models - Governance v6.0
 */

/**
 * @typedef {('FORENSIC'|'COMPLIANCE'|'OPERATIONAL'|'FINANCIAL')} ObjectiveType
 */

/**
 * @typedef {Object} InvestigationObjective
 * @property {string} id - Unique objective identifier
 * @property {string} caseId - Parent Case ID
 * @property {string} question - The central investigative question
 * @property {ObjectiveType} type - The domain of the inquiry
 * @property {string} status - PENDING | ACTIVE | CONCLUDED
 * @property {string} createdAt - ISO Timestamp
 */

/**
 * @typedef {Object} InvestigationPlan
 * @property {string} id - Plan identifier
 * @property {string} objectiveId - Target objective
 * @property {Array<string>} steps - Planned investigative procedures
 * @property {Array<string>} targetEntities - Entity boundaries
 * @property {Array<string>} targetAccounts - Account boundaries
 */

export const ObjectiveSchema = {};
