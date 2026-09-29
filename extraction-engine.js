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
            referenceNumber: this.#extractReferenceNumber(safeData),
            paymentNumber: this.#extractPaymentNumber(safeData), // Phase 4.1I Promotion
            batchId: this.#extractBatchId(safeData),           // Phase 4.1I Promotion
            _extractionFlags: []
        };


        // Phase 2.5 Mapping Error Flagging
        if (record.amount === null) record._extractionFlags.push('INVALID_AMOUNT');
        if (record.transactionDate === null) record._extractionFlags.push('MISSING_TRANSACTION_DATE');
        if (record.invoiceNumber === 'ERR_DATE_IN_DOC_FIELD') record._extractionFlags.push('ERR_DATE_IN_DOC_FIELD');

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
            // Power GP Remediation: Reference and Journal Entry are the primary anchor keys
            let val = data['Reference'] || 
                      data['Journal Entry'] ||
                      data['Originating Document Number'] ||
                      data.doc_number || 
                      data.invoiceNumber;

            // Remediation: Date objects must NEVER populate document fields
            if (val instanceof Date) {
                console.error('[ExtractionEngine] Critical Mapping Error: Date object detected in Document Number field.');
                return 'ERR_DATE_IN_DOC_FIELD';
            }

            val = String(val || '-').trim();
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
            // Power GP Layout: TRX Date is Column 3
            const rawDate = data['TRX Date'] || data.doc_date || data.transactionDate;
            if (!rawDate) return null; 
        
            const parsed = new Date(rawDate);
            if (isNaN(parsed.getTime())) return null; 
            return parsed.toISOString().split('T')[0];
        }



        static #extractAmount(data) {
            // Power GP Signed Amount Reconstruction (Phase 2.5)
            const dStr = String(data['Debit Amount'] || '0');
            const cStr = String(data['Credit Amount'] || '0');
        
            const debit = this.#parseForensicCurrency(dStr);
            const credit = this.#parseForensicCurrency(cStr);

            if (debit > 0) return debit;
            if (credit > 0) return -credit;
        
            // Phase 2.8: Return 0 instead of null to prevent NaN in aggregations
            if (debit === 0 && credit === 0) return 0;

            // Fallback for net amount fields if they exist but debits/credits don't
            const rawAmt = data.doc_amount !== undefined ? data.doc_amount : (data.amount || data['Amount'] || 0);
            return this.#parseForensicCurrency(rawAmt);
        }



    /**
     * Robust currency parsing for forensic accounting
     * Handles: $1,234.56, (1,234.56), -1234.56, whitespace
     */
    static #parseForensicCurrency(val) {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;

        let str = String(val).trim();
        if (!str || str === '-') return 0;

        // Check for parentheses (negative)
        const isParenthetical = str.startsWith('(') && str.endsWith(')');
        
        // Remove currency symbols, commas, and parentheses
        let clean = str.replace(/[$,\(\)]/g, '');
        
        let num = parseFloat(clean);
        if (isNaN(num)) {
            console.error(`[ExtractionEngine] Critical: Failed to parse currency string: "${str}"`);
            return NaN; // Remediation: Do not silently return 0
        }

        return isParenthetical ? -Math.abs(num) : num;
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

    static #extractPaymentNumber(data) {
        const val = String(
            data['Originating Document Number'] ||
            data['Check Number'] ||
            data.payment_number ||
            '-'
        ).trim();
        return (val === '' || val === 'undefined' || val === 'null') ? '-' : val;
    }

    static #extractBatchId(data) {
        const val = String(
            data['Originating TRX Source'] ||
            data.batch_id ||
            '-'
        ).trim();
        return (val === '' || val === 'undefined' || val === 'null') ? '-' : val;
    }
}

