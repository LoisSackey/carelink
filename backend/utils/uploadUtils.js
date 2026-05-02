import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Optional AWS S3 support (AWS SDK v3)
let S3Client;
let PutObjectCommand;
let DeleteObjectCommand;
let getSignedUrl;
try {
  const aws = await import('@aws-sdk/client-s3');
  S3Client = aws.S3Client;
  PutObjectCommand = aws.PutObjectCommand;
  DeleteObjectCommand = aws.DeleteObjectCommand;
  const presigner = await import('@aws-sdk/s3-request-presigner');
  getSignedUrl = presigner.getSignedUrl;
} catch (e) {
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const useS3 = process.env.USE_S3 === 'true' && process.env.S3_BUCKET;
let s3Client = null;
if (useS3 && S3Client) {
  s3Client = new S3Client({ region: process.env.S3_REGION || 'us-east-1' });
}

export const ensureUploadDir = (dir) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', dir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

const makeLocalUrl = (dir, filename) => `/uploads/${dir}/${filename}`;

export const saveReceiptFile = async (fileBuffer, originalFileName) => {
  const dir = 'receipts';
  const timestamp = Date.now();
  const ext = path.extname(originalFileName);
  const filename = `receipt_${timestamp}${ext}`;

  if (useS3 && s3Client && PutObjectCommand) {
    const Key = `receipts/${filename}`;
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key,
      Body: fileBuffer,
    };
    await s3Client.send(new PutObjectCommand(params));
    // return presigned URL
    if (getSignedUrl) {
      const url = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key }), { expiresIn: 3600 });
      return { fileUrl: url, key: Key };
    }
    return { fileUrl: `s3://${process.env.S3_BUCKET}/${Key}`, key: Key };
  }

  const uploadDir = ensureUploadDir(dir);
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, fileBuffer);
  return { fileUrl: makeLocalUrl(dir, filename), key: filename };
};

export const deleteReceiptFile = async (filePathOrKey) => {
  if (!filePathOrKey) return;
  if (useS3 && s3Client && DeleteObjectCommand) {
    // accept either key or s3://... path
    const Key = filePathOrKey.startsWith('s3://') ? filePathOrKey.split('/').slice(3).join('/') : filePathOrKey;
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key }));
    } catch (err) {
      console.error('S3 delete error:', err);
    }
    return;
  }

  // local
  const uploadDir = ensureUploadDir('receipts');
  const filename = path.basename(filePathOrKey);
  const filepath = path.join(uploadDir, filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
};

export const saveProfilePicture = async (fileBuffer, originalFileName, userId) => {
  const dir = 'profiles';
  const timestamp = Date.now();
  const ext = path.extname(originalFileName);
  const filename = `profile_${userId}_${timestamp}${ext}`;

  if (useS3 && s3Client && PutObjectCommand) {
    const Key = `profiles/${filename}`;
    await s3Client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key, Body: fileBuffer }));
    if (getSignedUrl) {
      const url = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key }), { expiresIn: 3600 });
      return { fileUrl: url, key: Key };
    }
    return { fileUrl: `s3://${process.env.S3_BUCKET}/${Key}`, key: Key };
  }

  const uploadDir = ensureUploadDir(dir);
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, fileBuffer);
  return { fileUrl: makeLocalUrl(dir, filename), key: filename };
};

export const deleteProfilePicture = async (filePathOrKey) => {
  if (!filePathOrKey) return;
  // skip external urls
  if (filePathOrKey.startsWith('http://') || filePathOrKey.startsWith('https://')) return;
  if (useS3 && s3Client && DeleteObjectCommand) {
    const Key = filePathOrKey.startsWith('s3://') ? filePathOrKey.split('/').slice(3).join('/') : filePathOrKey.replace('/uploads/profiles/', 'profiles/');
    try { await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key })); } catch (err) { console.error('S3 delete error:', err); }
    return;
  }
  if (!filePathOrKey.startsWith('/uploads/')) return;
  const uploadDir = ensureUploadDir('profiles');
  const filename = path.basename(filePathOrKey);
  const filepath = path.join(uploadDir, filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
};

export const saveCredentialFile = async (fileBuffer, originalFileName, userId) => {
  const dir = 'credentials';
  const timestamp = Date.now();
  const ext = path.extname(originalFileName);
  const filename = `${userId}-${timestamp}-${originalFileName}`.replace(/\s+/g, '_');

  if (useS3 && s3Client && PutObjectCommand) {
    const Key = `credentials/${filename}`;
    await s3Client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key, Body: fileBuffer }));
    if (getSignedUrl) {
      const url = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key }), { expiresIn: 3600 });
      return { fileUrl: url, key: Key };
    }
    return { fileUrl: `s3://${process.env.S3_BUCKET}/${Key}`, key: Key };
  }

  const uploadDir = ensureUploadDir(dir);
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, fileBuffer);
  return { fileUrl: makeLocalUrl(dir, filename), key: filename };
};

export const deleteCredentialFile = async (filePathOrKey) => {
  if (!filePathOrKey) return;
  if (useS3 && s3Client && DeleteObjectCommand) {
    const Key = filePathOrKey.startsWith('s3://') ? filePathOrKey.split('/').slice(3).join('/') : filePathOrKey.replace('/uploads/credentials/', 'credentials/');
    try { await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key })); } catch (err) { console.error('S3 delete error:', err); }
    return;
  }
  const uploadDir = ensureUploadDir('credentials');
  const filename = path.basename(filePathOrKey);
  const filepath = path.join(uploadDir, filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
};

export const getFileUrl = async (filePathOrKey) => {
  if (!filePathOrKey) return null;
  // If it's already an http(s) URL or s3:// string, return as-is or generate presigned URL
  if (filePathOrKey.startsWith('http://') || filePathOrKey.startsWith('https://')) return filePathOrKey;
  if (filePathOrKey.startsWith('s3://') && useS3 && getSignedUrl && s3Client) {
    const parts = filePathOrKey.split('/');
    const Key = parts.slice(3).join('/');
    try {
      const url = await getSignedUrl(s3Client, new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key }), { expiresIn: 3600 });
      return url;
    } catch (err) {
      return filePathOrKey;
    }
  }
  // Local path like /uploads/credentials/filename
  return filePathOrKey;
};

export default {
  saveReceiptFile,
  deleteReceiptFile,
  saveProfilePicture,
  deleteProfilePicture,
  saveCredentialFile,
  deleteCredentialFile,
  getFileUrl,
  ensureUploadDir,
};
