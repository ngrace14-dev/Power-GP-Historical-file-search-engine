/**
 * Relationship Config - Governance v6.0
 */
export const RelationshipConfig = {
    reversalWindowDays: 60,
    settlementWindowDays: 180,
    transferWindowDays: 7,
    maxClassificationEdges: 5,
    matchThresholds: {
        exact: 1.0,
        strong: 0.9,
        probable: 0.75
    }
};
