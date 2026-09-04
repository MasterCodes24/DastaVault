const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const Document = require("../models/Document");
const Case = require("../models/Case");
const AuditLog = require("../models/AuditLog");

const { calculateFileHash } = require("../services/hash.service");
const { registerDocument, getDocumentRecord } = require("../services/blockchain.service");

const router = express.Router();

// ─── Upload directory setup ───────────────────────
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// ─── Audit helper ─────────────────────────────────
async function createAuditLog({ actionType, actor, caseId, documentId, blockchainRef, details }) {
    try {
        await AuditLog.create({ actionType, actor: actor || null, caseId, documentId, blockchainRef, details });
    } catch (err) {
        console.error("AuditLog creation failed (non-fatal):", err.message);
    }
}

// ─────────────────────────────────────────────────
// POST /api/cases/:caseId/documents
// Uploads a document, hashes it, registers on blockchain,
// saves to MongoDB, creates AuditLog entry.
// Body (multipart): document (File), title, documentType, uploadedBy?
// ─────────────────────────────────────────────────
router.post(
    "/cases/:caseId/documents",
    upload.single("document"),
    async (req, res) => {
        try {
            const { caseId } = req.params;
            const { documentType, title, uploadedBy = null } = req.body;

            const caseExists = await Case.findOne({ caseId });
            if (!caseExists) {
                return res.status(404).json({ message: "Case not found" });
            }

            if (!req.file) {
                return res.status(400).json({ message: "Document file is required" });
            }

            const documentId = "DOC-" + Date.now();
            const hash = calculateFileHash(req.file.path);

            const blockchainRecord = registerDocument({ documentId, caseId, hash, version: 1 });

            // Normalize documentType — accept either old or new enum values
            const normalizedDocType = normalizeDocType(documentType);

            const document = await Document.create({
                documentId,
                caseId,
                CNR: caseExists.CNR || null,
                title,
                docName: title,
                documentType: normalizedDocType,
                docType: normalizedDocType,
                version: 1,
                filePath: req.file.path,
                hash,
                hashCode: hash,
                blockchain: {
                    transactionId: blockchainRecord.transactionId,
                    blockNumber: blockchainRecord.blockNumber
                },
                blockchainTxRef: blockchainRecord.transactionId,
                uploadedBy,
                assigned_users: caseExists.assigned_users || []
            });

            // Auto-update case progress for Forensic Reports
            if (normalizedDocType === "Forensic Report" && caseExists.progressStage < 2) {
                await Case.findOneAndUpdate(
                    { caseId },
                    {
                        $max: { progressStage: 2 },
                        $set: { "milestoneDates.forensics": caseExists.milestoneDates?.forensics || new Date() }
                    }
                );
            }

            // Audit log
            await createAuditLog({
                actionType: "upload",
                actor: uploadedBy,
                caseId,
                documentId,
                blockchainRef: blockchainRecord.transactionId,
                details: `Uploaded "${title}" (${normalizedDocType})`
            });

            res.status(201).json({
                message: "Document registered successfully",
                document
            });

        } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ message: "Upload failed", error: error.message });
        }
    }
);

// ─────────────────────────────────────────────────
// POST /api/documents/:documentId/verify
// Verifies document integrity against blockchain hash.
// Creates AuditLog entry.
// ─────────────────────────────────────────────────
router.post("/documents/:documentId/verify", async (req, res) => {
    try {
        const { documentId } = req.params;
        const { actor = null } = req.body;

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const currentHash = calculateFileHash(document.filePath);
        const blockchainRecord = getDocumentRecord(documentId);

        if (!blockchainRecord) {
            return res.status(404).json({ message: "Blockchain record not found" });
        }

        const verified = currentHash === blockchainRecord.hash;

        // Audit log
        await createAuditLog({
            actionType: "verify",
            actor,
            caseId: document.caseId,
            documentId,
            blockchainRef: blockchainRecord.transactionId,
            details: `Verification result: ${verified ? "VERIFIED" : "TAMPERED"}`
        });

        res.json({
            documentId,
            currentHash,
            blockchainHash: blockchainRecord.hash,
            verified,
            status: verified ? "VERIFIED" : "TAMPERED"
        });

    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ message: "Verification failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/documents/:documentId/download
// Downloads a document file. Creates AuditLog entry.
// ─────────────────────────────────────────────────
router.get("/documents/:documentId/download", async (req, res) => {
    try {
        const { documentId } = req.params;
        const { actor = null } = req.query;

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Audit log
        await createAuditLog({
            actionType: "access",
            actor,
            caseId: document.caseId,
            documentId,
            details: `Downloaded "${document.title}"`
        });

        res.download(document.filePath, document.title);

    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ message: "Download failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/documents/:documentId/view
// Serves the document inline. Creates AuditLog entry.
// ─────────────────────────────────────────────────
router.get("/documents/:documentId/view", async (req, res) => {
    try {
        const { documentId } = req.params;
        const { actor = null } = req.query;

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Audit log
        await createAuditLog({
            actionType: "access",
            actor,
            caseId: document.caseId,
            documentId,
            details: `Viewed "${document.title}"`
        });

        res.sendFile(path.resolve(document.filePath));

    } catch (error) {
        console.error("View error:", error);
        res.status(500).json({ message: "View failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/cases/:caseId/documents
// Returns all documents for a case
// ─────────────────────────────────────────────────
router.get("/cases/:caseId/documents", async (req, res) => {
    try {
        const { caseId } = req.params;
        const docs = await Document.find({ caseId }).sort({ createdAt: -1 });
        res.json(docs);
    } catch (error) {
        console.error("Docs fetch error:", error);
        res.status(500).json({ message: "Failed to fetch documents", error: error.message });
    }
});

// ─── Helper: normalize document type across old/new schema ───
function normalizeDocType(raw) {
    if (!raw) return "Other";
    const map = {
        "fir": "e-FIR",
        "e-fir": "e-FIR",
        "police report": "Police Report",
        "witness statement": "Witness Statement",
        "charge sheet": "Charge Sheet",
        "forensic report": "Forensic Report",
        "court order": "Court Order",
        "court orde": "Court Order",
        "legal motion": "Legal Motion",
        "evidence photo": "Evidence Photo",
        "verdict": "Verdict",
        "other": "Other"
    };
    return map[raw.toLowerCase()] || raw;
}

module.exports = router;