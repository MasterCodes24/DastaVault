import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { seedUsers, seedCases, seedDocuments, ROLES } from "../data/mockData";

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
    ({ cnrNumber, title, creatorId, efir }) => {
      const newCase = {
        id: nextId("c"),
        cnrNumber,
        title,
        status: efir ? "e-FIR Registered" : "Open",
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
      notify("Case folder created.");
      return newCase;
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
    ({ caseId, documentName, docType, uploadedBy, fileName }) => {
      const newDoc = {
        id: nextId("d"),
        caseId,
        documentName,
        docType,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        fileUrl: "#",
        fileName: fileName || `${documentName}.pdf`,
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
      notify("Document uploaded successfully.");
      return newDoc;
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
