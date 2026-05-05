const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    b2FileId: { type: String, required: true },
    size: { type: Number, required: true },
    iv: { type: String, required: true }, 
    salt: { type: String, required: true }, 
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'soft-deleted'], default: 'active' },
    deletedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);
