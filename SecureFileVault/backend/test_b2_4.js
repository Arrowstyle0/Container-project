require('dotenv').config();
const B2 = require('backblaze-b2');
const b2 = new B2({
    applicationKeyId: process.env.B2_APP_KEY_ID,
    applicationKey: process.env.B2_APP_KEY
});

async function test() {
    try {
        const auth = await b2.authorize();
        console.log("Capabilities:", auth.data.allowed.capabilities);
        console.log("Bucket name:", auth.data.allowed.bucketName);
    } catch(e) {
        console.error(e.message);
    }
}
test();
