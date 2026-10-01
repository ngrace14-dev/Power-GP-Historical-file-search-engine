export class InvestigationController {
    static startInvestigationUI(AppState, InvestigationEngine, renderResults) {
        const title = prompt("Enter a title for this Investigation Case:");
        if (!title) return;

        const entity = prompt("Enter Entity Domain boundary (e.g., POMCO, RREDCO):", "POMCO") || "UNKNOWN";

        try {
            AppState.activeCase = InvestigationEngine.createInvestigation(title, entity, AppState.currentUserEmail);
            this.renderCasePanel(AppState);
            renderResults(AppState.extractedData);
        } catch (err) {
            alert(err.message);
        }
    }

    static attachToCaseUI(recordId, AppState, InvestigationEngine, renderResults) {
        if (!AppState.activeCase) return alert("No active investigation case. Click 'Start Case' in the header to open a workspace.");

        const record = AppState.extractedData.find(r => r._id === recordId || r.data?.row_id === recordId);
        if (!record) return;

        const rationale = prompt("Enter mandatory Governance rationale for attaching this evidence:");
        if (!rationale) return alert("Governance Violation: Link rationale is required.");

        try {
            InvestigationEngine.attachEvidence(AppState.activeCase, record, rationale, AppState.currentUserEmail);
            this.renderCasePanel(AppState);
            renderResults(AppState.extractedData);
        } catch (err) {
            alert(err.message);
        }
    }

    static saveAndCloseCaseUI(AppState, renderResults) {
        if (!AppState.activeCase) return;
        alert(`Case ${AppState.activeCase.caseId} saved securely with ${AppState.activeCase.evidenceLog.length} evidence attachments.`);
        AppState.activeCase = null;
        const section = document.getElementById('case-section');
        if (section) section.classList.add('hidden');
        renderResults(AppState.extractedData);
    }

    static renderCasePanel(AppState) {
        if (!AppState.activeCase) return;
        const section = document.getElementById('case-section');
        if (!section) return;
        
        section.classList.remove('hidden');

        document.getElementById('case-title').textContent = AppState.activeCase.title;
        document.getElementById('case-state').textContent = AppState.activeCase.state;
        document.getElementById('case-entity').textContent = AppState.activeCase.entityContext;
        document.getElementById('case-id').textContent = AppState.activeCase.caseId;
        document.getElementById('case-count').textContent = AppState.activeCase.evidenceLog.length;
    }
}
