/**
 * Structured Financial Field Extraction Engine
 * Enforces Phase 3 Roadmap Requirements & System Governance Charter v6.0
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
        // Prevent crashes on null payloads
        const safeData = rawData || {};

        const record = {
            entity: entityContext,
            vendor: this.#extractVendor(safeData),
            customer: this.#extractCustomer(safeData),
            invoiceNumber: this.#extractInvoiceNumber(safeData),
            voucherNumber: this.#extractVoucherNumber(safeData),
            journalEntry: this.#extractJournalEntry(safeData),
            accountNumber: this.#extractAccountNumber(safeData),
            transactionDate: this.#extractTransactionDate(safeData),
            amount: this.#extractAmount(safeData),
            description: this.#extractDescription(safeData),
            referenceNumber: this.#extractReferenceNumber(safeData)
        };

        // Fallback: If Vendor is still the generic HTML default, try to salvage it from Description or Reference
        if (record.vendor === 'MASTER GL RECORD' || record.vendor === '000') {
            if (record.description && record.description !== 'Unspecified Transaction') {
                record.vendor = `(Desc) ${record.description.substring(0, 30)}`;
            } else {
                record.vendor = `(JE) ${record.journalEntry}`;
            }
        }

        return record;
    }

    static #extractVendor(data) {
        const val = data.vendor_name || 
                    data['Originating Master Name'] || 
                    data['Vendor Name'] || 
                    data.vendor || 
                    data['Creditor Name'] ||
                    data['Payee'] ||
                    'UNKNOWN';
        
        return String(val).trim();
    }

    static #extractCustomer(data) {
        const val = data.customer_name || 
                    data.customer || 
                    data['Customer Name'] || 
                    data['Customer'] || 
                    data['Debtor Name'] ||
                    'N/A';
        
        return String(val).trim();
    }

    static #extractInvoiceNumber(data) {
        const val = String(
            data['Originating Document Number'] ||
            data.doc_number || 
            data.invoiceNumber || 
            data['Invoice Number'] || 
            data['Doc Number'] || 
            data['Document Number'] ||
            data['Original Control Number'] ||
            '-'
        ).trim();
        
        return (val === '' || val === 'undefined' || val === 'null') ? '-' : val;
    }

    static #extractVoucherNumber(data) {
        const val = String(
            data['Voucher Number'] ||
            data.voucher || 
            data.voucherNumber || 
            data['Voucher'] || 
            data['Control Number'] ||
            '-'
        ).trim();
        
        return (val === '' || val === 'undefined' || val === 'null') ? '-' : val;
    }

    static #extractJournalEntry(data) {
        const val = String(
            data['Journal Entry'] ||
            data.journalEntry || 
            data.je || 
            data['JE Number'] ||
            data['TRX Number'] ||
            '-'
        ).trim();
        
        return (val === '' || val === 'undefined' || val === 'null') ? '-' : val;
    }

    static #extractAccountNumber(data) {
        const val = String(
            data['Account Number'] ||
            data.accountNumber || 
            data.vendor_id || 
            data['Account'] || 
            data['GL Account'] ||
            '-'
        ).trim();
        
        return (val === '' || val === 'undefined' || val === 'null') ? '-' : val;
    }

    static #extractTransactionDate(data) {
        const rawDate = data['TRX Date'] || data.doc_date || data.transactionDate || data['Date'] || data['Posting Date'];
        if (!rawDate) return new Date().toISOString().split('T')[0];
        
        const parsed = new Date(rawDate);
        if (isNaN(parsed.getTime())) return new Date().toISOString().split('T')[0];
        return parsed.toISOString().split('T')[0];
    }

    static #extractAmount(data) {
        // Dynamics GP usually splits amounts into Debits and Credits in raw ledgers
        if (data['Debit Amount'] !== undefined || data['Credit Amount'] !== undefined) {
            const debit = parseFloat(data['Debit Amount']) || 0;
            const credit = parseFloat(data['Credit Amount']) || 0;
            // Assuming standard GL perspective: Debits are positive, Credits are negative
            return parseFloat((debit - credit).toFixed(2));
        }

        const rawAmt = data.doc_amount !== undefined ? data.doc_amount : (data.amount || data['Amount'] || data['Net Amount'] || 0);
        const parsed = parseFloat(rawAmt);
        
        return isNaN(parsed) ? 0.0 : parseFloat(parsed.toFixed(2));
    }

    static #extractDescription(data) {
        const val = data.description || 
                    data['Description'] || 
                    data['Account Description'] || 
                    data['Distribution Reference'] ||
                    'Unspecified Transaction';
                    
        return String(val).trim();
    }

    static #extractReferenceNumber(data) {
        const val = String(
            data['Reference'] ||
            data.referenceNumber || 
            data.reference || 
            data['Orig Seq Num'] ||
            '-'
        ).trim();
        
        return (val === '' || val === 'undefined' || val === 'null') ? '-' : val;
    }
}
