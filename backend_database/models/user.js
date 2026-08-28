const mongoose = require('mongoose');

const user_schema = new mongoose.Schema({
    name:{type: String, required: true},
    role:{type: String, enum:['admin', 'police', 'lawyer', 'judge', 'forensic'], required: true},
    phone:{type: String, required: true, unique: true},
    credentialId: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['pending approval', 'approved', 'rejected'], default: 'pending approval' },
    isPhoneVerified: { type: Boolean, default: false },
    otpCode: { type: String },
    otpExpiry: { type: Date }
})

user_schema.index({role: 1, credentialId: 1}, {unique: true});

module.exports = mongoose.model('user', user_schema);