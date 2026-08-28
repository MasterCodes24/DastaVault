import React, { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useApp } from "../context/AppContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import CaseFolderBrowser from "../components/shared/CaseFolderBrowser";
import DocumentUpload from "../components/shared/DocumentUpload";

export default function ForensicDashboard() {
  const { currentUser, getCasesForUser } = useApp();
  const [tab, setTab] = useState("folders");
  const myCases = getCasesForUser(currentUser.id);

  return (
    <DashboardLayout activeTab={tab} onTabChange={setTab}>
      {tab === "folders" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Forensic Case Folders</h1>
            <p className="mt-1 text-sm text-ink-400">Cases where your agency has been assigned for analysis.</p>
          </div>
          <CaseFolderBrowser cases={myCases} title="Assigned Cases" />
        </section>
      )}

      {tab === "upload" && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Forensic Report Upload</h1>
            <p className="mt-1 text-sm text-ink-400">Submit a verified forensic report to a case folder.</p>
          </div>
          <DocumentUpload
            title="Specialized Forensic Report Upload"
            subtitle="All reports require expert attribution and an authenticity verification."
            cases={myCases}
            accentIcon={FlaskConical}
            extraFields={[
              { key: "expertName", label: "Forensic Expert Name", required: true, placeholder: "e.g. Dr. Anjali Rao" },
              {
                key: "verified",
                label: "I hereby verify the authenticity of this report",
                type: "checkbox",
                required: true,
              },
            ]}
          />
        </section>
      )}
    </DashboardLayout>
  );
}
