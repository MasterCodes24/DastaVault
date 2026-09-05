import React, { useState } from "react";
import { UploadCloud, FilePlus2, ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { DOC_TYPES } from "../../data/mockData";
import { getAllowedUploadTypes } from "../../utils/docPermissions";
import { Label, Input, Select, Button } from "./Field";

/**
 * Reusable upload panel.
 * props:
 *  - title, subtitle
 *  - cases: cases available to upload into
 *  - extraFields: optional array of { key, label, type: 'text'|'checkbox', required }
 *  - typeFilter: optional restrict DOC_TYPES
 */
export default function DocumentUpload({
  title = "Upload Document",
  subtitle = "Attach a document to an existing case folder.",
  cases,
  extraFields = [],
  accentIcon: AccentIcon = UploadCloud,
}) {
  const { currentUser, uploadDocument, createCase, notify, verifyDocument } = useApp();

  // Restrict doc types to what this role is allowed to upload.
  // Falls back to the full list if the role is unrecognized (safe default).
  const allowedTypes = getAllowedUploadTypes(currentUser?.role);
  const effectiveTypes = allowedTypes.length > 0 ? allowedTypes : DOC_TYPES;

  const [documentName, setDocumentName] = useState("");
  const [docType, setDocType] = useState(effectiveTypes[0] ?? DOC_TYPES[0]);
  const [caseId, setCaseId] = useState(cases[0]?.id || "");
  const [fileObj, setFileObj] = useState(null);   // stores the actual File object
  const [extra, setExtra] = useState({});
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCnr, setNewCnr] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const resetForm = () => {
    setDocumentName("");
    setDocType(DOC_TYPES[0]);
    setFileObj(null);
    setExtra({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentName.trim()) return notify("Document name is required.", "warn");
    if (!fileObj) return notify("Please choose a file to upload.", "warn");

    for (const f of extraFields) {
      if (f.required && f.type !== "checkbox" && !extra[f.key]?.toString().trim()) {
        return notify(`${f.label} is required.`, "warn");
      }
      if (f.type === "checkbox" && f.required && !extra[f.key]) {
        return notify(`Please confirm: ${f.label}`, "warn");
      }
    }

    let targetCaseId = caseId;
    if (creatingNew) {
      if (!newCnr.trim() || !newTitle.trim())
        return notify("CNR number and case title are required to create a folder.", "warn");
      const created = await createCase({ cnrNumber: newCnr, title: newTitle, type: "General", creatorId: currentUser.id });
      if (!created) return;
      targetCaseId = created.id;
    }

    if (!targetCaseId) return notify("Please select a target case folder.", "warn");

    await uploadDocument({
      caseId: targetCaseId,
      documentName: extra.expertName ? `${documentName}` : documentName,
      docType,
      uploadedBy: currentUser.id,
      file: fileObj,              // pass actual File object to the context
    });
    resetForm();
    setCreatingNew(false);
    setNewCnr("");
    setNewTitle("");
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
          <AccentIcon size={18} />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
          <p className="text-sm text-ink-400">{subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {extraFields
          .filter((f) => f.type !== "checkbox")
          .map((f) => (
            <div key={f.key} className={f.fullWidth ? "sm:col-span-2" : ""}>
              <Label>{f.label}{f.required && " *"}</Label>
              <Input
                value={extra[f.key] || ""}
                onChange={(e) => setExtra((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </div>
          ))}

        <div>
          <Label>Document Name / Title *</Label>
          <Input
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="e.g. Witness Statement — R. Kumar"
          />
        </div>

        <div>
          <Label>Document Type *</Label>
          <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {effectiveTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label>File *</Label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-ink-50/50 px-4 py-3 text-sm text-ink-500 transition hover:border-vault-cyan hover:bg-vault-cyan/5">
            <FilePlus2 size={16} className="shrink-0 text-ink-400" />
            <span className="truncate">{fileObj ? fileObj.name : "Click to choose a file"}</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFileObj(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Target Case Folder *</Label>
            <button
              type="button"
              onClick={() => setCreatingNew((v) => !v)}
              className="mb-1.5 text-xs font-semibold text-vault-cyanDark hover:underline"
            >
              {creatingNew ? "Choose existing folder instead" : "+ Create new case folder"}
            </button>
          </div>

          {!creatingNew ? (
            <Select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              {cases.length === 0 && <option value="">No case folders assigned yet</option>}
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cnrNumber} — {c.title}
                </option>
              ))}
            </Select>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="CNR Number" value={newCnr} onChange={(e) => setNewCnr(e.target.value)} />
              <Input placeholder="Case Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
          )}
        </div>

        {extraFields
          .filter((f) => f.type === "checkbox")
          .map((f) => (
            <label key={f.key} className="sm:col-span-2 flex cursor-pointer items-start gap-2.5 rounded-lg bg-ink-50/60 px-3.5 py-3 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={!!extra[f.key]}
                onChange={(e) => setExtra((s) => ({ ...s, [f.key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-vault-cyanDark"
              />
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-vault-cyanDark" />
                {f.label}
              </span>
            </label>
          ))}

        <div className="sm:col-span-2">
          <Button type="submit" variant="accent" className="w-full sm:w-auto">
            <UploadCloud size={16} />
            Upload Document
          </Button>
        </div>
      </form>
    </div>
  );
}
