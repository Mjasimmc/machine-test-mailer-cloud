import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { QueueService, AsyncJob } from '../queue/queue.service';
import { validateSafeUrl } from '../../common/utils/ssrf-protection';

export interface WebhookNotificationPayload {
  url: string;
  secret?: string;
  formId: string;
  submissionId?: string;
  data: Record<string, any>;
  eventType?: string;
  timestamp?: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  deliveryId: string;
  attempts: number;
  error?: string;
  durationMs: number;
}

@Injectable()
export class WebhookService implements OnModuleInit {
  private readonly logger = new Logger(WebhookService.name);
  private readonly maxRetries = 3;
  private readonly timeoutMs = 8000;

  constructor(private readonly queueService: QueueService) {}

  onModuleInit() {
    this.queueService.registerHandler('webhook_notification', this.handleWebhookJob.bind(this));
    this.logger.log('WebhookService initialized and registered for "webhook_notification" queue events.');
  }

  async dispatchWebhook(payload: WebhookNotificationPayload): Promise<string> {
    return this.queueService.dispatch('webhook_notification', {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      eventType: payload.eventType || 'form.submission.created',
    });
  }

  async handleWebhookJob(job: AsyncJob<WebhookNotificationPayload>): Promise<void> {
    const payload = job.payload;
    if (!payload?.url) {
      this.logger.warn(`Skipping webhook job ${job.id}: missing target URL`);
      return;
    }

    const result = await this.deliverWebhook(payload);
    if (!result.success) {
      this.logger.error(
        `Webhook delivery failed for job ${job.id} to ${payload.url}: ${result.error} (after ${result.attempts} attempts)`,
      );
      throw new Error(`Webhook delivery failed: ${result.error}`);
    } else {
      this.logger.log(
        `Webhook delivery successful for job ${job.id} [${result.deliveryId}] (Status: ${result.statusCode}, ${result.durationMs}ms)`,
      );
    }
  }

  async deliverWebhook(payload: WebhookNotificationPayload): Promise<WebhookDeliveryResult> {
    const deliveryId = `del_${crypto.randomBytes(8).toString('hex')}`;
    const startTime = Date.now();

    // 1. SSRF and protocol protection validation
    let safeUrl: string;
    try {
      safeUrl = await validateSafeUrl(payload.url);
    } catch (err: any) {
      return {
        success: false,
        deliveryId,
        attempts: 1,
        error: `SSRF validation failed: ${err.message}`,
        durationMs: Date.now() - startTime,
      };
    }

    const body = JSON.stringify({
      id: deliveryId,
      event: payload.eventType || 'form.submission.created',
      timestamp: payload.timestamp || new Date().toISOString(),
      formId: payload.formId,
      submissionId: payload.submissionId,
      data: payload.data,
    });

    // 2. Compute HMAC-SHA256 signature
    const secret = payload.secret || process.env.WEBHOOK_SIGNING_SECRET || 'saas_default_signing_key_secret';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signaturePayload = `${timestamp}.${body}`;
    const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

    // 3. Retry loop with exponential backoff
    let attempts = 0;
    let lastError = '';
    let lastStatusCode: number | undefined;

    while (attempts < this.maxRetries) {
      attempts++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(safeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SaaS-Webhook-Dispatcher/1.0',
            'X-Webhook-Delivery': deliveryId,
            'X-Webhook-Event': payload.eventType || 'form.submission.created',
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Signature-256': `t=${timestamp},v1=${signature}`,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timer);
        lastStatusCode = response.status;

        if (response.ok) {
          return {
            success: true,
            statusCode: response.status,
            deliveryId,
            attempts,
            durationMs: Date.now() - startTime,
          };
        }

        lastError = `HTTP error status ${response.status}: ${response.statusText}`;

        // Don't retry on 4xx client errors except 429 Too Many Requests
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err.name === 'AbortError' ? `Request timeout after ${this.timeoutMs}ms` : err.message;
      }

      // Exponential backoff before next retry (500ms, 1000ms, 2000ms)
      if (attempts < this.maxRetries) {
        const backoffMs = Math.pow(2, attempts - 1) * 500;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    return {
      success: false,
      statusCode: lastStatusCode,
      deliveryId,
      attempts,
      error: lastError,
      durationMs: Date.now() - startTime,
    };
  }
}
