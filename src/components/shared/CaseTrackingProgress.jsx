import React, { useMemo } from "react";
import { Check, FileSignature, FlaskConical, Scale, Gavel, ScrollText } from "lucide-react";
import { MILESTONES, ROLES } from "../../data/mockData";
import { formatDate } from "../../utils/format";
import { useApp } from "../../context/AppContext";

const ICONS = {
  efir: FileSignature,
  forensics: FlaskConical,
  lawyers: Scale,
  hearings: Gavel,
  verdict: ScrollText,
};

export default function CaseTrackingProgress({ caseItem }) {
  const { getUserById } = useApp();

  const activeMilestones = useMemo(() => {
    const users = (caseItem.assignedUsers || []).map(getUserById).filter(Boolean);
    const hasForensic = users.some((u) => u.role === ROLES.FORENSIC);
    const hasLawyer = users.some((u) => u.role === ROLES.LAWYER);
    const hasJudge = users.some((u) => u.role === ROLES.JUDGE);

    const visible = [];

    // 1. e-FIR / Registration
    visible.push({ ...MILESTONES[0], isDone: true, isActive: false });

    // 2. Forensics
    const forensicsDone = !!caseItem.milestoneDates?.forensics;
    if (hasForensic || forensicsDone) {
      visible.push({ ...MILESTONES[1], isDone: forensicsDone, isActive: !forensicsDone });
    }

    // 3. Lawyers
    const lawyersDone = !!caseItem.milestoneDates?.lawyers;
    if (hasLawyer || lawyersDone) {
      visible.push({ ...MILESTONES[2], isDone: lawyersDone, isActive: !lawyersDone });
    }

    // 4. Hearings
    const hearingsDone = (caseItem.courtDates?.length || 0) > 0;
    if (hasJudge || hearingsDone) {
      visible.push({ ...MILESTONES[3], isDone: hearingsDone, isActive: !hearingsDone });
    }

    // 5. Verdict
    const verdictDone = !!caseItem.verdict;
    if (hasJudge || verdictDone) {
      visible.push({ ...MILESTONES[4], isDone: verdictDone, isActive: !verdictDone });
    }

    return visible;
  }, [caseItem, getUserById]);

  return (
    <div className="w-full">
      <p className="mb-5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
        Case Tracking Progress
      </p>

      {/* Desktop / tablet: horizontal chain */}
      <div className="hidden sm:block">
        <div className="relative flex items-start">
          {activeMilestones.map((m, index) => {
            const isDone = m.isDone;
            const isActive = m.isActive;
            const Icon = ICONS[m.key];
            const date = caseItem.milestoneDates?.[m.key] || caseItem.createdAt;

            return (
              <div key={m.key} className="relative flex flex-1 flex-col items-center text-center">
                {index !== 0 && (
                  <div
                    className={`absolute right-1/2 top-5 h-[3px] w-full -translate-y-1/2 ${
                      isDone || isActive ? "bg-vault-cyan" : "bg-line"
                    }`}
                    style={{ backgroundImage: isDone || isActive ? "none" : undefined }}
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
          {activeMilestones.map((m, index) => {
            const isDone = m.isDone;
            const isActive = m.isActive;
            const date = caseItem.milestoneDates?.[m.key] || caseItem.createdAt;
            const stepNum = index + 1;
            
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
