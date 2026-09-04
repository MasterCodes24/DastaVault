const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        actionType: {
            type: String,
            enum: ["upload", "access", "share", "close", "verify"],
            required: true
        },

        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        // String caseId for cross-compatibility with frontend "CASE-2026-xxx" ids
        caseId: {
            type: String,
            required: true
        },

        documentId: {
            type: String,
            default: null
        },

        blockchainRef: {
            type: String,
            default: null
        },

        details: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

// Index for fast case-level audit queries
auditLogSchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
