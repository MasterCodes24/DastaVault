/**
 * apiClient.js
 * Central API layer — all fetch() calls to the backend live here.
 * Base URL is read from the .env VITE_API_BASE_URL variable.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

// ─── CREATE CASE ──────────────────────────────────────────────────────────────
// POST /api/cases
// Body: { title, type, description }
// Returns: { caseId, title, type, description, status, createdAt, _id }
export async function apiCreateCase({ title, type, description }) {
  const res = await fetch(`${BASE}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, type, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Case creation failed");
  }
  return res.json();
}

// ─── GET ALL CASES ────────────────────────────────────────────────────────────
// GET /api/cases
// Returns: array of case objects from MongoDB
export async function apiFetchCases() {
  const res = await fetch(`${BASE}/api/cases`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}

// ─── UPLOAD DOCUMENT ──────────────────────────────────────────────────────────
// POST /api/cases/:caseId/documents
// Body: FormData with fields: document (File), title (string), documentType (string)
// Note: :caseId is the backend's generated ID e.g. "CASE-2026-1234567890"
// Returns: { message, document: { documentId, caseId, hash, blockchain, ... } }
export async function apiUploadDocument({ caseId, title, documentType, file }) {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("title", title);
  formData.append("documentType", documentType);

  const res = await fetch(`${BASE}/api/cases/${caseId}/documents`, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type header — browser sets it with boundary automatically for FormData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed");
  }
  return res.json(); // { message, document }
}

// ─── VERIFY DOCUMENT ──────────────────────────────────────────────────────────
// POST /api/documents/:documentId/verify
// Returns: { documentId, currentHash, blockchainHash, verified: bool, status: "VERIFIED" | "TAMPERED" }
export async function apiVerifyDocument(documentId) {
  const res = await fetch(`${BASE}/api/documents/${documentId}/verify`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Verification failed");
  }
  return res.json();
}
