/**
 * Evidence Graph Engine - Phase 9 (Governance v6.0 Compliant)
 * Overhauls record arrays into a formal Node-Edge Evidence Graph Structure.
 * - Node Types: ENTITY, VENDOR, INVOICE, VOUCHER, ACCOUNT, DOCUMENT
 * - Edge Types: POSTED_TO, SUPPORTS, CONTRADICTS, REFERENCES, CROSS_ENTITY_LEAK
 * Supports multi-hop graph traversal and backward path reconstruction.
 */

import { AIGovernanceEngine } from './ai-governance.js';

export class EvidenceGraph {
    constructor() {
        this.nodes = new Map(); // id -> Node
        this.edges = [];        // Array of Edge Objects
        this.adjacencyList = new Map(); // nodeId -> Set of connected Edge Indices
    }

    /**
     * Adds a formal Node to the graph
     */
    addNode(id, type, label, metadata = {}) {
        if (!id || !type) return null;

        if (!this.nodes.has(id)) {
            const node = {
                id,
                type, // 'ENTITY' | 'VENDOR' | 'INVOICE' | 'VOUCHER' | 'ACCOUNT' | 'DOCUMENT'
                label: label || id,
                metadata,
                createdAt: new Date().toISOString()
            };
            this.nodes.set(id, node);
            this.adjacencyList.set(id, new Set());
        }
        return this.nodes.get(id);
    }

