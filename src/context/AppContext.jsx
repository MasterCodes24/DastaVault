import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { seedUsers, seedCases, seedDocuments, ROLES } from "../data/mockData";
import {
  apiRegister,
  apiLogin,
  apiCreateCase,
  apiFetchCases,
  apiFetchUsers,
  apiApproveUser,
  apiRejectUser,
  apiAssignUser,
  apiUnassignUser,
  apiAddCourtDate,
  apiAddCaseNote,
  apiAddVerdict,
  apiUploadDocument,
  apiVerifyDocument,
} from "../api/apiClient";

const AppContext = createContext(null);

let idCounter = 1000;
const nextId = (prefix) => `${prefix}-${idCounter++}`;

// ─── Role normalization helpers ───────────────────────────────────────────────
// DB stores lowercase ("police"), frontend displays "Police Officer"
const ROLE_DB_TO_FRONTEND = {
  admin: ROLES.ADMIN,
  police: ROLES.POLICE,
  lawyer: ROLES.LAWYER,
  judge: ROLES.JUDGE,
  forensic: ROLES.FORENSIC,
};

const ROLE_FRONTEND_TO_DB = Object.fromEntries(
  Object.entries(ROLE_DB_TO_FRONTEND).map(([k, v]) => [v, k])
);

function normRoleToFrontend(dbRole) {
  return ROLE_DB_TO_FRONTEND[dbRole?.toLowerCase()] || dbRole;
}

function normRoleToDB(frontendRole) {
  return ROLE_FRONTEND_TO_DB[frontendRole] || frontendRole?.toLowerCase();
}

// DB stores "pending_approval" → frontend uses "PENDING_APPROVAL"
function normStatus(dbStatus) {
  if (!dbStatus) return "PENDING_APPROVAL";
  return dbStatus.toUpperCase().replace(/-/g, "_");
}

// Map a DB user doc → frontend user shape
function dbUserToFrontend(u) {
  return {
    id: u.id || u._id?.toString(),
    dbId: u.dbId || u._id?.toString(),
    name: u.name,
    role: normRoleToFrontend(u.role),
    credentialID: u.credentialID || u.credentialId,
    phone: u.phone,
    status: normStatus(u.status),
    password: u.password || "",   // not returned from DB — kept for mock compat
  };
}

// Map a DB case doc → frontend case shape
function dbCaseToFrontend(c) {
  return {
    id: c.caseId || c._id?.toString(),
    backendId: c.caseId || c._id?.toString(),
    cnrNumber: c.CNR || c.cnrNumber || "",
    FIR_NO: c.FIR_NO || "",
    title: c.title || "",
    type: c.type || "General",
    description: c.description || "",
    status: c.status || "REGISTERED",
    openedBy: c.openedBy || null,
    assignedUsers: c.assigned_users || c.assignedUsers || [],
    progressStage: c.progressStage ?? 0,
    milestoneDates: {
      efir: c.milestoneDates?.efir || null,
      forensics: c.milestoneDates?.forensics || null,
      lawyers: c.milestoneDates?.lawyers || null,
      hearings: c.milestoneDates?.hearings || null,
      verdict: c.milestoneDates?.verdict || null,
    },
    courtDates: c.courtDates || [],
    verdict: c.verdict?.verdictTitle
      ? {
          verdictTitle: c.verdict.verdictTitle,
          fileUrl: c.verdict.fileUrl || "#",
          uploadedAt: c.verdict.uploadedAt || new Date().toISOString(),
        }
      : null,
    efir: c.efir?.number ? c.efir : null,
    notes: c.notes || [],
  };
}

