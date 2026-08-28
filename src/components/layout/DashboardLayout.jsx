import React, { useState } from "react";
import {
  LayoutGrid,
  ShieldCheck,
  FolderLock,
  UploadCloud,
  Gavel,
  CalendarClock,
  FileSignature,
  FlaskConical,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ROLES } from "../../data/mockData";
import { initials } from "../../utils/format";

const NAV_BY_ROLE = {
  [ROLES.ADMIN]: [
    { key: "approvals", label: "Pending Approvals", icon: ShieldCheck },
    { key: "vault", label: "Master Case Vault", icon: FolderLock },
  ],
  [ROLES.POLICE]: [
    { key: "efir", label: "e-FIR Portal", icon: FileSignature },
    { key: "folders", label: "Case Folders", icon: FolderLock },
    { key: "upload", label: "Upload Document", icon: UploadCloud },
  ],
  [ROLES.LAWYER]: [
    { key: "folders", label: "Case Folders", icon: FolderLock },
    { key: "upload", label: "Upload Filing", icon: UploadCloud },
  ],
  [ROLES.JUDGE]: [
    { key: "folders", label: "Bench Case Folders", icon: FolderLock },
    { key: "scheduler", label: "Court Date Scheduler", icon: CalendarClock },
    { key: "verdict", label: "Notes & Verdict", icon: Gavel },
  ],
  [ROLES.FORENSIC]: [
    { key: "folders", label: "Case Folders", icon: FolderLock },
    { key: "upload", label: "Forensic Report Upload", icon: FlaskConical },
  ],
};

export default function DashboardLayout({ activeTab, onTabChange, children }) {
  const { currentUser, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = NAV_BY_ROLE[currentUser.role] || [];

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <img src="/logo.png" alt="DASTAVAULT logo" className="h-9 w-9 rounded-lg object-contain bg-white p-1" />
        <div>
          <p className="font-display text-sm font-bold tracking-tight text-white">DASTAVAULT</p>
          <p className="text-[10px] uppercase tracking-wider text-ink-300">Evidence Chain</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onTabChange(item.key);
                setMobileOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-vault-cyan/15 text-vault-cyan ring-1 ring-inset ring-vault-cyan/30"
                  : "text-ink-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vault-cyan/20 text-xs font-bold text-vault-cyan">
            {initials(currentUser.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
            <p className="truncate text-xs text-ink-300">{currentUser.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-200 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="chain-bg-dark hidden w-64 shrink-0 bg-ink-900 lg:block">{SidebarContent}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setMobileOpen(false)} />
          <aside className="chain-bg-dark relative h-full w-72 bg-ink-900">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-6 text-ink-300 hover:text-white"
            >
              <X size={20} />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-4 lg:px-8">
          <button
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
            <span className="font-display text-sm font-bold text-ink-900">DASTAVAULT</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-ink-400">
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">{currentUser.role} Dashboard</span>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
