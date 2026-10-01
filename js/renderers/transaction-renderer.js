export class TransactionRenderer {
    static render(transactions) {
        const tbody = document.getElementById('table-body');
        const thead = document.querySelector('#results-section thead tr');

        if (!tbody || !thead) return;

        thead.innerHTML = `
            <th class="px-4 py-3 text-left font-bold text-slate-300">Document</th>
            <th class="px-4 py-3 text-left font-bold text-slate-300">Type</th>
            <th class="px-4 py-3 text-left font-bold text-slate-300">Amount</th>
            <th class="px-4 py-3 text-left font-bold text-slate-300">Validation</th>
        `;

        tbody.innerHTML = transactions.map(txn => {
            const data = txn.data || txn;
            return `
            <tr class="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td class="px-4 py-3 font-mono">${data.doc_number || data.voucher || 'UNKNOWN'}</td>
                <td class="px-4 py-3">${data.type || 'UNKNOWN'}</td>
                <td class="px-4 py-3">$${(data.doc_amount || data.amount || 0).toLocaleString()}</td>
                <td class="px-4 py-3">${txn._validation ? txn._validation.tieOutStatus : 'N/A'}</td>
            </tr>
        `}).join('');
    }
}
