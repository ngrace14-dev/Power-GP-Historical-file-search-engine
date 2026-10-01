export class DrawerUI {
    static closeInvestigationDrawer() {
        const drawer = document.getElementById('drawer-investigation');
        const aiContainer = document.getElementById('ai-analyst-container');
        
        if (drawer) {
            drawer.classList.add('translate-x-full');
            setTimeout(() => {
                drawer.classList.add('hidden');
                if (aiContainer) aiContainer.classList.add('hidden');
            }, 300);
        }
    }
}
