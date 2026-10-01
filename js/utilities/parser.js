export class ParserUtility {
    static parseLedgerText(rawText, classifiedDocType = "Unknown Document") {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const rows = [];
        let currentVendor = "GENERAL VENDOR";
        let currentVendorId = "UNKNOWN";
        let rowId = 1;

        const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
        const amountRegex = /(\(?-?\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?)/g;

        lines.forEach(line => {
            const lower = line.toLowerCase();
            if (lower.includes("vendor") || lower.includes("name:")) {
                let vMatch = line.match(/Vendor\s*ID:?\s*([A-Z0-9.-]+)/i);
                if (vMatch) currentVendorId = vMatch[1];
                let nMatch = line.replace(/Vendor\s*ID:?\s*[A-Z0-9.-]+/ig, '').replace(/Name:/ig, '').trim();
                if (nMatch) currentVendor = nMatch;
                return;
            }

            let dateMatch = line.match(dateRegex);
            let amounts = [...line.matchAll(amountRegex)].map(m => m[1]);

            if (dateMatch && amounts.length > 0) {
                const parseAmt = (s) => {
                    let isNeg = s.includes('(') || s.includes('-');
                    let clean = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
                    return isNeg ? -clean : clean;
                };

                let numAmounts = amounts.map(parseAmt);
                let docAmt = numAmounts[0] || 0;
                let curAmt = numAmounts[1] || docAmt;
                let d31 = numAmounts[2] || 0, d61 = numAmounts[3] || 0, d91 = numAmounts[4] || 0;

                let isCrossFootValid = Math.abs(docAmt - (curAmt + d31 + d61 + d91)) < 0.05;

                rows.push({
                    row_id: `RAW_ROW_${rowId++}`,
                    vendor_id: currentVendorId,
                    vendor_name: currentVendor,
                    voucher: "VCH-" + Math.floor(100000 + Math.random() * 900000),
                    doc_number: "DOC-" + Math.floor(10000 + Math.random() * 90000),
                    type: classifiedDocType,
                    doc_date: new Date(dateMatch[1]).toISOString(),
                    doc_amount: docAmt,
                    current_period: curAmt,
                    days_31_60: d31, days_61_90: d61, days_91_over: d91,
                    _cross_foot_valid: isCrossFootValid
                });
            }
        });
        return rows;
    }
}
