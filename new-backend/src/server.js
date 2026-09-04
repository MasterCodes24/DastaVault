require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes    = require("./routes/auth.routes");
const userRoutes    = require("./routes/user.routes");
const caseRoutes    = require("./routes/case.routes");
const documentRoutes = require("./routes/document.routes");
const auditRoutes   = require("./routes/audit.routes");

const app = express();

connectDB();

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true
    })
);

app.use(express.json());

app.use(
    express.urlencoded({ extended: true })
);

app.use(
    "/uploads",
    express.static("uploads")
);

// ─── Routes ───────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/cases",     caseRoutes);
app.use("/api",           documentRoutes);
app.use("/api/audit",     auditRoutes);

// Also mount case-scoped audit under /api (for /api/cases/:caseId/audit)
app.use("/api",           auditRoutes);

// ─── Health check ─────────────────────────────────
app.get("/", (req, res) => {
    res.json({
        message: "DastaVault Secure DMS API running",
        version: "2.0.0",
        routes: [
            "POST   /api/auth/register",
            "POST   /api/auth/login",
            "POST   /api/auth/verify-otp",
            "GET    /api/users",
            "PATCH  /api/users/:id/approve",
            "PATCH  /api/users/:id/reject",
            "POST   /api/cases",
            "GET    /api/cases",
            "GET    /api/cases/:caseId",
            "PATCH  /api/cases/:caseId/assign",
            "PATCH  /api/cases/:caseId/unassign",
            "POST   /api/cases/:caseId/court-dates",
            "POST   /api/cases/:caseId/verdict",
            "POST   /api/cases/:caseId/notes",
            "POST   /api/cases/:caseId/documents",
            "GET    /api/cases/:caseId/documents",
            "POST   /api/documents/:documentId/verify",
            "GET    /api/documents/:documentId/download",
            "GET    /api/documents/:documentId/view",
            "GET    /api/audit",
            "GET    /api/cases/:caseId/audit"
        ]
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🚀  DastaVault API running on http://localhost:${PORT}`);
    console.log(`📋  GET http://localhost:${PORT}/ for route listing\n`);
});