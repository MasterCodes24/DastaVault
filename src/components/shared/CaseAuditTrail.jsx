import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  FileText,
  GitBranch,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  User,
  Search,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Filter,
} from "lucide-react";
import Badge from "./Badge";
import { formatDateTime } from "../../utils/format";
import { useApp } from "../../context/AppContext";

export default function CaseAuditTrail({ caseId }) {
  const { fetchCaseAuditLogs, blockchainStatus, getUserById } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState("all");
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);

  const loadAudit = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const data = await fetchCaseAuditLogs(caseId);
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [caseId]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isSepolia = blockchainStatus?.networkName?.toLowerCase().includes("sepolia");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = filterAction === "all" || log.actionType === filterAction;
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.documentId && log.documentId.toLowerCase().includes(q)) ||
        (log.blockchainRef && log.blockchainRef.toLowerCase().includes(q));
      return matchesAction && matchesQuery;
    });
  }, [logs, filterAction, query]);

  const getActionBadge = (type) => {
    switch (type) {
      case "upload":
        return <Badge tone="neutral">Upload (v1)</Badge>;
      case "version_upload":
        return <Badge tone="accent">Version Update</Badge>;
      case "verify":
        return <Badge tone="success">Integrity Check</Badge>;
      case "access":
        return <Badge tone="info">Access / View</Badge>;
      case "close":
        return <Badge tone="warning">Case Sealed</Badge>;
      case "status_change":
        return <Badge tone="neutral">Milestone</Badge>;
      default:
        return <Badge tone="neutral">{type}</Badge>;
    }
  };

  const getActionIcon = (type) => {
    switch (type) {
      case "upload":
        return <FileText size={16} className="text-vault-cyanDark" />;
      case "version_upload":
        return <GitBranch size={16} className="text-vault-cyanDark" />;
      case "verify":
        return <ShieldCheck size={16} className="text-emerald-600" />;
      case "access":
        return <Eye size={16} className="text-blue-600" />;
      case "close":
        return <Lock size={16} className="text-amber-600" />;
      default:
        return <Activity size={16} className="text-ink-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Search and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
            <Activity size={16} />
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold text-ink-900">
              Immutable Chain of Custody & Audit Trail
            </h4>
            <p className="text-xs text-ink-400">
              Cryptographically timestamped events recorded on DastaVault ledger ({logs.length} events)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <div className="relative">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-lg border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-ink-700 focus:border-vault-cyan focus:outline-none"
            >
              <option value="all">All Events</option>
              <option value="upload">Initial Uploads</option>
              <option value="version_upload">Version Updates</option>
              <option value="verify">Verifications</option>
              <option value="access">Access / Views</option>
              <option value="close">Sealed / Verdict</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-48 sm:w-60">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search audit trail…"
              className="w-full rounded-lg border border-line bg-white py-1.5 pl-8 pr-2.5 text-xs focus:border-vault-cyan focus:outline-none"
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={loadAudit}
            disabled={loading}
            title="Refresh audit trail"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-500 hover:bg-paper/70 hover:text-ink-900 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      {loading && logs.length === 0 ? (
        <div className="rounded-xl border border-line bg-paper/60 p-10 text-center text-sm text-ink-400">
          Loading audit events…
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-paper/60 p-8 text-center text-sm text-ink-400">
          No audit log entries found matching criteria.
        </div>
      ) : (
        <div className="relative pl-6 before:absolute before:bottom-3 before:left-2.5 before:top-3 before:w-0.5 before:bg-line">
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const actor = getUserById(log.actor);
              const actorName = actor?.name || log.actorName || log.actor || "System";
              const actorRole = actor?.role || "";
              const txRef = log.blockchainRef;

              return (
                <div
                  key={log._id || log.id || Math.random()}
                  className="relative rounded-xl border border-line bg-white p-3.5 shadow-sm transition hover:bg-paper/40"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-4 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white shadow-xs">
                    {getActionIcon(log.actionType)}
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.actionType)}
                      <span className="text-xs font-semibold text-ink-900">
                        {log.details || log.actionType}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 font-mono text-[11px] text-ink-400">
                      <Clock size={11} />
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11px] text-ink-500">
                    <span className="flex items-center gap-1">
                      <User size={11} className="text-ink-400" />
                      Actor: <span className="font-semibold text-ink-800">{actorName}</span>
                      {actorRole && <span className="text-ink-400">({actorRole})</span>}
                    </span>

                    {txRef && (
                      <div className="flex items-center gap-1 font-mono text-ink-600">
                        <span className="text-ink-400">On-Chain Tx:</span>
                        <span className="truncate max-w-[130px]" title={txRef}>
                          {txRef.substring(0, 10)}…{txRef.slice(-6)}
                        </span>
                        <button
                          onClick={() => handleCopy(txRef, log._id || txRef)}
                          title="Copy Tx Reference"
                          className="text-ink-400 hover:text-ink-900"
                        >
                          {copiedKey === (log._id || txRef) ? (
                            <Check size={11} className="text-emerald-600" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                        {isSepolia && !txRef.startsWith("sim-") && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${txRef}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Sepolia Etherscan"
                            className="text-vault-cyanDark hover:text-ink-900"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
