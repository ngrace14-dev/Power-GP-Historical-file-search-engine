export class ExportService {
    static async downloadExcel(data, ExcelJS) {
        if (!data || data.length === 0) return;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Evidence');
        sheet.addRow(['ID', 'Entity', 'Vendor', 'Voucher', 'Type', 'Date', 'Amount', 'Confidence']);
        data.forEach(row => {
            const r = row.data || row;
            sheet.addRow([
                row._id || r.row_id,
                row._provenance?.entityContext || r.entity,
                r.vendor || r.vendor_name,
                r.voucher || r.voucherNumber,
                r.type || r.documentType,
                r.doc_date || r.transactionDate,
                r.amount || r.doc_amount,
                row._provenance?.parsingConfidence || 1
            ]);
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Lighthouse_Export.xlsx';
        link.click();
    }
}
