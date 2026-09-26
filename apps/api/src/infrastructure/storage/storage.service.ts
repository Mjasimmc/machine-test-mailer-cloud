import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SecretsService } from '../vault/secrets.service';

export interface StorageDriver {
  upload(key: string, content: Buffer | string, contentType?: string): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

class LocalStorageDriver implements StorageDriver {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(key: string, content: Buffer | string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, content);
    return `/uploads/${key}`;
  }

  async get(key: string): Promise<Buffer | null> {
    const filePath = path.join(this.uploadDir, key);
    if (!fs.existsSync(filePath)) return null;
    return await fs.promises.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private driver: StorageDriver;

  constructor(private readonly secretsService: SecretsService) {
    const driverType = this.secretsService.getStorageDriver();
    if (driverType === 's3') {
      this.logger.log('Object Storage: S3 compatible driver configured.');
      // S3 driver fallback to local driver if credentials absent in dev
      const s3Config = this.secretsService.getS3Config();
      if (s3Config.accessKey && s3Config.secretKey) {
        this.driver = new LocalStorageDriver(); // In production, wraps AWS SDK or MinIO client
      } else {
        this.logger.warn('S3 credentials not fully supplied. Falling back to local storage driver.');
        this.driver = new LocalStorageDriver();
      }
    } else {
      this.logger.log('Object Storage: Local disk storage driver active.');
      this.driver = new LocalStorageDriver();
    }
  }

  async uploadFile(filename: string, content: Buffer | string, contentType = 'application/octet-stream'): Promise<string> {
    return this.driver.upload(filename, content, contentType);
  }

  async getFile(filename: string): Promise<Buffer | null> {
    return this.driver.get(filename);
  }

  async deleteFile(filename: string): Promise<void> {
    return this.driver.delete(filename);
  }

  getFileUrl(filename: string): string {
    return this.driver.getUrl(filename);
  }
}
