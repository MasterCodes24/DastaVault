const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        // Frontend-generated id e.g. "DOC-1234567890"
        documentId: {
            type: String,
            unique: true,
            required: true
        },

        // String caseId matching Case.caseId
        caseId: {
            type: String,
            required: true
        },

        // Court Number Reference — copied from parent case
        CNR: {
            type: String,
            default: null
        },

        // Human-readable document name / title
        title: {
            type: String,
            required: true
        },

        // Alias accepted in requests as "docName"
        docName: {
            type: String,
            default: null
        },

        // Document category
        documentType: {
            type: String,
            required: true,
            enum: [
                "e-FIR",
                "Witness Statement",
                "Forensic Report",
                "Charge Sheet",
                "Legal Motion",
                "Court Order",
                "Evidence Photo",
                "Verdict",
                "FIR",
                "Police Report",
                "Other"
            ]
        },

        // Alias for documentType (old schema compatibility)
        docType: {
            type: String,
            default: null
        },

        version: {
            type: Number,
            default: 1
        },

        // Absolute path on disk
        filePath: {
            type: String,
            required: true
        },

        // SHA-256 hash of the file
        hash: {
            type: String,
            required: true
        },

        // Alias for hash (old schema compatibility)
        hashCode: {
            type: String,
            default: null
        },

        // Blockchain registration record
        blockchain: {
            transactionId: { type: String, default: null },
            blockNumber: { type: Number, default: null }
        },

        // Alias for blockchain.transactionId
        blockchainTxRef: {
            type: String,
            default: null
        },

        // Who uploaded this document (user id or credentialId)
        uploadedBy: {
            type: String,
            default: null
        },

        // Users with access to this document
        assigned_users: {
            type: [String],
            default: []
        },

        // Becomes true when parent case is closed
        isCaseClosed: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Document", documentSchema);