import { ChainOfCustody } from '../../chain-of-custody.js';

/**
 * Case Management Service - Governance v6.0
 */
export class CaseService {
    /**
     * Initializes a new Audit Case
     * @param {string} title
     * @param {string} entity
     * @param {string} user
     * @returns {Promise<AuditCase>}
     */
    static async createCase(title, entity, user) {
        const auditCase = {
            caseId: `CASE_${Date.now()}`,
            title,
            status: 'OPEN',
            type: 'AUDIT',
            entityContext: entity.toUpperCase(),
            leadAuditor: user,
            participants: [user],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {}
        };

        await ChainOfCustody.recordEvent('CASE_CREATED', {
            caseId: auditCase.caseId,
            title: auditCase.title,
            entity: auditCase.entityContext
        }, user);

        return auditCase;
    }

    /**
     * Updates case status with governance validation
     * @param {AuditCase} auditCase
     * @param {CaseStatus} newStatus
     * @param {string} user
     */
    static async updateStatus(auditCase, newStatus, user) {
        const oldStatus = auditCase.status;
        auditCase.status = newStatus;
        auditCase.updatedAt = new Date().toISOString();

        await ChainOfCustody.recordEvent('CASE_STATUS_UPDATED', {
            caseId: auditCase.caseId,
            oldStatus,
            newStatus
        }, user);
    }
}
