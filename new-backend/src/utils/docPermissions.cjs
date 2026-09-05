// Dastavault — Backend mirror of role-based document permissions
// DB roles are lowercase: "police", "lawyer", "judge", "forensic", "admin"

// ─── UPDATE permissions (versioning an existing document) ────────────────────
const ROLE_UPDATE_PERMISSIONS = {
  police:   ["e-FIR", "Witness Statement", "Evidence Photo", "Charge Sheet"],
  forensic: ["Forensic Report"],
  lawyer:   ["Legal Motion"],
  judge:    ["Court Order", "Verdict"],
  admin:    ["Other"],
};

/**
 * Returns true if the DB-stored role is permitted to version a document of the given type.
 * @param {string} dbRole  - lowercase db role: "police", "judge", etc.
 * @param {string} docType - e.g. "Witness Statement", "Verdict"
 */
function canRoleUpdateDoc(dbRole, docType) {
  return ROLE_UPDATE_PERMISSIONS[dbRole]?.includes(docType) ?? false;
}

// ─── UPLOAD permissions (first-time document upload) ─────────────────────────
// Judge's Verdict is excluded — it has a dedicated upload flow in the dashboard.
const ROLE_UPLOAD_PERMISSIONS = {
  police:   ["e-FIR", "Witness Statement", "Evidence Photo", "Charge Sheet"],
  forensic: ["Forensic Report"],
  lawyer:   ["Legal Motion"],
  judge:    ["Court Order"],
  admin:    ["Other"],
};

/**
 * Returns true if the DB-stored role is permitted to upload a document of the given type (v1).
 * @param {string} dbRole  - lowercase db role: "police", "judge", etc.
 * @param {string} docType - e.g. "Forensic Report"
 */
function canRoleUploadDoc(dbRole, docType) {
  return ROLE_UPLOAD_PERMISSIONS[dbRole]?.includes(docType) ?? false;
}

module.exports = { ROLE_UPDATE_PERMISSIONS, canRoleUpdateDoc, ROLE_UPLOAD_PERMISSIONS, canRoleUploadDoc };

