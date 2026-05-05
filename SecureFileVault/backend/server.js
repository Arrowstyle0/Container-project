const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const File = require('./models/File');
const emailService = require('./services/emailService');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

        // Optional: Hard delete files older than 30 days after soft delete
        const hardDeleteDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        await File.deleteMany({
            status: 'soft-deleted',
            deletedAt: { $lt: hardDeleteDate }
        });

    } catch (error) {
        console.error('Error in file expiration cron:', error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
