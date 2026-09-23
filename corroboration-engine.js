/**
 * Corroboration Engine - Phase 4 (Governance v6.0 Compliant)
 * Operationalizes independent source verification tracking:
 * - Level A: Single source verification (Status: Detected)
 * - Level B: Dual independent source cross-verification (Status: Validated)
 * - Level C: Triple+ independent source cross-verification (Status: Corroborated)
 * - Level D: Formally reviewed within a resolved investigation (Status: Archived)
 */

export class CorroborationEngine {

    /**
     * Evaluates independent source verification for a single record against the full evidence graph
     */
    static evaluateCorroboration(record, allDatasetRecords = []) {
        const srcFile = record._provenance?.sourceFile || record._sourceFile || 'Primary_Source';
        const srcSystem = record._provenance?.sourceSystem || record['Originating TRX Source'] || 'System';

        const distinctSources = new Set([`${srcSystem}:${srcFile}`]);
        const sourceNames = new Set([srcFile]);

        const rel = record._relationships || {};
        const validEdges = [...(rel.tier1Edges || []), ...(rel.tier2Edges || [])].filter(e => e.label !== "Cross-Entity Invoice Collision");

        // Inspect linked Tier 1 & Tier 2 targets for distinct source files/systems
        validEdges.forEach(edge => {
            const targetRec = allDatasetRecords.find(r => r._id === edge.targetId);
            if (targetRec) {
                const tgtFile = targetRec._provenance?.sourceFile || targetRec._sourceFile || '';
                const tgtSys = targetRec._provenance?.sourceSystem || targetRec['Originating TRX Source'] || '';
                if (tgtFile) {
                    distinctSources.add(`${tgtSys}:${tgtFile}`);
                    sourceNames.add(tgtFile);
                }
            }
        });

        const sourceCount = distinctSources.size;
        let corroborationLevel = 'A';
        let corroborationStatus = 'Detected';
        let confidenceWeight = 25; // Base single-source confidence

        if (record._evidenceState?.status === 'Archived') {
            corroborationLevel = 'D';
            corroborationStatus = 'Archived';
            confidenceWeight = 100;
        } else if (sourceCount >= 3) {
            corroborationLevel = 'C';
            corroborationStatus = 'Corroborated';
            confidenceWeight = 95;
        } else if (sourceCount === 2) {
            corroborationLevel = 'B';
            corroborationStatus = 'Validated';
            confidenceWeight = 70;
        }

        return {
            corroborationLevel,
            corroborationStatus,
            sourceCount,
            confidenceWeight,
            isIndependent: sourceCount > 1,
            supportingSources: Array.from(sourceNames)
        };
    }

    /**
     * Evaluates dataset corroboration ratings and appends metadata
     */
    static evaluateDataset(records = []) {
        if (!Array.isArray(records) || records.length === 0) {
            return { records: [], corroboratedCount: 0 };
        }

        let corroboratedCount = 0;
        const processed = records.map(rec => {
            const corrob = this.evaluateCorroboration(rec, records);
            if (corrob.corroborationLevel === 'B' || corrob.corroborationLevel === 'C' || corrob.corroborationLevel === 'D') {
                corroboratedCount++;
            }
            rec._corroboration = corrob;
            return rec;
        });

        return {
            records: processed,
            corroboratedCount
        };
    }
}
