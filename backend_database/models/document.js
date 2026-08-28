const mongoose = require('mongoose');

const document_schema = new mongoose.Schema({
    caseId:{type: mongoose.Schema.Types.ObjectId, ref: 'case', required: true},
    CNR:{type: String, required: true},
    docName:{type: String, required: true},
    docType:{
        type: String, 
        enum:['FIR', 'Police Report', 'Witness Statement', 'Charge Sheet', 'Forensic Report', 'Court Order'],
        required: true
    },
    hashCode:{type: String, required: true, unique: true},
    storageURI:{type: String, required: true, unique: true},
    assigned_users:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
    isCaseClosed:{type: Boolean, default: false},
    uploadedBy:{type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true},
    uploadedDate:{type: Date, default: Date.now},
    blockchainTxRef:{type: String}
})

module.exports = mongoose.model('document', document_schema);