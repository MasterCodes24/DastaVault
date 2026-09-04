/**
 * apiClient.js
 * Central API layer — all fetch() calls to the backend live here.
 * Base URL is read from the .env VITE_API_BASE_URL variable.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

// ─── Shared fetch helper ──────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("dv_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
// Body: { name, role, phone, credentialId, password }
// Returns: { message, user }
export async function apiRegister({ name, role, phone, credentialId, password }) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, role, phone, credentialId, password }),
  });
}

// POST /api/auth/login
// Body: { credentialId, password }
// Returns: { token, user }
export async function apiLogin({ credentialId, password }) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentialId, password }),
  });
  // Persist JWT for subsequent requests
  if (data.token) localStorage.setItem("dv_token", data.token);
  return data;
}

// POST /api/auth/verify-otp
// Body: { userId, otpCode }
export async function apiVerifyOtp({ userId, otpCode }) {
  return apiFetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, otpCode }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/users?role=...&status=...
// Returns: array of user objects
export async function apiFetchUsers({ role, status } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch(`/api/users${qs}`);
}

// PATCH /api/users/:id/approve
export async function apiApproveUser(id) {
  return apiFetch(`/api/users/${id}/approve`, { method: "PATCH" });
}

// PATCH /api/users/:id/reject
export async function apiRejectUser(id) {
  return apiFetch(`/api/users/${id}/reject`, { method: "PATCH" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/cases
// Body: { title, type, description?, openedBy?, efir?, cnrNumber? }
// Returns: case document from MongoDB
export async function apiCreateCase({ title, type, description, openedBy, efir, cnrNumber }) {
  return apiFetch("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, type, description, openedBy, efir, cnrNumber }),
  });
}

// GET /api/cases
// Returns: array of case objects
export async function apiFetchCases() {
  return apiFetch("/api/cases");
}

// GET /api/cases/:caseId
export async function apiFetchCase(caseId) {
  return apiFetch(`/api/cases/${caseId}`);
}

// PATCH /api/cases/:caseId/assign
// Body: { userId }
export async function apiAssignUser(caseId, userId) {
  return apiFetch(`/api/cases/${caseId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

// PATCH /api/cases/:caseId/unassign
// Body: { userId }
export async function apiUnassignUser(caseId, userId) {
  return apiFetch(`/api/cases/${caseId}/unassign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

// POST /api/cases/:caseId/court-dates
// Body: { date, note? }
export async function apiAddCourtDate(caseId, { date, note }) {
  return apiFetch(`/api/cases/${caseId}/court-dates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, note }),
  });
}

// POST /api/cases/:caseId/verdict
// Body: { verdictTitle, fileUrl?, judge? }
export async function apiAddVerdict(caseId, { verdictTitle, fileUrl, judge }) {
  return apiFetch(`/api/cases/${caseId}/verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verdictTitle, fileUrl, judge }),
  });
}

// POST /api/cases/:caseId/notes
// Body: { author, text }
export async function apiAddCaseNote(caseId, { author, text }) {
  return apiFetch(`/api/cases/${caseId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, text }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/cases/:caseId/documents  (multipart)
// Body: FormData with fields: document (File), title, documentType, uploadedBy?
// Returns: { message, document }
export async function apiUploadDocument({ caseId, title, documentType, file, uploadedBy }) {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("title", title);
  formData.append("documentType", documentType);
  if (uploadedBy) formData.append("uploadedBy", uploadedBy);

  const token = localStorage.getItem("dv_token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api/cases/${caseId}/documents`, {
    method: "POST",
    headers,
    body: formData,
    // Do NOT set Content-Type — browser sets it with boundary automatically for FormData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed");
  }
  return res.json();
}

// POST /api/documents/:documentId/verify
// Returns: { documentId, currentHash, blockchainHash, verified, status }
export async function apiVerifyDocument(documentId, actor) {
  return apiFetch(`/api/documents/${documentId}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor: actor || null }),
  });
}

// GET /api/cases/:caseId/documents
export async function apiFetchCaseDocuments(caseId) {
  return apiFetch(`/api/cases/${caseId}/documents`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/audit?caseId=...&limit=...
export async function apiFetchAuditLogs({ caseId, limit } = {}) {
  const params = new URLSearchParams();
  if (caseId) params.set("caseId", caseId);
  if (limit) params.set("limit", limit);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch(`/api/audit${qs}`);
}

// GET /api/cases/:caseId/audit
export async function apiFetchCaseAudit(caseId) {
  return apiFetch(`/api/cases/${caseId}/audit`);
}
