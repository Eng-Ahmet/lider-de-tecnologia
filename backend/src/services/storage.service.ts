import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/config.js';

export class StorageService {
  private s3Client: S3Client | null = null;
  private isR2Configured = false;

  constructor() {
    this.ensureLocalStorageDir();
    this.initS3();
  }

  private ensureLocalStorageDir(): void {
    if (!fs.existsSync(config.uploadsDir)) {
      fs.mkdirSync(config.uploadsDir, { recursive: true });
    }
  }

  private initS3(): void {
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
      }
    } catch {
      this.isR2Configured = false;
    }
  }

  /**
   * Upload an image buffer: ALWAYS save directly to backend disk (public/uploads/)
   * and optionally back up to Cloudflare R2 asynchronously.
   */
  async uploadImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string = 'image/jpeg'
  ): Promise<string> {
    this.ensureLocalStorageDir();

    // 1. Always save physically to backend server storage
    const ext = path.extname(originalName) || '.jpg';
    const localFileName = `incidencia-${Date.now()}-${uuidv4().substring(0, 8)}${ext}`;
    const localFilePath = path.join(config.uploadsDir, localFileName);
    fs.writeFileSync(localFilePath, buffer);

    const backendUrl = `http://localhost:${config.port}/uploads/${localFileName}`;
    console.log(`💾 Imagen guardada con éxito en el servidor backend: ${localFilePath} (${buffer.length} bytes)`);

    // 2. Asynchronous R2 backup (without blocking local URL response)
    if (this.isR2Configured && this.s3Client) {
      const key = `reports/${localFileName}`;
      const command = new PutObjectCommand({
        Bucket: config.r2.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      this.s3Client.send(command).then(() => {
        console.log(`☁️ Copia de seguridad en Cloudflare R2 completada: ${key}`);
      }).catch(err => {
        console.warn('⚠️ Fallo menor en copia de seguridad R2 (archivo local preservado):', err.message);
      });
    }

    return backendUrl;
  }
}

export const storageService = new StorageService();
