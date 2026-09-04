const express = require("express");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

// ─────────────────────────────────────────────────
// GET /api/audit
// Returns all audit log entries (admin view), newest first.
// Optional query: ?caseId=CASE-2026-xxx&limit=50
// ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const { caseId, limit = 100 } = req.query;

        const filter = {};
        if (caseId) filter.caseId = caseId;

        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.json(logs);

    } catch (error) {
        console.error("Audit fetch error:", error);
        res.status(500).json({ message: "Failed to fetch audit logs.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/cases/:caseId/audit
// Returns audit logs for a specific case, newest first.
// ─────────────────────────────────────────────────
router.get("/cases/:caseId/audit", async (req, res) => {
    try {
        const { caseId } = req.params;

        const logs = await AuditLog.find({ caseId })
            .sort({ createdAt: -1 });

        res.json(logs);

    } catch (error) {
        console.error("Case audit fetch error:", error);
        res.status(500).json({ message: "Failed to fetch case audit logs.", error: error.message });
    }
});

module.exports = router;
