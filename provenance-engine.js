// modules/provenance-engine.js

/**
 * Provenance Engine
 * Enforces RREDCO System Governance Charter v5.0
 * Primary Directive: Preserve evidence traceability and entity isolation.
 */

const VALID_ENTITIES = new Set(['POMCO', 'RREDCO', 'RRCSCO', 'WRGCC']);

const SOURCE_TRUST_LEVELS = {
    'NATIVE_EXPORT': 1, // Dynamics GP Export, Bank Data
    'ORIGINAL_DOC': 2,  // Native electronic invoice/file
    'SOURCE_PDF': 3,    // Scanned or flattened PDF
    'OCR_EXTRACTION': 4, // Raw text from OCR
    'AI_INTERPRETATION': 5 // LLM or Heuristic output
};

export class ProvenanceEngine {
    
    /**
     * Generates a frozen, immutable provenance wrapper for extracted data.
     * @param {Object} params 
     * @returns {Object} Immutable record with _provenance stamp
     */
    static stampRecord(params) {
        this.#validateEntity(params.entityContext);
        
        const trustLevel = SOURCE_TRUST_LEVELS[params.sourceType] || 5;

        const provenanceData = {
            sourceFile: params.sourceFile,
            sourceSystem: params.sourceSystem,
            trustLevel: trustLevel,
            entityContext: params.entityContext,
            retrievedAt: new Date().toISOString(),
            processedBy: params.processedBy || "Lighthouse Engine v2",
            confidenceMetrics: {
                ocrConfidence: params.ocrConfidence || null,
                parsingConfidence: params.parsingConfidence || null
            }
        };

        // Create the final record payload
        const stampedRecord = {
            _provenance: provenanceData,
            data: params.extractedData
        };

        // Enforce Immutability (Governance v5.0 - Data Integrity Precedence)
        return this.#deepFreeze(stampedRecord);
    }

    static #validateEntity(entity) {
        if (!entity) {
            throw new Error("Governance Violation: Entity Context is required. Records may not be merged or processed without an entity domain.");
        }
        // Note: The entity list expands over time, but strict boundaries must be maintained.
        if (!VALID_ENTITIES.has(entity)) {
            console.warn(`Warning: '${entity}' is not in the standard strict entity list, but isolation will be enforced.`);
        }
    }

    static #deepFreeze(object) {
        const propNames = Object.getOwnPropertyNames(object);
        for (const name of propNames) {
            const value = object[name];
            if (value && typeof value === "object") {
                this.#deepFreeze(value);
            }
        }
        return Object.freeze(object);
    }
}
