export class ContradictionRenderer {
    static render(flags = []) {
        const section = document.getElementById('contradiction-section');
        const badge = document.getElementById('contradiction-badge');
        const cards = document.getElementById('contradiction-cards');

        if (!section || !badge || !cards) return;

        if (!flags || flags.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        badge.textContent = `${flags.length} Flags`;

        const safeFlags = flags.slice(0, 100);

        cards.innerHTML = safeFlags.map(f => `
            <div class="p-3 bg-slate-900 rounded-xl border border-rose-500/30 flex items-start justify-between text-xs font-mono">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-rose-400 font-bold uppercase">${f.category}</span>
                  <span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">${f.severity}</span>
                  <span class="text-slate-400 text-[10px]">${f.sourceEntity} | Target: ${f.targetDocument}</span>
                </div>
                <p class="text-slate-300 mt-1 font-sans text-xs">${f.description}</p>
              </div>
            </div>
        `).join('');
        
        if (flags.length > 100) {
            cards.innerHTML += `<div class="p-3 mt-2 text-center text-[10px] text-rose-400/70 font-mono border border-dashed border-rose-500/30 rounded-xl bg-rose-950/20">... plus ${(flags.length - 100).toLocaleString()} additional flags safely hidden from UI.</div>`;
        }
    }
}
