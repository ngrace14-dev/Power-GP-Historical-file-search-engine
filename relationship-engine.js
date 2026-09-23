/**
 * Relationship Engine - Governance v6.0 Compliant
 * Features Independent Corroboration Tracking, Attribute Frequency Decay,
 * and Cross-Entity Edge Protection on Tier 1 matches.
 */

import { AIGovernanceEngine } from './ai-governance.js';

export class RelationshipEngine {

    static getFieldValue(rec, keys) {
        if (!rec) return '';
        const d = rec.data || rec;
        for (const key of keys) {
            if (rec[key] !== undefined && rec[key] !== null && String(rec[key]).trim() !== '' && rec[key] !== '-') {
                return String(rec[key]).trim();
            }
            if (d[key] !== undefined && d[key] !== null && String(d[key]).trim() !== '' && d[key] !== '-') {
                return String(d[key]).trim();
            }
        }
        return '';
    }

    static getRecordId(rec, idx) {
        if (rec._id) return rec._id;
        if (rec.id) return rec.id;
        if (rec.data && rec.data.row_id) return rec.data.row_id;
        return `REC_${idx}_${Date.now()}`;
    }

    static buildRelationships(records = []) {
        if (!Array.isArray(records) || records.length === 0) return records;

        const invoiceMap = new Map();
        const voucherMap = new Map();
        const tuple3DMap = new Map(); 
        const vendorMap = new Map();
        const vendorFrequencyMap = new Map(); // Relationship Decay Tracking

        const invKeys = ['Invoice Number', 'invoiceNumber', 'doc_number'];
        const jeKeys = ['Journal Entry', 'voucherNumber', 'voucher'];
        const vendorKeys = ['Originating Master Name', 'vendor', 'vendor_name'];
        const dateKeys = ['TRX Date', 'transactionDate', 'doc_date'];
        const amtKeys = ['Debit Amount', 'Credit Amount', 'amount', 'doc_amount'];

        // Step 1: Index primary identifiers and calculate vendor attribute frequency
        records.forEach((rec, idx) => {
            const id = this.getRecordId(rec, idx);
            if (!rec._id) rec._id = id;

            const inv = this.getFieldValue(rec, invKeys);
            const je = this.getFieldValue(rec, jeKeys);
            const vendor = this.getFieldValue(rec, vendorKeys);
            const date = this.getFieldValue(rec, dateKeys);
            const amt = this.getFieldValue(rec, amtKeys);

            if (vendor && vendor !== '-' && !vendor.toLowerCase().includes('general vendor')) {
                const cleanVendor = vendor.toLowerCase();
                vendorFrequencyMap.set(cleanVendor, (vendorFrequencyMap.get(cleanVendor) || 0) + 1);
                
                if (!vendorMap.has(vendor)) vendorMap.set(vendor, []);
                vendorMap.get(vendor).push(id);
            }

            if (inv && inv !== '-' && !inv.toLowerCase().includes('inv-clk')) {
                if (!invoiceMap.has(inv)) invoiceMap.set(inv, []);
                invoiceMap.get(inv).push(id);
            }

            if (je && je !== '-' && !je.toLowerCase().includes('je-clk')) {
                if (!voucherMap.has(je)) voucherMap.set(je, []);
                voucherMap.get(je).push(id);
            }

            if (vendor && amt && date && vendor !== '-' && amt !== '0' && amt !== '0.00') {
                const tupleKey = `${vendor.toLowerCase()}_${parseFloat(amt).toFixed(2)}_${date}`;
                if (!tuple3DMap.has(tupleKey)) tuple3DMap.set(tupleKey, []);
                tuple3DMap.get(tupleKey).push(id);
            }
        });

        // Step 2: Categorize edges per record with Decay Penalties & Entity Boundary Checks
        return records.map((rec, idx) => {
            const id = this.getRecordId(rec, idx);

            const inv = this.getFieldValue(rec, invKeys);
            const je = this.getFieldValue(rec, jeKeys);
            const vendor = this.getFieldValue(rec, vendorKeys);
            const date = this.getFieldValue(rec, dateKeys);
            const amt = this.getFieldValue(rec, amtKeys);

            const srcEntity = (rec._provenance?.entityContext || rec._location || '').toUpperCase();
            const srcFile = rec._provenance?.sourceFile || rec._sourceFile || '';

            const tier1Edges = [];
            const tier2Edges = [];
            const tier3Edges = [];

            // Helper to determine independent source corroboration
            const checkIndependence = (targetRec) => {
                const tgtFile = targetRec?._provenance?.sourceFile || targetRec?._sourceFile || '';
                return srcFile !== '' && tgtFile !== '' && srcFile !== tgtFile;
            };

            // Check Tier 1 Matches with Entity Preservation Protection
            if (inv && invoiceMap.get(inv)) {
                invoiceMap.get(inv).filter(targetId => targetId !== id).forEach(targetId => {
                    const targetRec = records.find(r => r._id === targetId);
                    const tgtEntity = (targetRec?._provenance?.entityContext || targetRec?._location || '').toUpperCase();
                    const isSameEntity = (srcEntity === tgtEntity) && srcEntity !== '';
                    const isIndependent = checkIndependence(targetRec);

                    if (isSameEntity) {
                        tier1Edges.push({
                            targetId,
                            tier: 1,
                            score: 95,
                            label: "Evidence Relationship",
                            isIndependentCorroboration: isIndependent,
                            reasons: [`Exact Invoice Match (${inv}) within ${srcEntity}`],
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        // Flag as Cross-Entity Collision Contradiction edge instead of Tier 1 Evidence
                        tier1Edges.push({
                            targetId,
                            tier: 1,
                            score: 40,
                            label: "Cross-Entity Invoice Collision",
                            isIndependentCorroboration: isIndependent,
                            reasons: [`Invoice #${inv} matches record in Entity ${tgtEntity} (Cross-Entity Contradiction)`],
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }

            if (je && voucherMap.get(je)) {
                voucherMap.get(je).filter(targetId => targetId !== id).forEach(targetId => {
                    const targetRec = records.find(r => r._id === targetId);
                    const isIndependent = checkIndependence(targetRec);

                    tier1Edges.push({
                        targetId,
                        tier: 1,
                        score: 90,
                        label: "Evidence Relationship",
                        isIndependentCorroboration: isIndependent,
                        reasons: [`Exact Journal Entry Match (${je})`],
                        timestamp: new Date().toISOString()
                    });
                });
            }

            // Check Tier 2 Corroborating Matches (3-Dimensional)
            if (vendor && amt && date) {
                const tupleKey = `${vendor.toLowerCase()}_${parseFloat(amt).toFixed(2)}_${date}`;
                if (tuple3DMap.get(tupleKey)) {
                    tuple3DMap.get(tupleKey).filter(targetId => targetId !== id).forEach(targetId => {
                        if (!tier1Edges.some(e => e.targetId === targetId)) {
                            const targetRec = records.find(r => r._id === targetId);
                            const isIndependent = checkIndependence(targetRec);

                            tier2Edges.push({
                                targetId,
                                tier: 2,
                                score: 80,
                                label: "Corroborating Relationship",
                                isIndependentCorroboration: isIndependent,
                                reasons: ["3D Corroboration Match (Vendor + Dollar Amount + TRX Date)"],
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                }
            }

            // Check Tier 3 Associative Matches with Frequency Decay
            if (vendor && vendorMap.get(vendor)) {
                const freq = vendorFrequencyMap.get(vendor.toLowerCase()) || 1;
                // Relationship Decay Penalty: high-frequency vendors decay in score
                const decayPenalty = Math.min(30, Math.floor(Math.log10(freq) * 15));
                const decayedScore = Math.max(10, 45 - decayPenalty);

                vendorMap.get(vendor).filter(targetId => targetId !== id).forEach(targetId => {
                    if (!tier1Edges.some(e => e.targetId === targetId) && !tier2Edges.some(e => e.targetId === targetId)) {
                        tier3Edges.push({
                            targetId,
                            tier: 3,
                            score: decayedScore,
                            label: "Associative Relationship",
                            isIndependentCorroboration: false,
                            reasons: [`Shared Vendor Context (${vendor}) [Decay Penalty: -${decayPenalty} pts for ${freq} records]`],
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }

            // Calculate Independent Corroboration Level
            const distinctIndependentSources = new Set([srcFile || 'Source_1']);
            const validEvidenceEdges = [...tier1Edges, ...tier2Edges].filter(e => e.label !== "Cross-Entity Invoice Collision");

            validEvidenceEdges.forEach(edge => {
                if (edge.isIndependentCorroboration) {
                    const targetRec = records.find(r => r._id === edge.targetId);
                    const tgtFile = targetRec?._provenance?.sourceFile || targetRec?._sourceFile || '';
                    if (tgtFile) distinctIndependentSources.add(tgtFile);
                }
            });

            const sourceCount = distinctIndependentSources.size;
            let corroborationLevel = 'A'; // Level A = 1 source
            if (sourceCount === 2) corroborationLevel = 'B';
            else if (sourceCount >= 3) corroborationLevel = 'C';

            rec._corroboration = {
                corroborationLevel,
                sourceCount,
                isIndependent: sourceCount > 1,
                supportingSources: Array.from(distinctIndependentSources)
            };

            rec._relationships = {
                hasLinks: validEvidenceEdges.length > 0,
                evidenceCount: tier1Edges.filter(e => e.label === "Evidence Relationship").length,
                corroboratingCount: tier2Edges.length,
                associativeCount: tier3Edges.length,
                contextualCount: 0,
                tier1Edges,
                tier2Edges,
                tier3Edges
            };

            return rec;
        });
    }
}
