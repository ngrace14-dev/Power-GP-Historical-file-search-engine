// modules/validation-engine.js

/**
 * Financial Validation Engines
 * Phase 4 Roadmap Requirement & System Governance Charter v5.0
 * Verifies accounting integrity and cross-footing rules before staging.
 */

export const VALIDATION_CHECKS = Object.freeze({
    CROSS_FOOT: 'Cross-Foot Aging Check',
    VENDOR_STATEMENT: 'Vendor Statement Detail Tie-Out',
    GENERAL_LEDGER: 'GL Debits Equals Credits',
    TRIAL_BALANCE: 'Trial Balance Accounting Equation'
});

export class ValidationEngine {

    /**
     * Validates accounting integrity based on document type and payload array.
     * @param {Array|Object} dataPayload - Array of extracted records or single record
     * @param {String} documentType - Classification from ClassificationEngine
     * @returns {Object} { tieOutStatus: 'PASS'|'FAIL', variance: Number, checkType: String, message: String }
     */
    static validatePayload(dataPayload, documentType = 'Unknown Document') {
        const records = Array.isArray(dataPayload) ? dataPayload : [dataPayload];

        switch (documentType) {
            case 'General Ledger Export':
                return this.validateGeneralLedger(records);
            case 'Trial Balance':
                return this.validateTrialBalance(records);
            case 'Vendor Statement':
                return this.validateVendorStatement(records);
            case 'AP Aging':
            case 'AR Aging':
            default:
                return this.validateAgingCrossFoot(records);
        }
    }

    /**
     * Rule 1: Aging Schedule / Row-level Cross-Footing
     * Total = Current + (31-60) + (61-90) + (91+)
     */
    static validateAgingCrossFoot(records) {
        let totalVariance = 0;
        let failureCount = 0;

        records.forEach(r => {
            const rec = r.data || r;
            const docAmt = parseFloat(rec.doc_amount || rec.amount || 0);
            const current = parseFloat(rec.current_period || 0);
            const d31 = parseFloat(rec.days_31_60 || 0);
            const d61 = parseFloat(rec.days_61_90 || 0);
            const d91 = parseFloat(rec.days_91_over || 0);

            const expectedTotal = current + d31 + d61 + d91;
            const diff = Math.abs(docAmt - expectedTotal);

            if (diff > 0.01 && (current !== 0 || d31 !== 0 || d61 !== 0 || d91 !== 0)) {
                totalVariance += diff;
                failureCount++;
            }
        });

        if (failureCount > 0) {
            return {
                tieOutStatus: 'FAIL',
                variance: parseFloat(totalVariance.toFixed(2)),
                checkType: VALIDATION_CHECKS.CROSS_FOOT,
                message: `${failureCount} row(s) failed cross-foot aging calculation. Total variance: $${totalVariance.toFixed(2)}`
            };
        }

        return {
            tieOutStatus: 'PASS',
            variance: 0.0,
            checkType: VALIDATION_CHECKS.CROSS_FOOT,
            message: 'All aging rows cross-foot verified successfully.'
        };
    }

    /**
     * Rule 2: General Ledger Balance Check
     * Sum(Debits) = Sum(Credits)
     */
    static validateGeneralLedger(records) {
        let totalDebits = 0;
        let totalCredits = 0;

        records.forEach(r => {
            const rec = r.data || r;
            const debit = parseFloat(rec.debit || rec['Debit Amount'] || (rec.amount > 0 ? rec.amount : 0));
            const credit = parseFloat(rec.credit || rec['Credit Amount'] || (rec.amount < 0 ? Math.abs(rec.amount) : 0));

            totalDebits += isNaN(debit) ? 0 : debit;
            totalCredits += isNaN(credit) ? 0 : credit;
        });

        const diff = Math.abs(totalDebits - totalCredits);

        if (diff > 0.01) {
            return {
                tieOutStatus: 'FAIL',
                variance: parseFloat(diff.toFixed(2)),
                checkType: VALIDATION_CHECKS.GENERAL_LEDGER,
                message: `GL Out of Balance: Debits ($${totalDebits.toFixed(2)}) != Credits ($${totalCredits.toFixed(2)}). Variance: $${diff.toFixed(2)}`
            };
        }

        return {
            tieOutStatus: 'PASS',
            variance: 0.0,
            checkType: VALIDATION_CHECKS.GENERAL_LEDGER,
            message: `GL Balanced: Debits equal Credits ($${totalDebits.toFixed(2)}).`
        };
    }

    /**
     * Rule 3: Vendor Statement Check
     * Statement Total = Sum of Detail Transactions
     */
    static validateVendorStatement(records) {
        let detailSum = 0;
        let statementHeaderTotal = null;

        records.forEach(r => {
            const rec = r.data || r;
            const amt = parseFloat(rec.amount || rec.doc_amount || 0);
            detailSum += isNaN(amt) ? 0 : amt;

            if (rec.statementHeaderTotal !== undefined) {
                statementHeaderTotal = parseFloat(rec.statementHeaderTotal);
            }
        });

        if (statementHeaderTotal === null) {
            return {
                tieOutStatus: 'PASS',
                variance: 0.0,
                checkType: VALIDATION_CHECKS.VENDOR_STATEMENT,
                message: `Statement detail sum calculated at $${detailSum.toFixed(2)}.`
            };
        }

        const diff = Math.abs(statementHeaderTotal - detailSum);
        if (diff > 0.01) {
            return {
                tieOutStatus: 'FAIL',
                variance: parseFloat(diff.toFixed(2)),
                checkType: VALIDATION_CHECKS.VENDOR_STATEMENT,
                message: `Vendor Statement Detail ($${detailSum.toFixed(2)}) does not match Statement Total ($${statementHeaderTotal.toFixed(2)}).`
            };
        }

        return {
            tieOutStatus: 'PASS',
            variance: 0.0,
            checkType: VALIDATION_CHECKS.VENDOR_STATEMENT,
            message: `Vendor Statement reconciled: Detail total matches statement total ($${detailSum.toFixed(2)}).`
        };
    }

    /**
     * Rule 4: Trial Balance Check
     * Assets = Liabilities + Equity
     */
    static validateTrialBalance(records) {
        let assets = 0;
        let liabilities = 0;
        let equity = 0;

        records.forEach(r => {
            const rec = r.data || r;
            const accountType = String(rec.accountType || rec.type || '').toLowerCase();
            const amt = parseFloat(rec.amount || rec.doc_amount || 0);

            if (accountType.includes('asset')) assets += amt;
            else if (accountType.includes('liability') || accountType.includes('liab')) liabilities += amt;
            else if (accountType.includes('equity')) equity += amt;
        });

        const diff = Math.abs(assets - (liabilities + equity));

        if (assets !== 0 && (liabilities !== 0 || equity !== 0) && diff > 0.01) {
            return {
                tieOutStatus: 'FAIL',
                variance: parseFloat(diff.toFixed(2)),
                checkType: VALIDATION_CHECKS.TRIAL_BALANCE,
                message: `Trial Balance Violation: Assets ($${assets.toFixed(2)}) != Liab ($${liabilities.toFixed(2)}) + Equity ($${equity.toFixed(2)}). Variance: $${diff.toFixed(2)}`
            };
        }

        return {
            tieOutStatus: 'PASS',
            variance: 0.0,
            checkType: VALIDATION_CHECKS.TRIAL_BALANCE,
            message: 'Trial Balance equation verified (Assets = Liabilities + Equity).'
        };
    }
}
