import { z } from 'zod';
import type { BaseEvent } from './types';

// Calibration Session event payload schemas
export const CalibrationSessionCreatedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  cycleId: z.string().uuid(),
  name: z.string(),
  facilitatorId: z.string().uuid(),
  scheduledStart: z.string().datetime(),
  departmentScope: z.array(z.string()).optional(),
  levelScope: z.array(z.number()).optional(),
});

export const CalibrationSessionStartedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  startedById: z.string().uuid(),
  participantCount: z.number(),
});

export const CalibrationSessionCompletedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  completedById: z.string().uuid(),
  duration: z.number(), // minutes
  ratingsAdjusted: z.number(),
});

export const CalibrationSessionCancelledPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  cancelledById: z.string().uuid(),
  reason: z.string().optional(),
});

// Calibration Rating event payload schemas
export const CalibrationRatingAdjustedPayloadSchema = z.object({
  ratingId: z.string().uuid(),
  sessionId: z.string().uuid(),
  reviewId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  originalRating: z.number(),
  adjustedRating: z.number(),
  adjustedById: z.string().uuid(),
  rationale: z.string(),
});

export const CalibrationBiasAlertPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  alertType: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  affectedReviews: z.array(z.string().uuid()),
});

export const CalibrationParticipantJoinedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string(),
});

export const CalibrationParticipantLeftPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
});

// Event types
export type CalibrationSessionCreatedEvent = BaseEvent<'calibration.session_created', z.infer<typeof CalibrationSessionCreatedPayloadSchema>>;
export type CalibrationSessionStartedEvent = BaseEvent<'calibration.session_started', z.infer<typeof CalibrationSessionStartedPayloadSchema>>;
export type CalibrationSessionCompletedEvent = BaseEvent<'calibration.session_completed', z.infer<typeof CalibrationSessionCompletedPayloadSchema>>;
export type CalibrationSessionCancelledEvent = BaseEvent<'calibration.session_cancelled', z.infer<typeof CalibrationSessionCancelledPayloadSchema>>;
export type CalibrationRatingAdjustedEvent = BaseEvent<'calibration.rating_adjusted', z.infer<typeof CalibrationRatingAdjustedPayloadSchema>>;
export type CalibrationBiasAlertEvent = BaseEvent<'calibration.bias_alert', z.infer<typeof CalibrationBiasAlertPayloadSchema>>;
export type CalibrationParticipantJoinedEvent = BaseEvent<'calibration.participant_joined', z.infer<typeof CalibrationParticipantJoinedPayloadSchema>>;
export type CalibrationParticipantLeftEvent = BaseEvent<'calibration.participant_left', z.infer<typeof CalibrationParticipantLeftPayloadSchema>>;

export type CalibrationEvent =
  | CalibrationSessionCreatedEvent
  | CalibrationSessionStartedEvent
  | CalibrationSessionCompletedEvent
  | CalibrationSessionCancelledEvent
  | CalibrationRatingAdjustedEvent
  | CalibrationBiasAlertEvent
  | CalibrationParticipantJoinedEvent
  | CalibrationParticipantLeftEvent;

// Event type constants
export const CALIBRATION_EVENTS = {
  SESSION_CREATED: 'calibration.session_created',
  SESSION_STARTED: 'calibration.session_started',
  SESSION_COMPLETED: 'calibration.session_completed',
  SESSION_CANCELLED: 'calibration.session_cancelled',
  RATING_ADJUSTED: 'calibration.rating_adjusted',
  BIAS_ALERT: 'calibration.bias_alert',
  PARTICIPANT_JOINED: 'calibration.participant_joined',
  PARTICIPANT_LEFT: 'calibration.participant_left',
} as const;
