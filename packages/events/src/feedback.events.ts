import { z } from 'zod';
import type { BaseEvent } from './types';

// Feedback event payload schemas
export const FeedbackGivenPayloadSchema = z.object({
  feedbackId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  type: z.enum(['PRAISE', 'CONSTRUCTIVE', 'SUGGESTION', 'REQUEST', 'RECOGNITION']),
  visibility: z.enum(['PRIVATE', 'MANAGER_VISIBLE', 'PUBLIC']),
  isAnonymous: z.boolean(),
  tags: z.array(z.string()).optional(),
});

export const FeedbackRequestedPayloadSchema = z.object({
  feedbackId: z.string().uuid(),
  requesterId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  requestedFromId: z.string().uuid(),
  dueDate: z.string().datetime().optional(),
});

export const FeedbackAcknowledgedPayloadSchema = z.object({
  feedbackId: z.string().uuid(),
  acknowledgedById: z.string().uuid(),
});

export const FeedbackDeletedPayloadSchema = z.object({
  feedbackId: z.string().uuid(),
  deletedById: z.string().uuid(),
});

// Recognition event payload schemas
export const RecognitionGivenPayloadSchema = z.object({
  recognitionId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  valueTags: z.array(z.string()),
  message: z.string(),
  points: z.number().optional(),
});

export const RecognitionLikedPayloadSchema = z.object({
  recognitionId: z.string().uuid(),
  likedById: z.string().uuid(),
});

// Event types
export type FeedbackGivenEvent = BaseEvent<'feedback.given', z.infer<typeof FeedbackGivenPayloadSchema>>;
export type FeedbackRequestedEvent = BaseEvent<'feedback.requested', z.infer<typeof FeedbackRequestedPayloadSchema>>;
export type FeedbackAcknowledgedEvent = BaseEvent<'feedback.acknowledged', z.infer<typeof FeedbackAcknowledgedPayloadSchema>>;
export type FeedbackDeletedEvent = BaseEvent<'feedback.deleted', z.infer<typeof FeedbackDeletedPayloadSchema>>;
export type RecognitionGivenEvent = BaseEvent<'recognition.given', z.infer<typeof RecognitionGivenPayloadSchema>>;
export type RecognitionLikedEvent = BaseEvent<'recognition.liked', z.infer<typeof RecognitionLikedPayloadSchema>>;

export type FeedbackEvent =
  | FeedbackGivenEvent
  | FeedbackRequestedEvent
  | FeedbackAcknowledgedEvent
  | FeedbackDeletedEvent
  | RecognitionGivenEvent
  | RecognitionLikedEvent;

// Event type constants
export const FEEDBACK_EVENTS = {
  GIVEN: 'feedback.given',
  REQUESTED: 'feedback.requested',
  ACKNOWLEDGED: 'feedback.acknowledged',
  DELETED: 'feedback.deleted',
  RECOGNITION_GIVEN: 'recognition.given',
  RECOGNITION_LIKED: 'recognition.liked',
} as const;
