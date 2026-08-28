const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
.then(() =>{
    console.log('connected successfully');
})
.catch((err) =>{
    console.log('connection failed',err)
})