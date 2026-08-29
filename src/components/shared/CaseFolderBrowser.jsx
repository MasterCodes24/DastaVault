import React, { useMemo, useState } from "react";
import { Search, Folder, FileText, ChevronRight, ArrowLeft, User2, ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import Badge, { statusTone } from "./Badge";
import CaseTrackingProgress from "./CaseTrackingProgress";
import { formatDateTime } from "../../utils/format";

export default function CaseFolderBrowser({ cases, title = "Case Folders", extraPanel }) {
  const { getCaseDocuments, getUserById, verifyDocument } = useApp();
  const [query, setQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [activeCaseId, setActiveCaseId] = useState(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return cases;
    const q = query.toLowerCase();
    return cases.filter(
      (c) => c.cnrNumber.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }, [cases, query]);

  const activeCase = cases.find((c) => c.id === activeCaseId);
  const docs = activeCase ? getCaseDocuments(activeCase.id) : [];
  const filteredDocs = docs.filter((d) =>
    d.documentName.toLowerCase().includes(docQuery.toLowerCase())
  );

  if (activeCase) {
    return (
      <div className="rounded-2xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <button
            onClick={() => setActiveCaseId(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft size={16} /> Back to {title}
          </button>
          <Badge tone={statusTone(activeCase.status)}>{activeCase.status}</Badge>
        </div>

        <div className="space-y-8 p-6">
          <div>
            <p className="font-mono text-xs font-semibold tracking-wide text-vault-cyanDark">
              {activeCase.cnrNumber}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink-900">{activeCase.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeCase.assignedUsers.map((uid) => {
                const u = getUserById(uid);
                if (!u) return null;
                return (
                  <span
                    key={uid}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600"
                  >
                    <User2 size={12} /> {u.name} · {u.role}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper/60 p-5">
            <CaseTrackingProgress caseItem={activeCase} />
          </div>

          {extraPanel && extraPanel(activeCase)}

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-display text-sm font-semibold text-ink-900">
                Documents <span className="text-ink-400 font-normal">({docs.length})</span>
              </h4>
              <div className="relative w-full max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                <input
                  value={docQuery}
                  onChange={(e) => setDocQuery(e.target.value)}
                  placeholder="Search documents by name…"
                  className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30"
                />
              </div>
            </div>

            {filteredDocs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line bg-paper/60 px-4 py-6 text-center text-sm text-ink-400">
                No documents match your search.
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {filteredDocs.map((d) => {
                  const uploader = getUserById(d.uploadedBy);
                  return (
                    <li key={d.id} className="flex items-center gap-3 bg-white px-4 py-3 hover:bg-paper/60">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{d.documentName}</p>
                        <p className="truncate text-xs text-ink-400">
                          {d.docType} · Uploaded by {uploader?.name || "Unknown"} · {formatDateTime(d.uploadedAt)}
                        </p>
                      </div>
                      <Badge tone="neutral">{d.docType}</Badge>
                      {d.documentId && (
                        <button
                          onClick={() => verifyDocument(d.documentId)}
                          title="Verify document integrity against blockchain record"
                          className="flex items-center gap-1 rounded-lg border border-vault-cyan/30 bg-vault-cyan/10 px-2.5 py-1.5 text-xs font-semibold text-vault-cyanDark transition hover:bg-vault-cyan/20"
                        >
                          <ShieldCheck size={13} />
                          Verify
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by CNR number…"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-400">No case folders found.</p>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActiveCaseId(c.id)}
                className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-paper/70"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
                  <Folder size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold text-vault-cyanDark">{c.cnrNumber}</p>
                  <p className="truncate font-display text-sm font-semibold text-ink-900">{c.title}</p>
                </div>
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                <ChevronRight size={18} className="shrink-0 text-ink-300" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
