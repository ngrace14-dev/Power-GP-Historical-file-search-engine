import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// App Core
import { firebaseConfig, COMPANY_ENTITIES, MAX_VISIBLE_ROWS } from './config.js';
import { AppState } from './state.js';

// Controller Layer
import { IngestionController } from './controllers/ingestion-controller.js';
import { InvestigationController } from './controllers/investigation-controller.js';
import { AiController } from './controllers/ai-controller.js';
import { NarrativeController } from './controllers/narrative-controller.js';
import { EventController } from './controllers/event-controller.js';

// Renderer Layer
import { TransactionRenderer } from './renderers/transaction-renderer.js';
import { EventRenderer } from './renderers/event-renderer.js';
import { ContradictionRenderer } from './renderers/contradiction-renderer.js';
import { GraphRenderer } from './renderers/graph-renderer.js';

// UI Layer
import { TabsUI } from './ui/tabs.js';
import { ModalUI } from './ui/modals.js';
import { DrawerUI } from './ui/drawer.js';
import { LoaderUI } from './ui/loader.js';

// Utilities
import { Logger } from './utilities/logger.js';

// Existing Flat Root Engines
import { ProvenanceEngine } from '../provenance-engine.js'; 
import { EvidenceStateEngine } from '../evidence-state-engine.js'; 
import { ConfidenceEngine } from '../confidence-engine.js';
import { ClassificationEngine } from '../classification-engine.js';
import { ExtractionEngine } from '../extraction-engine.js';
import { ValidationEngine } from '../validation-engine.js';
import { GeminiService } from '../gemini-service.js';
import { MaterialityEngine } from '../materiality-engine.js';
import { RiskEngine } from '../risk-engine.js';
import { AuthorityEngine } from '../authority-engine.js';
import { CorroborationEngine } from '../corroboration-engine.js';
import { ContradictionEngine } from '../contradiction-engine.js';
import { InvestigationEngine } from '../investigation-engine.js';
import { ChainOfCustody } from '../chain-of-custody.js';

// Modular Engines
import { RelationshipEngine } from '../src/engines/relationship/relationship-engine.js';
import { AEREEngine } from '../src/engines/aere/aere-engine.js';
import { AiAnalystEngine } from '../src/engines/aere/ai-analyst-engine.js';
import { HypothesisCorroborationEngine } from '../src/engines/aere/hypothesis-corroboration-engine.js';

// Initialization
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

window.COMPANY_ENTITIES = COMPANY_ENTITIES;

onAuthStateChanged(auth, (user) => {
    if (user && user.email) {
        AppState.currentUserEmail = user.email;
        const emailEl = document.getElementById('userEmail');
        if (emailEl) emailEl.textContent = user.email;
    } else {
        window.location.href = 'index.html';
    }
});

// Helper for local orchestration
const localRenderResults = (data) => {
    EventController.renderResults(data, AppState, AEREEngine, {
        renderEventResults: EventRenderer.render,
        renderTransactionResults: TransactionRenderer.render,
        LoaderUI
    });
};

const localExecuteCloudIngestion = (files) => {
    IngestionController.executeCloudIngestion(files, AppState, {
        getDownloadURL, XLSX: window.XLSX, ClassificationEngine, ExtractionEngine, ConfidenceEngine, 
        ProvenanceEngine, EvidenceStateEngine, ValidationEngine, RelationshipEngine, CorroborationEngine, 
        MaterialityEngine, RiskEngine, AuthorityEngine, ContradictionEngine, ChainOfCustody, 
        LoaderUI, Logger, renderContradictionPanel: ContradictionRenderer.render, 
        renderResults: localRenderResults
    });
};

// Global Mappings for HTML onclick handlers
window.startInvestigationUI = () => InvestigationController.startInvestigationUI(AppState, InvestigationEngine, localRenderResults);
window.attachToCaseUI = (id) => InvestigationController.attachToCaseUI(id, AppState, InvestigationEngine, localRenderResults);
window.saveAndCloseCaseUI = () => InvestigationController.saveAndCloseCaseUI(AppState, localRenderResults);

window.fetchCloudCatalog = () => IngestionController.fetchCloudCatalog(AppState, storage, ref, listAll, Logger);
window.pullSelectedLedgers = () => IngestionController.pullSelectedLedgers(AppState, LoaderUI, localExecuteCloudIngestion);

window.generateAuditMemoUI = () => AiController.generateAuditMemoUI(AppState, GeminiService, ChainOfCustody, Logger);
window.askAiAssistant = () => AiController.askAiAssistant(AppState, GeminiService, ChainOfCustody);
window.triggerAiAnalyst = (ev) => AiController.triggerAiAnalyst(ev, AiAnalystEngine, HypothesisCorroborationEngine);

window.generateForensicNarrativeUI = () => NarrativeController.generateForensicNarrativeUI(AppState, InvestigationEngine, ChainOfCustody);

