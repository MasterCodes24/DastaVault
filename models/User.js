const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['ADMIN', 'POLICE_OFFICER', 'FORENSIC_EXPERT', 'LAWYER', 'JUDGE'],
    required: true 
  },
  credentialId: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  
  // Onboarding states
  isPhoneVerified: { type: Boolean, default: false },
  adminStatus: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING' 
  },
  
  otp: { type: String },
  otpExpiry: { type: Date }
}, { timestamps: true });

// Compound Index: Ensures a Police Officer and Lawyer can have the same ID number without crashing
userSchema.index({ role: 1, credentialId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);