const express = require("express");

const Case = require("../models/Case");

const router = express.Router();

router.post("/", async (req, res) => {

    try {

        const {
            title,
            type,
            description
        } = req.body;

        const caseId =
            "CASE-" +
            new Date().getFullYear() +
            "-" +
            Date.now();

        const newCase =
            await Case.create({

                caseId,

                title,

                type,

                description,

                status: "REGISTERED"

            });

        res.status(201).json(newCase);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Case creation failed"
        });
    }
});

router.get("/", async (req, res) => {

    const cases =
        await Case.find()
            .sort({ createdAt: -1 });

    res.json(cases);
});

module.exports = router;