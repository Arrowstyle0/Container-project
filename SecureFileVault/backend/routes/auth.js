const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, dob, email, clientHashedAuthToken } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedAuthToken = await bcrypt.hash(clientHashedAuthToken, 10);
        const queryableAuthHash = crypto.createHash('sha256').update(clientHashedAuthToken).digest('hex');
        
        const recoveryKey = crypto.randomBytes(32).toString('hex');
        const hashedRecoveryKey = await bcrypt.hash(recoveryKey, 10);

        const newUser = new User({
            name,
            dob,
            email,
            hashedAuthToken,
            queryableAuthHash,
            hashedRecoveryKey
        });

        await newUser.save();

        res.status(201).json({ message: 'User created successfully', recoveryKey });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { clientHashedAuthToken, deviceId, deviceName } = req.body;

        const queryableAuthHash = crypto.createHash('sha256').update(clientHashedAuthToken).digest('hex');
        const user = await User.findOne({ queryableAuthHash });
        
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(clientHashedAuthToken, user.hashedAuthToken);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        if (deviceId) {
            const deviceIndex = user.trustedDevices.findIndex(d => d.deviceId === deviceId);
            if (deviceIndex >= 0) {
                user.trustedDevices[deviceIndex].lastUsed = new Date();
            } else {
                user.trustedDevices.push({ deviceId, deviceName });
            }
            await user.save();
        }

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        
        res.json({ token, message: 'Logged in successfully' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
