
const { ethers } = require("ethers");
require("dotenv").config();

// 1. Import the compiled ABI from the adjacent blockchain folder
const DocumentRegistry = require("../blockchain/artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json");

// 2. Load Environment Variables
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.warn("⚠️ WARNING: BLOCKCHAIN_PRIVATE_KEY or CONTRACT_ADDRESS is missing in your backend/.env file!");
}

// 3. Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 4. Instantiate the contract using the imported DocumentRegistry.abi
const contract = new ethers.Contract(CONTRACT_ADDRESS, DocumentRegistry.abi, wallet);

// Helper function to anchor the initial e-FIR
const submitEFIR = async (caseId, firHash) => {
    try {
        const tx = await contract.anchorEFIR(caseId, firHash);
        const receipt = await tx.wait(); 
        return { success: true, transactionHash: receipt.hash };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Helper function to anchor evidence or forensic reports
const anchorDocumentHash = async (caseId, docId, fileHash, storageUri) => {
    try {
        const tx = await contract.anchorDocumentHash(caseId, docId, fileHash, storageUri);
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.hash };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Helper function for the backend to read state and verify document integrity
const verifyDocumentHash = async (caseId, docId) => {
    try {
        const doc = await contract.getDocument(caseId, docId);
        return { 
            success: true, 
            fileHash: doc[0], 
            storageUri: doc[1], 
            uploadedBy: doc[2], 
            timestamp: doc[3] 
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Helper function to seal the case post-verdict
const closeCase = async (caseId) => {
    try {
        const tx = await contract.closeCase(caseId);
        const receipt = await tx.wait();
        return { success: true, transactionHash: receipt.hash };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Export the helpers for the Express backend
module.exports = { submitEFIR, anchorDocumentHash, verifyDocumentHash, closeCase };