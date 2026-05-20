const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const File = require('./models/File');
const User = require('./models/User');
const emailService = require('./services/emailService');

dotenv.config();

const app = express();
const cookieParser = require('cookie-parser');

app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true,
    exposedHeaders: ['X-File-Iv', 'X-File-Salt', 'X-File-Name']
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/securefilevault')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Cron job for file expiration (Runs daily at midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily file expiration check');
    try {
        const now = new Date();
        const expiredFiles = await File.find({
            expiresAt: { $lt: now },
            status: 'active'
        }).populate('user', 'email');

        for (const file of expiredFiles) {
            file.status = 'soft-deleted';
            file.deletedAt = now;
            await file.save();

            // Send notification email
            if (file.user && file.user.email) {
                await emailService.sendExpirationNotice(file.user.email, file.filename);
            }
        }

        // Hard delete files older than 30 days after soft delete
        const hardDeleteDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        await File.deleteMany({
            status: 'soft-deleted',
            deletedAt: { $lt: hardDeleteDate }
        });

        // Clean up expired share links
        await File.updateMany(
            { 'shareLinks.expiresAt': { $lt: now } },
            { $pull: { shareLinks: { expiresAt: { $lt: now } } } }
        );

    } catch (error) {
        console.error('Error in file expiration cron:', error);
    }
});

// Dead Man's Switch cron (Runs daily at 6 AM)
cron.schedule('0 6 * * *', async () => {
    console.log('Running Dead Man\'s Switch check');
    try {
        const now = new Date();
        const users = await User.find({
            'deadManSwitch.enabled': true,
            'deadManSwitch.triggered': false
        });

        for (const user of users) {
            const dms = user.deadManSwitch;
            const thresholdDate = new Date(dms.lastCheckIn);
            thresholdDate.setDate(thresholdDate.getDate() + dms.intervalDays);

            if (now > thresholdDate) {
                console.log(`Dead Man's Switch triggered for user ${user.email}`);
                
                // Notify beneficiaries
                for (const beneficiary of dms.beneficiaries) {
                    try {
                        await emailService.sendDeadManNotice(
                            beneficiary.email,
                            beneficiary.name,
                            user.name || user.email
                        );
                    } catch (e) {
                        console.error(`Failed to notify beneficiary ${beneficiary.email}`, e);
                    }
                }

                user.deadManSwitch.triggered = true;
                await user.save();
            }
        }
    } catch (error) {
        console.error('Error in Dead Man\'s Switch cron:', error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
