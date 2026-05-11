const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendExpirationNotice = async (to, filename) => {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not set. Skipping email:', to, filename);
        return;
    }

    const msg = {
        to,
        from: process.env.EMAIL_USER || 'noreply@securefilevault.com', // Must be verified in SendGrid
        subject: 'File Expiration Notice - Secure File Vault',
        text: `Your file "${filename}" has expired and has been soft-deleted. It will be permanently deleted in 30 days.`
    };

    try {
        await sgMail.send(msg);
        console.log(`Expiration email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email via SendGrid:', error);
        if (error.response) {
            console.error(error.response.body);
        }
    }
};

module.exports = { sendExpirationNotice };
