require('dotenv').config();
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: process.env.EMAIL_USER,
  from: process.env.EMAIL_USER || 'noreply@securefilevault.com',
  subject: 'Test',
  text: 'Test',
};

(async () => {
  try {
    await sgMail.send(msg);
    console.log('Success');
  } catch (error) {
    if (error.response) {
      console.error(error.response.body);
    } else {
      console.error(error);
    }
  }
})();
