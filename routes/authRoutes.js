const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

const { verifyTokenAndRole } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);

// Protected dashboard
router.get(
  '/dashboard',
  verifyTokenAndRole(['POLICE_OFFICER', 'ADMIN']),
  (req, res) => {
    res.status(200).json({
      message: 'Welcome to the protected dashboard!',
      user: req.user
    });
  }
);

// ADMIN ROUTES
router.get(
  '/admin/pending-users',
  verifyTokenAndRole(['ADMIN']),
  adminController.getPendingUsers
);

router.patch(
  '/admin/users/:id/approve',
  verifyTokenAndRole(['ADMIN']),
  adminController.approveUser
);

router.patch(
  '/admin/users/:id/reject',
  verifyTokenAndRole(['ADMIN']),
  adminController.rejectUser
);

module.exports = router;