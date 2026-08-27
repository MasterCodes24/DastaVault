// Import the helper functions from your bridge file
const { submitEFIR, anchorDocumentHash, verifyDocumentHash } = require("./blockchainBridge.cjs");

async function runTests() {
    console.log("Starting Smart Contract Integration Tests...\n");

    // Test 1: Anchor the initial FIR
    console.log("1. Anchoring e-FIR...");
    const firResult = await submitEFIR("CASE_001", "hash_of_police_report_123");
    if (firResult.success) {
        console.log("✅ Success! Transaction Hash:", firResult.transactionHash);
    } else {
        console.error("❌ Failed to anchor FIR:", firResult.error);
        return; // Stop if the first step fails
    }

    // Test 2: Anchor a forensic report to the active case
    console.log("\n2. Anchoring Forensic Report...");
    const docResult = await anchorDocumentHash("CASE_001", "DOC_FORENSIC_1", "sha256_blood_report", "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi");
    if (docResult.success) {
        console.log("✅ Success! Transaction Hash:", docResult.transactionHash);
    } else {
        console.error("❌ Failed to anchor document:", docResult.error);
    }

    // Test 3: Read the data back from the blockchain to verify
    console.log("\n3. Verifying Document Integrity on-chain...");
    const verifyResult = await verifyDocumentHash("CASE_001", "DOC_FORENSIC_1");
    if (verifyResult.success) {
        console.log("✅ Verified! Data returned from Blockchain:");
        console.log(`   - File Hash: ${verifyResult.fileHash}`);
        console.log(`   - Storage URI: ${verifyResult.storageUri}`);
        console.log(`   - Uploaded By (Wallet): ${verifyResult.uploadedBy}`);
    } else {
        console.error("❌ Failed to verify document:", verifyResult.error);
    }
}

// Execute the tests
runTests();