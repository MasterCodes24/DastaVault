# DASTAVAULT — Legal & Evidence Management System

A production-ready React frontend (Vite + Tailwind CSS + lucide-react) for a
role-based legal/evidence management platform: Admin, Police Officer, Lawyer,
Judge and Forensic Agency, all sharing one case-tracking record.

All data is **mock / in-memory** (see `src/data/mockData.js` and
`src/context/AppContext.jsx`) — nothing is persisted to a backend, and file
uploads are simulated (the file name is captured, no bytes are stored).

---

## 1. Setup

```bash
# 1. Unzip the project, then from inside the folder:
npm install

# 2. Make sure the logo is in place (already included in this build):
#    public/logo.png  →  the DASTAVAULT hexagon shield logo

# 3. Start the dev server
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## 2. Production build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

## 3. Demo accounts

| Role             | Credential ID     | Password      |
|------------------|--------------------|--------------|
| Admin            | `admin`            | `admin123`   |
| Police Officer   | `MH-BADGE-2291`     | `police123`  |
| Lawyer           | `BAR-MH-88213`      | `lawyer123`  |
| Judge            | `GOVT-REG-5541`     | `judge123`   |
| Forensic Agency  | `AGY-LIC-7743`      | `forensic123`|

Police / Lawyer / Judge logins go through a simulated OTP step — any 6 digits
(e.g. `123456`) will pass.

There are also three accounts seeded with `PENDING_APPROVAL` status
(`MH-BADGE-4410`, `BAR-MH-91027`, `AGY-LIC-9021`) so you can see the Admin
approval flow immediately — log in as Admin and approve/reject them from
**Pending User Approvals**.

## 4. Project structure

```
src/
  context/AppContext.jsx        Global state: users, cases, documents, auth, actions
  data/mockData.js               Seed data + constants (roles, doc types, milestones)
  utils/format.js                 Date/initials formatting helpers
  components/
    layout/DashboardLayout.jsx    Single responsive shell, sidebar driven by user.role
    shared/                       CaseTrackingProgress, CaseFolderBrowser, DocumentUpload,
                                   Modal, Toast, Badge, Field (Input/Select/Button/Textarea)
  pages/
    Landing.jsx                   Marketing / hero page
    Auth.jsx                      Login + Registration (role-aware)
    AdminDashboard.jsx
    PoliceDashboard.jsx           e-FIR portal, case folders, upload
    LawyerDashboard.jsx           Case folders, filing upload
    JudgeDashboard.jsx            Bench folders, court scheduler, notes & verdict
    ForensicDashboard.jsx         Case folders, forensic report upload
  App.jsx                         View routing (landing → auth → role dashboard)
```

## 5. Notes for evaluators / extension

- Swap the in-memory `AppContext` state for real API calls without touching
  any page or component — every mutation goes through the context's action
  functions (`createCase`, `uploadDocument`, `approveUser`, etc.).
- The `CASE TRACKING PROGRESS` component (`components/shared/CaseTrackingProgress.jsx`)
  derives its state entirely from `case.progressStage` and `case.milestoneDates`,
  which are updated automatically by the relevant actions (e.g. uploading a
  Forensic Report auto-advances stage 2; assigning a lawyer advances stage 3;
  adding a court date advances stage 4; recording a verdict advances stage 5).
