export class LoaderUI {
    static updateForensicLoader(stage, pct, detail = '', counts = {}) {
        const loader = document.getElementById('forensic-loader');
        const stageEl = document.getElementById('loader-stage');
        const pctEl = document.getElementById('loader-pct');
        const barEl = document.getElementById('loader-bar');
        const detailEl = document.getElementById('loader-detail');

        if (loader) loader.classList.remove('hidden');
        if (stageEl) stageEl.textContent = stage;
        if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;
        if (barEl) barEl.style.width = `${pct}%`;
        if (detailEl && detail) detailEl.textContent = detail;

        if (counts.records !== undefined) {
            const el = document.getElementById('count-records');
            if (el) el.textContent = counts.records.toLocaleString();
        }
        if (counts.edges !== undefined) {
            const el = document.getElementById('count-edges');
            if (el) el.textContent = counts.edges.toLocaleString();
        }
        if (counts.events !== undefined) {
            const el = document.getElementById('count-events');
            if (el) el.textContent = counts.events.toLocaleString();
        }
    }

    static hideForensicLoader() {
        const el = document.getElementById('forensic-loader');
        if (el) el.classList.add('hidden');
    }

    static updateProgress(pct, msg) {
        const pctEl = document.getElementById('progress-pct');
        const barEl = document.getElementById('progress-bar');
        const textEl = document.getElementById('progress-text');

        if (pctEl) pctEl.innerText = `${Math.round(pct)}%`;
        if (barEl) barEl.style.width = `${pct}%`;
        if (textEl && msg) textEl.innerText = msg;
    }
}
