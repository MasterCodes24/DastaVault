const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
    {
        // Frontend-generated case id e.g. "CASE-2026-1234567890"
        caseId: {
            type: String,
            unique: true,
            required: true
        },

        // Court Number Reference — auto-generated on creation
        CNR: {
            type: String,
            unique: true,
            sparse: true
        },

        // First Information Report number — auto-generated on creation
        FIR_NO: {
            type: String,
            unique: true,
            sparse: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "REGISTERED",
                "e-FIR Registered",
                "Under Investigation",
                "In Court",
                "Closed — Verdict Delivered",
                "Open",
                "Close"
            ],
            default: "REGISTERED"
        },

        // The officer/user who opened the case
        openedBy: {
            type: String,          // store credentialId or user _id string
            default: null
        },

        // Array of user IDs assigned to this case
        assigned_users: {
            type: [String],
            default: []
        },

        // Case notes
        notes: {
            type: [
                {
                    id: String,
                    author: String,
                    text: String,
                    createdAt: { type: Date, default: Date.now }
                }
            ],
            default: []
        },

        // Scheduled / completed court hearing dates
        courtDates: {
            type: [
                {
                    date: String,
                    note: String
                }
            ],
            default: []
        },

        // Final verdict details
        verdict: {
            verdictTitle: { type: String, default: null },
            fileUrl: { type: String, default: null },
            uploadedAt: { type: Date, default: null },
            judge: { type: String, default: null }
        },

        // Milestone timestamps for case progress tracking
        milestoneDates: {
            efir: { type: Date, default: null },
            forensics: { type: Date, default: null },
            lawyers: { type: Date, default: null },
            hearings: { type: Date, default: null },
            verdict: { type: Date, default: null }
        },

        // e-FIR details
        efir: {
            number: { type: String, default: null },
            firDate: { type: String, default: null }
        },

        // Numeric progress stage (0–5)
        progressStage: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        // Hard-locked after a Judge uploads a Verdict update.
        // When true, no further document uploads or version updates are permitted.
        caseLocked: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Case", caseSchema);