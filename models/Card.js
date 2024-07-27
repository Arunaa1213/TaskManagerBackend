// models/Card.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const CardSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const CardModel = model('Card', CardSchema);

export default CardModel;
