export class AiController {
    static async generateAuditMemoUI(AppState, GeminiService, ChainOfCustody, Logger) {
        if (!AppState.extractedData || AppState.extractedData.length === 0) {
            return alert("No extracted data available to generate memorandum. Please pull cloud ledgers or ingest a document first.");
        }

        const modal = document.getElementById('modal-memo-result');
        const content = document.getElementById('memo-response-content');

        if (!modal || !content) return;

        modal.classList.remove('hidden');
        content.textContent = "Drafting Governed Evidence Memorandum from Level 1-4 source records...";

        try {
            const gemini = new GeminiService();
            const memoMarkdown = await gemini.generateAuditMemo(AppState.extractedData, "Corporate General Ledger Forensic Audit Memorandum");
            content.textContent = memoMarkdown;
            
            await ChainOfCustody.recordEvent("MEMO_GENERATED", {
                recordCount: AppState.extractedData.length,
                title: "Corporate General Ledger Forensic Audit Memorandum"
            }, AppState.currentUserEmail);

            Logger.logSys('Phase 6 Forensic Audit Memorandum generated and stamped into Phase 7 Chain of Custody.', 'success', AppState);
        } catch (err) {
            content.textContent = `Error generating Audit Memorandum: ${err.message}`;
        }
    }

    static async askAiAssistant(AppState, GeminiService, ChainOfCustody) {
        if (!AppState.extractedData || AppState.extractedData.length === 0) {
            return alert("No extracted data available to analyze. Please pull cloud ledgers or ingest a document first.");
        }

        const userQuery = prompt("Ask AI Audit Assistant (e.g. 'Identify anomalies or variance flags across these digitized ledgers', 'Summarize top vendor exposure'):");
        if (!userQuery) return;

        const modal = document.getElementById('modal-ai-result');
        const content = document.getElementById('ai-response-content');
        
        if (!modal || !content) return;

        modal.classList.remove('hidden');
        content.innerHTML = '<div class="flex items-center gap-3 text-purple-400 font-bold justify-center py-10"><i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i> Analyzing digitized Lighthouse records with AI reasoning engine...</div>';
        lucide.createIcons();

        try {
            const gemini = new GeminiService();
            const payloadToAnalyze = AppState.extractedData.map(d => d.data || d);
            
            const responseText = await gemini.queryEvidence(
                userQuery, 
                payloadToAnalyze, 
                "LIGHTHOUSE_STUDIO"
            );

            let formattedHtml = responseText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br/>')
                .replace(/- /g, '&bull; ');

            content.innerHTML = `<div class="bg-purple-950/50 p-4 rounded-xl mb-4 text-purple-200 border border-purple-500/20 font-mono text-xs"><i data-lucide="message-square-text" class="w-4 h-4 inline mr-1"></i> Audit Scope: "${userQuery}"</div>${formattedHtml}`;
            
            await ChainOfCustody.recordEvent("AI_REASONING_QUERY", { query: userQuery }, AppState.currentUserEmail);
            lucide.createIcons();
        } catch (err) {
            content.innerHTML = `<div class="p-5 text-rose-400 font-bold bg-rose-950/50 border border-rose-500/30 rounded-xl"><i data-lucide="alert-triangle" class="w-5 h-5 inline mr-2"></i> Error: ${err.message}</div>`;
            lucide.createIcons();
        }
    }

    static async triggerAiAnalyst(event, AiAnalystEngine, HypothesisCorroborationEngine) {
        const container = document.getElementById('ai-analyst-container');
        const interpretation = document.getElementById('ai-interpretation');
        const confidence = document.getElementById('ai-confidence-badge');
        const rec = document.getElementById('ai-recommendation');
        const evidenceList = document.getElementById('ai-evidence-list');
        const mostLikely = document.getElementById('ai-most-likely');
        const alternative = document.getElementById('ai-alternative');
        const altContainer = document.getElementById('ai-alt-container');
        const warnings = document.getElementById('ai-warnings');

        if (!container) return;

        container.classList.remove('hidden');
        interpretation.textContent = "Analyzing event context with Level 5 AI Reasoning...";
        confidence.textContent = "...";
        rec.textContent = "Processing...";
        evidenceList.innerHTML = '';
        mostLikely.textContent = '...';
        alternative.textContent = '...';
        altContainer.classList.add('hidden');
        warnings.innerHTML = '';
        warnings.classList.add('hidden');

        try {
            const analysis = await AiAnalystEngine.analyzeEvent(event);
            const corrob = HypothesisCorroborationEngine.corroborate(event, analysis);
        
            interpretation.textContent = analysis.interpretation;
            confidence.textContent = analysis.confidence + ' Confidence';
        
            confidence.className = 'px-2 py-0.5 rounded text-[9px] font-bold border uppercase whitespace-nowrap ' + 
                (analysis.confidence === 'High' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 
                (analysis.confidence === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                'bg-rose-500/20 text-rose-300 border-rose-500/30'));

            rec.innerHTML = `<i data-lucide="arrow-right-circle" class="w-3.5 h-3.5 text-purple-400"></i> ${analysis.recommendations[0] || 'Review manual entries.'}`;
        
            evidenceList.innerHTML = (analysis.evidenceUsed || []).map(e => `
                <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-purple-500/20 text-[8px] font-mono text-purple-400/80">${e}</span>
            `).join('');

            const renderExplanation = (exp, cor) => {
                if (!exp) return '';
                const corStatus = cor?.status || 'NOT EVALUATED';
                const corColor = corStatus === 'SUPPORTED' ? 'text-emerald-400' : (corStatus === 'PARTIALLY SUPPORTED' ? 'text-amber-400' : 'text-rose-400');
            
                return `
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] text-purple-100/90 italic leading-snug">${exp.explanation}</span>
                        <span class="text-[8px] font-bold px-1.5 py-0.5 rounded border border-current ${corColor} bg-current/10 uppercase ml-2 whitespace-nowrap">${corStatus}</span>
                    </div>
                    ${cor?.supporting?.length > 0 ? `<div class="text-[8px] text-slate-500 font-mono mt-1">Verified: ${cor.supporting.join(', ')}</div>` : ''}
                `;
            };

            mostLikely.innerHTML = renderExplanation(analysis.mostLikely, corrob?.mostLikely);
            if (analysis.alternative && analysis.alternative.explanation) {
                altContainer.classList.remove('hidden');
                alternative.innerHTML = renderExplanation(analysis.alternative, corrob?.alternative);
            }

            if (analysis.warnings && analysis.warnings.length > 0) {
                warnings.classList.remove('hidden');
                warnings.innerHTML = analysis.warnings.map(w => `
                    <div class="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-1">
                        <div class="flex items-center gap-2 text-[9px] font-bold text-rose-400 uppercase">
                            <i data-lucide="alert-triangle" class="w-3 h-3"></i>
                            Internal Consistency Warning: ${w.fields}
                        </div>
                        <p class="text-[9px] text-rose-300/80 leading-relaxed">${w.reason}</p>
                        <div class="text-[8px] font-mono text-rose-400 mt-1">Next Step: ${w.reviewStep}</div>
                    </div>
                `).join('');
            }
            lucide.createIcons();
        } catch (err) {
            interpretation.textContent = "AI Analyst error: " + err.message;
        }
    }
}
