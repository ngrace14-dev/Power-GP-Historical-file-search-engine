export class EventRenderer {
    static render(events) {
        const tbody = document.getElementById('table-body');
        const thead = document.querySelector('#results-section thead tr');

        if (!tbody || !thead) return;

        thead.innerHTML = `
            <th class="px-4 py-3 text-left font-bold text-slate-300">Event ID</th>
            <th class="px-4 py-3 text-left font-bold text-slate-300">Status</th>
            <th class="px-4 py-3 text-left font-bold text-slate-300">Net Impact</th>
            <th class="px-4 py-3 text-left font-bold text-slate-300">Confidence</th>
            <th class="px-4 py-3 text-right font-bold text-slate-300">Action</th>
        `;

        tbody.innerHTML = events.map(event => `
            <tr class="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td class="px-4 py-3 font-mono text-cyan-400">${event.eventId}</td>
                <td class="px-4 py-3">${event.finalEconomicState.status}</td>
                <td class="px-4 py-3">$${event.netEconomicImpact.toLocaleString()}</td>
                <td class="px-4 py-3">${Math.round(event.confidence.total * 100)}%</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="openForensicDrawer('${event.eventId}')" class="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded">Inspect</button>
                </td>
            </tr>
        `).join('');
    }
}
