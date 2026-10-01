export class Logger {
    static logSys(msg, type = 'info', AppState) {
        const time = new Date().toLocaleTimeString();
        AppState.fullDebugLog.push(`[${time}] [${type.toUpperCase()}] ${msg}`);
        
        const terminal = document.getElementById('terminal-logs');
        if (!terminal) return;
        
        const el = document.createElement('div');
        el.className = type === 'error' ? 'text-rose-400' : 
                     (type === 'success' ? 'text-emerald-400' : 
                     (type === 'warning' ? 'text-amber-400' : 'text-slate-400'));
        
        el.innerText = `[${time}] ${msg}`;
        terminal.appendChild(el);
        terminal.scrollTop = terminal.scrollHeight;
    }
}
