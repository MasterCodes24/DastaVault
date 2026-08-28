const mongoose = require("mongoose");

const CaseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  firHash: { type: String, required: true },
  complainant: { type: String, required: true },
  date: { type: String, required: true },
  charges: [{ type: String }],
  status: { type: String, enum: ["Active", "Closed"], default: "Active" },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
});

const DocumentSchema = new mongoose.Schema({
  caseId: { type: String, required: true, index: true },
  docId: { type: String, required: true },
  originalName: { type: String, required: true },
  fileHash: { type: String, required: true },
  storageUri: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  uploadedBy: { type: String, default: "system" },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now },
});
DocumentSchema.index({ caseId: 1, docId: 1 }, { unique: true });

const Case = mongoose.model("Case", CaseSchema);
const Document = mongoose.model("Document", DocumentSchema);

module.exports = { Case, Document };
