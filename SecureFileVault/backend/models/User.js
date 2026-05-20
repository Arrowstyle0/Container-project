const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    deviceName: { type: String },
    isParent: { type: Boolean, default: false },
    lastUsed: { type: Date, default: Date.now }
});

const BeneficiarySchema = new mongoose.Schema({
    email: { type: String, required: true },
    name: { type: String },
    encryptedKey: { type: String }
});

const UserSchema = new mongoose.Schema({
    name: { type: String },
    dob: { type: String },
    email: { type: String, required: true, unique: true },
    hashedAuthToken: { type: String, required: true },
    queryableAuthHash: { type: String, required: true },
    hashedRecoveryKey: { type: String, required: true },
    encryptedMEK: { type: String }, // Base64 encoded JSON { ciphertext, iv, salt }
    emailVerified: { type: Boolean, default: false },
    trustedDevices: [DeviceSchema],
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    refreshToken: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    permanentLockout: { type: Boolean, default: false },
    // Phase 2: BIP-39 Recovery
    recoveryMnemonicHash: { type: String },
    // Email Password Reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    // Phase 2: Duress Passphrase
    duressAuthHash: { type: String },
    hashedDuressAuthToken: { type: String },
    // Phase 2: Dead Man's Switch
    deadManSwitch: {
        enabled: { type: Boolean, default: false },
        intervalDays: { type: Number, default: 30 },
        lastCheckIn: { type: Date, default: Date.now },
        beneficiaries: [BeneficiarySchema],
        triggered: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
