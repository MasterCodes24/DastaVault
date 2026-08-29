require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB =
    require("./config/db");

const caseRoutes =
    require("./routes/case.routes");

const documentRoutes =
    require("./routes/document.routes");

const app = express();

connectDB();

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    "/uploads",
    express.static("uploads")
);

app.use(
    "/api/cases",
    caseRoutes
);

app.use(
    "/api",
    documentRoutes
);

app.get("/", (req, res) => {

    res.json({
        message:
            "Secure DMS API running"
    });

});

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});