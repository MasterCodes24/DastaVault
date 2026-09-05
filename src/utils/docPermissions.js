// Dastavault — Role-based document update permissions
// Legal basis mirrors Sec 173(8) CrPC, ISO 17025, Order VI Rule 17 CPC, Sec 362 CrPC

import { ROLES } from "../data/mockData";

/**
 * Maps each role to the document types they are permitted to update.
 * "Update" means uploading a new version (v2, v3, …) of an existing document.
 * The original uploader restriction is ALSO enforced separately — this map only
 * controls which document types a given role is eligible to update at all.
 */
export const ROLE_UPDATE_PERMISSIONS = {
  [ROLES.POLICE]:   ["e-FIR", "Witness Statement", "Evidence Photo", "Charge Sheet"],
  [ROLES.FORENSIC]: ["Forensic Report"],
  [ROLES.LAWYER]:   ["Legal Motion"],
  [ROLES.JUDGE]:    ["Court Order", "Verdict"],
  [ROLES.ADMIN]:    ["Other"],
};

/**
 * Returns true if the given role is allowed to update a document of the given type.
 * This is a necessary condition — not sufficient on its own.
 * The caller must also verify the user is the original uploader.
 *
 * @param {string} userRole  - e.g. "Police Officer", "Judge", "Forensic Agency"
 * @param {string} docType   - e.g. "Witness Statement", "Verdict"
 * @returns {boolean}
 */
export function canUserUpdateDoc(userRole, docType) {
  return ROLE_UPDATE_PERMISSIONS[userRole]?.includes(docType) ?? false;
}

/**
 * Returns a human-readable label describing the legal basis for updates
 * for a given role.
 */
export const UPDATE_LEGAL_BASIS = {
  [ROLES.POLICE]:   "Sec 173(8) CrPC / 193(9) BNSS — Further Investigation",
  [ROLES.FORENSIC]: "ISO/IEC 17025 — Supplement to Test Report",
  [ROLES.LAWYER]:   "Order VI Rule 17 CPC — Amendment of Pleadings",
  [ROLES.JUDGE]:    "Sec 362 CrPC — Clerical corrections only",
  [ROLES.ADMIN]:    "Procedural Registry Maintenance",
};
