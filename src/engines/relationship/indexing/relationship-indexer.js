/**
 * Relationship Indexer - Governance v6.0
 */
export class RelationshipIndexer {
    /**
     * Builds O(1) indexes for the relationship detection pass
     */
    static build(records) {
        const recordMap = new Map();
        const accountMap = new Map();
        const refMap = new Map();
        const amountMap = new Map();
        const vendorMap = new Map();

        records.forEach((rec, idx) => {
            const id = rec._id || `REC_${idx}`;
            recordMap.set(id, rec);
            const r = rec.data || rec;

            // Index Account
            const acct = String(r.accountNumber || '').trim();
            if (acct && acct !== '-') {
                if (!accountMap.has(acct)) accountMap.set(acct, []);
                accountMap.get(acct).push(id);
            }

            // Index References (Invoice, Voucher, JE)
            const refs = [
                String(r.invoiceNumber || '').trim(),
                String(r.voucherNumber || '').trim(),
                String(r.journalEntry || '').trim(),
                String(r.referenceNumber || '').trim()
            ].filter(v => v && v !== '-' && v.length > 2);

            refs.forEach(ref => {
                if (!refMap.has(ref)) refMap.set(ref, []);
                refMap.get(ref).push(id);
            });

            // Index Absolute Amount
            const amt = Math.abs(parseFloat(r.amount) || 0).toFixed(2);
            if (amt !== '0.00') {
                if (!amountMap.has(amt)) amountMap.set(amt, []);
                amountMap.get(amt).push(id);
            }

            // Index Vendor
            const vendor = String(r.vendor || '').trim().toLowerCase();
            if (vendor && vendor !== 'unknown') {
                if (!vendorMap.has(vendor)) vendorMap.set(vendor, []);
                vendorMap.get(vendor).push(id);
            }
        });

        return { recordMap, accountMap, refMap, amountMap, vendorMap };
    }
}
