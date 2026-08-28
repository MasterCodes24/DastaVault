const { Schema } = require('mongoose');

const mongoose = require('mongoose');

const case_schema = new mongoose.Schema({
    CNR :{type: String, required: true, unique:true},
    status:{type: String, enum:['Open','Under Investigation','In Court','Close'], default:'Open'},
    FIR_NO:{type: String, unique: true, required: true},
    title:{type: String, required: true},
    description:{type: String, trim: true},
    assigned_users:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
    openedBy:{type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true},
    openedDate:{type: Date, default: Date.now},
    verdict:{
        text:{type: String, trim: true},
        judge:{type: mongoose.Schema.Types.ObjectId, ref: 'user'},
        date:{type: Date}
    }
})

module.exports = mongoose.model('case', case_schema);