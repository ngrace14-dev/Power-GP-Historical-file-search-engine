// modules/extraction-engine.js

/**
 * Structured Financial Field Extraction Engine
 * Enforces Phase 3 Roadmap Requirements & System Governance Charter v5.0
 * Converts heterogenous document extractions into a normalized schema.
 */

export class ExtractionEngine {

    /**
     * Normalizes a raw parsed row into the standardized Phase 3 financial record schema.
     * @param {Object} rawData - The extracted row key-value pairs or text tokens
     * @param {String} documentType - Document classification from ClassificationEngine
     * @param {String} entityContext - Active corporate entity (e.g. POMCO, RREDCO)
     * @returns {Object} Normalized financial record matching Phase 3 schema
     */
    static extractFields(rawData = {}, documentType = 'Unknown Document', entityContext = 'UNKNOWN') {
        const record = {
            entity: entityContext,
            vendor: this.#extractVendor(rawData),
            customer: this.#extractCustomer(rawData),
            invoiceNumber: this.#extractInvoiceNumber(rawData),
            voucherNumber: this.#extractVoucherNumber(rawData),
            journalEntry: this.#extractJournalEntry(rawData),
            accountNumber: this.#extractAccountNumber(rawData),
            transactionDate: this.#extractTransactionDate(rawData),
            amount: this.#extractAmount(rawData),
            description: this.#extractDescription(rawData),
            referenceNumber: this.#extractReferenceNumber(rawData)
        };

        return record;
    }

    static #extractVendor(data) {
        return String(
            data.vendor_name || 
            data.vendor || 
            data['Vendor Name'] || 
            data['Originating Master Name'] || 
            'UNKNOWN'
        ).trim();
    }

    static #extractCustomer(data) {
        return String(
            data.customer_name || 
            data.customer || 
            data['Customer Name'] || 
            data['Customer'] || 
            'N/A'
        ).trim();
    }

    static #extractInvoiceNumber(data) {
        const val = String(
            data.doc_number || 
            data.invoiceNumber || 
            data['Invoice Number'] || 
            data['Doc Number'] || 
            '-'
        ).trim();
        return val === '' ? '-' : val;
    }

    static #extractVoucherNumber(data) {
        const val = String(
            data.voucher || 
            data.voucherNumber || 
            data['Voucher'] || 
            data['Voucher Number'] || 
            '-'
        ).trim();
        return val === '' ? '-' : val;
    }

    static #extractJournalEntry(data) {
        const val = String(
            data.journalEntry || 
            data['Journal Entry'] || 
            data.je || 
            '-'
        ).trim();
        return val === '' ? '-' : val;
    }

    static #extractAccountNumber(data) {
        return String(
            data.accountNumber || 
            data.vendor_id || 
            data['Account Number'] || 
            data['Account'] || 
            '-'
        ).trim();
    }

    static #extractTransactionDate(data) {
        const rawDate = data.doc_date || data.transactionDate || data['TRX Date'] || data['Date'];
        if (!rawDate) return new Date().toISOString().split('T')[0];
        
        const parsed = new Date(rawDate);
        if (isNaN(parsed.getTime())) return new Date().toISOString().split('T')[0];
        return parsed.toISOString().split('T')[0];
    }

    static #extractAmount(data) {
        const rawAmt = data.doc_amount !== undefined ? data.doc_amount : (data.amount || data['Amount'] || 0);
        const parsed = parseFloat(rawAmt);
        return isNaN(parsed) ? 0.0 : parseFloat(parsed.toFixed(2));
    }

    static #extractDescription(data) {
        return String(
            data.description || 
            data['Description'] || 
            data['Account Description'] || 
            'Unspecified Transaction'
        ).trim();
    }

    static #extractReferenceNumber(data) {
        const val = String(
            data.referenceNumber || 
            data.reference || 
            data['Reference'] || 
            '-'
        ).trim();
        return val === '' ? '-' : val;
    }
}
