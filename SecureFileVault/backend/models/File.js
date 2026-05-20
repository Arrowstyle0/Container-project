const mongoose = require('mongoose');

const ShareLinkSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    maxDownloads: { type: Number, default: -1 },
    downloadCount: { type: Number, default: 0 }
});

const FileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    b2FileId: { type: String, required: true },
    size: { type: Number, required: true },
    iv: { type: String, required: true }, 
    salt: { type: String, required: true }, 
    blindIndex: { type: String, index: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'soft-deleted'], default: 'active' },
    deletedAt: { type: Date },
    isDuress: { type: Boolean, default: false },
    shareLinks: [ShareLinkSchema]
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);
