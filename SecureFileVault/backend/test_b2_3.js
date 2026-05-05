require('dotenv').config();
const B2 = require('backblaze-b2');
const b2 = new B2({
    applicationKeyId: process.env.B2_APP_KEY_ID,
    applicationKey: process.env.B2_APP_KEY
});

async function test() {
    try {
        await b2.authorize();
        const fileId = '4_zf6147bc419de44029fdb0817_f4070cf39ec6b705e_d20260505_m150004_c005_v0501039_t0016_u01777993204809';
        
        // try downloading by name instead of id!
        // wait, I need the filename. The previous filename was 'test-file.txt'. But it had Date.now() prepended in our service.
        // let's just upload a new file and download by name.
        
        const bucketId = (await b2.getBucket({ bucketName: process.env.B2_BUCKET_NAME })).data.buckets[0].bucketId;
        const uploadUrlResp = await b2.getUploadUrl({ bucketId });
        const fileName = `test_${Date.now()}.txt`;
        const uploadResp = await b2.uploadFile({
            uploadUrl: uploadUrlResp.data.uploadUrl,
            uploadAuthToken: uploadUrlResp.data.authorizationToken,
            fileName: fileName,
            data: Buffer.from('hello world')
        });

        const downResp = await b2.downloadFileByName({
            bucketName: process.env.B2_BUCKET_NAME,
            fileName: fileName,
            responseType: 'arraybuffer'
        });
        
        console.log("Downloaded:", Buffer.from(downResp.data).toString());
    } catch(e) {
        console.error("Error:", e.response ? e.response.data.toString() : e.message);
    }
}
test();
