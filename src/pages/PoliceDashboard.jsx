import React, { useState } from "react";
import { Search, FileSignature, Loader2, ArrowLeft, CheckCircle2, MapPin, Calendar } from "lucide-react";
import { useApp } from "../context/AppContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import CaseFolderBrowser from "../components/shared/CaseFolderBrowser";
import DocumentUpload from "../components/shared/DocumentUpload";
import { Label, Input, Button } from "../components/shared/Field";
import { mockFetchFir } from "../utils/mockApi";

export default function PoliceDashboard() {
  const { currentUser, getCasesForUser, createCase, notify } = useApp();
  const [tab, setTab] = useState("efir");
  const myCases = getCasesForUser(currentUser.id);

  return (
    <DashboardLayout activeTab={tab} onTabChange={setTab}>
      {tab === "efir" && <EfirPortal onCreated={() => setTab("folders")} />}
      {tab === "folders" && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink-900">Case Folders</h1>
              <p className="mt-1 text-sm text-ink-400">Cases where you're an assigned investigating officer.</p>
            </div>
            <Button variant="accent" onClick={() => setTab("create-case")}>
              Create Case Folder
            </Button>
          </div>
          <CaseFolderBrowser cases={myCases} title="My Case Folders" />
        </section>
      )}
      {tab === "create-case" && (
        <DirectCaseCreate onCreated={() => setTab("folders")} onCancel={() => setTab("folders")} />
      )}
      {tab === "upload" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Upload Document</h1>
            <p className="mt-1 text-sm text-ink-400">Attach investigation documents to a case folder.</p>
          </div>
          <DocumentUpload
            title="Investigation Document Upload"
            subtitle="Add reports, statements or evidence photos to a case."
            cases={myCases}
          />
        </section>
      )}
    </DashboardLayout>
  );
}

function DirectCaseCreate({ onCreated, onCancel }) {
  const { currentUser, createCase, notify } = useApp();
  const [cnr, setCnr] = useState("");
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!cnr.trim() || !title.trim() || !caseType.trim())
      return notify("CNR number, case title and case type are required.", "warn");
    const created = await createCase({
      cnrNumber: cnr,
      title,
      type: caseType,
      description,
      creatorId: currentUser.id,
    });
    if (!created) return;
    onCreated();
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Create New Case Folder</h1>
        <p className="mt-1 text-sm text-ink-400">Create a case folder directly without an e-FIR.</p>
      </div>
      <form onSubmit={handleCreate} className="rounded-2xl border border-line bg-white p-6 shadow-card animate-fadeUp">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>CNR Number *</Label>
            <Input value={cnr} onChange={(e) => setCnr(e.target.value)} placeholder="e.g. MHCC010012342026" />
          </div>
          <div>
            <Label>Case Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. State vs. John Doe" />
          </div>
          <div>
            <Label>Case Type *</Label>
            <Input value={caseType} onChange={(e) => setCaseType(e.target.value)} placeholder="e.g. Theft, Fraud, Homicide" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description (optional)" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <ArrowLeft size={15} /> Cancel
          </Button>
          <Button type="submit" variant="accent">
            Create Case Folder
          </Button>
        </div>
      </form>
    </section>
  );
}

