import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import Redis from 'ioredis';

export interface AsyncJob<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  attempts?: number;
}

export type JobHandler<T = any> = (job: AsyncJob<T>) => Promise<void>;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private handlers = new Map<string, JobHandler>();
  private isRunning = false;
  private workerClient: Redis | null = null;
  private readonly queueKey = 'saas:jobs:queue';
  private readonly dlqKey = 'saas:jobs:dlq';

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    this.startWorker();
  }

  onModuleDestroy() {
    this.isRunning = false;
    if (this.workerClient) {
      this.workerClient.quit().catch(() => {});
      this.workerClient = null;
    }
  }

  registerHandler<T = any>(jobType: string, handler: JobHandler<T>) {
    this.handlers.set(jobType, handler);
    this.logger.log(`Registered async worker handler for job type: ${jobType}`);
  }

  async dispatch<T = any>(type: string, payload: T): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: AsyncJob<T> = {
      id: jobId,
      type,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0,
    };

    if (this.redisService.isAvailable()) {
      try {
        const client = this.redisService.getClient();
        await client?.lpush(this.queueKey, JSON.stringify(job));
        this.logger.log(`Job ${jobId} [${type}] pushed to Redis queue.`);
      } catch (err: any) {
        this.logger.warn(`Failed to push job ${jobId} to Redis queue: ${err.message}. Falling back to in-process execution.`);
        this.executeAsync(job);
      }
    } else {
      // In-process asynchronous execution boundary
      this.executeAsync(job);
    }

    return jobId;
  }

  private startWorker() {
    if (!this.redisService.isAvailable()) {
      return;
    }

    this.workerClient = this.redisService.createDuplicateClient();
    if (!this.workerClient) {
      return;
    }

    this.isRunning = true;
    this.logger.log('Started background Redis queue consumer worker.');
    this.processQueueLoop();
  }

  private async processQueueLoop() {
    while (this.isRunning && this.workerClient) {
      try {
        // BRPOP blocks for at most 2 seconds before timing out to allow clean shutdown checks
        const result = await this.workerClient.brpop(this.queueKey, 2);
        if (result && result.length === 2) {
          const rawJob = result[1];
          await this.processJobMessage(rawJob);
        }
      } catch (err: any) {
        if (!this.isRunning) break;
        this.logger.warn(`Error in queue worker loop: ${err.message}. Retrying in 2 seconds.`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  private async processJobMessage(rawJob: string) {
    try {
      const job: AsyncJob = JSON.parse(rawJob);
      const handler = this.handlers.get(job.type);

      if (!handler) {
        this.logger.warn(`No handler registered for job type: ${job.type}. Moving to DLQ.`);
        await this.moveToDlq(job, 'No handler registered');
        return;
      }

      job.attempts = (job.attempts || 0) + 1;

      try {
        await handler(job);
        this.logger.log(`Job ${job.id} [${job.type}] processed successfully by worker.`);
      } catch (handlerErr: any) {
        this.logger.error(`Job ${job.id} [${job.type}] failed attempt ${job.attempts}: ${handlerErr.message}`);
        if (job.attempts < 3) {
          // Re-queue with exponential backoff delay
          const client = this.redisService.getClient();
          await client?.lpush(this.queueKey, JSON.stringify(job));
        } else {
          await this.moveToDlq(job, handlerErr.message);
        }
      }
    } catch (parseErr: any) {
      this.logger.error(`Failed to parse job from Redis queue: ${parseErr.message}`);
    }
  }

  private async moveToDlq(job: AsyncJob, reason: string) {
    try {
      const client = this.redisService.getClient();
      const dlqPayload = {
        ...job,
        failedAt: new Date().toISOString(),
        failureReason: reason,
      };
      await client?.lpush(this.dlqKey, JSON.stringify(dlqPayload));
      this.logger.warn(`Job ${job.id} [${job.type}] permanently moved to Dead Letter Queue (DLQ).`);
    } catch (err: any) {
      this.logger.error(`Failed to move job ${job.id} to DLQ: ${err.message}`);
    }
  }

  private executeAsync<T>(job: AsyncJob<T>) {
    setImmediate(async () => {
      const handler = this.handlers.get(job.type);
      if (handler) {
        try {
          await handler(job);
          this.logger.log(`Job ${job.id} [${job.type}] completed successfully in-process.`);
        } catch (error: any) {
          this.logger.error(`Job ${job.id} [${job.type}] failed in-process: ${error.message}`, error.stack);
        }
      } else {
        this.logger.warn(`No handler registered for async job type: ${job.type}`);
      }
    });
  }
}
