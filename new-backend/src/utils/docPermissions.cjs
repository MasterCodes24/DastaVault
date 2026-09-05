// Dastavault — Backend mirror of role-based update permissions
// DB roles are lowercase: "police", "lawyer", "judge", "forensic", "admin"

const ROLE_UPDATE_PERMISSIONS = {
  police:   ["e-FIR", "Witness Statement", "Evidence Photo", "Charge Sheet"],
  forensic: ["Forensic Report"],
  lawyer:   ["Legal Motion"],
  judge:    ["Court Order", "Verdict"],
  admin:    ["Other"],
};

/**
 * Returns true if the DB-stored role is permitted to update a document of the given type.
 * @param {string} dbRole  - lowercase db role: "police", "judge", etc.
 * @param {string} docType - e.g. "Witness Statement", "Verdict"
 */
function canRoleUpdateDoc(dbRole, docType) {
  return ROLE_UPDATE_PERMISSIONS[dbRole]?.includes(docType) ?? false;
}

module.exports = { ROLE_UPDATE_PERMISSIONS, canRoleUpdateDoc };