function EfirPortal({ onCreated }) {
  const { currentUser, createCase, notify, getCasesForUser, cases } = useApp();
  const myCases = getCasesForUser(currentUser.id);
  const [firNumber, setFirNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [cnr, setCnr] = useState("");
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState("");
  const [description, setDescription] = useState("");

  const handleFetch = (e) => {
    e.preventDefault();
    if (!firNumber.trim()) return notify("Enter an e-FIR number to fetch.", "warn");
    setLoading(true);
    setTimeout(() => {
      setPreview(mockFetchFir(firNumber.trim().toUpperCase()));
      setLoading(false);
    }, 700);
  };

  const resetState = () => {
    setPreview(null);
    setFirNumber("");
    setShowCreate(false);
    setShowAttach(false);
    setCnr("");
    setTitle("");
    setCaseType("");
    setDescription("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!cnr.trim() || !title.trim() || !caseType.trim())
      return notify("CNR number, case title and case type are required.", "warn");
    const created = await createCase({
      cnrNumber: cnr,
      title,
      type: caseType,
      description,
      creatorId: currentUser.id,
      efir: { number: preview.number, firDate: preview.date },
    });
    if (!created) return; // API failed
    resetState();
    onCreated();
  };

  const handleAttach = (e) => {
    e.preventDefault();
    if (!selectedCaseId) return notify("Please select a case to attach the e-FIR to.", "warn");
    const selectedCase = cases.find((c) => c.id === selectedCaseId);
    if (!selectedCase) return notify("Case not found.", "danger");

    if (selectedCase.efir) {
      notify("This case already has an e-FIR attached. Indian law does not allow multiple FIRs for one case. Please upload this complaint as a Witness Statement in the Document Upload section.", "warn");
      return;
    }

    // In a real app we would dispatch an action to update the case in the backend.
    // For mock context, we assume success and notify.
    selectedCase.efir = { number: preview.number, firDate: preview.date };
    notify(`e-FIR ${preview.number} attached to case ${selectedCase.cnrNumber} successfully.`);
    resetState();
    onCreated();
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">e-FIR Portal</h1>
        <p className="mt-1 text-sm text-ink-400">Fetch an e-FIR by number and attach it to a new case folder.</p>
      </div>

      {!preview && (
        <form onSubmit={handleFetch} className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <Label>e-FIR Number</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={firNumber}
              onChange={(e) => setFirNumber(e.target.value)}
              placeholder="e.g. EFIR-2026-MH-0091"
              className="flex-1"
            />
            <Button type="submit" variant="accent" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "Fetching…" : "Fetch Details"}
            </Button>
          </div>
        </form>
      )}

      {preview && !showCreate && (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card animate-fadeUp">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vault-cyan/10 text-vault-cyanDark">
              <FileSignature size={18} />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold text-vault-cyanDark">{preview.number}</p>
              <h3 className="font-display text-base font-semibold text-ink-900">e-FIR Preview</h3>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 text-ink-400" />
              <div>
                <dt className="text-xs font-semibold text-ink-400">Police Station</dt>
                <dd className="text-sm text-ink-900">{preview.station}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar size={15} className="mt-0.5 text-ink-400" />
              <div>
                <dt className="text-xs font-semibold text-ink-400">Date Filed</dt>
                <dd className="text-sm text-ink-900">{preview.date}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-400">Section(s)</dt>
              <dd className="text-sm text-ink-900">{preview.section}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-ink-400">Complainant</dt>
              <dd className="text-sm text-ink-900">{preview.complainant}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-ink-400">Summary</dt>
              <dd className="text-sm text-ink-600">{preview.summary}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => resetState()}>
              <ArrowLeft size={15} /> Go Back
            </Button>
            <Button variant="accent" onClick={() => { setShowCreate(true); setShowAttach(false); }}>
              <CheckCircle2 size={15} /> Add to New Case Folder
            </Button>
            <Button variant="outline" onClick={() => { setShowAttach(true); setShowCreate(false); }}>
              Add to Existing Case Folder
            </Button>
          </div>
        </div>
      )}

      {preview && showAttach && (
        <form onSubmit={handleAttach} className="rounded-2xl border border-line bg-white p-6 shadow-card animate-fadeUp">
          <h3 className="mb-1 font-display text-base font-semibold text-ink-900">Attach to Existing Case</h3>
          <p className="mb-5 text-sm text-ink-400">
            Select an existing case folder to attach e-FIR {preview.number} to.
          </p>
          <div className="mb-6">
            <Label>Select Case *</Label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30"
            >
              <option value="" disabled>Select a case...</option>
              {myCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cnrNumber} — {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAttach(false)}>
              <ArrowLeft size={15} /> Back
            </Button>
            <Button type="submit" variant="accent">
              Attach e-FIR
            </Button>
          </div>
        </form>
      )}

      {preview && showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-line bg-white p-6 shadow-card animate-fadeUp">
          <h3 className="mb-1 font-display text-base font-semibold text-ink-900">New Case Folder</h3>
          <p className="mb-5 text-sm text-ink-400">
            e-FIR {preview.number} will be attached as the first document in this folder.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>CNR Number *</Label>
              <Input value={cnr} onChange={(e) => setCnr(e.target.value)} placeholder="e.g. MHCC010012342026" />
            </div>
            <div>
              <Label>Case Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. State vs. John Doe" />
            </div>
            <div>
              <Label>Case Type *</Label>
              <Input value={caseType} onChange={(e) => setCaseType(e.target.value)} placeholder="e.g. Theft, Fraud, Homicide" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description (optional)" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              <ArrowLeft size={15} /> Back
            </Button>
            <Button type="submit" variant="accent">
              Create Case Folder
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
