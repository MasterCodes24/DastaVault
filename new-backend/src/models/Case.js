const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
    {
        caseId: {
            type: String,
            unique: true,
            required: true
        },

        title: {
            type: String,
            required: true
        },

        type: {
            type: String,
            required: true
        },

        description: {
            type: String
        },

        status: {
            type: String,
            default: "REGISTERED"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Case", caseSchema);