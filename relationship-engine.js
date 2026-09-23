/**
 * Relationship Engine
 * Phase 5 Roadmap Requirement
 * Discovers cross-document relational edges (Invoices, Journal Entries, Vendors, Accounts)
 */

export class RelationshipEngine {

    static getFieldValue(rec, keys) {
        if (!rec) return '';
        const d = rec.data || rec;
        for (const key of keys) {
            if (rec[key] !== undefined && rec[key] !== null && String(rec[key]).trim() !== '' && rec[key] !== '-') {
                return String(rec[key]).trim();
            }
            if (d[key] !== undefined && d[key] !== null && String(d[key]).trim() !== '' && d[key] !== '-') {
                return String(d[key]).trim();
            }
        }
        return '';
    }

    static getRecordId(rec, idx) {
        if (rec._id) return rec._id;
        if (rec.id) return rec.id;
        if (rec.data && rec.data.row_id) return rec.data.row_id;
        return `REC_${idx}_${Date.now()}`;
    }

    static buildRelationships(records = []) {
        if (!Array.isArray(records) || records.length === 0) return records;

        const invoiceMap = new Map();
        const voucherMap = new Map();
        const vendorMap = new Map();
        const accountMap = new Map();

        const invKeys = ['Invoice Number', 'invoiceNumber', 'doc_number'];
        const jeKeys = ['Journal Entry', 'voucherNumber', 'voucher'];
        const vendorKeys = ['Originating Master Name', 'vendor', 'vendor_name'];
        const accountKeys = ['Account Number', 'accountNumber', 'vendor_id'];

        // Step 1: Index all records across primary key fields
        records.forEach((rec, idx) => {
            const id = this.getRecordId(rec, idx);
            if (!rec._id) rec._id = id;

            const inv = this.getFieldValue(rec, invKeys);
            const je = this.getFieldValue(rec, jeKeys);
            const vendor = this.getFieldValue(rec, vendorKeys);
            const acct = this.getFieldValue(rec, accountKeys);

            if (inv && inv !== '-' && !inv.toLowerCase().includes('inv-clk')) {
                if (!invoiceMap.has(inv)) invoiceMap.set(inv, []);
                invoiceMap.get(inv).push(id);
            }

            if (je && je !== '-' && !je.toLowerCase().includes('je-clk')) {
                if (!voucherMap.has(je)) voucherMap.set(je, []);
                voucherMap.get(je).push(id);
            }

            if (vendor && vendor !== '-' && !vendor.toLowerCase().includes('general vendor') && !vendor.toLowerCase().includes('master gl record')) {
                if (!vendorMap.has(vendor)) vendorMap.set(vendor, []);
                vendorMap.get(vendor).push(id);
            }

            if (acct && acct !== '-' && acct.toLowerCase() !== 'unknown') {
                if (!accountMap.has(acct)) accountMap.set(acct, []);
                accountMap.get(acct).push(id);
            }
        });

        // Step 2: Assign relational edges to each record
        return records.map((rec, idx) => {
            const id = this.getRecordId(rec, idx);

            const inv = this.getFieldValue(rec, invKeys);
            const je = this.getFieldValue(rec, jeKeys);
            const vendor = this.getFieldValue(rec, vendorKeys);
            const acct = this.getFieldValue(rec, accountKeys);

            const linkedInvoices = (inv && invoiceMap.get(inv)) ? invoiceMap.get(inv).filter(i => i !== id) : [];
            const linkedJournalEntries = (je && voucherMap.get(je)) ? voucherMap.get(je).filter(i => i !== id) : [];
            const linkedVendorRecords = (vendor && vendorMap.get(vendor)) ? vendorMap.get(vendor).filter(i => i !== id) : [];
            const linkedAccountRecords = (acct && accountMap.get(acct)) ? accountMap.get(acct).filter(i => i !== id) : [];

            const allUniqueLinks = Array.from(new Set([
                ...linkedInvoices,
                ...linkedJournalEntries,
                ...linkedVendorRecords,
                ...linkedAccountRecords
            ]));

            const totalConnected = allUniqueLinks.length;

            rec._relationships = {
                hasLinks: totalConnected > 0,
                totalConnectedRecords: totalConnected,
                linkedInvoices,
                linkedJournalEntries,
                linkedVendorRecords,
                linkedAccountRecords
            };

            return rec;
        });
    }
}