    /**
     * Adds a directed, scored Edge between two Nodes under Governance Rules
     */
    addEdge(sourceId, targetId, relationType, tier = 1, score = 90, reasons = [], metadata = {}) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            return null;
        }

        const edgeIndex = this.edges.length;
        const edge = {
            index: edgeIndex,
            sourceId,
            targetId,
            relationType, // 'POSTED_TO' | 'SUPPORTS' | 'CONTRADICTS' | 'REFERENCES' | 'CROSS_ENTITY_LEAK'
            tier,
            score,
            reasons,
            metadata,
            timestamp: new Date().toISOString()
        };

        // Enforce Transparency Rule on Graph Edges
        AIGovernanceEngine.validateRelationshipTransparency(edge);

        this.edges.push(edge);
        this.adjacencyList.get(sourceId).add(edgeIndex);
        this.adjacencyList.get(targetId).add(edgeIndex);

        return edge;
    }

    /**
     * Constructs a full Node-Edge Evidence Graph from digitized Lighthouse records
     */
    static buildGraphFromDataset(records = []) {
        const graph = new EvidenceGraph();

        // Step 1: Create Nodes for all Entities, Vendors, Invoices, and Journal Entries
        records.forEach(rec => {
            const r = rec.data || rec;
            const prov = rec._provenance || {};
            const entityCode = (prov.entityContext || rec._location || 'UNKNOWN').toUpperCase();
            const vendorName = r.vendor || r.vendor_name || r['Originating Master Name'] || 'Vendor';
            const invNum = r.invoiceNumber || r.doc_number || r['Invoice Number'] || '-';
            const jeNum = r.voucherNumber || r.voucher || r['Journal Entry'] || '-';
            const acctNum = r.accountNumber || r.vendor_id || r['Account Number'] || '-';

            // Add Entity Node
            const entityNodeId = `NODE_ENTITY_${entityCode}`;
            graph.addNode(entityNodeId, 'ENTITY', entityCode, { code: entityCode });

            // Add Vendor Node
            const vendorNodeId = `NODE_VENDOR_${vendorName.replace(/\s+/g, '_').toUpperCase()}`;
            graph.addNode(vendorNodeId, 'VENDOR', vendorName, { name: vendorName });

            // Add Invoice Node (if present)
            let invNodeId = null;
            if (invNum !== '-') {
                invNodeId = `NODE_INV_${entityCode}_${invNum}`;
                graph.addNode(invNodeId, 'INVOICE', `Invoice #${invNum}`, {
                    invoiceNumber: invNum,
                    amount: parseFloat(r.amount || r.doc_amount || 0),
                    date: r.transactionDate || r.doc_date || '-'
                });

                // Edge: Invoice -> Posted To Entity
                graph.addEdge(invNodeId, entityNodeId, 'POSTED_TO', 1, 100, [`Invoice ${invNum} posted in entity GL ${entityCode}`]);
                
                // Edge: Invoice -> Issued By Vendor
                graph.addEdge(invNodeId, vendorNodeId, 'SUPPORTS', 1, 95, [`Invoice ${invNum} issued by ${vendorName}`]);
            }

            // Add Voucher/JE Node (if present)
            if (jeNum !== '-') {
                const jeNodeId = `NODE_JE_${entityCode}_${jeNum}`;
                graph.addNode(jeNodeId, 'VOUCHER', `JE ${jeNum}`, { voucherNumber: jeNum });

                graph.addEdge(jeNodeId, entityNodeId, 'POSTED_TO', 1, 100, [`Journal Entry ${jeNum} recorded in entity GL ${entityCode}`]);

                if (invNodeId) {
                    graph.addEdge(invNodeId, jeNodeId, 'REFERENCES', 1, 90, [`Invoice #${invNum} referenced in Journal Entry ${jeNum}`]);
                }
            }

            // Add GL Account Node
            if (acctNum !== '-') {
                const acctNodeId = `NODE_ACCT_${entityCode}_${acctNum}`;
                graph.addNode(acctNodeId, 'ACCOUNT', `Account ${acctNum}`, { accountNumber: acctNum });
                graph.addEdge(acctNodeId, entityNodeId, 'POSTED_TO', 4, 30, [`Account ${acctNum} belongs to Entity ${entityCode}`]);
            }
        });

        // Step 2: Map Relational Edges from Relationship Engine Pipeline
        records.forEach(rec => {
            const rel = rec._relationships || {};
            const validEdges = [...(rel.tier1Edges || []), ...(rel.tier2Edges || [])];

            validEdges.forEach(edge => {
                const targetRec = records.find(r => r._id === edge.targetId);
                if (!targetRec) return;

                const srcData = rec.data || rec;
                const tgtData = targetRec.data || targetRec;

                const srcInv = srcData.invoiceNumber || srcData.doc_number || '-';
                const tgtInv = tgtData.invoiceNumber || tgtData.doc_number || '-';

                const srcEntity = (rec._provenance?.entityContext || rec._location || 'UNKNOWN').toUpperCase();
                const tgtEntity = (targetRec._provenance?.entityContext || targetRec._location || 'UNKNOWN').toUpperCase();

                if (srcInv !== '-' && tgtInv !== '-') {
                    const srcNodeId = `NODE_INV_${srcEntity}_${srcInv}`;
                    const tgtNodeId = `NODE_INV_${tgtEntity}_${tgtInv}`;

                    if (graph.nodes.has(srcNodeId) && graph.nodes.has(tgtNodeId)) {
                        const relType = edge.label === "Cross-Entity Invoice Collision" ? 'CROSS_ENTITY_LEAK' : 'SUPPORTS';
                        graph.addEdge(srcNodeId, tgtNodeId, relType, edge.tier, edge.score, edge.reasons);
                    }
                }
            });
        });

        return graph;
    }

    /**
     * Traverses graph backwards from a target Node to reconstruct full audit path
     */
    reconstructPath(targetNodeId, depth = 3) {
        if (!this.nodes.has(targetNodeId)) return [];

        const visited = new Set();
        const path = [];

        const traverse = (currId, currentDepth) => {
            if (currentDepth > depth || visited.has(currId)) return;
            visited.add(currId);

            const node = this.nodes.get(currId);
            path.push(node);

            const edgeIndices = this.adjacencyList.get(currId) || new Set();
            edgeIndices.forEach(idx => {
                const edge = this.edges[idx];
                const nextId = edge.sourceId === currId ? edge.targetId : edge.sourceId;
                traverse(nextId, currentDepth + 1);
            });
        };

        traverse(targetNodeId, 0);
        return path;
    }
}
