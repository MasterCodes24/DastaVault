const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Case, Document } = require("../models/schemas");
const { sha256Hash, encryptBuffer } = require("../utils/crypto");
const { submitEFIR, anchorDocumentHash, verifyDocumentHash } = require("../blockchainBridge.cjs");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const STORAGE_DIR = path.join(__dirname, "..", "storage");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

// Recursively convert BigInt values to strings so res.json() doesn't throw
const sanitizeBigInts = (obj) => {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(sanitizeBigInts);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const key of Object.keys(obj)) out[key] = sanitizeBigInts(obj[key]);
    return out;
  }
  return obj;
};

// ---------------------------------------------------------------------
// 1. Mock e-FIR Fetch -> create Case -> anchor to blockchain
// POST /api/efir/fetch  { firId }
// ---------------------------------------------------------------------
router.post("/efir/fetch", async (req, res) => {
  try {
    const { firId } = req.body;
    if (!firId) return res.status(400).json({ success: false, error: "firId is required" });

    const existing = await Case.findOne({ caseId: firId });
    if (existing) return res.status(409).json({ success: false, error: "Case already exists" });

    // Mock data simulating a police e-FIR portal response
    const mockFirData = {
      firId,
      complainant: "Rohan Mehta",
      date: new Date().toISOString().split("T")[0],
      charges: ["IPC 379 - Theft", "IPC 447 - Criminal Trespass"],
      station: "Sector 12 Police Station",
    };

    const firHash = sha256Hash(Buffer.from(JSON.stringify(mockFirData)));

    const chainResult = await submitEFIR(firId, firHash);
    if (!chainResult.success) {
      return res.status(502).json({ success: false, error: "Blockchain anchor failed", detail: chainResult.error });
    }

    const newCase = await Case.create({
      caseId: firId,
      firHash,
      complainant: mockFirData.complainant,
      date: mockFirData.date,
      charges: mockFirData.charges,
      status: "Active",
      txHash: chainResult.transactionHash,
    });

    return res.status(201).json({
      success: true,
      case: sanitizeBigInts(newCase.toObject()),
      mockFirData,
      transactionHash: chainResult.transactionHash,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------
// 2. Document Upload -> hash, encrypt, store locally, anchor to blockchain
// POST /api/documents/upload  (multipart/form-data: file, caseId, docId)
// ---------------------------------------------------------------------
router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    const { caseId, docId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: "file is required" });
    if (!caseId || !docId) return res.status(400).json({ success: false, error: "caseId and docId are required" });

    const caseDoc = await Case.findOne({ caseId });
    if (!caseDoc) return res.status(404).json({ success: false, error: "Case not found" });
    if (caseDoc.status === "Closed") return res.status(423).json({ success: false, error: "Case is closed" });

    // Hash raw buffer BEFORE encryption (integrity reference)
    const fileHash = sha256Hash(req.file.buffer);

    // Encrypt with AES-256-GCM
    const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer);

    // Mock S3: store encrypted buffer locally
    const storedFilename = `${caseId}_${docId}_${crypto.randomBytes(4).toString("hex")}.enc`;
    const storagePath = path.join(STORAGE_DIR, storedFilename);
    fs.writeFileSync(storagePath, encrypted);
    const storageUri = `local://storage/${storedFilename}`;

    const chainResult = await anchorDocumentHash(caseId, docId, fileHash, storageUri);
    if (!chainResult.success) {
      return res.status(502).json({ success: false, error: "Blockchain anchor failed", detail: chainResult.error });
    }

    const newDoc = await Document.create({
      caseId,
      docId,
      originalName: req.file.originalname,
      fileHash,
      storageUri,
      iv,
      authTag,
      uploadedBy: req.body.uploadedBy || "system",
      txHash: chainResult.transactionHash,
    });

    return res.status(201).json({
      success: true,
      document: sanitizeBigInts(newDoc.toObject()),
      transactionHash: chainResult.transactionHash,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------------------------------------------------
// 3. Live Verification -> hash uploaded file, compare against chain
// POST /api/documents/verify  (multipart/form-data: file, caseId, docId)
// ---------------------------------------------------------------------
router.post("/documents/verify", upload.single("file"), async (req, res) => {
  try {
    const { caseId, docId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, error: "file is required" });
    if (!caseId || !docId) return res.status(400).json({ success: false, error: "caseId and docId are required" });

    const liveHash = sha256Hash(req.file.buffer);

    const chainResult = await verifyDocumentHash(caseId, docId);
    if (!chainResult.success) {
      return res.status(404).json({ success: false, error: "Document not found on chain", detail: chainResult.error });
    }

    const sanitized = sanitizeBigInts(chainResult);
    const isAuthentic = liveHash === sanitized.fileHash;

    return res.json({
      success: true,
      authentic: isAuthentic,
      status: isAuthentic ? "AUTHENTIC" : "TAMPERED",
      liveHash,
      onChainHash: sanitized.fileHash,
      storageUri: sanitized.storageUri,
      uploadedBy: sanitized.uploadedBy,
      timestamp: sanitized.timestamp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
