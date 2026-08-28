import React, { useState } from "react";
import { Check, X, ShieldCheck, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import Badge from "../components/shared/Badge";
import { Button } from "../components/shared/Field";
import CaseFolderBrowser from "../components/shared/CaseFolderBrowser";

export default function AdminDashboard() {
  const { users, cases, approveUser, rejectUser } = useApp();
  const [tab, setTab] = useState("approvals");
  const pending = users.filter((u) => u.status === "PENDING_APPROVAL");

  return (
    <DashboardLayout activeTab={tab} onTabChange={setTab}>
      {tab === "approvals" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Pending User Approvals</h1>
            <p className="mt-1 text-sm text-ink-400">
              Review new registrations before they can access DASTAVAULT.
            </p>
          </div>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
              <ShieldCheck size={28} className="text-vault-cyanDark" />
              <p className="text-sm font-medium text-ink-500">No pending approvals — you're all caught up.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50/70 text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Credential ID</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pending.map((u) => (
                    <tr key={u.id} className="hover:bg-paper/60">
                      <td className="px-5 py-4 font-semibold text-ink-900">{u.name}</td>
                      <td className="px-5 py-4">
                        <Badge tone="cyan">{u.role}</Badge>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-500">{u.credentialID}</td>
                      <td className="px-5 py-4 text-ink-500">{u.phone}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="accent" className="!px-3 !py-1.5" onClick={() => approveUser(u.id)}>
                            <Check size={14} /> Approve
                          </Button>
                          <Button variant="danger" className="!px-3 !py-1.5" onClick={() => rejectUser(u.id)}>
                            <X size={14} /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-ink-50/70 px-4 py-3 text-xs text-ink-400">
            <Users size={14} />
            {users.filter((u) => u.status === "APPROVED").length} approved users across the platform.
          </div>
        </section>
      )}

      {tab === "vault" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Master Case Vault</h1>
            <p className="mt-1 text-sm text-ink-400">
              Browse every case folder and document across the system.
            </p>
          </div>
          <CaseFolderBrowser cases={cases} title="All Case Folders" />
        </section>
      )}
    </DashboardLayout>
  );
}
