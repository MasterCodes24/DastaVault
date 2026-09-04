const path = require("path");
const http = require("http");
const https = require("https");
const crypto = require("crypto");

let ethers;
try {
  ethers = require("ethers");
} catch (e) {
  try {
    ethers = require(path.join(__dirname, "../node_modules/ethers"));
  } catch (err) {
    ethers = null;
  }
}

let DocumentRegistry = null;
try {
  DocumentRegistry = require("../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json");
} catch (e) {
  // Artifacts might not be compiled yet
}

function getEnvConfig() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  const privateKey =
    process.env.BLOCKCHAIN_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const contractAddress =
    process.env.CONTRACT_ADDRESS || "0x5fbdb2315678afecb367f032d93f642f64180aa3";
  return { rpcUrl, privateKey, contractAddress };
}

let provider = null;
let wallet = null;
let contract = null;
let lastKnownRpc = null;

// Dual HTTP/HTTPS non-blocking probe to test if local or online node is reachable
function probeNode() {
  return new Promise((resolve) => {
    try {
      const { rpcUrl } = getEnvConfig();
      const parsed = new URL(rpcUrl);
      const client = parsed.protocol === "https:" ? https : http;
      const defaultPort = parsed.protocol === "https:" ? 443 : 8545;

      const req = client.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || defaultPort,
          path: parsed.pathname + (parsed.search || ""),
          method: "POST",
          headers: { "Content-Type": "application/json" },
          timeout: 1500,
        },
        (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.write(JSON.stringify({ jsonrpc: "2.0", method: "net_version", params: [], id: 1 }));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function getContract() {
  const { rpcUrl, privateKey, contractAddress } = getEnvConfig();
  if (!ethers || !DocumentRegistry) return null;

  const live = await probeNode();
  if (!live) return null;

  try {
    const p = new ethers.JsonRpcProvider(rpcUrl);
    const w = new ethers.Wallet(privateKey, p);
    const c = new ethers.Contract(contractAddress, DocumentRegistry.abi, w);
    return c;
  } catch (err) {
    console.warn("Failed to initialize contract instance:", err.message);
    return null;
  }
}

// Check if blockchain node is reachable
const isNodeLive = async () => {
  return await probeNode();
};

// Retrieve network details for frontend/backend reporting
const getNetworkInfo = async () => {
  const { rpcUrl, contractAddress } = getEnvConfig();
  const live = await probeNode();

  let networkType = "Offline";
  let chainId = null;

  if (rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost")) {
    networkType = live ? "Hardhat Localhost" : "Localhost (Disconnected)";
  } else if (rpcUrl.includes("sepolia")) {
    networkType = live ? "Ethereum Sepolia Testnet" : "Sepolia (Unreachable)";
  } else if (rpcUrl.includes("amoy") || rpcUrl.includes("polygon")) {
    networkType = live ? "Polygon Amoy Testnet" : "Polygon Amoy (Unreachable)";
  } else {
    networkType = live ? "Custom Ethereum Network" : "Custom Network (Unreachable)";
  }

  if (live && ethers) {
    try {
      const p = new ethers.JsonRpcProvider(rpcUrl);
      const network = await p.getNetwork();
      chainId = Number(network.chainId);
    } catch {
      // Ignored
    }
  }

  return {
    isLive: live,
    networkName: networkType,
    chainId,
    rpcUrl: rpcUrl.replace(/:[^:@]+@/, ":***@"), // Redact any auth in URL
    contractAddress,
  };
};

// Query pending nonce directly from RPC to eliminate any local ethers nonce caching
async function getFreshNonce(contractInstance) {
  try {
    const address = contractInstance.runner.address;
    const hexNonce = await contractInstance.runner.provider.send("eth_getTransactionCount", [address, "pending"]);
    return parseInt(hexNonce, 16);
  } catch (e) {
    return undefined;
  }
}

// Helper function to anchor the initial e-FIR
const submitEFIR = async (caseId, firHash) => {
  try {
    const c = await getContract();
    if (!c) {
      return {
        success: false,
        fallback: true,
        transactionHash: "sim-efir-" + Date.now().toString(16),
        blockNumber: 0,
        error: "Blockchain node offline. Simulated local record.",
      };
    }
    const nonce = await getFreshNonce(c);
    const options = nonce !== undefined ? { nonce } : {};
    const tx = await c.anchorEFIR(caseId, firHash, options);
    const receipt = await tx.wait();
    return { success: true, transactionHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Ensure the case exists on-chain so anchorDocumentHash won't revert with "Case does not exist"
async function ensureCaseExists(contractInstance, caseId) {
  try {
    const caseData = await contractInstance.cases(caseId);
    if (!caseData || Number(caseData.createdAt) === 0) {
      const dummyHash = "0x" + crypto.createHash("sha256").update(caseId).digest("hex");
      const nonce = await getFreshNonce(contractInstance);
      const options = nonce !== undefined ? { nonce } : {};
      const tx = await contractInstance.anchorEFIR(caseId, dummyHash, options);
      await tx.wait();
    }
  } catch (err) {
    // Already created or concurrent call, ignore
  }
}

// Helper function to anchor evidence or forensic reports (defaults to version 1)
const anchorDocumentHash = async (caseId, docId, fileHash, storageUri = "") => {
  try {
    const c = await getContract();
    if (!c) {
      return {
        success: false,
        fallback: true,
        transactionHash: "sim-tx-v1-" + Math.random().toString(36).substring(2, 10),
        blockNumber: 0,
        error: "Blockchain node offline. Using local simulated ledger.",
      };
    }
    await ensureCaseExists(c, caseId);
    const nonce = await getFreshNonce(c);
    const options = nonce !== undefined ? { nonce } : {};
    const tx = await c.anchorDocumentHash(caseId, docId, fileHash, storageUri || "", options);
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("anchorDocumentHash on-chain error:", error.message);
    return {
      success: false,
      fallback: true,
      transactionHash: "sim-tx-fallback-" + Math.random().toString(36).substring(2, 10),
      blockNumber: 0,
      error: error.message,
    };
  }
};

// Helper function to anchor a specific version of a document
const anchorDocumentVersion = async (caseId, docId, version, fileHash, storageUri = "") => {
  try {
    const c = await getContract();
    if (!c) {
      return {
        success: false,
        fallback: true,
        transactionHash: "sim-tx-v" + version + "-" + Math.random().toString(36).substring(2, 10),
        blockNumber: 0,
        error: "Blockchain node offline. Using local simulated ledger.",
      };
    }
    await ensureCaseExists(c, caseId);
    const nonce = await getFreshNonce(c);
    const options = nonce !== undefined ? { nonce } : {};
    const tx = await c.anchorDocumentVersion(caseId, docId, version, fileHash, storageUri || "", options);
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("anchorDocumentVersion on-chain error:", error.message);
    return {
      success: false,
      fallback: true,
      transactionHash: "sim-tx-fallback-" + Math.random().toString(36).substring(2, 10),
      blockNumber: 0,
      error: error.message,
    };
  }
};

// Helper function to verify document integrity (latest version)
const verifyDocumentHash = async (caseId, docId) => {
  try {
    const c = await getContract();
    if (!c) {
      return { success: false, fallback: true, error: "Ethereum node not live" };
    }
    const doc = await c.getDocument(caseId, docId);
    return {
      success: true,
      fileHash: doc[0],
      storageUri: doc[1],
      uploadedBy: doc[2],
      timestamp: Number(doc[3]),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to verify specific version of document integrity
const verifyDocumentVersionHash = async (caseId, docId, version) => {
  try {
    const c = await getContract();
    if (!c) {
      return { success: false, fallback: true, error: "Ethereum node not live" };
    }
    const docVer = await c.getDocumentVersion(caseId, docId, version);
    return {
      success: true,
      version: Number(version),
      fileHash: docVer[0],
      storageUri: docVer[1],
      uploadedBy: docVer[2],
      timestamp: Number(docVer[3]),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to seal the case post-verdict
const closeCase = async (caseId) => {
  try {
    const c = await getContract();
    if (!c) {
      return { success: false, fallback: true, error: "Ethereum node not live" };
    }
    const tx = await c.closeCase(caseId);
    const receipt = await tx.wait();
    return { success: true, transactionHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  isNodeLive,
  getNetworkInfo,
  submitEFIR,
  anchorDocumentHash,
  anchorDocumentVersion,
  verifyDocumentHash,
  verifyDocumentVersionHash,
  closeCase,
};