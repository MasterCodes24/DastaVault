const path = require("path");
const crypto = require("crypto");

let bridge = null;
try {
  bridge = require("../../../blockchain/integration/blockchainBridge.cjs");
} catch (err) {
  console.warn("Could not load blockchainBridge.cjs directly:", err.message);
}

// In-memory registry fallback if blockchain node is offline
const fallbackRegistry = new Map();

/**
 * Register initial document (v1) on the smart contract
 */
const registerDocument = async ({ documentId, caseId, hash, version = 1, storageUri = "" }) => {
  let txResult = null;

  if (bridge) {
    try {
      txResult = await bridge.anchorDocumentHash(caseId, documentId, hash, storageUri);
    } catch (err) {
      console.warn("Smart contract anchor failed, using fallback:", err.message);
    }
  }

  const transactionId = txResult?.transactionHash || "tx-" + crypto.createHash("sha256").update(documentId + hash + Date.now()).digest("hex");
  const blockNumber = txResult?.blockNumber ?? Math.floor(Math.random() * 500) + 1;

  const record = {
    documentId,
    caseId,
    hash,
    version,
    transactionId,
    blockNumber,
    timestamp: new Date().toISOString(),
    isFallback: !txResult || !!txResult.fallback,
  };

  fallbackRegistry.set(`${caseId}:${documentId}:${version}`, record);
  fallbackRegistry.set(`${caseId}:${documentId}:latest`, record);

  return record;
};

/**
 * Register subsequent document versions (v2, v3, ...) on smart contract
 */
const registerDocumentVersion = async ({ documentId, caseId, hash, version, storageUri = "" }) => {
  let txResult = null;

  if (bridge) {
    try {
      txResult = await bridge.anchorDocumentVersion(caseId, documentId, version, hash, storageUri);
    } catch (err) {
      console.warn("Smart contract version anchor failed, using fallback:", err.message);
    }
  }

  const transactionId = txResult?.transactionHash || "tx-v" + version + "-" + crypto.createHash("sha256").update(documentId + hash + Date.now()).digest("hex");
  const blockNumber = txResult?.blockNumber ?? Math.floor(Math.random() * 500) + 1;

  const record = {
    documentId,
    caseId,
    hash,
    version,
    transactionId,
    blockNumber,
    timestamp: new Date().toISOString(),
    isFallback: !txResult || !!txResult.fallback,
  };

  fallbackRegistry.set(`${caseId}:${documentId}:${version}`, record);
  fallbackRegistry.set(`${caseId}:${documentId}:latest`, record);

  return record;
};

/**
 * Verify document hash against on-chain smart contract (latest)
 */
const verifyDocumentOnChain = async (caseId, documentId) => {
  if (bridge) {
    try {
      const res = await bridge.verifyDocumentHash(caseId, documentId);
      if (res.success) {
        return {
          onChain: true,
          hash: res.fileHash,
          storageUri: res.storageUri,
          timestamp: res.timestamp,
        };
      }
    } catch (e) {
      // Ignored
    }
  }

  // Fallback to local cache
  const cached = fallbackRegistry.get(`${caseId}:${documentId}:latest`);
  if (cached) {
    return {
      onChain: false,
      hash: cached.hash,
      timestamp: cached.timestamp,
      isFallback: true,
    };
  }

  return null;
};

/**
 * Verify document version hash against on-chain smart contract
 */
const verifyDocumentVersionOnChain = async (caseId, documentId, version) => {
  if (bridge) {
    try {
      const res = await bridge.verifyDocumentVersionHash(caseId, documentId, version);
      if (res.success) {
        return {
          onChain: true,
          version: res.version,
          hash: res.fileHash,
          storageUri: res.storageUri,
          timestamp: res.timestamp,
        };
      }
    } catch (e) {
      // Ignored
    }
  }

  // Fallback to local cache
  const cached = fallbackRegistry.get(`${caseId}:${documentId}:${version}`);
  if (cached) {
    return {
      onChain: false,
      version: cached.version,
      hash: cached.hash,
      timestamp: cached.timestamp,
      isFallback: true,
    };
  }

  return null;
};

/**
 * Retrieve blockchain network status
 */
const getNetworkStatus = async () => {
  if (bridge) {
    return await bridge.getNetworkInfo();
  }
  return {
    isLive: false,
    networkName: "Bridge not loaded",
    chainId: null,
    rpcUrl: "",
    contractAddress: "",
  };
};

const getDocumentRecord = (documentId, caseId = null) => {
  if (caseId) {
    return fallbackRegistry.get(`${caseId}:${documentId}:latest`);
  }
  for (const [key, value] of fallbackRegistry.entries()) {
    if (key.includes(documentId) && key.endsWith(":latest")) {
      return value;
    }
  }
  return null;
};

module.exports = {
  registerDocument,
  registerDocumentVersion,
  verifyDocumentOnChain,
  verifyDocumentVersionOnChain,
  getNetworkStatus,
  getDocumentRecord,
};