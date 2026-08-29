const crypto = require("crypto");

let blockchain = [];

const registerDocument = ({
    documentId,
    caseId,
    hash,
    version
}) => {

    const previousBlock =
        blockchain.length > 0
            ? blockchain[blockchain.length - 1]
            : null;

    const blockNumber = blockchain.length + 1;

    const timestamp = new Date().toISOString();

    const previousHash = previousBlock
        ? previousBlock.blockHash
        : "0";

    const blockData =
        documentId +
        caseId +
        hash +
        version +
        timestamp +
        previousHash;

    const blockHash = crypto
        .createHash("sha256")
        .update(blockData)
        .digest("hex");

    const transactionId = crypto
        .createHash("sha256")
        .update(blockHash + Date.now())
        .digest("hex");

    const block = {
        blockNumber,
        transactionId,
        documentId,
        caseId,
        hash,
        version,
        timestamp,
        previousHash,
        blockHash
    };

    blockchain.push(block);

    return block;
};

const getDocumentRecord = (documentId) => {

    return blockchain.find(
        block => block.documentId === documentId
    );
};

module.exports = {
    registerDocument,
    getDocumentRecord
};