export function AppProvider({ children }) {
  const [users, setUsers] = useState(seedUsers);
  const [cases, setCases] = useState(seedCases);
  const [documents, setDocuments] = useState(seedDocuments);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  const notify = useCallback((message, tone = "success") => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  // ─── Initial data load from MongoDB ──────────────────────────────────────
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Load cases
        const dbCases = await apiFetchCases();
        if (Array.isArray(dbCases) && dbCases.length > 0) {
          setCases((prev) => {
            // Merge: keep seed data IDs that don't conflict, add DB cases
            const dbMapped = dbCases.map(dbCaseToFrontend);
            const seedFiltered = prev.filter(
              (s) => !dbMapped.some((d) => d.id === s.id)
            );
            return [...dbMapped, ...seedFiltered];
          });
        }
        setBackendOnline(true);
      } catch {
        // Backend not running — stay in offline/mock mode silently
        setBackendOnline(false);
      }

      try {
        // Load users
        const dbUsers = await apiFetchUsers();
        if (Array.isArray(dbUsers) && dbUsers.length > 0) {
          setUsers((prev) => {
            const dbMapped = dbUsers.map(dbUserToFrontend);
            const seedFiltered = prev.filter(
              (s) => !dbMapped.some((d) => d.credentialID === s.credentialID)
            );
            return [...dbMapped, ...seedFiltered];
          });
        }
      } catch {
        // Users endpoint failed — keep seed users
      }
    }

    loadInitialData();
  }, []);

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  const registerUser = useCallback(
    async ({ name, role, credentialID, phone, password }) => {
      // Check local state first for immediate duplicate detection
      const exists = users.some(
        (u) => u.credentialID?.toLowerCase() === credentialID?.toLowerCase()
      );
      if (exists) {
        return { ok: false, error: "A user with this credential ID already exists." };
      }

      // Attempt to persist to backend
      if (backendOnline) {
        try {
          const result = await apiRegister({
            name,
            role: normRoleToDB(role),
            phone,
            credentialId: credentialID,
            password,
          });
          const newUser = dbUserToFrontend(result.user);
          setUsers((prev) => [newUser, ...prev]);
          return { ok: true, user: newUser };
        } catch (err) {
          return { ok: false, error: err.message };
        }
      }

      // Fallback: local-only (backend offline)
      const newUser = {
        id: nextId("u"),
        name,
        role,
        credentialID,
        phone,
        password,
        status: "PENDING_APPROVAL",
      };
      setUsers((prev) => [newUser, ...prev]);
      return { ok: true, user: newUser };
    },
    [users, backendOnline]
  );

  const loginWithCredential = useCallback(
    async (credentialID, password) => {
      // Try backend login first
      if (backendOnline) {
        try {
          const result = await apiLogin({ credentialId: credentialID, password });
          const user = dbUserToFrontend(result.user);
          // Sync user into local state
          setUsers((prev) => {
            const idx = prev.findIndex((u) => u.credentialID?.toLowerCase() === credentialID.toLowerCase());
            if (idx === -1) return [user, ...prev];
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...user };
            return updated;
          });
          return { ok: true, user };
        } catch (err) {
          // If backend returns an explicit approval or rejection error, preserve it
          if (
            err.message?.includes("pending Admin approval") ||
            err.message?.includes("rejected by the admin")
          ) {
            return { ok: false, error: err.message };
          }
          // Check local seed / mock users if account was not found in DB or password failed in DB
          const localUser = users.find(
            (u) => u.credentialID?.toLowerCase() === credentialID?.toLowerCase()
          );
          if (localUser) {
            if (localUser.password !== password) return { ok: false, error: "Incorrect password." };
            if (localUser.status === "PENDING_APPROVAL")
              return {
                ok: false,
                error: "Your registration is still pending Admin approval. Please check back later.",
              };
            return { ok: true, user: localUser };
          }
          return { ok: false, error: err.message };
        }
      }

      // Fallback: local mock login
      const user = users.find(
        (u) => u.credentialID?.toLowerCase() === credentialID?.toLowerCase()
      );
      if (!user) return { ok: false, error: "No account found with that credential ID." };
      if (user.password !== password) return { ok: false, error: "Incorrect password." };
      if (user.status === "PENDING_APPROVAL")
        return {
          ok: false,
          error: "Your registration is still pending Admin approval. Please check back later.",
        };
      return { ok: true, user };
    },
    [users, backendOnline]
  );

  const loginAdmin = useCallback(
    async (username, password) => {
      if (backendOnline) {
        try {
          const result = await apiLogin({ credentialId: username, password });
          const user = dbUserToFrontend(result.user);
          return { ok: true, user };
        } catch (err) {
          if (
            err.message?.includes("pending Admin approval") ||
            err.message?.includes("rejected by the admin")
          ) {
            return { ok: false, error: err.message };
          }
        }
      }
      const admin = users.find((u) => u.role === ROLES.ADMIN);
      if (!admin) return { ok: false, error: "Admin account not configured." };
      if (username === admin.credentialID && password === admin.password) {
        return { ok: true, user: admin };
      }
      return { ok: false, error: "Invalid admin credentials." };
    },
    [users, backendOnline]
  );

  const completeLogin = useCallback((user) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("dv_token");
  }, []);

  // ─── ADMIN ────────────────────────────────────────────────────────────────
  const approveUser = useCallback(
    async (userId) => {
      // Try backend
      const user = users.find((u) => u.id === userId || u.dbId === userId);
      const backendId = user?.dbId || user?.id;

      if (backendOnline && backendId) {
        try {
          await apiApproveUser(backendId);
        } catch (err) {
          console.warn("Backend approve failed (local-only):", err.message);
        }
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "APPROVED" } : u)));
      notify("User approved.");
    },
    [users, backendOnline, notify]
  );

  const rejectUser = useCallback(
    async (userId) => {
      const user = users.find((u) => u.id === userId || u.dbId === userId);
      const backendId = user?.dbId || user?.id;

      if (backendOnline && backendId) {
        try {
          await apiRejectUser(backendId);
        } catch (err) {
          console.warn("Backend reject failed (local-only):", err.message);
        }
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      notify("User rejected and removed.", "danger");
    },
    [users, backendOnline, notify]
  );

  // ─── CASES ────────────────────────────────────────────────────────────────
  const createCase = useCallback(
    async ({ cnrNumber, title, type = "General", description = "", creatorId, efir }) => {
      try {
        const backendCase = await apiCreateCase({
          title,
          type,
          description,
          openedBy: creatorId || null,
          efir: efir || null,
          cnrNumber: cnrNumber || null,
        });

        const newCase = dbCaseToFrontend(backendCase);
        // Override cnrNumber if user supplied one
        if (cnrNumber) newCase.cnrNumber = cnrNumber;
        // Preserve creator info
        if (creatorId) newCase.assignedUsers = [...new Set([...(newCase.assignedUsers || []), creatorId])];

        setCases((prev) => [newCase, ...prev]);
        notify("Case folder created and saved to database.");
        return newCase;
      } catch (err) {
        notify(err.message || "Failed to create case. Is the backend running?", "danger");
        return null;
      }
    },
    [notify]
  );

  const assignUserToCase = useCallback(
    async (caseId, userId) => {
      // Optimistic local update
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          if (c.assignedUsers.includes(userId)) return c;
          const user = users.find((u) => u.id === userId);
          const isLawyer = user?.role === ROLES.LAWYER;
          const nextStage = isLawyer && c.progressStage < 3 ? 3 : c.progressStage;
          return {
            ...c,
            assignedUsers: [...c.assignedUsers, userId],
            progressStage: nextStage,
            milestoneDates: {
              ...c.milestoneDates,
              lawyers:
                isLawyer && !c.milestoneDates.lawyers
                  ? new Date().toISOString()
                  : c.milestoneDates.lawyers,
            },
          };
        })
      );

      // Persist to backend
      if (backendOnline) {
        try {
          await apiAssignUser(caseId, userId);
        } catch (err) {
          console.warn("Backend assign failed (local-only):", err.message);
        }
      }
    },
    [users, backendOnline]
  );

  const unassignUserFromCase = useCallback(
    async (caseId, userId) => {
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          return { ...c, assignedUsers: c.assignedUsers.filter((id) => id !== userId) };
        })
      );

      if (backendOnline) {
        try {
          await apiUnassignUser(caseId, userId);
        } catch (err) {
          console.warn("Backend unassign failed (local-only):", err.message);
        }
      }
    },
    [backendOnline]
  );

  const addCourtDate = useCallback(
    async (caseId, date, note) => {
      // Optimistic update
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          const nextStage = c.progressStage < 4 ? 4 : c.progressStage;
          return {
            ...c,
            courtDates: [...c.courtDates, { date, note }],
            progressStage: nextStage,
            milestoneDates: {
              ...c.milestoneDates,
              hearings: c.milestoneDates.hearings || new Date().toISOString(),
            },
          };
        })
      );

      if (backendOnline) {
        try {
          await apiAddCourtDate(caseId, { date, note });
        } catch (err) {
          console.warn("Backend court date failed (local-only):", err.message);
        }
      }

      notify("Court hearing date added.");
    },
    [backendOnline, notify]
  );

  const addCaseNote = useCallback(
    async (caseId, authorId, text) => {
      const note = {
        id: nextId("n"),
        author: authorId,
        text,
        createdAt: new Date().toISOString(),
      };

      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          return { ...c, notes: [...(c.notes || []), note] };
        })
      );

      if (backendOnline) {
        try {
          await apiAddCaseNote(caseId, { author: authorId, text });
        } catch (err) {
          console.warn("Backend note failed (local-only):", err.message);
        }
      }
    },
    [backendOnline]
  );

  const uploadVerdict = useCallback(
    async (caseId, { verdictTitle, fileUrl }) => {
      // Optimistic update
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          return {
            ...c,
            status: "Closed — Verdict Delivered",
            progressStage: 5,
            verdict: { verdictTitle, fileUrl: fileUrl || "#", uploadedAt: new Date().toISOString() },
            milestoneDates: { ...c.milestoneDates, verdict: new Date().toISOString() },
          };
        })
      );

      if (backendOnline) {
        try {
          await apiAddVerdict(caseId, { verdictTitle, fileUrl });
        } catch (err) {
          console.warn("Backend verdict failed (local-only):", err.message);
        }
      }

      notify("Verdict recorded and case closed.");
    },
    [backendOnline, notify]
  );

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────
  const uploadDocument = useCallback(
    async ({ caseId, documentName, docType, uploadedBy, file }) => {
      try {
        const result = await apiUploadDocument({
          caseId,
          title: documentName,
          documentType: docType,
          file,
          uploadedBy: uploadedBy || null,
        });
        const backendDoc = result.document;
        const newDoc = {
          id: backendDoc.documentId,
          documentId: backendDoc.documentId,
          caseId,
          documentName,
          docType,
          uploadedBy,
          uploadedAt: backendDoc.createdAt || new Date().toISOString(),
          fileUrl: "#",
          fileName: file.name,
          hash: backendDoc.hash,
        };
        setDocuments((prev) => [newDoc, ...prev]);
        setCases((prev) =>
          prev.map((c) => {
            if (c.id !== caseId) return c;
            let progressStage = c.progressStage;
            let milestoneDates = { ...c.milestoneDates };
            if (docType === "Forensic Report" && progressStage < 2) {
              progressStage = 2;
              milestoneDates.forensics = milestoneDates.forensics || new Date().toISOString();
            }
            return { ...c, progressStage, milestoneDates };
          })
        );
        notify("Document uploaded and registered on blockchain.");
        return newDoc;
      } catch (err) {
        notify(err.message || "Upload failed. Is the backend running?", "danger");
        return null;
      }
    },
    [notify]
  );

  // ─── VERIFY DOCUMENT ──────────────────────────────────────────────────────
  const verifyDocument = useCallback(
    async (documentId) => {
      try {
        const result = await apiVerifyDocument(documentId, currentUser?.id);
        if (result.verified) {
          notify("✅ Document verified — integrity confirmed, not tampered.", "success");
        } else {
          notify("⚠️ TAMPERED — hash mismatch detected! Document may be compromised.", "danger");
        }
        return result;
      } catch (err) {
        notify(err.message || "Verification failed.", "danger");
        return null;
      }
    },
    [currentUser, notify]
  );

  const getUserById = useCallback((id) => users.find((u) => u.id === id), [users]);

  const getCaseDocuments = useCallback(
    (caseId) => documents.filter((d) => d.caseId === caseId),
    [documents]
  );

  const getCasesForUser = useCallback(
    (userId) => cases.filter((c) => c.assignedUsers.includes(userId)),
    [cases]
  );

  const value = useMemo(
    () => ({
      users,
      cases,
      documents,
      currentUser,
      toast,
      setToast,
      notify,
      backendOnline,
      registerUser,
      loginWithCredential,
      loginAdmin,
      completeLogin,
      logout,
      approveUser,
      rejectUser,
      createCase,
      assignUserToCase,
      unassignUserFromCase,
      addCourtDate,
      addCaseNote,
      uploadVerdict,
      uploadDocument,
      verifyDocument,
      getUserById,
      getCaseDocuments,
      getCasesForUser,
    }),
    [
      users,
      cases,
      documents,
      currentUser,
      toast,
      notify,
      backendOnline,
      registerUser,
      loginWithCredential,
      loginAdmin,
      completeLogin,
      logout,
      approveUser,
      rejectUser,
      createCase,
      assignUserToCase,
      unassignUserFromCase,
      addCourtDate,
      addCaseNote,
      uploadVerdict,
      uploadDocument,
      verifyDocument,
      getUserById,
      getCaseDocuments,
      getCasesForUser,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
