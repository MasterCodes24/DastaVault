import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import CaseFolderBrowser from "../components/shared/CaseFolderBrowser";
import DocumentUpload from "../components/shared/DocumentUpload";
import { Scale } from "lucide-react";

export default function LawyerDashboard() {
  const { currentUser, getCasesForUser } = useApp();
  const [tab, setTab] = useState("folders");
  const myCases = getCasesForUser(currentUser.id);

  return (
    <DashboardLayout activeTab={tab} onTabChange={setTab}>
      {tab === "folders" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Case Folders & Documents</h1>
            <p className="mt-1 text-sm text-ink-400">Cases where you're an assigned counsel of record.</p>
          </div>
          <CaseFolderBrowser cases={myCases} title="My Case Folders" />
        </section>
      )}

      {tab === "upload" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Upload Legal Filing</h1>
            <p className="mt-1 text-sm text-ink-400">Submit motions, briefs or other legal filings to a case.</p>
          </div>
          <DocumentUpload
            title="Legal Filing Upload"
            subtitle="Attach motions and legal documents to a case folder."
            cases={myCases}
            accentIcon={Scale}
          />
        </section>
      )}
    </DashboardLayout>
  );
}
