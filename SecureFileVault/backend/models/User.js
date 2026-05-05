const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    deviceName: { type: String },
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
    trustedDevices: [DeviceSchema]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
