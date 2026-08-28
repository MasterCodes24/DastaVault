import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";

const TONE = {
  success: { icon: CheckCircle2, bg: "bg-ink-900", accent: "text-vault-cyan" },
  danger: { icon: XCircle, bg: "bg-ink-900", accent: "text-vault-coral" },
  warn: { icon: AlertTriangle, bg: "bg-ink-900", accent: "text-vault-amber" },
};

export default function Toast() {
  const { toast, setToast } = useApp();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;
  const conf = TONE[toast.tone] || TONE.success;
  const Icon = conf.icon;

  return (
    <div
      key={toast.id}
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl ${conf.bg} px-4 py-3 shadow-pop animate-fadeUp text-white max-w-sm`}
      role="status"
    >
      <Icon size={18} className={conf.accent} />
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
}
