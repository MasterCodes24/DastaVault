import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { seedUsers, seedCases, seedDocuments, ROLES } from "../data/mockData";
import { apiCreateCase, apiUploadDocument, apiVerifyDocument } from "../api/apiClient";

const AppContext = createContext(null);

let idCounter = 1000;
const nextId = (prefix) => `${prefix}-${idCounter++}`;

export function AppProvider({ children }) {
  const [users, setUsers] = useState(seedUsers);
  const [cases, setCases] = useState(seedCases);
  const [documents, setDocuments] = useState(seedDocuments);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = "success") => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  // ---------- AUTH ----------
  const registerUser = useCallback(
    ({ name, role, credentialID, phone, password }) => {
      const exists = users.some(
        (u) => u.credentialID.toLowerCase() === credentialID.toLowerCase()
      );
      if (exists) {
        return { ok: false, error: "A user with this credential ID already exists." };
      }
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
    [users]
  );

  const loginWithCredential = useCallback(
    (credentialID, password) => {
      const user = users.find(
        (u) => u.credentialID.toLowerCase() === credentialID.toLowerCase()
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
    [users]
  );

  const loginAdmin = useCallback(
    (username, password) => {
      const admin = users.find((u) => u.role === ROLES.ADMIN);
      if (username === admin.credentialID && password === admin.password) {
        return { ok: true, user: admin };
      }
      return { ok: false, error: "Invalid admin credentials." };
    },
    [users]
  );

  const completeLogin = useCallback((user) => {
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);

  // ---------- ADMIN ----------
  const approveUser = useCallback((userId) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "APPROVED" } : u)));
    notify("User approved.");
  }, [notify]);

  const rejectUser = useCallback((userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    notify("User rejected and removed.", "danger");
  }, [notify]);

  // ---------- CASES ----------
  const createCase = useCallback(
    async ({ cnrNumber, title, type = "General", description = "", creatorId, efir }) => {
      try {
        // Call the real backend API
        const backendCase = await apiCreateCase({ title, type, description });
        // Build the local case shape — merge backend ID + frontend-only fields
        const newCase = {
          id: backendCase.caseId,          // use backend's "CASE-2026-xxx" as the local id
          backendId: backendCase.caseId,   // keep explicit reference for upload URL
          cnrNumber,                        // frontend-only field, stored locally
          title: backendCase.title,
          type: backendCase.type,
          description: backendCase.description || "",
          status: efir ? "e-FIR Registered" : "REGISTERED",
          assignedUsers: creatorId ? [creatorId] : [],
          progressStage: efir ? 1 : 0,
          milestoneDates: {
            efir: efir ? new Date().toISOString() : null,
            forensics: null,
            lawyers: null,
            hearings: null,
            verdict: null,
          },
          courtDates: [],
          verdict: null,
          efir: efir || null,
          notes: [],
        };
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
    (caseId, userId) => {
      setCases((prev) =>
        prev.map((c) => {
          if (c.id !== caseId) return c;
          if (c.assignedUsers.includes(userId)) return c;
          const user = users.find((u) => u.id === userId);
          const isLawyer = user?.role === ROLES.LAWYER;
          const nextStage =
            isLawyer && c.progressStage < 3 ? 3 : c.progressStage;
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
    },
    [users]
  );

  // Revokes a user's access to a case folder (removes them from assignedUsers).
  // Used by the Admin's Case Access Control panel.
  const unassignUserFromCase = useCallback((caseId, userId) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        return { ...c, assignedUsers: c.assignedUsers.filter((id) => id !== userId) };
      })
    );
  }, []);

  const addCourtDate = useCallback(
    (caseId, date, note) => {
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
      notify("Court hearing date added.");
    },
    [notify]
  );

  const addCaseNote = useCallback((caseId, authorId, text) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const note = {
          id: nextId("n"),
          author: authorId,
          text,
          createdAt: new Date().toISOString(),
        };
        return { ...c, notes: [...(c.notes || []), note] };
      })
    );
  }, []);

  const uploadVerdict = useCallback(
    (caseId, { verdictTitle, fileUrl }) => {
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
      notify("Verdict recorded and case closed.");
    },
    [notify]
  );

  // ---------- DOCUMENTS ----------
  const uploadDocument = useCallback(
    async ({ caseId, documentName, docType, uploadedBy, file }) => {
      try {
        // The backend expects the backend caseId ("CASE-2026-xxx") in the URL
        // caseId here is the local case id which we set to backendId on creation
        const result = await apiUploadDocument({
          caseId,                   // e.g. "CASE-2026-1234567890"
          title: documentName,
          documentType: docType,
          file,                     // actual File object from the file input
        });
        const backendDoc = result.document;
        const newDoc = {
          id: backendDoc.documentId,       // backend's "DOC-xxx"
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

  // ---------- VERIFY DOCUMENT ----------
  const verifyDocument = useCallback(
    async (documentId) => {
      try {
        const result = await apiVerifyDocument(documentId);
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
    [notify]
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
