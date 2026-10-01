export class GraphRenderer {
    static viewGraphLinks(recordId, AppState) {
        const record = AppState.extractedData.find(r => r._id === recordId || r.data?.row_id === recordId);
        if (!record || !record._relationships) return;

        const r = record.data || record;
        const rel = record._relationships;
        const invNum = r.invoiceNumber || r.doc_number || '-';
        const voucherNum = r.voucherNumber || r.voucher || '-';
        const authCitation = record._authority?.primaryCitation || 'ASC 205';
        const corr = record._corroboration || { corroborationLevel: 'A', corroborationStatus: 'Detected', sourceCount: 1 };
        
        const primaryEl = document.getElementById('graph-modal-primary');
        if (primaryEl) {
            primaryEl.innerHTML = `
                <div class="flex justify-between items-center text-sm">
                  <span class="text-cyan-300 font-bold">${record._provenance?.entityContext || 'ENTITY'} | ${r.vendor || r.vendor_name || 'Vendor'}</span>
                  <span class="text-emerald-400 font-bold">$${parseFloat(r.amount || r.doc_amount || 0).toFixed(2)}</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1 font-mono">
                  Ref Invoice #${invNum} | JE: ${voucherNum} | Corroboration: <span class="text-amber-400 font-bold">Level ${corr.corroborationLevel} - ${corr.corroborationStatus} (${corr.sourceCount} Source)</span> | Authority: <span class="text-purple-300 font-bold">${authCitation}</span>
                </div>
            `;
        }

        const allValidEdges = [...(rel.tier1Edges || []), ...(rel.tier2Edges || [])];

        const linksEl = document.getElementById('graph-modal-links');
        if (linksEl) {
            let linksHtml = '';
            if (allValidEdges.length === 0) {
                linksHtml = `<div class="p-4 text-center text-slate-500">No Tier 1 or Tier 2 evidence links discovered for this record.</div>`;
            } else {
                linksHtml = allValidEdges.map(edge => {
                    const linkedRec = AppState.extractedData.find(item => item._id === edge.targetId || item.data?.row_id === edge.targetId);
                    if (!linkedRec) return '';
                    const lr = linkedRec.data || linkedRec;
                    const tierBadge = edge.tier === 1 
                        ? `<span class="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Tier 1 Evidence</span>`
                        : `<span class="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">Tier 2 Corroboration</span>`;

                    return `
                        <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1.5 hover:border-slate-700 transition">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              ${tierBadge}
                              <span class="font-bold text-cyan-400 text-[11px]">${linkedRec._provenance?.entityContext || 'ENTITY'} | ${lr.vendor || lr.vendor_name}</span>
                            </div>
                            <span class="text-xs font-mono font-bold text-emerald-400">$${parseFloat(lr.amount || lr.doc_amount || 0).toFixed(2)}</span>
                          </div>
                          <div class="text-[10px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                            <span class="text-slate-300 font-semibold block mb-0.5">Audit Reason Trace:</span>
                            ${edge.reasons.map(res => `<div>&bull; ${res}</div>`).join('')}
                          </div>
                        </div>
                    `;
                }).join('');
            }
            linksEl.innerHTML = linksHtml;
        }

        const modal = document.getElementById('modal-relationship-inspector');
        if (modal) modal.classList.remove('hidden');
        lucide.createIcons();
    }
}