window.setRenderMode = (mode) => EventController.setRenderMode(mode, AppState, localRenderResults);
window.openForensicDrawer = (id) => window.openForensicDrawerOriginal(id); // placeholder, logic still in index for now or moved to drawer?

window.switchTab = TabsUI.switchTab;
window.closeMemoModal = ModalUI.closeMemoModal;
window.closeAiModal = ModalUI.closeAiModal;
window.closeGraphModal = ModalUI.closeGraphModal;
window.closeInvestigationDrawer = DrawerUI.closeInvestigationDrawer;
window.viewGraphLinks = (id) => GraphRenderer.viewGraphLinks(id, AppState);

// Manual logic mapping for complex drawer interactions
window.openForensicDrawer = (eventId) => {
    const event = AppState.reconstructedEvents.find(e => e.eventId === eventId);
    if (!event) return;

    const drawer = document.getElementById('drawer-investigation');
    if (drawer) {
        drawer.classList.remove('hidden');
        setTimeout(() => drawer.classList.remove('translate-x-full'), 10);
    }

    // Populate drawer elements... (This part remains as is but uses AppState)
    document.getElementById('drawer-event-id').textContent = event.eventId;
    document.getElementById('drawer-status').textContent = event.finalEconomicState.status;
    document.getElementById('drawer-intent').textContent = event.eventIntent?.replace('_', ' ');
    document.getElementById('drawer-net-impact').textContent = `$${event.netEconomicImpact.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('drawer-complexity').textContent = `${event.finalEconomicState.determinedFrom} Entries`;
    document.getElementById('drawer-confidence').textContent = `${Math.round(event.confidence.total * 100)}%`;
    
    // ... rest of population logic from original openForensicDrawer ...
    // Using global function triggerAiAnalyst mapped above
    window.triggerAiAnalyst(event);

    // Timeline Rendering
    const timeline = document.getElementById('drawer-timeline');
    if (timeline) {
        timeline.innerHTML = event.nodes.map((node) => {
            const r = node.data || node;
            let roleColor = 'text-slate-400';
            if (node.lifecycleRole === 'REVERSAL') roleColor = 'text-rose-400';
            if (node.lifecycleRole === 'CORRECTION') roleColor = 'text-amber-400';
            if (node.lifecycleRole === 'FINAL_ENTRY') roleColor = 'text-emerald-400';
            return `
                <div class="relative mb-6">
                    <div class="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-slate-700"></div>
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="text-[10px] font-bold ${roleColor} uppercase tracking-wider">${node.lifecycleRole}</div>
                            <div class="text-[11px] text-white font-mono mt-0.5">${r.voucherNumber || r.voucher} | ${r.invoiceNumber || r.doc_number}</div>
                            <div class="text-[9px] text-slate-500 mt-1">${r.transactionDate || r.doc_date}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs font-mono font-bold text-white">$${node.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    // Relationships
    const relContainer = document.getElementById('drawer-relationships');
    if (relContainer) {
        const allEdges = event.nodes.flatMap(n => [
            ...(n._relationships?.forensicEdges || []),
            ...(n._relationships?.anomalyEdges || []),
            ...(n._relationships?.classificationEdges || [])
        ]);
        if (allEdges.length === 0) {
            relContainer.innerHTML = '<div class="text-[10px] text-slate-600 text-center py-4 italic">No external graph relationships identified.</div>';
        } else {
            relContainer.innerHTML = allEdges.slice(0, 10).map(edge => {
                const targetId = edge.targetNode || edge.targetId || 'UNKNOWN';
                const safeId = targetId.toString();
                return `<div class="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between group hover:border-indigo-500/40 transition">
                    <div class="flex items-center gap-2">
                        <div class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${edge.relationshipType || edge.type}</div>
                        <span class="text-[10px] text-slate-400 font-mono">${safeId.substring(0, 12)}...</span>
                    </div>
                    <i data-lucide="chevron-right" class="w-3 h-3 text-slate-700"></i>
                </div>`;
            }).join('');
        }
    }

    lucide.createIcons();
};

window.resetState = () => {
    AppState.extractedData = [];
    AppState.reconstructedEvents = [];
    AppState.activeEvidenceGraph = null;
    AppState.originalFileName = "";
    document.getElementById('pdf-upload').value = '';
    document.getElementById('raw-text-input').value = '';
    document.getElementById('upload-section').classList.remove('hidden');
    document.getElementById('progress-section').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('terminal-logs').innerHTML = '<div>System initialized.</div>';
    document.getElementById('table-body').innerHTML = '';
    document.getElementById('btn-download').disabled = true;
    document.getElementById('btn-pass').disabled = true;
    LoaderUI.updateProgress(0, 'ANALYZING DOCUMENT...');
};

// Start
lucide.createIcons();
Logger.logSys('Lighthouse Workstation v3 Modular initialized.', 'success', AppState);
