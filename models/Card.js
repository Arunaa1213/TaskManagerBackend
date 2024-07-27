const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const CardSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const CardModel = model('Card', CardSchema);

module.exports = CardModel;