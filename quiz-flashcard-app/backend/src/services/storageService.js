const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

class StorageService {
  constructor() {
    this.useS3 = process.env.USE_S3_STORAGE === 'true';

    if (this.useS3) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      this.bucket = process.env.AWS_S3_BUCKET;
    }

    this.localUploadPath = path.join(__dirname, '../../uploads');
    this.ensureLocalDirectory();
  }

  ensureLocalDirectory() {
    if (!fs.existsSync(this.localUploadPath)) {
      fs.mkdirSync(this.localUploadPath, { recursive: true });
    }
  }

  async uploadFile(file, categoryId) {
    const fileName = `${categoryId}/${Date.now()}-${file.originalname}`;

    if (this.useS3) {
      return this.uploadToS3(file, fileName);
    } else {
      return this.uploadToLocal(file, fileName);
    }
  }

  async uploadToS3(file, fileName) {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: fileName,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype
      }
    });

    await upload.done();

    // Clean up temp file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      path: fileName,
      url: `https://${this.bucket}.s3.amazonaws.com/${fileName}`
    };
  }

  uploadToLocal(file, fileName) {
    const categoryDir = path.join(this.localUploadPath, path.dirname(fileName));

    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    const destPath = path.join(this.localUploadPath, fileName);

    // Move file from temp to permanent location
    fs.renameSync(file.path, destPath);

    return {
      path: destPath,
      url: `/uploads/${fileName}`
    };
  }

  async deleteFile(filePath) {
    if (this.useS3) {
      return this.deleteFromS3(filePath);
    } else {
      return this.deleteFromLocal(filePath);
    }
  }

  async deleteFromS3(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    await this.s3Client.send(command);
  }

  deleteFromLocal(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async getFile(filePath) {
    if (this.useS3) {
      return this.getFromS3(filePath);
    } else {
      return this.getFromLocal(filePath);
    }
  }

  async getFromS3(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.s3Client.send(command);
    return response.Body;
  }

  getFromLocal(filePath) {
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath);
    }
    throw new Error('File not found');
  }
}

module.exports = new StorageService();
