import React from "react";
import { ShieldCheck, FileSignature, Lock, ArrowRight, Fingerprint, Scale, FlaskConical, Gavel } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "Police, lawyers, judges and forensic agencies each see exactly the case material their role is cleared for — nothing more.",
  },
  {
    icon: FileSignature,
    title: "e-FIR ingestion",
    body: "Pull an e-FIR straight into a new case folder, with the original filing preserved as the first link in the chain.",
  },
  {
    icon: Lock,
    title: "Secure file tracking",
    body: "Every upload is timestamped and attributed, so the custody trail from first report to final verdict stays intact.",
  },
];

const ROLE_ICONS = [
  { icon: FileSignature, label: "Police" },
  { icon: Scale, label: "Lawyers" },
  { icon: Gavel, label: "Judges" },
  { icon: FlaskConical, label: "Forensics" },
];

export default function Landing({ onNavigate }) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="DASTAVAULT logo" className="h-9 w-9 object-contain" />
            <span className="font-display text-lg font-bold tracking-tight text-ink-900">DASTAVAULT</span>
          </div>
          <button
            onClick={() => onNavigate("auth")}
            className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Login / Register
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-900">
        {/* layered background: soft glow blobs + faint fingerprint-ring grid, kept clear of the copy */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-[8%] h-72 w-72 rounded-full bg-vault-cyan/10 blur-[100px]" />
          <div className="absolute right-[6%] top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-vault-cyan/[0.08] blur-[120px]" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-ink-500/20 blur-[110px]" />
          <svg
            className="absolute right-0 top-0 h-full w-full opacity-[0.35]"
            style={{
              maskImage: "radial-gradient(circle at 78% 50%, black 0%, black 35%, transparent 62%)",
              WebkitMaskImage: "radial-gradient(circle at 78% 50%, black 0%, black 35%, transparent 62%)",
            }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="hero-rings" width="46" height="46" patternUnits="userSpaceOnUse">
                <circle cx="23" cy="23" r="1" fill="#22D9CE" fillOpacity="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-rings)" />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-vault-cyan ring-1 ring-inset ring-white/10">
              <Fingerprint size={13} />
              Digital Evidence Management
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
              One vault. Every link
              <br className="hidden sm:block" /> in the chain of custody.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-200">
              DASTAVAULT connects police, lawyers, judges and forensic agencies around a single
              case record — from the first e-FIR to the final verdict — so no document, date or
              signature ever goes missing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("auth")}
                className="inline-flex items-center gap-2 rounded-lg bg-vault-cyan px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-white"
              >
                Get started
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => onNavigate("auth")}
                className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/10"
              >
                I already have an account
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {ROLE_ICONS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-ink-300">
                  <Icon size={16} className="text-vault-cyan" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signature: chain-of-custody visual echoing the logo's dotted arc */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-sm lg:block">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-full border border-white/10" />
            </div>
            <svg viewBox="0 0 320 320" className="relative h-full w-full">
              <circle cx="160" cy="160" r="120" fill="none" stroke="#22D9CE" strokeOpacity="0.18" strokeWidth="1.5" />
              {Array.from({ length: 5 }).map((_, i) => {
                const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const x = 160 + 120 * Math.cos(angle);
                const y = 160 + 120 * Math.sin(angle);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="7" fill="#0F1B3C" stroke="#22D9CE" strokeWidth="2" />
                  </g>
                );
              })}
              <circle cx="160" cy="160" r="46" fill="#0F1B3C" stroke="#22D9CE" strokeWidth="2" />
              <path
                d="M141 160 L154 173 L181 146"
                fill="none"
                stroke="#22D9CE"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-vault-cyanDark">
            Built for the whole case lifecycle
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            Every role, one shared record of truth
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-vault-cyan">
                <Icon size={18} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line bg-white px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-ink-400">
          <span>© 2026 DASTAVAULT. Evidence, held whole.</span>
          <span>Demo build — all data is simulated and stored in memory.</span>
        </div>
      </footer>
    </div>
  );
}