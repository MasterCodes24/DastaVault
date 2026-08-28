const mongoose = require('mongoose');

const auditLog_schema = new mongoose.Schema({
    actionType:{type: String, enum:['upload', 'access', 'share', 'close'], required: true},
    actor:{type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true},
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'case' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'document' },
    timestamp:{type: Date, default: Date.now, required: true},
    blockChainRef:{type: String}
})

module.exports = mongoose.model('auditLog', auditLog_schema);