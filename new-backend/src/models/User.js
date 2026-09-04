const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        role: {
            type: String,
            enum: ["admin", "police", "lawyer", "judge", "forensic"],
            required: true
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        credentialId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        status: {
            type: String,
            enum: ["pending_approval", "approved", "rejected"],
            default: "pending_approval"
        },

        isPhoneVerified: {
            type: Boolean,
            default: false
        },

        otpCode: {
            type: String,
            default: null
        },

        otpExpiry: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Hash password before saving if it was modified
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Instance method: compare plain password against stored hash
userSchema.methods.comparePassword = async function (plain) {
    return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
