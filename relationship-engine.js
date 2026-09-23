// modules/relationship-engine.js

/**
 * Evidence Relationship Engine
 * Phase 5 Roadmap Requirement & System Governance Charter v5.0
 * Automatically maps cross-document relational links between invoices, vendors, journal entries, and accounts.
 */

export class RelationshipEngine {

    /**
     * Analyzes a collection of records and maps relational edges across entities, vendors, invoices, and journal entries.
     * @param {Array} records - Collection of normalized financial records
     * @returns {Array} Enriched records containing a `_relationships` graph node
     */
    static buildRelationships(records = []) {
        if (!Array.isArray(records) || records.length === 0) return records;

        // Maps for grouping related documents
        const invoiceMap = new Map();
        const jeMap = new Map();
        const vendorMap = new Map();
        const accountMap = new Map();

        // Pass 1: Index items by relational identifiers
        records.forEach((record, index) => {
            const recData = record.data || record;
            const recId = record._id || recData.row_id || index;

            const inv = recData.invoiceNumber || recData.doc_number;
            const je = recData.journalEntry || recData.voucher;
            const vendor = recData.vendor || recData.vendor_name;
            const acc = recData.accountNumber || recData.vendor_id;

            if (inv && inv !== '-' && inv !== 'INV-CLK') {
                if (!invoiceMap.has(inv)) invoiceMap.set(inv, []);
                invoiceMap.get(inv).push(recId);
            }

            if (je && je !== '-' && je !== 'JE-CLK') {
                if (!jeMap.has(je)) jeMap.set(je, []);
                jeMap.get(je).push(recId);
            }

            if (vendor && vendor !== 'UNKNOWN' && vendor !== 'GENERAL VENDOR') {
                if (!vendorMap.has(vendor)) vendorMap.set(vendor, []);
                vendorMap.get(vendor).push(recId);
            }

            if (acc && acc !== '-') {
                if (!accountMap.has(acc)) accountMap.set(acc, []);
                accountMap.get(acc).push(recId);
            }
        });

        // Pass 2: Enrich each record with explicit relational links
        return records.map((record, index) => {
            const recData = record.data || record;
            const recId = record._id || recData.row_id || index;

            const inv = recData.invoiceNumber || recData.doc_number;
            const je = recData.journalEntry || recData.voucher;
            const vendor = recData.vendor || recData.vendor_name;
            const acc = recData.accountNumber || recData.vendor_id;

            const linkedInvoices = (inv && invoiceMap.has(inv)) 
                ? invoiceMap.get(inv).filter(id => id !== recId) : [];
            const linkedJEs = (je && jeMap.has(je)) 
                ? jeMap.get(je).filter(id => id !== recId) : [];
            const linkedVendors = (vendor && vendorMap.has(vendor)) 
                ? vendorMap.get(vendor).filter(id => id !== recId) : [];
            const linkedAccounts = (acc && accountMap.has(acc)) 
                ? accountMap.get(acc).filter(id => id !== recId) : [];

            const totalLinks = linkedInvoices.length + linkedJEs.length + linkedVendors.length + linkedAccounts.length;

            const relationshipsNode = {
                hasLinks: totalLinks > 0,
                totalConnectedRecords: totalLinks,
                linkedInvoices: linkedInvoices,
                linkedJournalEntries: linkedJEs,
                linkedVendorRecords: linkedVendors,
                linkedAccountRecords: linkedAccounts
            };

            return {
                ...record,
                _relationships: relationshipsNode
            };
        });
    }
}
