export class StagingService {
    static async openAuditDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('RREDCO_Audit_Store', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('staging')) {
                    db.createObjectStore('staging');
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    static async stageAuditData(extractedData) {
        if (!extractedData || extractedData.length === 0) return alert('No data to stage.');
        try {
            const db = await this.openAuditDB();
            const tx = db.transaction('staging', 'readwrite');
            const store = tx.objectStore('staging');
            store.put({ id: 'latest_export', data: extractedData, timestamp: Date.now() });
            tx.oncomplete = () => alert('Data staged to Ledger Terminal successfully.');
        } catch (e) {
            alert('Failed to stage data: ' + e.message);
        }
    }
}
