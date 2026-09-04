const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dastavault_secret_key";

// ─────────────────────────────────────────────────
// POST /api/auth/register
// Creates a new user with status "pending_approval"
// Body: { name, role, phone, credentialId, password }
// ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { name, role, phone, credentialId, password } = req.body;

        if (!name || !role || !phone || !credentialId || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Check for existing credentialId or phone
        const existingCred = await User.findOne({ credentialId });
        if (existingCred) {
            return res.status(409).json({ message: "A user with this credential ID already exists." });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(409).json({ message: "A user with this phone number already exists." });
        }

        // Validate role
        const validRoles = ["admin", "police", "lawyer", "judge", "forensic"];
        const normalizedRole = role.toLowerCase();
        if (!validRoles.includes(normalizedRole)) {
            return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
        }

        const newUser = new User({
            name,
            role: normalizedRole,
            phone,
            credentialId,
            password,              // will be hashed by pre-save hook
            status: "pending_approval"
        });

        await newUser.save();

        res.status(201).json({
            message: "Registration successful. Awaiting admin approval.",
            user: {
                id: newUser._id,
                name: newUser.name,
                role: newUser.role,
                credentialId: newUser.credentialId,
                phone: newUser.phone,
                status: newUser.status
            }
        });

    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Registration failed.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/auth/login
// Authenticates credentialId + password, checks status
// Body: { credentialId, password }
// Returns: { token, user }
// ─────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { credentialId, password } = req.body;

        if (!credentialId || !password) {
            return res.status(400).json({ message: "Credential ID and password are required." });
        }

        // Case-insensitive credentialId lookup
        const user = await User.findOne({
            credentialId: { $regex: new RegExp(`^${credentialId}$`, "i") }
        });

        if (!user) {
            return res.status(401).json({ message: "No account found with that credential ID." });
        }

        const passwordMatch = await user.comparePassword(password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        if (user.status === "pending_approval") {
            return res.status(403).json({
                message: "Your registration is still pending Admin approval. Please check back later."
            });
        }

        if (user.status === "rejected") {
            return res.status(403).json({ message: "Your account has been rejected by the admin." });
        }

        const token = jwt.sign(
            { id: user._id, credentialId: user.credentialId, role: user.role },
            JWT_SECRET,
            { expiresIn: "12h" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                credentialId: user.credentialId,
                phone: user.phone,
                status: user.status
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/auth/verify-otp
// OTP verification stub — ready for phone 2FA
// Body: { userId, otpCode }
// ─────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
    try {
        const { userId, otpCode } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        if (!user.otpCode || !user.otpExpiry) {
            return res.status(400).json({ message: "No OTP has been issued for this user." });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ message: "OTP has expired." });
        }

        if (user.otpCode !== otpCode) {
            return res.status(401).json({ message: "Invalid OTP." });
        }

        user.isPhoneVerified = true;
        user.otpCode = null;
        user.otpExpiry = null;
        await user.save();

        res.json({ message: "Phone verified successfully." });

    } catch (error) {
        console.error("OTP error:", error);
        res.status(500).json({ message: "OTP verification failed.", error: error.message });
    }
});

module.exports = router;
