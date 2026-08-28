const mongoose = require('mongoose');
require('dotenv').config();

const user = require('./models/user');
const cases = require('./models/case');
const document = require('./models/document');
const auditLog = require('./models/auditLog');

async function run(){
    const newUser = new user({
        name: 'test officer',
        role: 'police',
        phone: '9999999999',
        credentialId: 'Badge001',
        password: 'hashed password'
    });

    const savedUser = await newUser.save();
    console.log('user saved:' , savedUser);

    const newCase = new cases({
        CNR: 'CNR-TEST-001',
        FIR_NO: 'FIR-TEST-001',
        title: 'Test case for schema validation',
        description: 'dummy case',
        assigned_users: [savedUser._id],
        openedBy: savedUser._id
    });

    const savedCase = await newCase.save();
    console.log('case saved: ', savedCase);

    const newDoc = new document({
        caseId: savedCase._id,
        CNR: savedCase.CNR,
        docName: 'Test FIR document',
        docType: 'FIR',
        hashCode: 'testhash1234567890',
        storageURI: 'https://test-storage.example.com/file1',
        assigned_users: [savedUser._id],
        uploadedBy: savedUser._id
    });

    const savedDoc = await newDoc.save();
    console.log('document saved:', savedDoc);

    const newAuditLog = new auditLog({
       actionType: 'upload',
        actor: savedUser._id,
        caseId: savedCase._id,
        documentId: savedDoc._id 
    })

    const savedauditLog = await newAuditLog.save();
    console.log('auditLog saved:', savedauditLog);
}

mongoose.connect(process.env.MONGO_URI)
.then(() =>{
    run();
})
.catch((err) =>{
    console.log('connection failed',err);
})