import React, { useState } from "react";
import { ArrowLeft, ShieldAlert, KeyRound, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ROLES, CREDENTIAL_LABEL } from "../data/mockData";
import { Label, Input, Select, Button } from "../components/shared/Field";
import Modal from "../components/shared/Modal";

const LOGIN_ROLES = [ROLES.ADMIN, ROLES.POLICE, ROLES.LAWYER, ROLES.JUDGE, ROLES.FORENSIC];
const REGISTER_ROLES = [ROLES.POLICE, ROLES.LAWYER, ROLES.JUDGE, ROLES.FORENSIC];

export default function Auth({ onNavigate, onLoggedIn }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white px-5 py-4 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft size={16} /> Back to home
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="DASTAVAULT logo" className="h-8 w-8 object-contain" />
            <span className="font-display text-base font-bold text-ink-900">DASTAVAULT</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col px-5 py-12 lg:py-16">
        <div className="mb-8 flex rounded-xl bg-ink-50 p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === "login" ? "bg-white text-ink-900 shadow-card" : "text-ink-400"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === "register" ? "bg-white text-ink-900 shadow-card" : "text-ink-400"
            }`}
          >
            Register
          </button>
        </div>

        {mode === "login" ? <LoginForm onLoggedIn={onLoggedIn} /> : <RegisterForm onDone={() => setMode("login")} />}
      </main>
    </div>
  );
}

function LoginForm({ onLoggedIn }) {
  const { loginWithCredential, loginAdmin, completeLogin, notify } = useApp();
  const [role, setRole] = useState(ROLES.POLICE);
  const [credentialID, setCredentialID] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

  const label = role === ROLES.ADMIN ? "Admin Username" : CREDENTIAL_LABEL[role] || "License ID";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = role === ROLES.ADMIN 
        ? await loginAdmin(credentialID, password) 
        : await loginWithCredential(credentialID, password);

      if (!result.ok) {
        setError(result.error || "Login failed. Please verify your credentials.");
        return;
      }

      const loggedInUser = result.user;
      if (role !== loggedInUser.role) {
        setError(`This account is registered as ${loggedInUser.role}. Please select "${loggedInUser.role}" in the dropdown above.`);
        return;
      }

      const needsOtp = [ROLES.POLICE, ROLES.LAWYER, ROLES.JUDGE].includes(loggedInUser.role);
      if (needsOtp) {
        setPendingUser(loggedInUser);
        setOtpOpen(true);
        setOtp("");
      } else {
        completeLogin(loggedInUser);
        onLoggedIn(loggedInUser);
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      notify("Enter the 6-digit OTP sent to the registered phone.", "warn");
      return;
    }
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setOtpOpen(false);
      completeLogin(pendingUser);
      onLoggedIn(pendingUser);
    }, 700);
  };

  return (
    <>
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <h1 className="font-display text-xl font-semibold text-ink-900">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-400">Sign in to access your role dashboard.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label>I am logging in as</Label>
            <Select value={role} onChange={(e) => { setRole(e.target.value); setCredentialID(""); setError(""); }}>
              {LOGIN_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>{label} *</Label>
            <Input
              value={credentialID}
              onChange={(e) => setCredentialID(e.target.value)}
              placeholder={role === ROLES.ADMIN ? "admin" : "e.g. MH-BADGE-2291"}
              required
            />
          </div>

          <div>
            <Label>Password *</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-vault-coral/10 px-3.5 py-2.5 text-sm text-vault-coral">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>

        <div className="mt-5 rounded-lg bg-ink-50/70 px-3.5 py-3 text-xs leading-relaxed text-ink-400">
          <p className="font-semibold text-ink-500">Demo credentials</p>
          Police: MH-BADGE-2291 / police123 · Lawyer: BAR-MH-88213 / lawyer123 · Judge: GOVT-REG-5541 / judge123 ·
          Forensic: AGY-LIC-7743 / forensic123 · Admin: admin / admin123
        </div>
      </div>

      <Modal open={otpOpen} onClose={() => setOtpOpen(false)} title="Two-Factor Verification" maxWidth="max-w-sm">
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-vault-cyan/10 px-3.5 py-3 text-sm text-ink-600">
            <KeyRound size={18} className="text-vault-cyanDark" />
            A simulated 6-digit OTP has been sent to the registered phone number ending in{" "}
            {pendingUser?.phone ? pendingUser.phone.slice(-4) : "••••"}.
          </div>
          <div>
            <Label>Enter OTP *</Label>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="tracking-[0.4em] text-center font-mono text-lg"
              maxLength={6}
            />
            <p className="mt-1.5 text-xs text-ink-400">Hint: enter any 6 digits, e.g. 123456</p>
          </div>
          <Button type="submit" variant="accent" className="w-full" disabled={verifying}>
            {verifying ? <Loader2 size={16} className="animate-spin" /> : null}
            {verifying ? "Verifying…" : "Verify & Continue"}
          </Button>
        </form>
      </Modal>
    </>
  );
}

function RegisterForm({ onDone }) {
  const { registerUser, notify } = useApp();
  const [role, setRole] = useState(ROLES.POLICE);
  const [name, setName] = useState("");
  const [credentialID, setCredentialID] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const label = CREDENTIAL_LABEL[role];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !credentialID.trim() || !phone.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    try {
      const result = await registerUser({ name, role, credentialID, phone, password });
      if (!result.ok) {
        setError(result.error || "Registration failed.");
        return;
      }
      notify("Registration submitted. Await Admin approval before logging in.");
      onDone();
    } catch (err) {
      setError(err.message || "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <h1 className="font-display text-xl font-semibold text-ink-900">Create an account</h1>
      <p className="mt-1 text-sm text-ink-400">
        New accounts require Admin approval before you can log in.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label>Role *</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {REGISTER_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Full Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Insp. Rajeev Nair" />
        </div>

        <div>
          <Label>{label} *</Label>
          <Input value={credentialID} onChange={(e) => setCredentialID(e.target.value)} placeholder={`Enter your ${label}`} />
        </div>

        <div>
          <Label>Phone Number *</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
          />
        </div>

        <div>
          <Label>Password *</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-vault-coral/10 px-3.5 py-2.5 text-sm text-vault-coral">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" variant="accent" className="w-full" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Submitting…" : "Submit registration"}
        </Button>
      </form>
    </div>
  );
}
