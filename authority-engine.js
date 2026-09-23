/**
 * Authority Engine - Phase 3 (Governance v6.0 Compliant)
 * Maps transaction characteristics, GL descriptions, and document types 
 * to authoritative accounting standards (ASC, AICPA, GASB, IFRS).
 * 
 * GOVERNANCE RULE:
 * Authority is Evidence Context. Authority is NOT Evidence.
 * Accounting standards may support an audit conclusion but may NEVER replace source evidence.
 */

export class AuthorityEngine {
    static AUTHORITY_MAP = [
        {
            keywords: ['prepaid', 'deferred cost', 'advance payment'],
            topic: 'Prepaid Expense & Deferred Asset Recognition',
            citations: [
                { framework: 'US GAAP', citation: 'ASC 340-10', title: 'Other Assets and Deferred Costs', confidence: 0.95 },
                { framework: 'IFRS', citation: 'IAS 1', title: 'Presentation of Financial Statements', confidence: 0.85 }
            ]
        },
        {
            keywords: ['revenue', 'sales', 'deferred rev', 'unearned', 'contract liability', 'subscription'],
            topic: 'Revenue Recognition & Contract Liabilities',
            citations: [
                { framework: 'US GAAP', citation: 'ASC 606', title: 'Revenue from Contracts with Customers', confidence: 0.98 },
                { framework: 'IFRS', citation: 'IFRS 15', title: 'Revenue from Contracts with Customers', confidence: 0.92 }
            ]
        },
        {
            keywords: ['lease', 'rent', 'rou asset', 'lease liability'],
            topic: 'Lease Accounting & Right-of-Use Assets',
            citations: [
                { framework: 'US GAAP', citation: 'ASC 842', title: 'Leases', confidence: 0.98 },
                { framework: 'IFRS', citation: 'IFRS 16', title: 'Leases', confidence: 0.90 }
            ]
        },
        {
            keywords: ['equipment', 'building', 'fixed asset', 'depreciation', 'accumulated dep'],
            topic: 'Property, Plant, and Equipment Impairment & Capitalization',
            citations: [
                { framework: 'US GAAP', citation: 'ASC 360-10', title: 'Property, Plant, and Equipment', confidence: 0.95 },
                { framework: 'IFRS', citation: 'IAS 16', title: 'Property, Plant and Equipment', confidence: 0.88 }
            ]
        },
        {
            keywords: ['intercompany', 'due to', 'due from', 'ic clearance', 'transfer'],
            topic: 'Intercompany Transactions & Consolidated Eliminating Entries',
            citations: [
                { framework: 'US GAAP', citation: 'ASC 810-10', title: 'Consolidations - Overall', confidence: 0.96 }
            ]
        },
        {
            keywords: ['accrual', 'accrued', 'contingency', 'litigation', 'reserve'],
            topic: 'Accrued Liabilities & Contingent Liabilities',
            citations: [
                { framework: 'US GAAP', citation: 'ASC 450-20', title: 'Loss Contingencies', confidence: 0.94 }
            ]
        },
        {
            keywords: ['inventory', 'cogs', 'cost of goods', 'raw materials'],
            topic: 'Inventory Valuation & Cost of Sales',
            citations: [
                { framework: 'US GAAP', citation: 'ASC 330', title: 'Inventory', confidence: 0.95 }
            ]
        }
    ];

    /**
     * Identifies governing accounting standards for a given record
     */
    static mapAuthority(record) {
        const data = record.data || record;
        const textToScan = `${data['Account Description'] || data.type || ''} ${data.vendor || data.vendor_name || ''} ${data.Description || ''}`.toLowerCase();

        for (const item of this.AUTHORITY_MAP) {
            if (item.keywords.some(kw => textToScan.includes(kw))) {
                return {
                    topic: item.topic,
                    authoritySources: item.citations,
                    primaryCitation: item.citations[0].citation,
                    governanceNote: 'Authority is Evidence Context, not Evidence. Citation supports conclusion but does not replace source evidence.'
                };
            }
        }

        return {
            topic: 'General Ledger Accounting',
            authoritySources: [
                { framework: 'US GAAP', citation: 'ASC 205', title: 'Presentation of Financial Statements', confidence: 0.70 }
            ],
            primaryCitation: 'ASC 205',
            governanceNote: 'Authority is Evidence Context, not Evidence. Citation supports conclusion but does not replace source evidence.'
        };
    }

    /**
     * Appends authority citations across a dataset
     */
    static evaluateDataset(records = []) {
        if (!Array.isArray(records) || records.length === 0) return { records: [], mappedCount: 0 };

        let mappedCount = 0;
        const processed = records.map(rec => {
            const authority = this.mapAuthority(rec);
            rec._authority = authority;
            if (authority.topic !== 'General Ledger Accounting') mappedCount++;
            return rec;
        });

        return {
            records: processed,
            mappedCount
        };
    }
}
