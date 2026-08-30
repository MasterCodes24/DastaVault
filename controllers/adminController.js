const User = require('../models/User');

// GET PENDING USERS
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      adminStatus: 'PENDING'
    }).select('-password -otp -otpExpiry');

    res.status(200).json({
      message: 'Pending users retrieved successfully.',
      users
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

// APPROVE USER
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { adminStatus: 'APPROVED' },
      { new: true }
    ).select('-password -otp -otpExpiry');

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    res.status(200).json({
      message: 'User approved successfully.',
      user
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

// REJECT USER
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { adminStatus: 'REJECTED' },
      { new: true }
    ).select('-password -otp -otpExpiry');

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    res.status(200).json({
      message: 'User rejected successfully.',
      user
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};