const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const Document = require("../models/Document");
const Case = require("../models/Case");

const { calculateFileHash } =
    require("../services/hash.service");

const {
    registerDocument,
    getDocumentRecord
} = require("../services/blockchain.service");

const router = express.Router();

const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage
});



router.post(
    "/cases/:caseId/documents",
    upload.single("document"),
    async (req, res) => {

        try {

            const { caseId } = req.params;

            const {
                documentType,
                title
            } = req.body;

            const caseExists = await Case.findOne({
                caseId
            });

            if (!caseExists) {
                return res.status(404).json({
                    message: "Case not found"
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: "Document is required"
                });
            }

            const documentId =
                "DOC-" +
                Date.now();

            const hash =
                calculateFileHash(
                    req.file.path
                );

            const blockchainRecord =
                registerDocument({
                    documentId,
                    caseId,
                    hash,
                    version: 1
                });

            const document =
                await Document.create({

                    documentId,

                    caseId,

                    documentType,

                    title,

                    version: 1,

                    filePath: req.file.path,

                    hash,

                    blockchain: {

                        transactionId:
                            blockchainRecord.transactionId,

                        blockNumber:
                            blockchainRecord.blockNumber
                    }
                });

            res.status(201).json({

                message:
                    "Document registered successfully",

                document

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Upload failed"
            });
        }
    }
);

module.exports = router;

router.post(
    "/documents/:documentId/verify",
    async (req, res) => {

        try {

            const { documentId } =
                req.params;

            const document =
                await Document.findOne({
                    documentId
                });

            if (!document) {

                return res.status(404).json({
                    message: "Document not found"
                });
            }

            const currentHash =
                calculateFileHash(
                    document.filePath
                );

            const blockchainRecord =
                getDocumentRecord(
                    documentId
                );

            if (!blockchainRecord) {

                return res.status(404).json({
                    message:
                        "Blockchain record not found"
                });
            }

            const verified =
                currentHash ===
                blockchainRecord.hash;

            res.json({

                documentId,

                currentHash,

                blockchainHash:
                    blockchainRecord.hash,

                verified,

                status:
                    verified
                        ? "VERIFIED"
                        : "TAMPERED"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Verification failed"
            });
        }
    }
);