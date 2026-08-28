import React from "react";
import { Check, FileSignature, FlaskConical, Scale, Gavel, ScrollText } from "lucide-react";
import { MILESTONES } from "../../data/mockData";
import { formatDate } from "../../utils/format";

const ICONS = [FileSignature, FlaskConical, Scale, Gavel, ScrollText];

export default function CaseTrackingProgress({ caseItem }) {
  const stage = caseItem.progressStage || 0; // number of completed milestones (0-5)

  return (
    <div className="w-full">
      <p className="mb-5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
        Case Tracking Progress
      </p>

      {/* Desktop / tablet: horizontal chain */}
      <div className="hidden sm:block">
        <div className="relative flex items-start">
          {MILESTONES.map((m, i) => {
            const stepNum = i + 1;
            const isDone = stepNum <= stage;
            const isActive = stepNum === stage + 1;
            const Icon = ICONS[i];
            const date = caseItem.milestoneDates?.[m.key];

            return (
              <div key={m.key} className="relative flex flex-1 flex-col items-center text-center">
                {i !== 0 && (
                  <div
                    className={`absolute right-1/2 top-5 h-[3px] w-full -translate-y-1/2 ${
                      stepNum <= stage ? "bg-vault-cyan" : "bg-line"
                    }`}
                    style={{ backgroundImage: stepNum <= stage ? "none" : undefined }}
                  />
                )}
                <div
                  className={[
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isDone
                      ? "border-vault-cyan bg-vault-cyan text-ink-900"
                      : isActive
                      ? "border-vault-cyan bg-white text-vault-cyanDark animate-pulseRing"
                      : "border-dashed border-ink-200 bg-white text-ink-300",
                  ].join(" ")}
                >
                  {isDone ? <Check size={18} strokeWidth={3} /> : <Icon size={16} />}
                </div>
                <p
                  className={`mt-2.5 max-w-[9rem] text-[11px] font-semibold leading-tight ${
                    isDone || isActive ? "text-ink-900" : "text-ink-400"
                  }`}
                >
                  {m.label}
                </p>
                <p className="mt-1 font-mono text-[10px] text-ink-400">
                  {isDone && date ? formatDate(date) : isActive ? "In progress" : "Pending"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical chain */}
      <div className="sm:hidden">
        <ol className="relative ml-4 space-y-6 border-l-2 border-line pl-6">
          {MILESTONES.map((m, i) => {
            const stepNum = i + 1;
            const isDone = stepNum <= stage;
            const isActive = stepNum === stage + 1;
            const date = caseItem.milestoneDates?.[m.key];
            return (
              <li key={m.key} className="relative">
                <span
                  className={[
                    "absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                    isDone
                      ? "border-vault-cyan bg-vault-cyan text-ink-900"
                      : isActive
                      ? "border-vault-cyan bg-white text-vault-cyanDark animate-pulseRing"
                      : "border-dashed border-ink-200 bg-white text-ink-300",
                  ].join(" ")}
                >
                  {isDone ? <Check size={12} strokeWidth={3} /> : stepNum}
                </span>
                <p className={`text-sm font-semibold ${isDone || isActive ? "text-ink-900" : "text-ink-400"}`}>
                  {m.label}
                </p>
                <p className="font-mono text-[11px] text-ink-400">
                  {isDone && date ? formatDate(date) : isActive ? "In progress" : "Pending"}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
