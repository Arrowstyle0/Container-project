const B2 = require('backblaze-b2');
const dotenv = require('dotenv');

dotenv.config();

const b2 = new B2({
    applicationKeyId: process.env.B2_APP_KEY_ID || 'dummy',
    applicationKey: process.env.B2_APP_KEY || 'dummy'
});

let b2Authorized = false;

const authorize = async () => {
    if (b2Authorized) return;
    try {
        await b2.authorize();
        b2Authorized = true;
        console.log('B2 Authorized');
    } catch (error) {
        console.error('Error authorizing B2:', error);
    }
};

const getBucketId = async () => {
    const bucketName = process.env.B2_BUCKET_NAME || 'secure-file-vault';
    try {
        await authorize();
        const response = await b2.getBucket({ bucketName });
        return response.data.buckets[0].bucketId;
    } catch (error) {
        console.error('Error getting bucket ID:', error);
        throw error;
    }
};

const uploadFile = async (buffer, filename) => {
    try {
        await authorize();
        const bucketId = await getBucketId();
        const uploadUrlResponse = await b2.getUploadUrl({ bucketId });

        const uploadResponse = await b2.uploadFile({
            uploadUrl: uploadUrlResponse.data.uploadUrl,
            uploadAuthToken: uploadUrlResponse.data.authorizationToken,
            fileName: `${Date.now()}_${filename}`,
            data: buffer
        });

        return uploadResponse.data.fileId;
    } catch (error) {
        console.error('Error uploading to B2:', error);
        throw error;
    }
};

const downloadFile = async (fileId) => {
    try {
        await authorize();
        const response = await b2.downloadFileById({
            fileId,
            responseType: 'arraybuffer'
        });
        return response.data;
    } catch (error) {
        console.error('Error downloading from B2:', error);
        throw error;
    }
};

const deleteFile = async (fileName, fileId) => {
    try {
        await authorize();
        await b2.deleteFileVersion({ fileName, fileId });
    } catch (error) {
        console.error('Error deleting from B2:', error);
        throw error;
    }
};

module.exports = {
    uploadFile,
    downloadFile,
    deleteFile
};
