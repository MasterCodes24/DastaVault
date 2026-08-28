import React from "react";

export function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink-600">
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink-900 transition focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-vault-cyan focus:outline-none focus:ring-2 focus:ring-vault-cyan/30 ${className}`}
      {...props}
    />
  );
}

export function Button({ variant = "primary", className = "", children, ...props }) {
  const variants = {
    primary: "bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-200",
    accent: "bg-vault-cyan text-ink-900 hover:bg-vault-cyanDark hover:text-white disabled:bg-ink-100 disabled:text-ink-300",
    ghost: "bg-transparent text-ink-600 hover:bg-ink-50",
    outline: "bg-white text-ink-900 ring-1 ring-inset ring-line hover:bg-ink-50",
    danger: "bg-vault-coral text-white hover:bg-[#c8352a]",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
