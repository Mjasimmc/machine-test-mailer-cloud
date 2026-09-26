import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private vaultSecrets: Record<string, string> = {};
  private isVaultActive = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.loadSecrets();
  }

  private async loadSecrets() {
    const vaultEnabled = this.configService.get<string>('VAULT_ENABLED') === 'true';
    const vaultAddr = this.configService.get<string>('VAULT_ADDR');
    const vaultToken = this.configService.get<string>('VAULT_TOKEN');
    const vaultPath = this.configService.get<string>('VAULT_PATH', 'secret/data/saas-api');

    if (!vaultEnabled || !vaultAddr || !vaultToken) {
      this.logger.log('Vault integration disabled or credentials not provided. Using environment configuration boundary.');
      return;
    }

    try {
      this.logger.log(`Connecting to HashiCorp Vault at ${vaultAddr}...`);
      const url = `${vaultAddr.replace(/\/$/, '')}/v1/${vaultPath.replace(/^\//, '')}`;
      const response = await fetch(url, {
        headers: {
          'X-Vault-Token': vaultToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Vault returned HTTP ${response.status}: ${response.statusText}`);
      }

      const body = (await response.json()) as any;
      // Handle KV v2 ({ data: { data: { ... } } }) and KV v1 ({ data: { ... } })
      this.vaultSecrets = body?.data?.data || body?.data || {};
      this.isVaultActive = true;
      this.logger.log(`Successfully loaded ${Object.keys(this.vaultSecrets).length} secrets from Vault.`);
    } catch (error: any) {
      const isProd = this.configService.get<string>('NODE_ENV') === 'production';
      if (isProd && vaultEnabled) {
        this.logger.error(`Critical: Failed to retrieve production secrets from Vault: ${error.message}`);
        throw error;
      }
      this.logger.warn(`Vault secret retrieval failed (${error.message}). Falling back to local configuration.`);
    }
  }

  get(key: string, defaultValue?: string): string {
    if (this.isVaultActive && this.vaultSecrets[key] !== undefined) {
      return this.vaultSecrets[key];
    }
    const envVal = this.configService.get<string>(key);
    if (envVal !== undefined && envVal !== null && envVal !== '') {
      return envVal;
    }
    return defaultValue ?? '';
  }

  getDatabaseUri(): string {
    return this.get('MONGODB_URI', 'mongodb://127.0.0.1:27017/saas_db');
  }

  getJwtSecret(): string {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const secret = this.get('JWT_SECRET');

    if (isProd) {
      if (!secret || secret === 'super-secret-jwt-key-for-saas-platform-change-in-prod') {
        throw new Error(
          'Fatal: Insecure default JWT_SECRET detected in production. Production startup requires a securely configured secret from Vault or secure environment.',
        );
      }
      return secret;
    }

    return secret || 'super-secret-jwt-key-for-saas-platform-change-in-prod';
  }

  getJwtExpiresIn(): string {
    return this.get('JWT_EXPIRES_IN', '7d');
  }

  getRedisUrl(): string | undefined {
    const url = this.get('REDIS_URL');
    return url ? url : undefined;
  }

  getStorageDriver(): 'local' | 's3' {
    const driver = this.get('STORAGE_DRIVER', 'local').toLowerCase();
    return driver === 's3' ? 's3' : 'local';
  }

  getS3Config() {
    return {
      endpoint: this.get('S3_ENDPOINT'),
      bucket: this.get('S3_BUCKET', 'saas-uploads'),
      region: this.get('S3_REGION', 'us-east-1'),
      accessKey: this.get('S3_ACCESS_KEY'),
      secretKey: this.get('S3_SECRET_KEY'),
    };
  }

  isVaultConnected(): boolean {
    return this.isVaultActive;
  }
}
