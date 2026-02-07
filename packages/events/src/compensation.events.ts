/**
 * Compensation Decision Domain Events
 *
 * Events for tracking compensation changes throughout the HR lifecycle.
 * These events support audit trails, analytics, and real-time notifications.
 */

import { z } from 'zod';
import { BaseEvent, EventMetadataSchema } from './types';

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export const CompensationDecisionCreatedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.enum([
    'BASE_SALARY',
    'BONUS',
    'EQUITY',
    'COMMISSION',
    'ALLOWANCE',
    'BENEFITS',
    'ONE_TIME_PAYMENT',
    'RETENTION_BONUS',
    'SIGN_ON_BONUS',
  ]),
  previousAmount: z.number(),
  newAmount: z.number(),
  changePercent: z.number(),
  currency: z.string(),
  effectiveDate: z.string().datetime(),
  reviewCycleId: z.string().uuid().optional(),
  proposedById: z.string().uuid(),
  reason: z.string(),
});

export const CompensationDecisionSubmittedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  amount: z.number(),
  submittedById: z.string().uuid(),
  approverIds: z.array(z.string().uuid()),
});

export const CompensationDecisionApprovedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  previousAmount: z.number(),
  newAmount: z.number(),
  approvedById: z.string().uuid(),
  approvalLevel: z.number().optional(),
  notes: z.string().optional(),
});

export const CompensationDecisionRejectedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  proposedAmount: z.number(),
  rejectedById: z.string().uuid(),
  rejectionReason: z.string(),
});

export const CompensationDecisionImplementedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  previousAmount: z.number(),
  newAmount: z.number(),
  effectiveDate: z.string().datetime(),
  implementedById: z.string().uuid(),
  payrollReference: z.string().optional(),
});

export const CompensationDecisionModifiedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  employeeId: z.string().uuid(),
  modifiedById: z.string().uuid(),
  previousValues: z.record(z.unknown()),
  newValues: z.record(z.unknown()),
  modificationReason: z.string(),
});

export const CompensationEvidenceLinkedPayloadSchema = z.object({
  decisionId: z.string().uuid(),
  evidenceId: z.string().uuid(),
  linkedById: z.string().uuid(),
  relevanceScore: z.number().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// EVENT TYPES
// ============================================================================

export type CompensationDecisionCreatedPayload = z.infer<typeof CompensationDecisionCreatedPayloadSchema>;
export type CompensationDecisionSubmittedPayload = z.infer<typeof CompensationDecisionSubmittedPayloadSchema>;
export type CompensationDecisionApprovedPayload = z.infer<typeof CompensationDecisionApprovedPayloadSchema>;
export type CompensationDecisionRejectedPayload = z.infer<typeof CompensationDecisionRejectedPayloadSchema>;
export type CompensationDecisionImplementedPayload = z.infer<typeof CompensationDecisionImplementedPayloadSchema>;
export type CompensationDecisionModifiedPayload = z.infer<typeof CompensationDecisionModifiedPayloadSchema>;
export type CompensationEvidenceLinkedPayload = z.infer<typeof CompensationEvidenceLinkedPayloadSchema>;

export type CompensationDecisionCreatedEvent = BaseEvent<'compensation.decision_created', CompensationDecisionCreatedPayload>;
export type CompensationDecisionSubmittedEvent = BaseEvent<'compensation.decision_submitted', CompensationDecisionSubmittedPayload>;
export type CompensationDecisionApprovedEvent = BaseEvent<'compensation.decision_approved', CompensationDecisionApprovedPayload>;
export type CompensationDecisionRejectedEvent = BaseEvent<'compensation.decision_rejected', CompensationDecisionRejectedPayload>;
export type CompensationDecisionImplementedEvent = BaseEvent<'compensation.decision_implemented', CompensationDecisionImplementedPayload>;
export type CompensationDecisionModifiedEvent = BaseEvent<'compensation.decision_modified', CompensationDecisionModifiedPayload>;
export type CompensationEvidenceLinkedEvent = BaseEvent<'compensation.evidence_linked', CompensationEvidenceLinkedPayload>;

export type CompensationEvent =
  | CompensationDecisionCreatedEvent
  | CompensationDecisionSubmittedEvent
  | CompensationDecisionApprovedEvent
  | CompensationDecisionRejectedEvent
  | CompensationDecisionImplementedEvent
  | CompensationDecisionModifiedEvent
  | CompensationEvidenceLinkedEvent;

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const COMPENSATION_EVENT_TYPES = {
  DECISION_CREATED: 'compensation.decision_created',
  DECISION_SUBMITTED: 'compensation.decision_submitted',
  DECISION_APPROVED: 'compensation.decision_approved',
  DECISION_REJECTED: 'compensation.decision_rejected',
  DECISION_IMPLEMENTED: 'compensation.decision_implemented',
  DECISION_MODIFIED: 'compensation.decision_modified',
  EVIDENCE_LINKED: 'compensation.evidence_linked',
} as const;

// ============================================================================
// EVENT FACTORIES
// ============================================================================

export function createCompensationDecisionCreatedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: CompensationDecisionCreatedPayload
): CompensationDecisionCreatedEvent {
  return {
    metadata,
    type: 'compensation.decision_created',
    payload: CompensationDecisionCreatedPayloadSchema.parse(payload),
  };
}

export function createCompensationDecisionApprovedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: CompensationDecisionApprovedPayload
): CompensationDecisionApprovedEvent {
  return {
    metadata,
    type: 'compensation.decision_approved',
    payload: CompensationDecisionApprovedPayloadSchema.parse(payload),
  };
}

export function createCompensationDecisionRejectedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: CompensationDecisionRejectedPayload
): CompensationDecisionRejectedEvent {
  return {
    metadata,
    type: 'compensation.decision_rejected',
    payload: CompensationDecisionRejectedPayloadSchema.parse(payload),
  };
}

export function createCompensationDecisionImplementedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: CompensationDecisionImplementedPayload
): CompensationDecisionImplementedEvent {
  return {
    metadata,
    type: 'compensation.decision_implemented',
    payload: CompensationDecisionImplementedPayloadSchema.parse(payload),
  };
}
