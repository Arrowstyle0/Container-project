const B2 = require('./services/b2Service');
const crypto = require('crypto');

(async () => {
    try {
        // Create dummy stream
        const { Readable } = require('stream');
        const buffer = Buffer.from('Hello B2 Stream!');
        const stream = Readable.from(buffer);
        const size = buffer.length;
        const sha1 = crypto.createHash('sha1').update(buffer).digest('hex');

        // We need B2 auth to get an upload URL
        const B2_PKG = require('backblaze-b2');
        require('dotenv').config();
        const b2 = new B2_PKG({ applicationKeyId: process.env.B2_APP_KEY_ID, applicationKey: process.env.B2_APP_KEY });
        await b2.authorize();
        const bucketRes = await b2.getBucket({ bucketName: process.env.B2_BUCKET_NAME });
        const bucketId = bucketRes.data.buckets[0].bucketId;
        const uploadUrlRes = await b2.getUploadUrl({ bucketId });

        const uploadUrl = uploadUrlRes.data.uploadUrl;
        const auth = uploadUrlRes.data.authorizationToken;

        const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': auth,
                'X-Bz-File-Name': 'test_stream.txt',
                'Content-Type': 'b2/x-auto',
                'X-Bz-Content-Sha1': sha1,
                'Content-Length': size.toString()
            },
            body: stream,
            duplex: 'half'
        });

        const data = await res.json();
        console.log('Response:', data);
    } catch(e) {
        console.error(e);
    }
})();
