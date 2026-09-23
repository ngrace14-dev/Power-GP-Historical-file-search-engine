 modules/confidence-engine.js

/**
 * Confidence Engine
 * Enforces RREDCO System Governance Charter v5.0 - Rule 6
 * Calculates probabilistic confidence scores for extraction and parsing.
 */

export class ConfidenceEngine {
    
    /**
     * Calculates combined confidence metrics for a given record.
     * @param {Object} params - Contains sourceType, rawText (optional), and the parsedRecord
     * @returns {Object} { ocrConfidence, parsingConfidence }
     */
    static calculateScores(params) {
        let ocrConfidence = 100.0;
        let parsingConfidence = 100.0;

        // 1. OCR / Text Extraction Quality
        if (params.sourceType === 'NATIVE_EXPORT') {
            ocrConfidence = 100.0; // Native Excel exports have perfect "OCR" confidence
        } else if (params.rawText) {
            // Heuristic: Penalize for high presence of garbled or unexpected characters
            const totalChars = params.rawText.length;
            const badChars = (params.rawText.match(/[^a-zA-Z0-9\s.,\-$():/]/g) || []).length;
            
            if (totalChars > 0) {
                const penalty = (badChars / totalChars) * 150; // Weighted penalty
                ocrConfidence = Math.max(0, 100 - penalty);
            }
        } else {
            ocrConfidence = 85.0; // Baseline for unknown unstructured text
        }

        // 2. Parsing Structural Integrity
        if (params.parsedRecord) {
            let requiredFieldsScore = 0;
            const r = params.parsedRecord;
            
            // Validate core forensic fields (20 points each)
            if (r.vendor_id && r.vendor_id !== "UNKNOWN") requiredFieldsScore += 20;
            if (r.doc_date && r.doc_date !== "Invalid Date") requiredFieldsScore += 20;
            if (typeof r.doc_amount === 'number') requiredFieldsScore += 20;
            if (typeof r.current_period === 'number') requiredFieldsScore += 20;
            
            // Validate mathematical integrity (20 points)
            if (r._cross_foot_valid) requiredFieldsScore += 20;

            parsingConfidence = requiredFieldsScore;
        }

        return {
            ocrConfidence: parseFloat(ocrConfidence.toFixed(1)),
            parsingConfidence: parseFloat(parsingConfidence.toFixed(1))
        };
    }
}
