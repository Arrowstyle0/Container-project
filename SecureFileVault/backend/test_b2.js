require('dotenv').config();
const B2 = require('backblaze-b2');
const b2 = new B2({
    applicationKeyId: process.env.B2_APP_KEY_ID,
    applicationKey: process.env.B2_APP_KEY
});

async function test() {
    try {
        await b2.authorize();
        console.log("Authorized.");
        const bucketId = (await b2.getBucket({ bucketName: process.env.B2_BUCKET_NAME })).data.buckets[0].bucketId;
        console.log("Bucket ID:", bucketId);
        
        // upload a dummy file
        const uploadUrlResp = await b2.getUploadUrl({ bucketId });
        const uploadResp = await b2.uploadFile({
            uploadUrl: uploadUrlResp.data.uploadUrl,
            uploadAuthToken: uploadUrlResp.data.authorizationToken,
            fileName: 'test-file.txt',
            data: Buffer.from('hello world')
        });
        const fileId = uploadResp.data.fileId;
        console.log("Uploaded file ID:", fileId);

        // try downloading
        const downResp = await b2.downloadFileById({
            fileId: fileId,
            responseType: 'arraybuffer'
        });
        console.log("Downloaded:", Buffer.from(downResp.data).toString());
        
    } catch(e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}
test();
