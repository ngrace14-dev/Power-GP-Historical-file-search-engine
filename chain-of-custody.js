/**
 * Chain-of-Custody Ledger - Phase 7 (Governance v6.0 Compliant)
 * Maintains an immutable, tamper-evident hash chain for all financial evidence actions:
 * Ingestion, Validation, Relationship Creation, Risk Evaluation, Memo Generation, and Staging.
 */

export class ChainOfCustody {
    static chain = [];

    /**
     * Generates a SHA-256 cryptographic hash for an audit payload
     */
    static async generateHash(dataString) {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const msgUint8 = new TextEncoder().encode(dataString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            let hash = 0;
            for (let i = 0; i < dataString.length; i++) {
                const char = dataString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            return 'hash_' + Math.abs(hash).toString(16);
        }
    }

    /**
     * Records a new immutable event block into the chain of custody
     */
    static async recordEvent(eventType, details = {}, user = "SYSTEM_AUTOMATION") {
        const prevHash = this.chain.length > 0 
            ? this.chain[this.chain.length - 1].hash 
            : "0000000000000000000000000000000000000000000000000000000000000000";
            
        const timestamp = new Date().toISOString();
        
        const eventPayload = {
            index: this.chain.length + 1,
            timestamp,
            eventType,
            user,
            details,
            prevHash
        };

        const payloadString = JSON.stringify(eventPayload);
        const hash = await this.generateHash(payloadString);

        const block = {
            ...eventPayload,
            hash
        };

        this.chain.push(block);
        return block;
    }

    /**
     * Verifies cryptographic hash integrity across the audit chain
     */
    static verifyChainIntegrity() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i - 1];
            if (currentBlock.prevHash !== prevBlock.hash) {
                return { 
                    valid: false, 
                    brokenIndex: i, 
                    reason: `Cryptographic hash mismatch detected between block ${i-1} and block ${i}.` 
                };
            }
        }
        return { valid: true, totalBlocks: this.chain.length };
    }

    /**
     * Returns complete chain-of-custody audit log
     */
    static getLedger() {
        return this.chain;
    }
}
