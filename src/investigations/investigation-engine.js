import { CaseService } from '../cases/services/case-service.js';
import { EvidenceService } from '../evidence/services/evidence-service.js';
import { FindingService } from '../findings/services/finding-service.js';
import { ChainOfCustody } from '../chain-of-custody.js';

/**
 * Investigation Engine - Governance v6.0
 * The core orchestrator for the investigation-centered workflow.
 */
export class InvestigationEngine {
    /**
     * Initializes a formal investigation context
     * @param {string} title
     * @param {string} entity
     * @param {string} user
     * @returns {Promise<Object>} The investigation context
     */
    static async openInvestigation(title, entity, user) {
        const auditCase = await CaseService.createCase(title, entity, user);
        
        const context = {
            case: auditCase,
            evidencePackages: [],
            findings: [],
            memorandum: null,
            timeline: []
        };

        await ChainOfCustody.recordEvent('INVESTIGATION_OPENED', {
            caseId: auditCase.caseId,
            entity
        }, user);

        return context;
    }

    /**
     * Pinned evidence to the investigation context
     * @param {Object} context
     * @param {Array<Object>} records
     * @param {string} rationale
     * @param {string} user
     */
    static async pinEvidence(context, records, rationale, user) {
        const pkg = await EvidenceService.assemblePackage(context.case.caseId, records, rationale, user);
        context.evidencePackages.push(pkg);
        
        this.logTimeline(context, 'EVIDENCE_PINNED', `Pinned ${records.length} records to case.`, user);
    }

    /**
     * Drafts a finding based on pinned evidence
     * @param {Object} context
     * @param {Object} findingData
     * @param {string} user
     */
    static async draftFinding(context, findingData, user) {
        const finding = await FindingService.recordFinding(context.case.caseId, findingData, user);
        context.findings.push(finding);
        
        this.logTimeline(context, 'FINDING_DRAFTED', `Finding drafted: ${finding.title}`, user);
    }

    /**
     * Internal Timeline logger for the investigation
     */
    static logTimeline(context, event, description, user) {
        context.timeline.push({
            timestamp: new Date().toISOString(),
            event,
            description,
            user
        });
    }
}
