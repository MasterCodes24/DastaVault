import React from "react";

const TONES = {
  neutral: "bg-ink-50 text-ink-600 ring-1 ring-inset ring-ink-100",
  cyan: "bg-vault-cyan/10 text-vault-cyanDark ring-1 ring-inset ring-vault-cyan/30",
  amber: "bg-vault-amber/10 text-[#8a6110] ring-1 ring-inset ring-vault-amber/30",
  coral: "bg-vault-coral/10 text-vault-coral ring-1 ring-inset ring-vault-coral/30",
  leaf: "bg-vault-leaf/10 text-[#1f7a53] ring-1 ring-inset ring-vault-leaf/30",
  ink: "bg-ink-900 text-white",
};

export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status) {
  if (!status) return "neutral";
  if (status.includes("Closed")) return "leaf";
  if (status.includes("Investigation")) return "amber";
  if (status.includes("Registered") || status.includes("Open")) return "cyan";
  return "neutral";
}
