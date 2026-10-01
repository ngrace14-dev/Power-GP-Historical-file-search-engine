export class EventController {
    static setRenderMode(mode, AppState, renderResults) {
        AppState.renderMode = mode;
        const btnEvent = document.getElementById('mode-event');
        const btnTxn = document.getElementById('mode-txn');
        
        if (btnEvent && btnTxn) {
            if (mode === 'EVENT') {
                btnEvent.classList.add('bg-cyan-500', 'text-slate-950');
                btnEvent.classList.remove('text-slate-400');
                btnTxn.classList.remove('bg-cyan-500', 'text-slate-950');
                btnTxn.classList.add('text-slate-400');
            } else {
                btnTxn.classList.add('bg-cyan-500', 'text-slate-950');
                btnTxn.classList.remove('text-slate-400');
                btnEvent.classList.remove('bg-cyan-500', 'text-slate-950');
                btnEvent.classList.add('text-slate-400');
            }
        }
        
        renderResults(AppState.extractedData);
    }

    static renderResults(data, AppState, AEREEngine, params) {
        const { renderEventResults, renderTransactionResults, LoaderUI } = params;
        console.time("Render Results");
        
        const progressSection = document.getElementById('progress-section');
        const resultsSection = document.getElementById('results-section');
        if (progressSection) progressSection.classList.add('hidden');
        if (resultsSection) resultsSection.classList.remove('hidden');
        
        if (AppState.renderMode === 'EVENT') {
            AppState.reconstructedEvents = AEREEngine.reconstruct(data);
            renderEventResults(AppState.reconstructedEvents);
        } else {
            renderTransactionResults(data);
        }
        
        console.timeEnd("Render Results");
        lucide.createIcons();
    }
}
