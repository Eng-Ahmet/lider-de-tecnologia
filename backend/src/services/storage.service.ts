import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config.js';

export class StorageService {
  private s3Client: S3Client | null = null;
  private isR2Configured = false;

  constructor() {
    this.initS3();
    this.ensureLocalStorageDir();
  }

  private initS3() {
    try {
      if (config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.accountId) {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.r2.accessKeyId,
            secretAccessKey: config.r2.secretAccessKey,
          },
        });
        this.isR2Configured = true;
        console.log('✅ Cloudflare R2 Storage client initialized for bucket:', config.r2.bucketName);
      } else {
        console.warn('⚠️ Cloudflare R2 credentials incomplete, falling back to local file storage.');
      }
    } catch (err) {
      console.warn('⚠️ Failed to initialize R2 client, using local file storage fallback:', err);
      this.isR2Configured = false;
    }
  }

  private ensureLocalStorageDir() {
    if (!fs.existsSync(config.uploadsDir)) {
      fs.mkdirSync(config.uploadsDir, { recursive: true });
    }
  }

  /**
   * Upload an image buffer or file to Cloudflare R2 with fallback to local storage
   */
  async uploadImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string = 'image/jpeg'
  ): Promise<string> {
    const ext = path.extname(originalName) || '.jpg';
    const key = `reports/${Date.now()}-${uuidv4()}${ext}`;

    // Attempt Cloudflare R2 upload if configured
    if (this.isR2Configured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: config.r2.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        });

        await this.s3Client.send(command);

        if (config.r2.publicUrl) {
          const publicUrl = `${config.r2.publicUrl.replace(/\/$/, '')}/${key}`;
          console.log(`☁️ Uploaded image to Cloudflare R2: ${publicUrl}`);
          return publicUrl;
        }

        const r2Url = `https://${config.r2.bucketName}.${config.r2.accountId}.r2.cloudflarestorage.com/${key}`;
        console.log(`☁️ Uploaded image to Cloudflare R2: ${r2Url}`);
        return r2Url;
      } catch (r2Error) {
        console.warn('⚠️ Cloudflare R2 upload failed, falling back to local disk storage:', r2Error);
      }
    }

    // Fallback: Save to local uploads directory
    this.ensureLocalStorageDir();
    const localFileName = `${Date.now()}-${uuidv4()}${ext}`;
    const localFilePath = path.join(config.uploadsDir, localFileName);
    fs.writeFileSync(localFilePath, buffer);

    const localUrl = `http://localhost:${config.port}/uploads/${localFileName}`;
    console.log(`💾 Saved image to local storage: ${localUrl}`);
    return localUrl;
  }
}

export const storageService = new StorageService();
