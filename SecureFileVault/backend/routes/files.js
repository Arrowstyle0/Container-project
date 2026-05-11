const express = require('express');
const jwt = require('jsonwebtoken');
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

const requireParentDevice = async (req, res, next) => {
    try {
        const deviceId = req.user.deviceId;
        if (!deviceId) {
            return res.status(403).json({ error: 'Only parent devices can delete files. No device ID found in session.' });
        }
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const device = user.trustedDevices.find(d => d.deviceId === deviceId);
        if (!device || !device.isParent) {
            return res.status(403).json({ error: 'Only parent devices can delete files. Set this device as a parent in Devices settings.' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Failed to verify device status' });
    }
};

router.post('/upload', authenticate, async (req, res) => {
    try {
        const filename = decodeURIComponent(req.headers['x-file-name']);
        const iv = req.headers['x-file-iv'];
        const salt = req.headers['x-file-salt'];
        const contentLength = req.headers['content-length'];

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
            expiresAt
        });

        await newFile.save();
        res.status(201).json({ message: 'File uploaded successfully', file: newFile });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const files = await File.find({ user: req.user.id, status: 'active' });
        res.json(files);
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id/download', authenticate, async (req, res) => {
    try {
        const fileRecord = await File.findOne({ _id: req.params.id, user: req.user.id, status: 'active' });
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
        res.status(500).json({ error: 'Backblaze B2 Error: Your application key lacks the readFiles permission. Please generate a new key on Backblaze with readFiles checked and update your .env file.' });
    }
});

router.delete('/all', authenticate, requireParentDevice, async (req, res) => {
    try {
        const userFiles = await File.find({ user: req.user.id });
        if (userFiles.length === 0) return res.json({ message: 'No files to delete' });

        for (const fileRecord of userFiles) {
            try {
                await b2Service.deleteFile(fileRecord.filename, fileRecord.b2FileId);
            } catch(e) {
                console.error('b2 bulk deletion failed for file', fileRecord.filename, e);
            }
        }
        await File.deleteMany({ user: req.user.id });
        res.json({ message: 'All files deleted successfully' });
    } catch (error) {
        console.error('Delete all error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', authenticate, requireParentDevice, async (req, res) => {
    try {
        const fileRecord = await File.findOne({ _id: req.params.id, user: req.user.id });
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
