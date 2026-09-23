/**
 * Provenance Engine
 * Phase 1 Roadmap Requirement - Source Tracking & Trust Scoring
 */
export class ProvenanceEngine {
    static stampRecord({ sourceFile, sourceSystem, sourceType, entityContext, processedBy, ocrConfidence, parsingConfidence, extractedData }) {
        return {
            _provenance: {
                sourceFile: sourceFile || 'Unknown',
                sourceSystem: sourceSystem || 'Unknown',
                sourceType: sourceType || 'Unknown',
                entityContext: entityContext || 'UNKNOWN',
                processedBy: processedBy || 'Lighthouse Engine',
                timestamp: new Date().toISOString(),
                trustLevel: this.calculateTrustLevel(ocrConfidence, parsingConfidence),
                confidenceMetrics: { ocrConfidence, parsingConfidence }
            },
            data: extractedData
        };
    }

    static calculateTrustLevel(ocr, parse) {
        const avg = ((ocr || 100) + (parse || 100)) / 2;
        if (avg >= 95) return 5;
        if (avg >= 85) return 4;
        if (avg >= 70) return 3;
        if (avg >= 50) return 2;
        return 1;
    }
}
