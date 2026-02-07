import { z } from 'zod';
import type { BaseEvent } from './types';

// Integration event payload schemas
export const IntegrationConnectedPayloadSchema = z.object({
  integrationId: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  connectedById: z.string().uuid(),
});

export const IntegrationDisconnectedPayloadSchema = z.object({
  integrationId: z.string().uuid(),
  type: z.string(),
  disconnectedById: z.string().uuid(),
  reason: z.string().optional(),
});

export const IntegrationSyncStartedPayloadSchema = z.object({
  syncJobId: z.string().uuid(),
  integrationId: z.string().uuid(),
  direction: z.enum(['inbound', 'outbound', 'bidirectional']),
  triggeredBy: z.enum(['scheduled', 'manual', 'webhook']),
});

export const IntegrationSyncCompletedPayloadSchema = z.object({
  syncJobId: z.string().uuid(),
  integrationId: z.string().uuid(),
  recordsProcessed: z.number(),
  recordsFailed: z.number(),
  duration: z.number(), // milliseconds
});

export const IntegrationSyncFailedPayloadSchema = z.object({
  syncJobId: z.string().uuid(),
  integrationId: z.string().uuid(),
  error: z.string(),
  failedAt: z.string().datetime(),
});

export const IntegrationWebhookReceivedPayloadSchema = z.object({
  integrationId: z.string().uuid(),
  webhookType: z.string(),
  externalId: z.string().optional(),
  processed: z.boolean(),
});

export const IntegrationErrorPayloadSchema = z.object({
  integrationId: z.string().uuid(),
  errorType: z.string(),
  errorMessage: z.string(),
  retryable: z.boolean(),
});

// Event types
export type IntegrationConnectedEvent = BaseEvent<'integration.connected', z.infer<typeof IntegrationConnectedPayloadSchema>>;
export type IntegrationDisconnectedEvent = BaseEvent<'integration.disconnected', z.infer<typeof IntegrationDisconnectedPayloadSchema>>;
export type IntegrationSyncStartedEvent = BaseEvent<'integration.sync_started', z.infer<typeof IntegrationSyncStartedPayloadSchema>>;
export type IntegrationSyncCompletedEvent = BaseEvent<'integration.sync_completed', z.infer<typeof IntegrationSyncCompletedPayloadSchema>>;
export type IntegrationSyncFailedEvent = BaseEvent<'integration.sync_failed', z.infer<typeof IntegrationSyncFailedPayloadSchema>>;
export type IntegrationWebhookReceivedEvent = BaseEvent<'integration.webhook_received', z.infer<typeof IntegrationWebhookReceivedPayloadSchema>>;
export type IntegrationErrorEvent = BaseEvent<'integration.error', z.infer<typeof IntegrationErrorPayloadSchema>>;

export type IntegrationEvent =
  | IntegrationConnectedEvent
  | IntegrationDisconnectedEvent
  | IntegrationSyncStartedEvent
  | IntegrationSyncCompletedEvent
  | IntegrationSyncFailedEvent
  | IntegrationWebhookReceivedEvent
  | IntegrationErrorEvent;

// Event type constants
export const INTEGRATION_EVENTS = {
  CONNECTED: 'integration.connected',
  DISCONNECTED: 'integration.disconnected',
  SYNC_STARTED: 'integration.sync_started',
  SYNC_COMPLETED: 'integration.sync_completed',
  SYNC_FAILED: 'integration.sync_failed',
  WEBHOOK_RECEIVED: 'integration.webhook_received',
  ERROR: 'integration.error',
} as const;
