export class TabsUI {
    static switchTab(tab) {
        const tabs = ['cloud', 'pdf', 'text'];
        const viewPrefix = 'view-';
        const tabPrefix = 'tab-';

        tabs.forEach(t => {
            const tabEl = document.getElementById(tabPrefix + t);
            const viewEl = document.getElementById(viewPrefix + t);
            
            if (!tabEl || !viewEl) return;

            if (t === tab) {
                tabEl.className = "text-cyan-400 font-bold pb-3 border-b-2 border-cyan-400 transition-colors text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap";
                viewEl.classList.remove('hidden');
                viewEl.classList.add('flex');
            } else {
                tabEl.className = "text-slate-500 hover:text-slate-300 font-bold pb-3 border-b-2 border-transparent transition-colors text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap";
                viewEl.classList.add('hidden');
                viewEl.classList.remove('flex');
            }
        });
    }
}
