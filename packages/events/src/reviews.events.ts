import { z } from 'zod';
import type { BaseEvent } from './types';

// Review Cycle event payload schemas
export const ReviewCycleCreatedPayloadSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'PROBATION', 'PROJECT', 'AD_HOC']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  createdById: z.string().uuid(),
});

export const ReviewCycleStatusChangedPayloadSchema = z.object({
  cycleId: z.string().uuid(),
  previousStatus: z.string(),
  newStatus: z.string(),
  changedById: z.string().uuid(),
});

export const ReviewCycleLaunchedPayloadSchema = z.object({
  cycleId: z.string().uuid(),
  participantCount: z.number(),
  launchedById: z.string().uuid(),
});

// Review event payload schemas
export const ReviewCreatedPayloadSchema = z.object({
  reviewId: z.string().uuid(),
  cycleId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  type: z.enum(['SELF', 'MANAGER', 'PEER', 'UPWARD', 'EXTERNAL', 'THREE_SIXTY']),
});

export const ReviewSubmittedPayloadSchema = z.object({
  reviewId: z.string().uuid(),
  cycleId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  type: z.string(),
  overallRating: z.number().optional(),
});

export const ReviewCalibratedPayloadSchema = z.object({
  reviewId: z.string().uuid(),
  sessionId: z.string().uuid(),
  originalRating: z.number(),
  calibratedRating: z.number(),
  adjustedById: z.string().uuid(),
  rationale: z.string(),
});

export const ReviewFinalizedPayloadSchema = z.object({
  reviewId: z.string().uuid(),
  cycleId: z.string().uuid(),
  finalRating: z.number(),
  finalizedById: z.string().uuid(),
});

export const ReviewSharedPayloadSchema = z.object({
  reviewId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  sharedById: z.string().uuid(),
});

export const ReviewAcknowledgedPayloadSchema = z.object({
  reviewId: z.string().uuid(),
  revieweeId: z.string().uuid(),
});

// Event types
export type ReviewCycleCreatedEvent = BaseEvent<'review_cycle.created', z.infer<typeof ReviewCycleCreatedPayloadSchema>>;
export type ReviewCycleStatusChangedEvent = BaseEvent<'review_cycle.status_changed', z.infer<typeof ReviewCycleStatusChangedPayloadSchema>>;
export type ReviewCycleLaunchedEvent = BaseEvent<'review_cycle.launched', z.infer<typeof ReviewCycleLaunchedPayloadSchema>>;
export type ReviewCreatedEvent = BaseEvent<'review.created', z.infer<typeof ReviewCreatedPayloadSchema>>;
export type ReviewSubmittedEvent = BaseEvent<'review.submitted', z.infer<typeof ReviewSubmittedPayloadSchema>>;
export type ReviewCalibratedEvent = BaseEvent<'review.calibrated', z.infer<typeof ReviewCalibratedPayloadSchema>>;
export type ReviewFinalizedEvent = BaseEvent<'review.finalized', z.infer<typeof ReviewFinalizedPayloadSchema>>;
export type ReviewSharedEvent = BaseEvent<'review.shared', z.infer<typeof ReviewSharedPayloadSchema>>;
export type ReviewAcknowledgedEvent = BaseEvent<'review.acknowledged', z.infer<typeof ReviewAcknowledgedPayloadSchema>>;

export type ReviewEvent =
  | ReviewCycleCreatedEvent
  | ReviewCycleStatusChangedEvent
  | ReviewCycleLaunchedEvent
  | ReviewCreatedEvent
  | ReviewSubmittedEvent
  | ReviewCalibratedEvent
  | ReviewFinalizedEvent
  | ReviewSharedEvent
  | ReviewAcknowledgedEvent;

// Event type constants
export const REVIEW_EVENTS = {
  CYCLE_CREATED: 'review_cycle.created',
  CYCLE_STATUS_CHANGED: 'review_cycle.status_changed',
  CYCLE_LAUNCHED: 'review_cycle.launched',
  REVIEW_CREATED: 'review.created',
  REVIEW_SUBMITTED: 'review.submitted',
  REVIEW_CALIBRATED: 'review.calibrated',
  REVIEW_FINALIZED: 'review.finalized',
  REVIEW_SHARED: 'review.shared',
  REVIEW_ACKNOWLEDGED: 'review.acknowledged',
} as const;
