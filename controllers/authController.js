const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// REGISTER USER
exports.register = async (req, res) => {
  try {
    const { fullName, role, credentialId, phone, password } = req.body;
    
    // Check if user already exists for this role + credential ID
    const existingUser = await User.findOne({ role, credentialId });
    if (existingUser) {
      return res.status(400).json({ error: 'This credential ID is already registered under this role.' });
    }

    // Hash password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save user to database
    await User.create({
      fullName,
      role,
      credentialId,
      phone,
      password: hashedPassword,
      otp,
      otpExpiry
    });

    // Simulate sending SMS by printing OTP in terminal
    console.log(`[SIMULATED SMS] OTP for ${phone} is: ${otp}`);

    res.status(201).json({ 
      message: 'Registration successful. Check your VS Code terminal for the OTP!',
      phone 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found with this phone number.' });
    }

    // Check if OTP matches and is not expired
    if (user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Update user verification status
    user.isPhoneVerified = true;
    user.otp = undefined; 
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ 
      message: 'Phone verified successfully! Your account is now pending admin approval.',
      adminStatus: user.adminStatus 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  try {
    const { role, credentialId, password } = req.body;

    const user = await User.findOne({ role, credentialId });
    if (!user) {
      return res.status(404).json({ error: 'Invalid credentials or user not found.' });
    }

    if (!user.isPhoneVerified) {
      return res.status(400).json({ error: 'Please verify your phone number using OTP first.' });
    }
    if (user.adminStatus !== 'APPROVED') {
  return res.status(403).json({
    error: 'Your account has not been approved by an administrator.'
  });
}

    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        fullName: user.fullName,
        role: user.role,
        credentialId: user.credentialId,
        adminStatus: user.adminStatus
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};