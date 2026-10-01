export class ModalUI {
    static closeMemoModal() {
        const el = document.getElementById('modal-memo-result');
        if (el) el.classList.add('hidden');
    }

    static closeAiModal() {
        const el = document.getElementById('modal-ai-result');
        if (el) el.classList.add('hidden');
    }

    static closeGraphModal() {
        const el = document.getElementById('modal-relationship-inspector');
        if (el) el.classList.add('hidden');
    }
}
