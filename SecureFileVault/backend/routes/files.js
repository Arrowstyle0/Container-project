const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const File = require('../models/File');
const User = require('../models/User');
const b2Service = require('../services/b2Service');

const router = express.Router();

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Helper: check if the requesting device is a parent device
const requireParentDevice = async (req, res, next) => {
    try {
        const deviceId = req.headers['x-device-id'];
        if (!deviceId) {
            return res.status(403).json({ error: 'Device ID required. Only parent devices can delete files.' });
        }
        const user = await User.findById(req.user.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const device = user.trustedDevices.find(d => d.deviceId === deviceId);
        if (!device || !device.isParent) {
            return res.status(403).json({ error: 'Only parent devices are authorized to delete files.' });
        }
        next();
    } catch (error) {
        console.error('Parent device check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ========================
// Upload
// ========================
router.post('/upload', authenticate, async (req, res) => {
    try {
        const filename = decodeURIComponent(req.headers['x-file-name']);
        const iv = req.headers['x-file-iv'];
        const salt = req.headers['x-file-salt'];
        const blindIndex = req.headers['x-blind-index'] || null;
        const contentLength = req.headers['content-length'];
        const isDuress = req.user.isDuress || false;

        if (!filename || !contentLength) {
            return res.status(400).json({ error: 'Missing headers' });
        }

        const b2FileId = await b2Service.uploadStream(req, contentLength, filename);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const newFile = new File({
            user: req.user.id,
            filename,
            b2FileId,
            size: parseInt(contentLength),
            iv,
            salt,
            blindIndex,
            expiresAt,
            isDuress
        });

        await newFile.save();
        res.status(201).json({ message: 'File uploaded successfully', file: newFile });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// List Files
// ========================
router.get('/', authenticate, async (req, res) => {
    try {
        const isDuress = req.user.isDuress || false;
        const files = await File.find({ user: req.user.id, status: 'active', isDuress });
        res.json(files);
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Search by Blind Index
// ========================
router.get('/search', authenticate, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const isDuress = req.user.isDuress || false;
        const files = await File.find({ 
            user: req.user.id, 
            status: 'active', 
            isDuress,
            blindIndex: q
        });
        res.json(files);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Download
// ========================
router.get('/:id/download', authenticate, async (req, res) => {
    try {
        const isDuress = req.user.isDuress || false;
        const fileRecord = await File.findOne({ _id: req.params.id, user: req.user.id, status: 'active', isDuress });
        if (!fileRecord) return res.status(404).json({ error: 'File not found' });

        const fileData = await b2Service.downloadFile(fileRecord.b2FileId);
        
        res.json({
            iv: fileRecord.iv,
            salt: fileRecord.salt,
            filename: fileRecord.filename,
            ciphertext: Buffer.from(fileData).toString('base64')
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed. Check B2 permissions.' });
    }
});

// ========================
// Download Raw Binary
// ========================
router.get('/:id/download-raw', authenticate, async (req, res) => {
    try {
        const isDuress = req.user.isDuress || false;
        const fileRecord = await File.findOne({ _id: req.params.id, user: req.user.id, status: 'active', isDuress });
        if (!fileRecord) return res.status(404).send('File not found');

        const fileData = await b2Service.downloadFile(fileRecord.b2FileId);
        
        res.setHeader('X-File-Iv', fileRecord.iv);
        res.setHeader('X-File-Salt', fileRecord.salt);
        res.setHeader('X-File-Name', encodeURIComponent(fileRecord.filename));
        res.setHeader('Content-Type', 'application/octet-stream');
        
        res.send(Buffer.from(fileData));
    } catch (error) {
        console.error('Raw download error:', error);
        res.status(500).send('Download failed.');
    }
});

// ========================
// Stream a specific chunk (for media playback)
// ========================
router.get('/:id/stream', authenticate, async (req, res) => {
    try {
        const isDuress = req.user.isDuress || false;
        const fileRecord = await File.findOne({ _id: req.params.id, user: req.user.id, status: 'active', isDuress });
        if (!fileRecord) return res.status(404).json({ error: 'File not found' });

        const fileData = await b2Service.downloadFile(fileRecord.b2FileId);
        
        // Return the full encrypted blob along with metadata for client-side chunk decryption
        res.json({
            iv: fileRecord.iv,
            salt: fileRecord.salt,
            filename: fileRecord.filename,
            size: fileRecord.size,
            ciphertext: Buffer.from(fileData).toString('base64')
        });
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Stream failed' });
    }
});

// ========================
// Create Share Link
// ========================
router.post('/:id/share', authenticate, async (req, res) => {
    try {
        const { expiresIn, maxDownloads } = req.body;
        const isDuress = req.user.isDuress || false;
        const fileRecord = await File.findOne({ _id: req.params.id, user: req.user.id, status: 'active', isDuress });
        if (!fileRecord) return res.status(404).json({ error: 'File not found' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        
        // expiresIn: '1h', '24h', '7d'
        switch (expiresIn) {
            case '1h': expiresAt.setHours(expiresAt.getHours() + 1); break;
            case '24h': expiresAt.setHours(expiresAt.getHours() + 24); break;
            case '7d': expiresAt.setDate(expiresAt.getDate() + 7); break;
            case '30d': expiresAt.setDate(expiresAt.getDate() + 30); break;
            default: expiresAt.setHours(expiresAt.getHours() + 24);
        }

        fileRecord.shareLinks.push({
            token,
            expiresAt,
            maxDownloads: maxDownloads || -1,
            downloadCount: 0
        });
        await fileRecord.save();

        res.json({ token, expiresAt });
    } catch (error) {
        console.error('Share link error:', error);
        res.status(500).json({ error: 'Failed to create share link' });
    }
});

// ========================
// Access Shared File (no auth required)
// ========================
router.get('/shared/:token', async (req, res) => {
    try {
        const fileRecord = await File.findOne({ 
            'shareLinks.token': req.params.token,
            status: 'active'
        });
        if (!fileRecord) return res.status(404).json({ error: 'Share link not found or expired' });

        const shareLink = fileRecord.shareLinks.find(s => s.token === req.params.token);
        if (!shareLink) return res.status(404).json({ error: 'Share link not found' });

        // Check expiration
        if (new Date() > shareLink.expiresAt) {
            return res.status(410).json({ error: 'Share link has expired' });
        }

        // Check download limit
        if (shareLink.maxDownloads > 0 && shareLink.downloadCount >= shareLink.maxDownloads) {
            return res.status(410).json({ error: 'Download limit reached for this share link' });
        }

        // Increment download count
        shareLink.downloadCount += 1;
        await fileRecord.save();

        const fileData = await b2Service.downloadFile(fileRecord.b2FileId);
        
        res.json({
            iv: fileRecord.iv,
            salt: fileRecord.salt,
            filename: fileRecord.filename,
            ciphertext: Buffer.from(fileData).toString('base64')
        });
    } catch (error) {
        console.error('Shared download error:', error);
        res.status(500).json({ error: 'Failed to download shared file' });
    }
});

// ========================
// Delete All
// ========================
router.delete('/all', authenticate, requireParentDevice, async (req, res) => {
    try {
        const isDuress = req.user.isDuress || false;
        const userFiles = await File.find({ user: req.user.id, isDuress });
        if (userFiles.length === 0) return res.json({ message: 'No files to delete' });

        for (const fileRecord of userFiles) {
            try {
                await b2Service.deleteFile(fileRecord.filename, fileRecord.b2FileId);
            } catch(e) {
                console.error('b2 bulk deletion failed for file', fileRecord.filename, e);
            }
        }
        await File.deleteMany({ user: req.user.id, isDuress });
        res.json({ message: 'All files deleted successfully' });
    } catch (error) {
        console.error('Delete all error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Delete Single
// ========================
router.delete('/:id', authenticate, requireParentDevice, async (req, res) => {
    try {
        const isDuress = req.user.isDuress || false;
        const fileRecord = await File.findOne({ _id: req.params.id, user: req.user.id, isDuress });
        if (!fileRecord) return res.status(404).json({ error: 'File not found' });

        try {
            await b2Service.deleteFile(fileRecord.filename, fileRecord.b2FileId);
        } catch(e) {
            console.error('b2 deletion failed', e);
        }
        await File.deleteOne({ _id: fileRecord._id });
        
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
