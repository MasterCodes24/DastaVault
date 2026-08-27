const { ethers } = require("ethers");
// Use ../ to navigate one folder up (out of 'integration') to access the root 'artifacts' folder
const DocumentRegistry = require("../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json");

// Connect to the Hardhat local node provider
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Private key of Account #0 from your local Hardhat node
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Replace this with your actual deployed contract address
const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

// Instantiate the contract to interact with it using Ethers v6
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
        return { success: true, fileHash: doc[0], storageUri: doc[1], uploadedBy: doc[2], timestamp: doc[3] };
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