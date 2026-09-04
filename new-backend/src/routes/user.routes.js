const express = require("express");
const User = require("../models/User");

const router = express.Router();

// ─────────────────────────────────────────────────
// GET /api/users
// Returns all users. Optional: ?role=police&status=approved
// ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
    try {
        const { role, status } = req.query;

        const filter = {};
        if (role) filter.role = role.toLowerCase();
        if (status) filter.status = status.toLowerCase();

        const users = await User.find(filter)
            .select("-password -otpCode -otpExpiry")
            .sort({ createdAt: -1 });

        // Normalize to frontend-friendly shape
        const normalized = users.map((u) => ({
            id: u._id,
            dbId: u._id,
            name: u.name,
            role: normalizeRoleToFrontend(u.role),
            credentialID: u.credentialId,
            phone: u.phone,
            status: normalizeStatusToFrontend(u.status),
            createdAt: u.createdAt
        }));

        res.json(normalized);

    } catch (error) {
        console.error("Users fetch error:", error);
        res.status(500).json({ message: "Failed to fetch users.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// PATCH /api/users/:id/approve
// Admin approves a pending user
// ─────────────────────────────────────────────────
router.patch("/:id/approve", async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: "approved" },
            { new: true }
        ).select("-password -otpCode -otpExpiry");

        if (!user) return res.status(404).json({ message: "User not found." });

        res.json({
            message: "User approved.",
            user: {
                id: user._id,
                name: user.name,
                role: normalizeRoleToFrontend(user.role),
                credentialID: user.credentialId,
                status: normalizeStatusToFrontend(user.status)
            }
        });

    } catch (error) {
        console.error("Approve error:", error);
        res.status(500).json({ message: "Approval failed.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// PATCH /api/users/:id/reject
// Admin rejects / removes a pending user
// ─────────────────────────────────────────────────
router.patch("/:id/reject", async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: "rejected" },
            { new: true }
        ).select("-password -otpCode -otpExpiry");

        if (!user) return res.status(404).json({ message: "User not found." });

        res.json({
            message: "User rejected.",
            user: {
                id: user._id,
                name: user.name,
                status: normalizeStatusToFrontend(user.status)
            }
        });

    } catch (error) {
        console.error("Reject error:", error);
        res.status(500).json({ message: "Rejection failed.", error: error.message });
    }
});

// ─────────────────────────────────────────────────
// Helpers — keep role/status consistent with frontend labels
// ─────────────────────────────────────────────────
function normalizeRoleToFrontend(dbRole) {
    const map = {
        admin: "Admin",
        police: "Police Officer",
        lawyer: "Lawyer",
        judge: "Judge",
        forensic: "Forensic Agency"
    };
    return map[dbRole] || dbRole;
}

function normalizeStatusToFrontend(dbStatus) {
    const map = {
        pending_approval: "PENDING_APPROVAL",
        approved: "APPROVED",
        rejected: "REJECTED"
    };
    return map[dbStatus] || dbStatus.toUpperCase();
}

module.exports = router;
