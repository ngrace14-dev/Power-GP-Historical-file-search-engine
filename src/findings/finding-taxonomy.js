/**
 * Finding Taxonomy - Governance v6.0
 * Defines the classification and severity tiers for forensic observations.
 */

export const FindingTypes = {
    OBSERVATION: "OBSERVATION",
    DRAFT_FINDING: "DRAFT_FINDING",
    PROCEDURE_GAP: "PROCEDURE_GAP",
    POLICY_VARIANCE: "POLICY_VARIANCE",
    SYSTEM_ANOMALY: "SYSTEM_ANOMALY"
};

export const TheoryStatus = {
    PROPOSED: "PROPOSED",
    SUPPORTED: "SUPPORTED",
    CONTRADICTED: "CONTRADICTED",
    REJECTED: "REJECTED",
    ACCEPTED: "ACCEPTED"
};

export const ImpactTiers = {
    CRITICAL: "CRITICAL",
    SIGNIFICANT: "SIGNIFICANT",
    MODERATE: "MODERATE",
    MINOR: "MINOR",
    IMMATERIAL: "IMMATERIAL"
};
