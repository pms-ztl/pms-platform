/**
 * Promotion Decision Domain Events
 *
 * Events for tracking promotion decisions throughout the talent lifecycle.
 * These events support audit trails, analytics, and real-time notifications.
 */

import { z } from 'zod';
import { BaseEvent, EventMetadataSchema } from './types';

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export const PromotionNominatedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.enum([
    'LEVEL_PROMOTION',
    'ROLE_CHANGE',
    'TITLE_CHANGE',
    'LATERAL_MOVE',
    'CAREER_TRACK_CHANGE',
  ]),
  previousLevel: z.number().optional(),
  proposedLevel: z.number().optional(),
  previousTitle: z.string().optional(),
  proposedTitle: z.string().optional(),
  previousRoleId: z.string().uuid().optional(),
  proposedRoleId: z.string().uuid().optional(),
  nominatedById: z.string().uuid(),
  reviewCycleId: z.string().uuid().optional(),
  calibrationSessionId: z.string().uuid().optional(),
  justification: z.string().optional(),
  readinessScore: z.number().optional(),
});

export const PromotionReviewStartedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  reviewerRole: z.string().optional(),
});

export const PromotionApprovedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  previousLevel: z.number().optional(),
  newLevel: z.number().optional(),
  previousTitle: z.string().optional(),
  newTitle: z.string().optional(),
  effectiveDate: z.string().datetime(),
  approvedById: z.string().uuid(),
  approvalNotes: z.string().optional(),
});

export const PromotionRejectedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  proposedLevel: z.number().optional(),
  proposedTitle: z.string().optional(),
  rejectedById: z.string().uuid(),
  rejectionReason: z.string(),
  developmentPlan: z.array(z.string()).optional(),
});

export const PromotionDeferredPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  deferredById: z.string().uuid(),
  deferredUntil: z.string().datetime(),
  deferralReason: z.string(),
  conditions: z.array(z.string()).optional(),
});

export const PromotionImplementedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  previousLevel: z.number().optional(),
  newLevel: z.number().optional(),
  previousTitle: z.string().optional(),
  newTitle: z.string().optional(),
  previousRoleId: z.string().uuid().optional(),
  newRoleId: z.string().uuid().optional(),
  effectiveDate: z.string().datetime(),
  implementedById: z.string().uuid(),
  hrisReference: z.string().optional(),
  compensationDecisionId: z.string().uuid().optional(),
});

export const PromotionEvidenceLinkedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  evidenceId: z.string().uuid(),
  linkedById: z.string().uuid(),
  relevanceScore: z.number().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export const PromotionCriteriaEvaluatedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  evaluatedById: z.string().uuid(),
  criteriaScores: z.array(z.object({
    criterionId: z.string(),
    criterionName: z.string(),
    score: z.number(),
    weight: z.number(),
    evidenceCount: z.number(),
    notes: z.string().optional(),
  })),
  overallScore: z.number(),
  recommendation: z.enum(['PROMOTE', 'DEFER', 'REJECT', 'NEEDS_REVIEW']),
});

// ============================================================================
// EVENT TYPES
// ============================================================================

export type PromotionNominatedPayload = z.infer<typeof PromotionNominatedPayloadSchema>;
export type PromotionReviewStartedPayload = z.infer<typeof PromotionReviewStartedPayloadSchema>;
export type PromotionApprovedPayload = z.infer<typeof PromotionApprovedPayloadSchema>;
export type PromotionRejectedPayload = z.infer<typeof PromotionRejectedPayloadSchema>;
export type PromotionDeferredPayload = z.infer<typeof PromotionDeferredPayloadSchema>;
export type PromotionImplementedPayload = z.infer<typeof PromotionImplementedPayloadSchema>;
export type PromotionEvidenceLinkedPayload = z.infer<typeof PromotionEvidenceLinkedPayloadSchema>;
export type PromotionCriteriaEvaluatedPayload = z.infer<typeof PromotionCriteriaEvaluatedPayloadSchema>;

export type PromotionNominatedEvent = BaseEvent<'promotion.nominated', PromotionNominatedPayload>;
export type PromotionReviewStartedEvent = BaseEvent<'promotion.review_started', PromotionReviewStartedPayload>;
export type PromotionApprovedEvent = BaseEvent<'promotion.approved', PromotionApprovedPayload>;
export type PromotionRejectedEvent = BaseEvent<'promotion.rejected', PromotionRejectedPayload>;
export type PromotionDeferredEvent = BaseEvent<'promotion.deferred', PromotionDeferredPayload>;
export type PromotionImplementedEvent = BaseEvent<'promotion.implemented', PromotionImplementedPayload>;
export type PromotionEvidenceLinkedEvent = BaseEvent<'promotion.evidence_linked', PromotionEvidenceLinkedPayload>;
export type PromotionCriteriaEvaluatedEvent = BaseEvent<'promotion.criteria_evaluated', PromotionCriteriaEvaluatedPayload>;

export type PromotionEvent =
  | PromotionNominatedEvent
  | PromotionReviewStartedEvent
  | PromotionApprovedEvent
  | PromotionRejectedEvent
  | PromotionDeferredEvent
  | PromotionImplementedEvent
  | PromotionEvidenceLinkedEvent
  | PromotionCriteriaEvaluatedEvent;

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const PROMOTION_EVENT_TYPES = {
  NOMINATED: 'promotion.nominated',
  REVIEW_STARTED: 'promotion.review_started',
  APPROVED: 'promotion.approved',
  REJECTED: 'promotion.rejected',
  DEFERRED: 'promotion.deferred',
  IMPLEMENTED: 'promotion.implemented',
  EVIDENCE_LINKED: 'promotion.evidence_linked',
  CRITERIA_EVALUATED: 'promotion.criteria_evaluated',
} as const;

// ============================================================================
// EVENT FACTORIES
// ============================================================================

export function createPromotionNominatedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: PromotionNominatedPayload
): PromotionNominatedEvent {
  return {
    metadata,
    type: 'promotion.nominated',
    payload: PromotionNominatedPayloadSchema.parse(payload),
  };
}

export function createPromotionApprovedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: PromotionApprovedPayload
): PromotionApprovedEvent {
  return {
    metadata,
    type: 'promotion.approved',
    payload: PromotionApprovedPayloadSchema.parse(payload),
  };
}

export function createPromotionRejectedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: PromotionRejectedPayload
): PromotionRejectedEvent {
  return {
    metadata,
    type: 'promotion.rejected',
    payload: PromotionRejectedPayloadSchema.parse(payload),
  };
}

export function createPromotionDeferredEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: PromotionDeferredPayload
): PromotionDeferredEvent {
  return {
    metadata,
    type: 'promotion.deferred',
    payload: PromotionDeferredPayloadSchema.parse(payload),
  };
}

export function createPromotionImplementedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: PromotionImplementedPayload
): PromotionImplementedEvent {
  return {
    metadata,
    type: 'promotion.implemented',
    payload: PromotionImplementedPayloadSchema.parse(payload),
  };
}
