const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    deviceName: { type: String },
    isParent: { type: Boolean, default: false },
    lastUsed: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
    name: { type: String },
    dob: { type: String },
    email: { type: String, required: true, unique: true },
    hashedAuthToken: { type: String, required: true },
    queryableAuthHash: { type: String, required: true },
    hashedRecoveryKey: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    trustedDevices: [DeviceSchema],
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    refreshToken: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
