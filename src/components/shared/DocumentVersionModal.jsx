import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  History,
  UploadCloud,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
} from "lucide-react";
import Modal from "./Modal";
import Badge from "./Badge";
import { Label, Input, Button } from "./Field";
import { formatDateTime } from "../../utils/format";
import { useApp } from "../../context/AppContext";
import { apiFetchDocumentVersions } from "../../api/apiClient";

export default function DocumentVersionModal({ isOpen, onClose, document, initialTab = "history", caseItem }) {
  const { uploadDocumentVersion, verifyDocumentVersion, blockchainStatus, getUserById, notify } = useApp();
  const [activeTab, setActiveTab] = useState(initialTab); // 'history' | 'upload'
  const [currentDoc, setCurrentDoc] = useState(document);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [verifyingVersion, setVerifyingVersion] = useState(null);
  const [verificationResults, setVerificationResults] = useState({});
  const [copiedHash, setCopiedHash] = useState(null);

  // New version upload state
  const [newFile, setNewFile] = useState(null);
  const [changeNote, setChangeNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (document) {
      setCurrentDoc(document);
    }
  }, [document]);

  useEffect(() => {
    if (isOpen && document?.documentId) {
      setActiveTab(initialTab);
      loadVersions();
    }
  }, [isOpen, document?.documentId, initialTab]);

  const loadVersions = async () => {
    setLoadingVersions(true);
    try {
      const data = await apiFetchDocumentVersions(document.documentId);
      if (data?.versions) {
        // Sort descending by version number
        const sorted = [...data.versions].sort((a, b) => (b.version || 0) - (a.version || 0));
        setVersions(sorted);
      } else if (document.versions?.length) {
        setVersions([...document.versions].sort((a, b) => (b.version || 0) - (a.version || 0)));
      } else {
        // Fallback for mock documents
        setVersions([
          {
            version: document.version || 1,
            fileName: document.fileName || document.documentName,
            hash: document.hash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            blockchain: document.blockchain || { transactionId: document.blockchainTxRef || "tx-v1-initial" },
            uploadedBy: document.uploadedBy,
            changeNote: "Initial document upload (v1)",
            createdAt: document.uploadedAt || new Date().toISOString(),
          },
        ]);
      }
    } catch {
      if (document?.versions?.length) {
        setVersions([...document.versions].sort((a, b) => (b.version || 0) - (a.version || 0)));
      } else {
        setVersions([
          {
            version: document.version || 1,
            fileName: document.fileName || document.documentName,
            hash: document.hash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            blockchain: document.blockchain || { transactionId: document.blockchainTxRef || "tx-v1-initial" },
            uploadedBy: document.uploadedBy,
            changeNote: "Initial document upload (v1)",
            createdAt: document.uploadedAt || new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(key);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerify = async (verNum) => {
    setVerifyingVersion(verNum);
    try {
      const result = await verifyDocumentVersion(document.documentId, verNum);
      if (result) {
        setVerificationResults((prev) => ({
          ...prev,
          [verNum]: result,
        }));
      }
    } finally {
      setVerifyingVersion(null);
    }
  };

  const handleUploadNewVersion = async (e) => {
    e?.preventDefault?.();
    if (!newFile) {
      notify("Please select a file to upload as the updated revision.", "warn");
      return;
    }

    const docTarget = currentDoc || document;
    const targetCaseId = docTarget?.caseId || caseItem?.caseId || caseItem?.id || caseItem?.backendId;
    if (!targetCaseId) {
      console.error("[DocumentVersionModal] Could not resolve caseId.", {
        docCaseId: docTarget?.caseId,
        caseItemCaseId: caseItem?.caseId,
        caseItemId: caseItem?.id,
        caseItemBackendId: caseItem?.backendId,
      });
      notify("Case reference could not be resolved for this document.", "danger");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await uploadDocumentVersion({
        caseId: targetCaseId,
        documentId: docTarget.documentId,
        file: newFile,
        changeNote: changeNote.trim() || `Updated revision`,
      });

      if (result) {
        if (result.document) {
          setCurrentDoc((prev) => ({
            ...prev,
            version: result.document.version,
            hash: result.document.hash,
            blockchain: result.document.blockchain,
          }));
        }
        setNewFile(null);
        setChangeNote("");
        setActiveTab("history");
        await loadVersions();
      }
    } catch (err) {
      notify(err.message || "Version upload failed.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!document) return null;

  const isSepolia = blockchainStatus?.networkName?.toLowerCase().includes("sepolia");

  return (
    <Modal open={isOpen} onClose={onClose} title="Document Version Control & Ledger" maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Document Header Info */}
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-paper/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-semibold text-ink-900">
                  {currentDoc?.documentName || currentDoc?.title || document.documentName || document.title}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-vault-cyan/15 px-2.5 py-0.5 text-xs font-semibold text-vault-cyanDark">
                  <GitBranch size={12} />
                  v{currentDoc?.version || document.version || 1}
                </span>
              </div>
              <p className="text-xs text-ink-500">
                {currentDoc?.docType || currentDoc?.documentType || document.docType || document.documentType} · Case: {caseItem?.cnrNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                blockchainStatus?.isLive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  blockchainStatus?.isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {blockchainStatus?.networkName || "Checking Network"}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-line">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "history"
                ? "border-vault-cyan text-ink-900"
                : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            <History size={16} />
            Version History ({versions.length})
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "upload"
                ? "border-vault-cyan text-ink-900"
                : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            <UploadCloud size={16} />
            Upload New Version
          </button>
        </div>

        {/* Tab 1: Version History */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {loadingVersions ? (
              <div className="py-12 text-center text-sm text-ink-400">Loading version records from blockchain…</div>
            ) : versions.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-400">No version history found.</div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {versions.map((ver, idx) => {
                  const isLatest = idx === 0;
                  const uploader = getUserById(ver.uploadedBy);
                  const verResult = verificationResults[ver.version];
                  const txHash = ver.blockchain?.transactionId || ver.transactionId || null;

                  return (
                    <div
                      key={ver.version}
                      className={`relative rounded-xl border p-4 transition ${
                        isLatest
                          ? "border-vault-cyan/40 bg-vault-cyan/[0.02] shadow-sm"
                          : "border-line bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center rounded-lg bg-ink-900 px-2.5 py-1 text-xs font-bold text-vault-cyan">
                            v{ver.version}
                          </span>
                          {isLatest && <Badge tone="success">Current / Active</Badge>}
                          <span className="text-sm font-semibold text-ink-900">
                            {ver.fileName || currentDoc?.documentName || document.documentName}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVerify(ver.version)}
                            disabled={verifyingVersion === ver.version}
                            className="flex items-center gap-1 rounded-lg border border-vault-cyan/30 bg-vault-cyan/10 px-2.5 py-1 text-xs font-semibold text-vault-cyanDark hover:bg-vault-cyan/20 disabled:opacity-50"
                          >
                            <ShieldCheck size={13} />
                            {verifyingVersion === ver.version ? "Verifying…" : "Verify Hash"}
                          </button>

                          <a
                            href={`http://localhost:5000/api/documents/${document.documentId}/versions/${ver.version}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 hover:bg-paper/70"
                          >
                            <Eye size={13} />
                            View
                          </a>

                          <a
                            href={`http://localhost:5000/api/documents/${document.documentId}/versions/${ver.version}/download`}
                            className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 hover:bg-paper/70"
                          >
                            <Download size={13} />
                            Download
                          </a>
                        </div>
                      </div>

                      {/* Change Note */}
                      {ver.changeNote && (
                        <p className="mt-2 rounded-lg bg-paper/60 px-3 py-1.5 text-xs text-ink-700">
                          <span className="font-semibold text-ink-900">Revision Note:</span> {ver.changeNote}
                        </p>
                      )}

                      {/* Verification Banner if checked */}
                      {verResult && (
                        <div
                          className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                            verResult.verified
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {verResult.verified ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span>
                                Match Confirmed: File is intact and verified against secure ledger.
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} className="text-rose-600" />
                              <span>TAMPER ALERT: File has been modified or corrupted!</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Metadata Grid */}
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        {/* SHA-256 Hash */}
                        <div className="flex items-center justify-between rounded-md bg-ink-50 px-2.5 py-1.5">
                          <span className="text-ink-400">SHA-256:</span>
                          <div className="flex items-center gap-1.5 font-mono text-ink-700">
                            <span className="truncate max-w-[140px]" title={ver.hash}>
                              {ver.hash ? `${ver.hash.substring(0, 10)}…${ver.hash.slice(-8)}` : "None"}
                            </span>
                            <button
                              onClick={() => handleCopy(ver.hash, `hash-${ver.version}`)}
                              title="Copy SHA-256 Hash"
                              className="text-ink-400 hover:text-ink-900"
                            >
                              {copiedHash === `hash-${ver.version}` ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Transaction Ref */}
                        <div className="flex items-center justify-between rounded-md bg-ink-50 px-2.5 py-1.5">
                          <span className="text-ink-400">Transaction Ref:</span>
                          <div className="flex items-center gap-1.5 font-mono text-ink-700">
                            <span className="truncate max-w-[140px]" title={txHash}>
                              {txHash ? `${txHash.substring(0, 10)}…${txHash.slice(-8)}` : "Pending"}
                            </span>
                            {txHash && (
                              <button
                                onClick={() => handleCopy(txHash, `tx-${ver.version}`)}
                                title="Copy Transaction Reference"
                                className="text-ink-400 hover:text-ink-900"
                              >
                                {copiedHash === `tx-${ver.version}` ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                            {isSepolia && txHash && !txHash.startsWith("sim-") && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View on Sepolia Etherscan"
                                className="text-vault-cyanDark hover:text-ink-900"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          Uploaded by: {uploader?.name || ver.uploadedBy || "Officer / System"}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={12} />
                          {formatDateTime(ver.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload New Version Form */}
        {activeTab === "upload" && (
          <form onSubmit={handleUploadNewVersion} noValidate className="space-y-4">
            <div className="rounded-xl border border-vault-cyan/30 bg-vault-cyan/5 p-4 text-xs text-ink-600 leading-relaxed">
              <strong className="text-vault-cyanDark font-semibold">Version Increment:</strong> Uploading an updated
              file will automatically advance this document to{" "}
              <span className="font-bold text-ink-900">v{((currentDoc || document).version || 1) + 1}</span>. The cryptographic SHA-256
              hash of the new revision will be anchored permanently into the smart contract registry. Previous versions
              remain immutable and accessible in the history tab.
            </div>

            <div>
              <Label htmlFor="version-file-input">Select Replacement / Revision File *</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files?.[0]) {
                    setNewFile(e.dataTransfer.files[0]);
                  }
                }}
                className="group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-line bg-paper/60 p-6 text-center transition hover:border-vault-cyan hover:bg-vault-cyan/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan transition group-hover:scale-105">
                  <UploadCloud size={22} />
                </div>
                {newFile ? (
                  <div className="space-y-1">
                    <p className="font-display text-sm font-semibold text-ink-900 truncate max-w-sm">{newFile.name}</p>
                    <p className="text-xs text-vault-cyanDark font-medium">
                      {(newFile.size / 1024).toFixed(1)} KB · Ready to anchor · Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink-800">
                      Click to browse or drag and drop your updated file here
                    </p>
                    <p className="text-xs text-ink-400">Supported: PDF, DOCX, TXT, Images, Forensic files</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="version-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div>
              <Label>Revision Note / Reason for Update</Label>
              <Input
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="e.g. Added witness supplementary interview transcript"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setActiveTab("history")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Anchoring to Blockchain…"
                ) : (
                  <>
                    <GitBranch size={16} />
                    Anchor v{((currentDoc || document).version || 1) + 1} on Blockchain
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
