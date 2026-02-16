/**
 * Webhook Service - Express-compatible implementation
 *
 * Uses the Integration model for webhook registration (webhookUrl, webhookSecret fields).
 * Delivery tracking is in-memory since there's no WebhookDelivery model in the schema.
 * Retries use setTimeout-based exponential backoff (no BullMQ dependency required).
 */

import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';

interface WebhookEvent {
  id: string;
  event: string;
  timestamp: string;
  tenantId: string;
  data: any;
  metadata?: Record<string, any>;
}

interface DeliveryRecord {
  id: string;
  integrationId: string;
  eventId: string;
  url: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attemptNumber: number;
  maxAttempts: number;
  requestPayload: any;
  responseStatus?: number;
  error?: string;
  deliveredAt?: Date;
  createdAt: Date;
}

// In-memory delivery log (bounded to last 1000 entries per tenant)
const deliveryLog = new Map<string, DeliveryRecord[]>();
const MAX_LOG_PER_TENANT = 1000;

function appendDelivery(tenantId: string, record: DeliveryRecord) {
  let list = deliveryLog.get(tenantId);
  if (!list) {
    list = [];
    deliveryLog.set(tenantId, list);
  }
  list.push(record);
  if (list.length > MAX_LOG_PER_TENANT) {
    list.splice(0, list.length - MAX_LOG_PER_TENANT);
  }
}

class WebhookService {
  /**
   * Trigger a webhook event — finds all integrations with a webhookUrl
   * subscribed to this event type, then delivers to each.
   */
  async triggerEvent(event: WebhookEvent): Promise<void> {
    const integrations = await prisma.integration.findMany({
      where: {
        tenantId: event.tenantId,
        status: 'ACTIVE',
        webhookUrl: { not: null },
        webhookEvents: { has: event.event },
      },
    });

    if (integrations.length === 0) {
      logger.debug(`No webhook integrations for event ${event.event}`);
      return;
    }

    const promises = integrations.map((integration) =>
      this.deliver(integration, event),
    );

    await Promise.allSettled(promises);
    logger.info(
      `Dispatched ${integrations.length} webhook(s) for event ${event.event}`,
    );
  }

  /**
   * Deliver payload to a single integration's webhookUrl with retries.
   */
  private async deliver(
    integration: { id: string; tenantId: string; webhookUrl: string | null; webhookSecret: string | null },
    event: WebhookEvent,
    attempt = 1,
    maxAttempts = 3,
  ): Promise<void> {
    const url = integration.webhookUrl;
    if (!url) return;

    const payload = {
      id: event.id,
      event: event.event,
      timestamp: event.timestamp,
      tenant_id: event.tenantId,
      data: event.data,
      metadata: event.metadata || {},
    };

    const deliveryId = crypto.randomUUID();
    const record: DeliveryRecord = {
      id: deliveryId,
      integrationId: integration.id,
      eventId: event.id,
      url,
      status: 'pending',
      attemptNumber: attempt,
      maxAttempts,
      requestPayload: payload,
      createdAt: new Date(),
    };

    try {
      const signature = this.sign(payload, integration.webhookSecret || '');

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event.event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Delivery-ID': deliveryId,
          'X-Webhook-Timestamp': event.timestamp,
          'User-Agent': 'PMS-Platform-Webhooks/1.0',
        },
        timeout: 30000,
        validateStatus: (s) => s >= 200 && s < 300,
      });

      record.status = 'success';
      record.responseStatus = response.status;
      record.deliveredAt = new Date();
      appendDelivery(integration.tenantId, record);
      logger.info(`Webhook delivered to ${url} (attempt ${attempt})`);
    } catch (error: any) {
      record.status = attempt < maxAttempts ? 'retrying' : 'failed';
      record.error = error instanceof AxiosError
        ? `HTTP ${error.response?.status || 'N/A'}: ${error.message}`
        : (error.message || 'Unknown error');
      if (error instanceof AxiosError) {
        record.responseStatus = error.response?.status;
      }
      appendDelivery(integration.tenantId, record);

      if (attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        logger.warn(
          `Webhook delivery to ${url} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`,
        );
        setTimeout(() => {
          this.deliver(integration, event, attempt + 1, maxAttempts).catch((retryErr) => {
            logger.error(`Webhook retry delivery failed`, { url, attempt: attempt + 1, error: (retryErr as Error).message });
          });
        }, delay);
      } else {
        logger.error(
          `Webhook delivery to ${url} permanently failed after ${maxAttempts} attempts: ${record.error}`,
        );
      }
    }
  }

  /**
   * HMAC-SHA256 signature generation
   */
  sign(payload: any, secret: string): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify an incoming webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expected = this.sign(payload, secret);
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Get recent delivery records (from in-memory log)
   */
  getDeliveries(tenantId: string, integrationId?: string, limit = 50): DeliveryRecord[] {
    const list = deliveryLog.get(tenantId) || [];
    const filtered = integrationId
      ? list.filter((d) => d.integrationId === integrationId)
      : list;
    return filtered.slice(-limit).reverse();
  }
}

export const webhookService = new WebhookService();
