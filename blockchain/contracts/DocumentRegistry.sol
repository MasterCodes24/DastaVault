// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {
    // Contract deployer / authorized backend relayer
    address public admin;

    enum CaseStatus { Active, Closed }

    struct Case {
        string caseId;
        string firHash;
        CaseStatus status;
        uint256 createdAt;
        uint256 closedAt;
    }

    struct Document {
        string docId;
        string fileHash;     // Cryptographic SHA-256 / IPFS hash
        string storageUri;   // S3 or IPFS URI
        address uploadedBy;
        uint256 timestamp;
    }

    // Storage Mappings
    mapping(string => Case) public cases;
    // caseId => docId => Document
    mapping(string => mapping(string => Document)) public caseDocuments;

    // Events acting as the on-chain audit trail
    event EFIRAnchored(string indexed caseId, string firHash, address indexed anchoredBy, uint256 timestamp);
    event DocumentAnchored(string indexed caseId, string indexed docId, string fileHash, address indexed uploadedBy, uint256 timestamp);
    event AccessLogged(string indexed caseId, string indexed docId, address indexed sharedWith, address sharedBy, uint256 timestamp);
    event CaseClosed(string indexed caseId, address indexed closedBy, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Unauthorized: Only admin can execute");
        _;
    }

    modifier caseMustBeActive(string memory _caseId) {
        require(cases[_caseId].createdAt != 0, "Case does not exist");
        require(cases[_caseId].status == CaseStatus.Active, "Case is closed: Modification locked");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Anchor initial e-FIR submission
    function anchorEFIR(string calldata _caseId, string calldata _firHash) external {
        require(cases[_caseId].createdAt == 0, "Case already exists");
        
        cases[_caseId] = Case({
            caseId: _caseId,
            firHash: _firHash,
            status: CaseStatus.Active,
            createdAt: block.timestamp,
            closedAt: 0
        });

        emit EFIRAnchored(_caseId, _firHash, msg.sender, block.timestamp);
    }

    // Anchor document hash and metadata for evidence/reports
    function anchorDocumentHash(
        string calldata _caseId,
        string calldata _docId,
        string calldata _fileHash,
        string calldata _storageUri
    ) external caseMustBeActive(_caseId) {
        require(bytes(caseDocuments[_caseId][_docId].fileHash).length == 0, "Document ID already anchored");

        caseDocuments[_caseId][_docId] = Document({
            docId: _docId,
            fileHash: _fileHash,
            storageUri: _storageUri,
            uploadedBy: msg.sender,
            timestamp: block.timestamp
        });

        emit DocumentAnchored(_caseId, _docId, _fileHash, msg.sender, block.timestamp);
    }

    // Log inter-party document sharing
    function logShareEvent(
        string calldata _caseId,
        string calldata _docId,
        address _sharedWith
    ) external caseMustBeActive(_caseId) {
        require(bytes(caseDocuments[_caseId][_docId].fileHash).length != 0, "Document does not exist");

        emit AccessLogged(_caseId, _docId, _sharedWith, msg.sender, block.timestamp);
    }

    // Lock case permanently post-verdict
    function closeCase(string calldata _caseId) external caseMustBeActive(_caseId) {
        cases[_caseId].status = CaseStatus.Closed;
        cases[_caseId].closedAt = block.timestamp;

        emit CaseClosed(_caseId, msg.sender, block.timestamp);
    }

    // Helper view function to verify document integrity
    function getDocument(string calldata _caseId, string calldata _docId) external view returns (
        string memory fileHash,
        string memory storageUri,
        address uploadedBy,
        uint256 timestamp
    ) {
        Document memory doc = caseDocuments[_caseId][_docId];
        require(bytes(doc.fileHash).length != 0, "Document not found");
        return (doc.fileHash, doc.storageUri, doc.uploadedBy, doc.timestamp);
    }
}