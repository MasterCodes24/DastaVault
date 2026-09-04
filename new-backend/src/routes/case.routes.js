const express = require("express");
const Case = require("../models/Case");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

// ─── Helpers ─────────────────────────────────────
async function logCaseAudit({ actionType, actor, caseId, details }) {
    try {
        await AuditLog.create({ actionType, actor: actor || null, caseId, details });
    } catch (err) {
        console.warn("Case audit log failed:", err.message);
    }
}

/** Generate Case Number Reference: MHCC01-<year>-<random 6 digits> */
function generateCNR() {
    const year = new Date().getFullYear();
    const seq = Math.floor(100000 + Math.random() * 900000);
    return `MHCC01-${year}-${seq}`;
}

/** Generate FIR Number: FIR-<year>-<random 5 digits> */
function generateFIR(year) {
    const seq = Math.floor(10000 + Math.random() * 90000);
    return `FIR-${year}-${seq}`;
}

let noteCounter = 1000;
const nextNoteId = () => `n-${noteCounter++}`;

// ─────────────────────────────────────────────────
// POST /api/cases
// Creates a new case with auto-generated CNR + FIR_NO
// Body: { title, type, description?, openedBy?, efir?, cnrNumber? }
// ─────────────────────────────────────────────────
router.post("/", async (req, res) => {
    try {
        const {
            title,
            type,
            description = "",
            openedBy = null,
            efir = null,
            cnrNumber = null,
            progressStage = 0,
            status = "REGISTERED"
        } = req.body;

        const year = new Date().getFullYear();

        const caseId = "CASE-" + year + "-" + Date.now();
        const CNR = cnrNumber || generateCNR();
        const FIR_NO = generateFIR(year);

        const milestoneDates = {
            efir: efir ? new Date() : null,
            forensics: null,
            lawyers: null,
            hearings: null,
            verdict: null
        };

        const newCase = await Case.create({
            caseId,
            CNR,
            FIR_NO,
            title,
            type,
            description,
            status: efir ? "e-FIR Registered" : status,
            openedBy,
            assigned_users: openedBy ? [openedBy] : [],
            efir: efir || { number: null, firDate: null },
            milestoneDates,
            progressStage: efir ? 1 : progressStage
        });

        await logCaseAudit({
            actionType: "status_change",
            actor: openedBy,
            caseId,
            details: `Case created: "${title}" [${CNR}]`
        });

        res.status(201).json(newCase);

    } catch (error) {
        console.error("Case creation error:", error);
        res.status(500).json({ message: "Case creation failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/cases
// Returns all cases, newest first
// ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const cases = await Case.find().sort({ createdAt: -1 });
        res.json(cases);
    } catch (error) {
        console.error("Cases fetch error:", error);
        res.status(500).json({ message: "Failed to fetch cases", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/cases/:caseId
// Returns a single case by its caseId string
// ─────────────────────────────────────────────────
router.get("/:caseId", async (req, res) => {
    try {
        const caseDoc = await Case.findOne({ caseId: req.params.caseId });
        if (!caseDoc) return res.status(404).json({ message: "Case not found" });
        res.json(caseDoc);
    } catch (error) {
        console.error("Case fetch error:", error);
        res.status(500).json({ message: "Failed to fetch case", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// PATCH /api/cases/:caseId/assign
// Adds a user to assigned_users (idempotent)
// Body: { userId }
// ─────────────────────────────────────────────────
router.patch("/:caseId/assign", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId is required." });

        const caseDoc = await Case.findOneAndUpdate(
            { caseId: req.params.caseId },
            { $addToSet: { assigned_users: userId } },
            { new: true }
        );

        if (!caseDoc) return res.status(404).json({ message: "Case not found." });

        res.json({ message: "User assigned to case.", case: caseDoc });

    } catch (error) {
        console.error("Assign error:", error);
        res.status(500).json({ message: "Assignment failed.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// PATCH /api/cases/:caseId/unassign
// Removes a user from assigned_users
// Body: { userId }
// ─────────────────────────────────────────────────
router.patch("/:caseId/unassign", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId is required." });

        const caseDoc = await Case.findOneAndUpdate(
            { caseId: req.params.caseId },
            { $pull: { assigned_users: userId } },
            { new: true }
        );

        if (!caseDoc) return res.status(404).json({ message: "Case not found." });

        res.json({ message: "User removed from case.", case: caseDoc });

    } catch (error) {
        console.error("Unassign error:", error);
        res.status(500).json({ message: "Unassignment failed.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/cases/:caseId/court-dates
// Appends a court hearing date
// Body: { date, note? }
// ─────────────────────────────────────────────────
router.post("/:caseId/court-dates", async (req, res) => {
    try {
        const { date, note = "" } = req.body;
        if (!date) return res.status(400).json({ message: "date is required." });

        const caseDoc = await Case.findOneAndUpdate(
            { caseId: req.params.caseId },
            {
                $push: { courtDates: { date, note } },
                $max: { progressStage: 4 },
                $set: {
                    "milestoneDates.hearings": {
                        $cond: [
                            { $eq: ["$milestoneDates.hearings", null] },
                            new Date(),
                            "$milestoneDates.hearings"
                        ]
                    }
                }
            },
            { new: true }
        );

        if (!caseDoc) return res.status(404).json({ message: "Case not found." });

        // Set hearings milestone if not set yet (Mongoose doesn't support $cond in update easily)
        if (!caseDoc.milestoneDates.hearings) {
            caseDoc.milestoneDates.hearings = new Date();
            await caseDoc.save();
        }

        await logCaseAudit({
            actionType: "status_change",
            caseId: req.params.caseId,
            details: `Court hearing scheduled for ${date}. Notes: ${note || "None"}`
        });

        res.json({ message: "Court date added.", case: caseDoc });

    } catch (error) {
        console.error("Court date error:", error);
        res.status(500).json({ message: "Failed to add court date.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/cases/:caseId/verdict
// Records the final verdict and closes the case
// Body: { verdictTitle, fileUrl?, judge? }
// ─────────────────────────────────────────────────
router.post("/:caseId/verdict", async (req, res) => {
    try {
        const { verdictTitle, fileUrl = "#", judge = null } = req.body;
        if (!verdictTitle) return res.status(400).json({ message: "verdictTitle is required." });

        const now = new Date();

        const caseDoc = await Case.findOneAndUpdate(
            { caseId: req.params.caseId },
            {
                $set: {
                    status: "Closed — Verdict Delivered",
                    progressStage: 5,
                    verdict: { verdictTitle, fileUrl, uploadedAt: now, judge },
                    "milestoneDates.verdict": now
                }
            },
            { new: true }
        );

        if (!caseDoc) return res.status(404).json({ message: "Case not found." });

        await logCaseAudit({
            actionType: "close",
            actor: judge,
            caseId: req.params.caseId,
            details: `Final verdict delivered: "${verdictTitle}". Case sealed and closed.`
        });

        res.json({ message: "Verdict recorded. Case closed.", case: caseDoc });

    } catch (error) {
        console.error("Verdict error:", error);
        res.status(500).json({ message: "Failed to record verdict.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/cases/:caseId/notes
// Appends a case note
// Body: { author, text }
// ─────────────────────────────────────────────────
router.post("/:caseId/notes", async (req, res) => {
    try {
        const { author, text } = req.body;
        if (!text) return res.status(400).json({ message: "Note text is required." });

        const note = {
            id: nextNoteId(),
            author: author || "unknown",
            text,
            createdAt: new Date()
        };

        const caseDoc = await Case.findOneAndUpdate(
            { caseId: req.params.caseId },
            { $push: { notes: note } },
            { new: true }
        );

        if (!caseDoc) return res.status(404).json({ message: "Case not found." });

        res.json({ message: "Note added.", note, case: caseDoc });

    } catch (error) {
        console.error("Note error:", error);
        res.status(500).json({ message: "Failed to add note.", error: error.message });
    }
});

module.exports = router;