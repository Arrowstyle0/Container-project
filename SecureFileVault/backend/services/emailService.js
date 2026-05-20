require('dotenv').config();
const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const fromEmail = process.env.EMAIL_USER || 'noreply@securefilevault.com';

const sendExpirationNotice = async (to, filename) => {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not set. Skipping email:', to, filename);
        return;
    }

    const msg = {
        to,
        from: fromEmail,
        subject: 'File Expiration Notice - SecureVault',
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

const sendDeadManNotice = async (beneficiaryEmail, beneficiaryName, ownerName) => {
    if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not set. Skipping Dead Man notification:', beneficiaryEmail);
        return;
    }

    const msg = {
        to: beneficiaryEmail,
        from: fromEmail,
        subject: 'SecureVault — Data Inheritance Notice',
        text: `Dear ${beneficiaryName || 'Beneficiary'},\n\nYou have been designated as a trusted beneficiary by ${ownerName} on SecureVault.\n\nThe vault owner has not checked in within their configured time window. Per their Dead Man's Switch settings, you are being notified of potential vault access.\n\nPlease contact the vault owner or their estate to coordinate access.\n\n— SecureVault`
    };

    try {
        await sgMail.send(msg);
        console.log(`Dead Man's Switch email sent to ${beneficiaryEmail}`);
    } catch (error) {
        console.error('Error sending Dead Man email:', error);
    }
};

const sendPasswordResetEmail = async (toEmail, resetToken) => {
  if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not set. Skipping reset email. Reset Token:', resetToken);
      return;
  }

  const resetLink = `http://localhost:4200/auth?resetToken=${resetToken}`;

  // Your responsive HTML Template strings
  const htmlTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; background-color: #0a0b10; color: #ffffff; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background-color: #11131c; padding: 30px; border-radius: 8px; border: 1px solid #1f2335; }
      .logo { color: #00f2ff; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; }
      .btn { display: inline-block; background-color: #00f2ff; color: #0a0b10 !important; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 4px; margin: 20px 0; }
      .warning { background-color: rgba(255, 107, 107, 0.1); border-left: 4px solid #ff6b6b; padding: 15px; border-radius: 4px; color: #ff9e9e; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🔒 SecureVault</div>
      <h2>Passphrase Reset Request</h2>
      <p>Click the button below to reset your passphrase:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="btn">Reset Passphrase</a>
      </div>
      <div class="warning">
        <strong>⚠️ Warning:</strong> Because SecureVault is Zero-Knowledge, resetting your passphrase changes your encryption keys. 
        <strong>All existing files in your vault will become permanently unreadable.</strong>
      </div>
    </div>
  </body>
  </html>
  `;

  // SendGrid message format
  const msg = {
    to: toEmail,
    from: fromEmail,
    subject: '⚠️ Action Required: Reset Your SecureVault Passphrase',
    html: htmlTemplate,
  };

  try {
    await sgMail.send(msg);
    console.log(`[SendGrid] Recovery email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[SendGrid] Error sending email:', error);
    if (error.response) {
      console.error('[SendGrid Details]:', error.response.body);
    }
    throw new Error('Email delivery failure');
  }
};

module.exports = { sendExpirationNotice, sendDeadManNotice, sendPasswordResetEmail };
