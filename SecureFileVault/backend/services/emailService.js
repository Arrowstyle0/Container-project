const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'dummy@gmail.com',
        pass: process.env.EMAIL_PASS || 'dummy'
    }
});

const sendExpirationNotice = async (to, filename) => {
    const mailOptions = {
        from: process.env.EMAIL_USER || 'dummy@gmail.com',
        to,
        subject: 'File Expiration Notice - Secure File Vault',
        text: `Your file "${filename}" has expired and has been soft-deleted. It will be permanently deleted in 30 days.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Expiration email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = { sendExpirationNotice };
