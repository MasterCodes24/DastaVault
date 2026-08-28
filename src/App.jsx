import React, { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { ROLES } from "./data/mockData";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import PoliceDashboard from "./pages/PoliceDashboard";
import LawyerDashboard from "./pages/LawyerDashboard";
import JudgeDashboard from "./pages/JudgeDashboard";
import ForensicDashboard from "./pages/ForensicDashboard";
import Toast from "./components/shared/Toast";

const DASHBOARD_BY_ROLE = {
  [ROLES.ADMIN]: AdminDashboard,
  [ROLES.POLICE]: PoliceDashboard,
  [ROLES.LAWYER]: LawyerDashboard,
  [ROLES.JUDGE]: JudgeDashboard,
  [ROLES.FORENSIC]: ForensicDashboard,
};

function Shell() {
  const { currentUser } = useApp();
  const [view, setView] = useState("landing"); // 'landing' | 'auth'

  useEffect(() => {
    if (!currentUser) setView((v) => (v === "dashboard" ? "landing" : v));
  }, [currentUser]);

  if (currentUser) {
    const Dashboard = DASHBOARD_BY_ROLE[currentUser.role];
    return (
      <>
        <Dashboard />
        <Toast />
      </>
    );
  }

  return (
    <>
      {view === "landing" && <Landing onNavigate={setView} />}
      {view === "auth" && <Auth onNavigate={setView} onLoggedIn={() => setView("dashboard")} />}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
