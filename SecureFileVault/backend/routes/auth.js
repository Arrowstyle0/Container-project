const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const emailService = require('../services/emailService');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const router = express.Router();

const generateTokens = (user, res, isDuress = false) => {
    const accessToken = jwt.sign(
        { id: user._id, email: user.email, isDuress },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    user.refreshToken = refreshToken;
    
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return accessToken;
};

// Auth Middleware
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

// ========================
// Signup
// ========================
router.post('/signup', async (req, res) => {
    try {
        const { name, dob, email, clientHashedAuthToken, mnemonicHash } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedAuthToken = await bcrypt.hash(clientHashedAuthToken, 10);
        const queryableAuthHash = crypto.createHash('sha256').update(clientHashedAuthToken).digest('hex');
        
        const recoveryKey = crypto.randomBytes(32).toString('hex');
        const hashedRecoveryKey = await bcrypt.hash(recoveryKey, 10);

        // If mnemonic hash provided, store it
        let recoveryMnemonicHash = null;
        if (mnemonicHash) {
            recoveryMnemonicHash = await bcrypt.hash(mnemonicHash, 10);
        }

        const newUser = new User({
            name,
            dob,
            email,
            hashedAuthToken,
            queryableAuthHash,
            hashedRecoveryKey,
            recoveryMnemonicHash
        });

        await newUser.save();

        res.status(201).json({ message: 'User created successfully', recoveryKey });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Login (with Duress detection)
// ========================
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, clientHashedAuthToken, deviceId, deviceName, totpCode } = req.body;

        // Find user by email
        let user = await User.findOne({ email });
        let isDuress = false;
        
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        // Check if this device is a registered parent device
        let isParentDevice = false;
        if (deviceId) {
            const device = user.trustedDevices.find(d => d.deviceId === deviceId);
            if (device && device.isParent) {
                isParentDevice = true;
            }
        }

        // If account is permanently locked, only parent devices can log in (not duress)
        if (user.permanentLockout && !isParentDevice && !isDuress) {
            return res.status(403).json({ 
                error: 'Account permanently locked due to too many failed attempts from unrecognized devices. Only parent devices can access this vault.',
                permanentLockout: true 
            });
        }

        // Verify password
        let isMatch = await bcrypt.compare(clientHashedAuthToken, user.hashedAuthToken);
        
        if (!isMatch && user.hashedDuressAuthToken) {
            const isDuressMatch = await bcrypt.compare(clientHashedAuthToken, user.hashedDuressAuthToken);
            if (isDuressMatch) {
                isMatch = true;
                isDuress = true;
            }
        }

        if (!isMatch) {
            if (!isParentDevice && !isDuress) {
                user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
                
                if (user.failedLoginAttempts >= 5) {
                    user.permanentLockout = true;
                }
                await user.save();

                const remaining = Math.max(0, 5 - user.failedLoginAttempts);
                if (user.permanentLockout) {
                    return res.status(403).json({ 
                        error: 'Account permanently locked. Only parent devices can access this vault.',
                        permanentLockout: true
                    });
                }
                return res.status(400).json({ 
                    error: `Invalid credentials. ${remaining} attempt(s) remaining before permanent lockout.` 
                });
            }
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check 2FA (skip for duress — duress should bypass 2FA for plausibility)
        if (user.isTwoFactorEnabled && !isDuress) {
            if (!totpCode) {
                return res.json({ require2FA: true, message: '2FA code required' });
            }
            const isValid = authenticator.verify({ token: totpCode, secret: user.twoFactorSecret });
            if (!isValid) return res.status(400).json({ error: 'Invalid 2FA code' });
        }

        // Register or update device
        if (deviceId) {
            const deviceIndex = user.trustedDevices.findIndex(d => d.deviceId === deviceId);
            if (deviceIndex >= 0) {
                user.trustedDevices[deviceIndex].lastUsed = new Date();
            } else {
                if (!user.permanentLockout) {
                    user.trustedDevices.push({ deviceId, deviceName });
                }
            }
        }

        // Successful login: reset failed attempts
        if (!isDuress) {
            user.failedLoginAttempts = 0;
            if (isParentDevice) {
                user.permanentLockout = false;
            }
            user.lockoutUntil = null;

            // Dead Man's Switch check-in
            if (user.deadManSwitch && user.deadManSwitch.enabled) {
                user.deadManSwitch.lastCheckIn = new Date();
                user.deadManSwitch.triggered = false;
            }
        }

        const token = generateTokens(user, res, isDuress);
        await user.save();
        
        res.json({ token, message: 'Logged in successfully', isDuress });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Recovery via Mnemonic
// ========================
router.post('/recover', async (req, res) => {
    try {
        const { email, mnemonicHash, newClientHashedAuthToken } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !user.recoveryMnemonicHash) {
            return res.status(400).json({ error: 'Recovery not available for this account' });
        }

        const isValid = await bcrypt.compare(mnemonicHash, user.recoveryMnemonicHash);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid recovery phrase' });
        }

        // Reset password
        user.hashedAuthToken = await bcrypt.hash(newClientHashedAuthToken, 10);
        user.queryableAuthHash = crypto.createHash('sha256').update(newClientHashedAuthToken).digest('hex');
        user.failedLoginAttempts = 0;
        user.permanentLockout = false;
        user.lockoutUntil = null;
        await user.save();

        res.json({ message: 'Account recovered. You can now login with your new passphrase.' });
    } catch (error) {
        console.error('Recovery error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Forgot Password (Email)
// ========================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return res.json({ message: 'If that email exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();
        await emailService.sendPasswordResetEmail(user.email, resetToken);

        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Reset Password (Email)
// ========================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newClientHashedAuthToken } = req.body;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        user.hashedAuthToken = await bcrypt.hash(newClientHashedAuthToken, 10);
        user.queryableAuthHash = crypto.createHash('sha256').update(newClientHashedAuthToken).digest('hex');
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.failedLoginAttempts = 0;
        user.permanentLockout = false;
        user.lockoutUntil = null;

        await user.save();
        res.json({ message: 'Passphrase has been successfully reset. You may now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Change Passphrase
// ========================
router.post('/change-passphrase', authenticate, async (req, res) => {
    try {
        const { currentClientHashedAuthToken, newClientHashedAuthToken } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentClientHashedAuthToken, user.hashedAuthToken);
        if (!isMatch) return res.status(400).json({ error: 'Current passphrase is incorrect' });

        user.hashedAuthToken = await bcrypt.hash(newClientHashedAuthToken, 10);
        user.queryableAuthHash = crypto.createHash('sha256').update(newClientHashedAuthToken).digest('hex');
        await user.save();

        res.json({ message: 'Passphrase changed successfully.' });
    } catch (error) {
        console.error('Change passphrase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================
// Refresh Token
// ========================
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

// ========================
// Logout
// ========================
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

// ========================
// 2FA
// ========================
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

// ========================
// Devices
// ========================
router.get('/devices', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.trustedDevices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

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

// ========================
// Duress Passphrase
// ========================
router.post('/duress/setup', authenticate, async (req, res) => {
    try {
        const { clientHashedDuressToken } = req.body;
        const user = await User.findById(req.user.id);

        user.duressAuthHash = crypto.createHash('sha256').update(clientHashedDuressToken).digest('hex');
        user.hashedDuressAuthToken = await bcrypt.hash(clientHashedDuressToken, 10);
        await user.save();

        res.json({ message: 'Duress passphrase configured successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to setup duress passphrase' });
    }
});

router.get('/duress/status', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ hasDuress: !!user.duressAuthHash });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check duress status' });
    }
});

// ========================
// Dead Man's Switch
// ========================
router.post('/dead-man/configure', authenticate, async (req, res) => {
    try {
        const { enabled, intervalDays, beneficiaries } = req.body;
        const user = await User.findById(req.user.id);

        user.deadManSwitch = {
            enabled: enabled !== undefined ? enabled : user.deadManSwitch?.enabled,
            intervalDays: intervalDays || user.deadManSwitch?.intervalDays || 30,
            lastCheckIn: new Date(),
            beneficiaries: beneficiaries || user.deadManSwitch?.beneficiaries || [],
            triggered: false
        };
        await user.save();

        res.json({ message: 'Dead Man\'s Switch configured', deadManSwitch: user.deadManSwitch });
    } catch (error) {
        res.status(500).json({ error: 'Failed to configure Dead Man\'s Switch' });
    }
});

router.post('/dead-man/check-in', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.deadManSwitch) {
            user.deadManSwitch.lastCheckIn = new Date();
            user.deadManSwitch.triggered = false;
            await user.save();
        }
        res.json({ message: 'Check-in recorded', lastCheckIn: new Date() });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check in' });
    }
});

router.get('/dead-man/status', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.deadManSwitch || { enabled: false });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// ========================
// Profile
// ========================
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            hasDuress: !!user.duressAuthHash,
            deadManSwitch: user.deadManSwitch || { enabled: false }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

module.exports = router;
