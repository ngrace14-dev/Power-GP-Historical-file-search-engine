export class NarrativeController {
    static async generateForensicNarrativeUI(AppState, InvestigationEngine, ChainOfCustody) {
      if (!AppState.extractedData || AppState.extractedData.length === 0) {
        return alert("No data available to synthesize. Please ingest records first.");
      }

      const modal = document.getElementById('modal-ai-result');
      const content = document.getElementById('ai-response-content');
      
      if (!modal || !content) return;

      modal.classList.remove('hidden');
      content.innerHTML = '<div class="flex items-center gap-3 text-cyan-400 font-bold justify-center py-10"><i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i> Synthesizing Forensic Narrative...</div>';
      lucide.createIcons();

      try {
        const result = await InvestigationEngine.runNarrativeSynthesis(AppState.extractedData);
        const { synthesis, reasoning, briefs } = result;

        const roleColors = {
          controller: { border: 'hover:border-cyan-500/30', icon: 'text-cyan-400', popupBorder: 'border-cyan-500/40' },
          auditor: { border: 'hover:border-emerald-500/30', icon: 'text-emerald-400', popupBorder: 'border-emerald-500/40' },
          m_and_a: { border: 'hover:border-amber-500/30', icon: 'text-amber-400', popupBorder: 'border-amber-500/40' },
          executive: { border: 'hover:border-purple-500/30', icon: 'text-purple-400', popupBorder: 'border-purple-500/40' }
        };

        let html = `
          <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              ${Object.entries(briefs).map(([role, text]) => {
                const config = roleColors[role] || { border: 'hover:border-slate-500/30', icon: 'text-slate-400', popupBorder: 'border-slate-500/40' };
                const label = { controller: 'Controller', auditor: 'Audit', m_and_a: 'M&A', executive: 'Executive' }[role] || role;
                const icon = { controller: 'user-cog', auditor: 'clipboard-check', m_and_a: 'briefcase', executive: 'presentation' }[role] || 'user';
                const sub = { controller: 'What did I inherit?', auditor: 'What deserves attention?', m_and_a: 'What is hidden?', executive: 'What matters?' }[role] || '';

                return `
                  <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 ${config.border} transition group cursor-help relative" onclick="this.querySelector('.brief-popup').classList.toggle('hidden')">
                    <div class="flex items-center gap-2 mb-2">
                      <i data-lucide="${icon}" class="w-4 h-4 ${config.icon}"></i>
                      <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">${label} Brief</span>
                    </div>
                    <p class="text-[10px] text-slate-500 font-medium">"${sub}"</p>
                    <div class="brief-popup hidden absolute top-full left-0 right-0 z-50 mt-2 p-4 bg-slate-900 border ${config.popupBorder} rounded-xl shadow-2xl max-h-64 overflow-y-auto text-[11px] font-sans leading-relaxed text-slate-300">
                      ${text.replace(/\n/g, '<br/>')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-6 shadow-lg">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <i data-lucide="brain-circuit" class="w-5 h-5 text-purple-400"></i>
                </div>
                <h2 class="text-sm font-bold text-purple-200 uppercase tracking-widest">Chief Forensic Reasoning (PRO 3)</h2>
              </div>
              <div class="prose prose-invert prose-xs max-w-none text-slate-300 font-sans leading-relaxed">
                ${reasoning.reasoningBody.replace(/\n/g, '<br/>')}
              </div>
            </div>

            <div class="bg-cyan-950/30 border border-cyan-500/30 rounded-2xl p-6">
              <h2 class="text-xl font-bold text-cyan-400 mb-2">${synthesis.executiveSummary.headline}</h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div class="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div class="text-[10px] text-slate-500 uppercase font-bold mb-1">Behavioral Profile</div>
                  <div class="text-sm font-bold text-white">${synthesis.executiveSummary.behavioralProfile}</div>
                </div>
                <div class="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div class="text-[10px] text-slate-500 uppercase font-bold mb-1">Systemic Risk</div>
                  <div class="text-sm font-bold text-rose-400">${synthesis.executiveSummary.systemicRisk}</div>
                </div>
                <div class="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div class="text-[10px] text-slate-500 uppercase font-bold mb-1">Environment Signature</div>
                  <div class="text-sm font-bold text-cyan-400">${synthesis.executiveSummary.environmentSignature}</div>
                </div>
              </div>
              <p class="mt-4 text-slate-300 italic">"${synthesis.executiveSummary.keyFinding}"</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${synthesis.enginePerspectives.map(p => `
                <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <h3 class="text-xs font-bold text-white uppercase tracking-wider">${p.engine}</h3>
                  </div>
                  <p class="text-[11px] text-slate-400">${p.summary}</p>
                  <ul class="space-y-1 mt-2">
                    ${(p.findings || p.explanations || p.phenomena || p.notable || []).slice(0, 3).map(f => `
                      <li class="text-[10px] text-slate-300 flex items-start gap-1.5">
                        <span class="text-cyan-500 mt-0.5">&bull;</span>
                        <span>${f}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
            
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between items-center">
              <span>SYNTHESIS TIMESTAMP: ${synthesis.timestamp}</span>
              <span>RECORDS ANALYZED: ${synthesis.metadata.recordCount}</span>
            </div>
          </div>
        `;

        content.innerHTML = html;
        await ChainOfCustody.recordEvent("FORENSIC_NARRATIVE_GENERATED", { recordCount: AppState.extractedData.length }, AppState.currentUserEmail);
      } catch (err) {
        content.innerHTML = `<div class="p-5 text-rose-400 font-bold bg-rose-950/50 border border-rose-500/30 rounded-xl">Error synthesizing narrative: ${err.message}</div>`;
      }
      lucide.createIcons();
    }
}
