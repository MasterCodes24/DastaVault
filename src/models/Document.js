const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        documentId: {
            type: String,
            unique: true,
            required: true
        },

        caseId: {
            type: String,
            required: true
        },

        documentType: {
            type: String,
            required: true
        },

        title: {
            type: String,
            required: true
        },

        version: {
            type: Number,
            default: 1
        },

        filePath: {
            type: String,
            required: true
        },

        hash: {
            type: String,
            required: true
        },

        blockchain: {
            transactionId: String,
            blockNumber: Number
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Document", documentSchema);