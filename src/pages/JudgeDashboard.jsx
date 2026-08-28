import React, { useState } from "react";
import { CalendarClock, Gavel, FileCheck2, Plus, Clock3 } from "lucide-react";
import { useApp } from "../context/AppContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import CaseFolderBrowser from "../components/shared/CaseFolderBrowser";
import { Label, Input, Select, Textarea, Button } from "../components/shared/Field";
import Modal from "../components/shared/Modal";
import { formatDate, formatDateTime } from "../utils/format";

export default function JudgeDashboard() {
  const { currentUser, getCasesForUser } = useApp();
  const [tab, setTab] = useState("folders");
  const myCases = getCasesForUser(currentUser.id);

  return (
    <DashboardLayout activeTab={tab} onTabChange={setTab}>
      {tab === "folders" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Bench Case Folders</h1>
            <p className="mt-1 text-sm text-ink-400">Cases currently listed before your bench.</p>
          </div>
          <CaseFolderBrowser cases={myCases} title="My Bench Cases" />
        </section>
      )}

      {tab === "scheduler" && <SchedulerTab cases={myCases} />}
      {tab === "verdict" && <NotesVerdictTab cases={myCases} />}
    </DashboardLayout>
  );
}

function SchedulerTab({ cases }) {
  const { addCourtDate, notify } = useApp();
  const [caseId, setCaseId] = useState(cases[0]?.id || "");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const selected = cases.find((c) => c.id === caseId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!caseId) return notify("Select a case folder first.", "warn");
    if (!date) return notify("Choose a hearing date.", "warn");
    addCourtDate(caseId, date, note || "Hearing");
    setDate("");
    setNote("");
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Court Date Scheduler</h1>
        <p className="mt-1 text-sm text-ink-400">Assign and track hearing dates for cases on your bench.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={handleSubmit} className="h-fit rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
              <CalendarClock size={18} />
            </div>
            <h3 className="font-display text-base font-semibold text-ink-900">Add Hearing Date</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Case Folder *</Label>
              <Select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                {cases.length === 0 && <option value="">No cases assigned</option>}
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cnrNumber} — {c.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Hearing Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Purpose / Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Framing of charges" />
            </div>
            <Button type="submit" variant="accent" className="w-full">
              <Plus size={16} /> Add Hearing Date
            </Button>
          </div>
        </form>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h3 className="mb-4 font-display text-base font-semibold text-ink-900">Hearing History</h3>
          {!selected || selected.courtDates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-paper/60 px-4 py-8 text-center text-sm text-ink-400">
              No hearing dates recorded yet for this case.
            </p>
          ) : (
            <ol className="space-y-3">
              {selected.courtDates.map((cd, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-paper/60 px-3.5 py-3">
                  <Clock3 size={16} className="mt-0.5 shrink-0 text-vault-cyanDark" />
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{formatDate(cd.date)}</p>
                    <p className="text-xs text-ink-400">{cd.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function NotesVerdictTab({ cases }) {
  const { addCaseNote, uploadVerdict, currentUser, getUserById, notify } = useApp();
  const [caseId, setCaseId] = useState(cases[0]?.id || "");
  const [note, setNote] = useState("");
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [verdictTitle, setVerdictTitle] = useState("");
  const [fileName, setFileName] = useState("");

  const selected = cases.find((c) => c.id === caseId);

  const handleNote = (e) => {
    e.preventDefault();
    if (!caseId) return notify("Select a case first.", "warn");
    if (!note.trim()) return notify("Session notes cannot be empty.", "warn");
    addCaseNote(caseId, currentUser.id, note.trim());
    setNote("");
  };

  const handleVerdict = (e) => {
    e.preventDefault();
    if (!verdictTitle.trim()) return notify("Verdict title is required.", "warn");
    if (!fileName.trim()) return notify("Attach the signed verdict PDF.", "warn");
    uploadVerdict(caseId, { verdictTitle: verdictTitle.trim(), fileUrl: "#" });
    setVerdictOpen(false);
    setVerdictTitle("");
    setFileName("");
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Court Notes & Verdict</h1>
        <p className="mt-1 text-sm text-ink-400">Record session notes and finalize the verdict for a case.</p>
      </div>

      <div>
        <Label>Case Folder</Label>
        <Select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="max-w-md">
          {cases.length === 0 && <option value="">No cases assigned</option>}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.cnrNumber} — {c.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
              <FileCheck2 size={18} />
            </div>
            <h3 className="font-display text-base font-semibold text-ink-900">Session Notes</h3>
          </div>
          <form onSubmit={handleNote} className="space-y-3">
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record proceedings, observations, or directions from today's session…"
            />
            <Button type="submit" variant="outline" className="w-full">
              Save Note
            </Button>
          </form>

          <div className="mt-5 space-y-3">
            {(selected?.notes || []).length === 0 ? (
              <p className="text-sm text-ink-400">No notes recorded yet.</p>
            ) : (
              selected.notes
                .slice()
                .reverse()
                .map((n) => (
                  <div key={n.id} className="rounded-lg bg-paper/60 px-3.5 py-3">
                    <p className="text-sm text-ink-700">{n.text}</p>
                    <p className="mt-1.5 text-xs text-ink-400">
                      {getUserById(n.author)?.name} · {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
              <Gavel size={18} />
            </div>
            <h3 className="font-display text-base font-semibold text-ink-900">Final Verdict</h3>
          </div>

          {selected?.verdict ? (
            <div className="rounded-lg border border-vault-leaf/30 bg-vault-leaf/5 px-4 py-4">
              <p className="text-sm font-semibold text-ink-900">{selected.verdict.verdictTitle}</p>
              <p className="mt-1 text-xs text-ink-400">Recorded {formatDateTime(selected.verdict.uploadedAt)}</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-400">
                No verdict recorded yet for this case. Attach a signed verdict to close the case.
              </p>
              <Button variant="accent" className="w-full" onClick={() => setVerdictOpen(true)} disabled={!caseId}>
                Upload Verdict
              </Button>
            </>
          )}
        </div>
      </div>

      <Modal open={verdictOpen} onClose={() => setVerdictOpen(false)} title="Upload Final Verdict">
        <form onSubmit={handleVerdict} className="space-y-4">
          <div>
            <Label>Verdict Title *</Label>
            <Input
              value={verdictTitle}
              onChange={(e) => setVerdictTitle(e.target.value)}
              placeholder="e.g. Guilty — Sentenced to 7 years imprisonment"
            />
          </div>
          <div>
            <Label>Signed Verdict PDF *</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-ink-50/50 px-4 py-3 text-sm text-ink-500 hover:border-vault-cyan hover:bg-vault-cyan/5">
              <span className="truncate">{fileName || "Click to attach signed PDF (simulated)"}</span>
              <input type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
            </label>
          </div>
          <p className="rounded-lg bg-vault-coral/10 px-3.5 py-2.5 text-xs text-vault-coral">
            This action closes the case and cannot be undone in this demo.
          </p>
          <Button type="submit" variant="accent" className="w-full">
            Confirm & Render Verdict
          </Button>
        </form>
      </Modal>
    </section>
  );
}
