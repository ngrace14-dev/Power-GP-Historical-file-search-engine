/**
 * Investigation Engine - Phase 8 (Governance v6.0 Compliant)
 * Handles comprehensive case file lifecycle management:
 * - Case Creation with strict Entity Boundary isolation
 * - Tri-Evidence Logging (Supporting, Contradicting, Unresolved)
 * - Mandatory Rationale Tracking for attached evidence
 * - Structured Finding & Conclusion Stamping
 * - Chain-of-Custody Event Audit Logging
 */

import { AIGovernanceEngine } from './ai-governance.js';
import { ChainOfCustody } from './chain-of-custody.js';

export class InvestigationEngine {

    static CASE_STATES = [
        'Open', 
        'Evidence Gathering', 
        'Validation', 
        'Corroboration', 
        'Escalated', 
        'Resolved', 
        'Archived'
    ];

    /**
     * Creates a new isolated Investigation Case
     */
    static createInvestigation(title, entityContext, authorEmail) {
        if (!title || !entityContext || !authorEmail) {
            throw new Error("Governance Violation (Rule 8): Investigation creation requires Title, Entity Domain, and Author Email.");
        }

        const caseId = `CASE_${entityContext.toUpperCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const newCase = {
            caseId,
            title,
            entityContext: entityContext.toUpperCase(),
            authorEmail,
            state: 'Open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            evidenceLog: [],       // Attached Evidence Proxies with Rationale
            contradictionLog: [],  // Linked Contradictions (Anti-Suppression)
            findings: [],          // Validated Audit Findings
            notes: [],             // Investigator Review Notes
            resolutionSummary: null
        };

        ChainOfCustody.recordEvent("INVESTIGATION_CASE_CREATED", {
            caseId,
            title,
            entityContext: entityContext.toUpperCase()
        }, authorEmail);

        return newCase;
    }

    /**
     * Attaches evidence to an investigation with mandatory Governance rationale
     */
    static attachEvidence(caseObj, record, rationale, userEmail) {
        if (!caseObj || !record) {
            throw new Error("Invalid Case or Evidence Record.");
        }

        if (!rationale || rationale.trim().length < 5) {
            throw new Error("Governance Violation (Rule 8): Attaching evidence requires a clear rationale (minimum 5 characters).");
        }

        const recordEntity = (record._provenance?.entityContext || record._location || '').toUpperCase();
        
        // Enforce Entity Isolation Boundary
        AIGovernanceEngine.enforceEntityIsolation(caseObj.entityContext, recordEntity, false);

        const recordId = record._id || record.data?.row_id;
        const isDuplicate = caseObj.evidenceLog.some(item => item.recordId === recordId);

        if (isDuplicate) {
            throw new Error(`Record ${recordId} is already attached to Case ${caseObj.caseId}.`);
        }

        const entry = {
            attachedId: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            recordId,
            attachedAt: new Date().toISOString(),
            attachedBy: userEmail || caseObj.authorEmail,
            rationale: rationale.trim(),
            snapshot: {
                vendor: record.data?.vendor || record.data?.vendor_name || record['Originating Master Name'] || 'Vendor',
                amount: parseFloat(record.data?.amount || record.data?.doc_amount || record['Debit Amount'] || record['Credit Amount'] || 0),
                invoice: record.data?.invoiceNumber || record.data?.doc_number || record['Invoice Number'] || '-',
                voucher: record.data?.voucherNumber || record.data?.voucher || record['Journal Entry'] || '-',
                trustLevel: record._provenance?.trustLevel || record._trustLevel || 5,
                corroborationLevel: record._corroboration?.corroborationLevel || 'A',
                riskScore: record._risk?.riskScore || 0
            }
        };

        caseObj.evidenceLog.push(entry);
        caseObj.updatedAt = new Date().toISOString();

        // Auto-link contradictions if present (Anti-Suppression)
        if (record._contradictions?.hasContradictions) {
            record._contradictions.flags.forEach(flag => {
                caseObj.contradictionLog.push({
                    flaggedAt: new Date().toISOString(),
                    recordId,
                    ...flag
                });
            });
        }

        // Progress case lifecycle state if gathering evidence
        if (caseObj.state === 'Open') {
            caseObj.state = 'Evidence Gathering';
        }

        ChainOfCustody.recordEvent("EVIDENCE_ATTACHED_TO_CASE", {
            caseId: caseObj.caseId,
            recordId,
            rationale: rationale.trim()
        }, userEmail || caseObj.authorEmail);

        return entry;
    }

    /**
     * Adds an investigator finding or review note
     */
    static addFinding(caseObj, findingText, userEmail) {
        if (!findingText || findingText.trim().length === 0) return;

        const finding = {
            findingId: `FINDING_${Date.now()}`,
            timestamp: new Date().toISOString(),
            author: userEmail,
            text: findingText.trim()
        };

        caseObj.findings.push(finding);
        caseObj.updatedAt = new Date().toISOString();

        ChainOfCustody.recordEvent("CASE_FINDING_ADDED", {
            caseId: caseObj.caseId,
            findingId: finding.findingId
        }, userEmail);

        return finding;
    }

    /**
     * Advances Case Lifecycle State
     */
    static updateCaseState(caseObj, newState, userEmail) {
        if (!this.CASE_STATES.includes(newState)) {
            throw new Error(`Invalid Case State '${newState}'.`);
        }

        const oldState = caseObj.state;
        caseObj.state = newState;
        caseObj.updatedAt = new Date().toISOString();

        ChainOfCustody.recordEvent("CASE_STATE_UPDATED", {
            caseId: caseObj.caseId,
            oldState,
            newState
        }, userEmail);

        return caseObj;
    }
}
