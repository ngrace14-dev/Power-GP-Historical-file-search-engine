/**
 * Case Lifecycle & Types - Governance v6.0
 */

/**
 * @typedef {('OPEN'|'ACTIVE'|'REVIEW'|'RESOLVED'|'ARCHIVED')} CaseStatus
 */

/**
 * @typedef {('AUDIT'|'INVESTIGATION'|'DUE_DILIGENCE'|'COMPLIANCE')} CaseType
 */

/**
 * @typedef {Object} AuditCase
 * @property {string} caseId - Unique investigation identifier
 * @property {string} title - Human-readable case title
 * @property {CaseStatus} status - Current lifecycle phase
 * @property {CaseType} type - Investigative intent
 * @property {string} entityContext - Primary entity boundary (e.g. POMCO)
 * @property {string} leadAuditor - User email of case owner
 * @property {Array<string>} participants - Authorized viewer emails
 * @property {string} createdAt - ISO Timestamp
 * @property {string} updatedAt - ISO Timestamp
 * @property {Object} metadata - Context-specific configurations
 */

export const CaseSchema = {};
