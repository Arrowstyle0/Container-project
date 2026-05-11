const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const router = express.Router();

const generateTokens = (user, res, deviceId) => {
    const accessToken = jwt.sign({ id: user._id, email: user.email, deviceId: deviceId || null }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    user.refreshToken = refreshToken;
    
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return accessToken;
};

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
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { clientHashedAuthToken, deviceId, deviceName, totpCode } = req.body;

        const queryableAuthHash = crypto.createHash('sha256').update(clientHashedAuthToken).digest('hex');
        const user = await User.findOne({ queryableAuthHash });
        
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        let isParentDevice = false;
        if (deviceId) {
            const device = user.trustedDevices.find(d => d.deviceId === deviceId);
            if (device && device.isParent) {
                isParentDevice = true;
            }
        }

        if (user.lockoutUntil && user.lockoutUntil > new Date() && !isParentDevice) {
            return res.status(403).json({ error: 'Account temporarily locked due to too many failed attempts from unrecognized devices. Please try again later.' });
        }

        const isMatch = await bcrypt.compare(clientHashedAuthToken, user.hashedAuthToken);
        if (!isMatch) {
            if (!isParentDevice) {
                user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
                if (user.failedLoginAttempts >= 5) {
                    const lockoutTime = new Date();
                    lockoutTime.setMinutes(lockoutTime.getMinutes() + 15);
                    user.lockoutUntil = lockoutTime;
                }
                await user.save();
            }
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check 2FA
        if (user.isTwoFactorEnabled) {
            if (!totpCode) {
                return res.json({ require2FA: true, message: '2FA code required' });
            }
            const isValid = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret });
            if (!isValid) return res.status(400).json({ error: 'Invalid 2FA code' });
        }

        if (deviceId) {
            const deviceIndex = user.trustedDevices.findIndex(d => d.deviceId === deviceId);
            if (deviceIndex >= 0) {
                user.trustedDevices[deviceIndex].lastUsed = new Date();
            } else {
                user.trustedDevices.push({ deviceId, deviceName });
            }
        }

        user.failedLoginAttempts = 0;
        user.lockoutUntil = null;
        const token = generateTokens(user, res, deviceId);
        await user.save();
        
        res.json({ token, message: 'Logged in successfully' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

        const user = await User.findOne({ refreshToken });
        if (!user) return res.status(403).json({ error: 'Invalid refresh token' });

        const token = generateTokens(user, res);
        await user.save();

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            const user = await User.findOne({ refreshToken });
            if (user) {
                user.refreshToken = null;
                await user.save();
            }
        }
        res.clearCookie('refreshToken');
        res.json({ message: 'Logged out' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Auth Middleware for 2FA routes
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Generate 2FA
router.post('/2fa/generate', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const secret = authenticator.generateSecret();
        user.twoFactorSecret = secret;
        await user.save();

        const otpauth = authenticator.keyuri(user.email, 'SecureFileVault', secret);
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        res.json({ secret, qrCodeUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate 2FA' });
    }
});

// Enable 2FA
router.post('/2fa/enable', authenticate, async (req, res) => {
    try {
        const { totpCode } = req.body;
        const user = await User.findById(req.user.id);

        const isValid = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret });
        if (!isValid) return res.status(400).json({ error: 'Invalid code' });

        user.isTwoFactorEnabled = true;
        await user.save();

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

// Get Devices
router.get('/devices', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.trustedDevices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// Set Parent Device
router.post('/devices/:deviceId/set-parent', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const parentCount = user.trustedDevices.filter(d => d.isParent).length;
        
        const deviceIndex = user.trustedDevices.findIndex(d => d.deviceId === req.params.deviceId);
        if (deviceIndex === -1) return res.status(404).json({ error: 'Device not found' });

        if (!user.trustedDevices[deviceIndex].isParent) {
            if (parentCount >= 2) {
                return res.status(400).json({ error: 'Maximum of 2 parent devices allowed' });
            }
            user.trustedDevices[deviceIndex].isParent = true;
            await user.save();
        }
        res.json({ message: 'Device set as parent successfully', devices: user.trustedDevices });
    } catch (error) {
        res.status(500).json({ error: 'Failed to set parent device' });
    }
});

// Remove Parent Device
router.post('/devices/:deviceId/remove-parent', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const deviceIndex = user.trustedDevices.findIndex(d => d.deviceId === req.params.deviceId);
        if (deviceIndex === -1) return res.status(404).json({ error: 'Device not found' });

        user.trustedDevices[deviceIndex].isParent = false;
        await user.save();
        res.json({ message: 'Device removed from parent', devices: user.trustedDevices });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove parent device' });
    }
});

// Get User Profile (recovery email)
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            isTwoFactorEnabled: user.isTwoFactorEnabled
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

module.exports = router;
