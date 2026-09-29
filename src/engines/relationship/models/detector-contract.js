/**
 * Detector Contract Interface - Governance v6.0
 * All detectors must implement the static detect() method.
 */
export class IDetector {
    /**
     * @param {Array<Object>} records - The full digitized dataset
     * @param {Object} indexes - O(1) hash maps from RelationshipIndexer
     * @param {Object} config - Parameters from RelationshipConfig
     * @returns {DetectorResult}
     */
    static detect(records, indexes, config) {
        throw new Error("Detector must implement static detect() method.");
    }
}
