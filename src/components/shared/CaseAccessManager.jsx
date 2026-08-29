import React, { useMemo, useState } from "react";
import { Search, UserPlus, UserMinus, ShieldCheck, KeyRound, FolderLock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ROLES } from "../../data/mockData";
import Badge, { statusTone } from "./Badge";
import { Select } from "./Field";
import { initials } from "../../utils/format";

// Roles the admin is allowed to grant case access to.
// Police + Admin already have baseline access, so they're excluded from the "grant" list.
const ASSIGNABLE_ROLES = [ROLES.POLICE, ROLES.LAWYER, ROLES.JUDGE, ROLES.FORENSIC];

const ROLE_BADGE_TONE = {
  [ROLES.POLICE]: "cyan",
  [ROLES.LAWYER]: "amber",
  [ROLES.JUDGE]: "ink",
  [ROLES.FORENSIC]: "leaf",
};

/**
 * Admin-only panel: pick a case folder, see who currently has access to it,
 * then search the full user directory (by name or credential ID) and grant
 * or revoke access. Granting access adds the user to case.assignedUsers,
 * which is the same field every dashboard/page already uses to decide what
 * a user can see (CaseFolderBrowser, DocumentUpload, etc.) — so no other
 * screen needs to change.
 */
export default function CaseAccessManager({ cases }) {
  const { users, assignUserToCase, unassignUserFromCase, notify } = useApp();
  const [caseQuery, setCaseQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || "");
  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const filteredCases = useMemo(() => {
    if (!caseQuery.trim()) return cases;
    const q = caseQuery.toLowerCase();
    return cases.filter(
      (c) => c.cnrNumber.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }, [cases, caseQuery]);

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || filteredCases[0];

  const assignedUsers = useMemo(() => {
    if (!selectedCase) return [];
    return selectedCase.assignedUsers
      .map((id) => users.find((u) => u.id === id))
      .filter(Boolean);
  }, [selectedCase, users]);

  const candidateUsers = useMemo(() => {
    if (!selectedCase) return [];
    const assignedIds = new Set(selectedCase.assignedUsers);
    const q = userQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (u.status !== "APPROVED") return false;
      if (u.role === ROLES.ADMIN) return false;
      if (assignedIds.has(u.id)) return false;
      if (roleFilter !== "All" && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.credentialID.toLowerCase().includes(q);
    });
  }, [selectedCase, users, userQuery, roleFilter]);

  const handleGrant = (user) => {
    if (!selectedCase) return;
    assignUserToCase(selectedCase.id, user.id);
    notify(`${user.name} was granted access to ${selectedCase.cnrNumber}.`);
  };

  const handleRevoke = (user) => {
    if (!selectedCase) return;
    unassignUserFromCase(selectedCase.id, user.id);
    notify(`${user.name}'s access to ${selectedCase.cnrNumber} was revoked.`, "warn");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      {/* Case list */}
      <div className="rounded-2xl border border-line bg-white shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-base font-semibold text-ink-900">Case Folders</h3>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={caseQuery}
              onChange={(e) => setCaseQuery(e.target.value)}
              placeholder="Search by CNR or title…"
              className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30"
            />
          </div>
        </div>
        <ul className="max-h-[560px] divide-y divide-line overflow-y-auto">
          {filteredCases.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-ink-400">No case folders found.</li>
          )}
          {filteredCases.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedCaseId(c.id)}
                className={`flex w-full flex-col gap-1.5 px-5 py-3.5 text-left transition ${
                  c.id === selectedCase?.id ? "bg-vault-cyan/10" : "hover:bg-paper/70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-vault-cyanDark">{c.cnrNumber}</p>
                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                </div>
                <p className="truncate text-sm font-semibold text-ink-900">{c.title}</p>
                <p className="text-xs text-ink-400">{c.assignedUsers.length} user(s) with access</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Access panel */}
      <div className="space-y-5">
        {!selectedCase ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <FolderLock size={28} className="text-ink-300" />
            <p className="text-sm text-ink-400">Select a case folder to manage access.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-ink-900">
                    Who has access — {selectedCase.cnrNumber}
                  </h3>
                  <p className="text-sm text-ink-400">{selectedCase.title}</p>
                </div>
              </div>

              <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-400">
                <KeyRound size={13} /> Admin can already view every case folder from the Master Case Vault.
              </p>

              {assignedUsers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line bg-paper/60 px-4 py-6 text-center text-sm text-ink-400">
                  No one is assigned to this case yet.
                </p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {assignedUsers.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 bg-white px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-50 text-xs font-bold text-ink-500">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{u.name}</p>
                        <p className="truncate font-mono text-xs text-ink-400">{u.credentialID}</p>
                      </div>
                      <Badge tone={ROLE_BADGE_TONE[u.role] || "neutral"}>{u.role}</Badge>
                      <button
                        onClick={() => handleRevoke(u)}
                        className="rounded-lg p-2 text-ink-400 transition hover:bg-vault-coral/10 hover:text-vault-coral"
                        title="Revoke access"
                      >
                        <UserMinus size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h4 className="mb-1 font-display text-sm font-semibold text-ink-900">Grant access</h4>
              <p className="mb-4 text-sm text-ink-400">
                Search users by name or credential ID and assign them to this case folder. They'll then
                be able to view the case, its documents, and upload their own.
              </p>

              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search by name or credential ID…"
                    className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30"
                  />
                </div>
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:w-48">
                  <option value="All">All roles</option>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>

              {candidateUsers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line bg-paper/60 px-4 py-6 text-center text-sm text-ink-400">
                  No matching users available to add.
                </p>
              ) : (
                <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                  {candidateUsers.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 bg-white px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-50 text-xs font-bold text-ink-500">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{u.name}</p>
                        <p className="truncate font-mono text-xs text-ink-400">{u.credentialID}</p>
                      </div>
                      <Badge tone={ROLE_BADGE_TONE[u.role] || "neutral"}>{u.role}</Badge>
                      <button
                        onClick={() => handleGrant(u)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-vault-cyan/10 px-3 py-1.5 text-xs font-semibold text-vault-cyanDark transition hover:bg-vault-cyan hover:text-ink-900"
                      >
                        <UserPlus size={14} /> Grant Access
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
