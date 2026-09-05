const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const Document = require("../models/Document");
const Case = require("../models/Case");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

const { calculateFileHash } = require("../services/hash.service");
const {
    registerDocument,
    registerDocumentVersion,
    verifyDocumentOnChain,
    verifyDocumentVersionOnChain,
    getNetworkStatus,
    getDocumentRecord
} = require("../services/blockchain.service");
const { canRoleUpdateDoc } = require("../utils/docPermissions.cjs");

const router = express.Router();

// ─── Upload directory setup ───────────────────────
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
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
// GET /api/blockchain/status
// Returns current blockchain connection status (localhost / sepolia / offline)
// ─────────────────────────────────────────────────
router.get("/blockchain/status", async (req, res) => {
    try {
        const status = await getNetworkStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ isLive: false, error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/cases/:caseId/documents
// Uploads a document (v1), hashes it, registers on blockchain,
// saves to MongoDB with versions array, creates AuditLog entry.
// ─────────────────────────────────────────────────
router.post(
    "/cases/:caseId/documents",
    upload.single("document"),
    async (req, res) => {
        try {
            const { caseId } = req.params;
            const { documentType, title, uploadedBy = null } = req.body;

            let caseExists = await Case.findOne({ caseId });
            if (!caseExists) {
                // Auto-create a mock case if uploading to a legacy mock case ID
                caseExists = await Case.create({
                    caseId: caseId,
                    title: `Legacy Case ${caseId}`,
                    type: "Other",
                    status: "REGISTERED",
                    openedBy: uploadedBy,
                    assigned_users: [uploadedBy]
                });
            }

            if (!req.file) {
                return res.status(400).json({ message: "Document file is required" });
            }

            const documentId = "DOC-" + Date.now();
            const hash = calculateFileHash(req.file.path);

            const blockchainRecord = await registerDocument({
                documentId,
                caseId,
                hash,
                version: 1,
                storageUri: req.file.path
            });

            // Normalize documentType
            const normalizedDocType = normalizeDocType(documentType);

            const initialVersion = {
                version: 1,
                filePath: req.file.path,
                fileName: req.file.originalname,
                hash,
                storageUri: req.file.path,
                blockchain: {
                    transactionId: blockchainRecord.transactionId,
                    blockNumber: blockchainRecord.blockNumber
                },
                uploadedBy,
                changeNote: "Initial document upload (v1)",
                createdAt: new Date()
            };

            const document = await Document.create({
                documentId,
                caseId,
                CNR: caseExists.CNR || null,
                title,
                docName: title,
                documentType: normalizedDocType,
                docType: normalizedDocType,
                version: 1,
                versions: [initialVersion],
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
                details: `Uploaded initial v1 of "${title}" (${normalizedDocType})`
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
// POST /api/cases/:caseId/documents/:documentId/version
// Uploads a new version of an existing document, hashes it,
// anchors it on blockchain, updates MongoDB version history and latest fields.
// ─────────────────────────────────────────────────
router.post(
    "/cases/:caseId/documents/:documentId/version",
    upload.single("document"),
    async (req, res) => {
        try {
            const { caseId, documentId } = req.params;
            const { changeNote = "", uploadedBy = null } = req.body;

            // ── Guard 1: Reason for update is mandatory (min 15 chars) ──────────
            if (!changeNote || changeNote.trim().length < 15) {
                return res.status(400).json({
                    message: "A reason for update (minimum 15 characters) is required."
                });
            }

            // ── Fetch document ───────────────────────────────────────────────────
            let document = await Document.findOne({ documentId, caseId });
            if (!document) {
                document = await Document.findOne({ documentId });
            }
            if (!document) {
                return res.status(404).json({ message: "Document not found" });
            }

            // ── Guard 2: Case hard-lock check ────────────────────────────────────
            const parentCase = await Case.findOne({ caseId: document.caseId });
            if (parentCase?.caseLocked) {
                return res.status(423).json({
                    message: "This case has been permanently sealed following a Verdict. No further document updates are permitted."
                });
            }

            // ── Guard 3: Role-based permission check ─────────────────────────────
            if (uploadedBy) {
                const actor = await User.findOne({
                    $or: [
                        { _id: uploadedBy.length === 24 ? uploadedBy : null },
                        { credentialId: uploadedBy }
                    ]
                });
                if (actor) {
                    const docType = document.documentType || document.docType;
                    if (!canRoleUpdateDoc(actor.role, docType)) {
                        return res.status(403).json({
                            message: `Your role (${actor.role}) is not permitted to update documents of type "${docType}".`
                        });
                    }
                }
            }

            if (!req.file) {
                return res.status(400).json({ message: "Updated document file is required" });
            }

            const nextVersion = (document.version || 1) + 1;
            const hash = calculateFileHash(req.file.path);

            const blockchainRecord = await registerDocumentVersion({
                documentId,
                caseId,
                hash,
                version: nextVersion,
                storageUri: req.file.path
            });

            const versionEntry = {
                version: nextVersion,
                filePath: req.file.path,
                fileName: req.file.originalname,
                hash,
                storageUri: req.file.path,
                blockchain: {
                    transactionId: blockchainRecord.transactionId,
                    blockNumber: blockchainRecord.blockNumber
                },
                uploadedBy,
                changeNote: changeNote.trim(),
                createdAt: new Date()
            };

            // If versions array was empty (from earlier mock uploads), backfill v1 first
            if (!document.versions || document.versions.length === 0) {
                document.versions = [{
                    version: document.version || 1,
                    filePath: document.filePath,
                    fileName: document.title,
                    hash: document.hash,
                    blockchain: document.blockchain || { transactionId: document.blockchainTxRef },
                    uploadedBy: document.uploadedBy,
                    changeNote: "Initial version",
                    createdAt: document.createdAt || new Date()
                }];
            }

            document.versions.push(versionEntry);
            document.version = nextVersion;
            document.filePath = req.file.path;
            document.hash = hash;
            document.hashCode = hash;
            document.blockchain = {
                transactionId: blockchainRecord.transactionId,
                blockNumber: blockchainRecord.blockNumber
            };
            document.blockchainTxRef = blockchainRecord.transactionId;

            await document.save();

            // ── Verdict hard-lock: seal the case permanently ─────────────────────
            const docType = document.documentType || document.docType;
            if (docType === "Verdict" && parentCase && !parentCase.caseLocked) {
                await Case.findOneAndUpdate(
                    { caseId: document.caseId },
                    { $set: { caseLocked: true } }
                );
            }

            // Audit log
            await createAuditLog({
                actionType: "version_upload",
                actor: uploadedBy,
                caseId,
                documentId,
                blockchainRef: blockchainRecord.transactionId,
                details: `Uploaded version ${nextVersion} for "${document.title}". Note: ${changeNote.trim()}`
            });

            res.status(201).json({
                message: `Version ${nextVersion} anchored successfully`,
                document,
                version: versionEntry,
                caseLocked: docType === "Verdict"
            });

        } catch (error) {
            console.error("Version upload error:", error);
            res.status(500).json({ message: "Version upload failed", error: error.message });
        }
    }
);

// ─────────────────────────────────────────────────
// GET /api/documents/:documentId/versions
// Returns complete version history of a document
// ─────────────────────────────────────────────────
router.get("/documents/:documentId/versions", async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        let versions = document.versions || [];
        if (versions.length === 0) {
            versions = [{
                version: document.version || 1,
                filePath: document.filePath,
                fileName: document.title,
                hash: document.hash,
                blockchain: document.blockchain || { transactionId: document.blockchainTxRef },
                uploadedBy: document.uploadedBy,
                changeNote: "Initial upload",
                createdAt: document.createdAt || new Date()
            }];
        }

        res.json({
            documentId,
            title: document.title,
            currentVersion: document.version || 1,
            versions
        });
    } catch (error) {
        console.error("Fetch versions error:", error);
        res.status(500).json({ message: "Failed to fetch version history", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/documents/:documentId/verify
// Verifies latest document integrity against on-chain smart contract hash.
// ─────────────────────────────────────────────────
router.post("/documents/:documentId/verify", async (req, res) => {
    try {
        const { documentId } = req.params;
        const { actor = null } = req.body;

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        if (!fs.existsSync(document.filePath)) {
            return res.status(404).json({ message: "File not found on storage disk" });
        }

        const currentHash = calculateFileHash(document.filePath);
        const onChain = await verifyDocumentOnChain(document.caseId, documentId);

        const targetHash = onChain?.hash || document.hash;
        const verified = currentHash === targetHash;

        // Audit log
        await createAuditLog({
            actionType: "verify",
            actor,
            caseId: document.caseId,
            documentId,
            blockchainRef: document.blockchain?.transactionId || document.blockchainTxRef,
            details: `Verification result: ${verified ? "VERIFIED" : "TAMPERED"} (On-chain: ${!!onChain?.onChain})`
        });

        res.json({
            documentId,
            currentHash,
            blockchainHash: targetHash,
            verified,
            status: verified ? "VERIFIED" : "TAMPERED",
            onChain: !!onChain?.onChain
        });

    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ message: "Verification failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/documents/:documentId/versions/:version/verify
// Verifies specific version integrity against on-chain smart contract hash.
// ─────────────────────────────────────────────────
router.post("/documents/:documentId/versions/:version/verify", async (req, res) => {
    try {
        const { documentId, version } = req.params;
        const { actor = null } = req.body;
        const verNum = Number(version);

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const versionDoc = document.versions?.find(v => v.version === verNum);
        const targetPath = versionDoc?.filePath || (document.version === verNum ? document.filePath : null);
        const recordedHash = versionDoc?.hash || (document.version === verNum ? document.hash : null);

        if (!targetPath || !fs.existsSync(targetPath)) {
            return res.status(404).json({ message: `Version ${version} file not found on disk` });
        }

        const currentHash = calculateFileHash(targetPath);
        const onChainRecord = await verifyDocumentVersionOnChain(document.caseId, documentId, verNum);

        const targetHash = onChainRecord?.hash || recordedHash;
        const verified = currentHash === targetHash;

        // Audit log
        await createAuditLog({
            actionType: "verify",
            actor,
            caseId: document.caseId,
            documentId,
            blockchainRef: versionDoc?.blockchain?.transactionId || null,
            details: `Integrity check for version ${version} of "${document.title}": ${verified ? "VERIFIED" : "TAMPERED"}`
        });

        res.json({
            documentId,
            version: verNum,
            currentHash,
            blockchainHash: targetHash,
            verified,
            status: verified ? "VERIFIED" : "TAMPERED",
            onChain: !!onChainRecord?.onChain
        });

    } catch (error) {
        console.error("Version verification error:", error);
        res.status(500).json({ message: "Version verification failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/documents/:documentId/versions/:version/download
// Downloads a specific version of a document
// ─────────────────────────────────────────────────
router.get("/documents/:documentId/versions/:version/download", async (req, res) => {
    try {
        const { documentId, version } = req.params;
        const { actor = null } = req.query;
        const verNum = Number(version);

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const versionDoc = document.versions?.find(v => v.version === verNum);
        const targetPath = versionDoc?.filePath || (document.version === verNum ? document.filePath : null);

        if (!targetPath || !fs.existsSync(targetPath)) {
            return res.status(404).json({ message: `Version ${version} file not found` });
        }

        await createAuditLog({
            actionType: "access",
            actor,
            caseId: document.caseId,
            documentId,
            details: `Downloaded version ${version} of "${document.title}"`
        });

        res.download(targetPath, `v${verNum}-${versionDoc?.fileName || document.title}`);
    } catch (error) {
        res.status(500).json({ message: "Version download failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/documents/:documentId/versions/:version/view
// View inline a specific version of a document
// ─────────────────────────────────────────────────
router.get("/documents/:documentId/versions/:version/view", async (req, res) => {
    try {
        const { documentId, version } = req.params;
        const { actor = null } = req.query;
        const verNum = Number(version);

        const document = await Document.findOne({ documentId });
        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const versionDoc = document.versions?.find(v => v.version === verNum);
        const targetPath = versionDoc?.filePath || (document.version === verNum ? document.filePath : null);

        if (!targetPath || !fs.existsSync(targetPath)) {
            return res.status(404).json({ message: `Version ${version} file not found` });
        }

        await createAuditLog({
            actionType: "access",
            actor,
            caseId: document.caseId,
            documentId,
            details: `Viewed version ${version} of "${document.title}"`
        });

        res.sendFile(path.resolve(targetPath));
    } catch (error) {
        res.status(500).json({ message: "Version view failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/documents/:documentId/download
// Downloads latest document file. Creates AuditLog entry.
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
            details: `Downloaded "${document.title}" (v${document.version || 1})`
        });

        res.download(document.filePath, document.title);

    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ message: "Download failed", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// GET /api/documents/:documentId/view
// Serves latest document inline. Creates AuditLog entry.
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
            details: `Viewed "${document.title}" (v${document.version || 1})`
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