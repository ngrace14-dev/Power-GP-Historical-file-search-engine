/**
 * @typedef {Object} RelationshipEdge
 * @property {string} edgeId - Unique cryptographic edge identifier
 * @property {string} sourceNode - Source Record ID
 * @property {string} targetNode - Target Record ID
 * @property {string} relationshipType - Valid type from RelationshipTypes
 * @property {string} investigativePriority - HIGH | MEDIUM | LOW
 * @property {number} confidence - Calculated score 0-100
 * @property {string} confidenceTier - Authoritative | Strong | Probable | Weak | Unreliable
 * @property {Array<string>} confidenceExplanation - Reasoning for the score
 * @property {string} detectedBy - Name of the detector module
 * @property {Array<string>} evidence - Human-readable evidence strings
 * @property {Object} metadata - Context-specific forensic factors
 * @property {Object} provenance - Stamp from RelationshipProvenance
 */

export const RelationshipEdgeSchema = {}; // Type definition container
