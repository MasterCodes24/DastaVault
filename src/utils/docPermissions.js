// Dastavault — Role-based document permissions
// Legal basis mirrors Sec 173(8) CrPC, ISO 17025, Order VI Rule 17 CPC, Sec 362 CrPC

import { ROLES } from "../data/mockData";

// ─── UPDATE permissions (versioning an existing document) ────────────────────
// The original uploader restriction is ALSO enforced separately — this map only
// controls which document types a given role is eligible to version at all.

export const ROLE_UPDATE_PERMISSIONS = {
  [ROLES.POLICE]:   ["e-FIR", "Witness Statement", "Evidence Photo", "Charge Sheet"],
  [ROLES.FORENSIC]: ["Forensic Report"],
  [ROLES.LAWYER]:   ["Legal Motion"],
  [ROLES.JUDGE]:    ["Court Order", "Verdict"],
  [ROLES.ADMIN]:    ["Other"],
};

/**
 * Returns true if the given role is allowed to upload a new version of a document.
 * @param {string} userRole  - e.g. "Police Officer", "Judge"
 * @param {string} docType   - e.g. "Witness Statement", "Verdict"
 */
export function canUserUpdateDoc(userRole, docType) {
  return ROLE_UPDATE_PERMISSIONS[userRole]?.includes(docType) ?? false;
}

// ─── UPLOAD permissions (first-time document upload) ─────────────────────────
// Note: Judge's Verdict upload has a dedicated flow in JudgeDashboard —
// it is intentionally excluded from the generic upload form.

export const ROLE_UPLOAD_PERMISSIONS = {
  [ROLES.POLICE]:   ["e-FIR", "Witness Statement", "Evidence Photo", "Charge Sheet"],
  [ROLES.FORENSIC]: ["Forensic Report"],
  [ROLES.LAWYER]:   ["Legal Motion"],
  [ROLES.JUDGE]:    ["Court Order"],
  [ROLES.ADMIN]:    ["Other"],
};

/**
 * Returns the list of document types a given role is allowed to upload (v1).
 * Falls back to an empty array if the role is not found.
 * @param {string} userRole - e.g. "Police Officer", "Forensic Agency"
 * @returns {string[]}
 */
export function getAllowedUploadTypes(userRole) {
  return ROLE_UPLOAD_PERMISSIONS[userRole] ?? [];
}

// ─── Legal basis labels ───────────────────────────────────────────────────────
export const UPDATE_LEGAL_BASIS = {
  [ROLES.POLICE]:   "Sec 173(8) CrPC / 193(9) BNSS — Further Investigation",
  [ROLES.FORENSIC]: "ISO/IEC 17025 — Supplement to Test Report",
  [ROLES.LAWYER]:   "Order VI Rule 17 CPC — Amendment of Pleadings",
  [ROLES.JUDGE]:    "Sec 362 CrPC — Clerical corrections only",
  [ROLES.ADMIN]:    "Procedural Registry Maintenance",
};

