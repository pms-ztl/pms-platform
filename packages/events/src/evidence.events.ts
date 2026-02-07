/**
 * Evidence Domain Events
 *
 * Events for tracking performance evidence artifacts throughout the system.
 * Evidence is the foundation for defensible HR decisions.
 */

import { z } from 'zod';
import { BaseEvent, EventMetadataSchema } from './types';

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export const EvidenceCreatedPayloadSchema = z.object({
  evidenceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  type: z.string(),
  source: z.string(),
  title: z.string(),
  description: z.string().optional(),
  externalId: z.string().optional(),
  externalUrl: z.string().optional(),
  occurredAt: z.string().datetime(),
  impactScore: z.number().optional(),
  effortScore: z.number().optional(),
  qualityScore: z.number().optional(),
  tags: z.array(z.string()).optional(),
  skillTags: z.array(z.string()).optional(),
  valueTags: z.array(z.string()).optional(),
  createdById: z.string().uuid().optional(),
});

export const EvidenceVerifiedPayloadSchema = z.object({
  evidenceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  verifiedById: z.string().uuid(),
  verificationStatus: z.enum(['VERIFIED', 'DISPUTED', 'REJECTED']),
  verificationNotes: z.string().optional(),
  adjustedScores: z.object({
    impactScore: z.number().optional(),
    effortScore: z.number().optional(),
    qualityScore: z.number().optional(),
  }).optional(),
});

export const EvidenceLinkedToReviewPayloadSchema = z.object({
  evidenceId: z.string().uuid(),
  reviewId: z.string().uuid(),
  employeeId: z.string().uuid(),
  category: z.string().optional(),
  weight: z.number().optional(),
  relevanceScore: z.number().optional(),
  linkedById: z.string().uuid(),
  notes: z.string().optional(),
});

export const EvidenceUnlinkedFromReviewPayloadSchema = z.object({
  evidenceId: z.string().uuid(),
  reviewId: z.string().uuid(),
  unlinkedById: z.string().uuid(),
  reason: z.string().optional(),
});

export const EvidenceImportedPayloadSchema = z.object({
  importId: z.string().uuid(),
  source: z.string(),
  employeeId: z.string().uuid(),
  evidenceCount: z.number(),
  evidenceIds: z.array(z.string().uuid()),
  importedById: z.string().uuid().optional(),
  integrationId: z.string().uuid().optional(),
});

export const EvidenceUpdatedPayloadSchema = z.object({
  evidenceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  updatedById: z.string().uuid(),
  previousValues: z.record(z.unknown()),
  newValues: z.record(z.unknown()),
  updateReason: z.string().optional(),
});

export const EvidenceArchivedPayloadSchema = z.object({
  evidenceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  archivedById: z.string().uuid(),
  archiveReason: z.string().optional(),
});

// ============================================================================
// EVENT TYPES
// ============================================================================

export type EvidenceCreatedPayload = z.infer<typeof EvidenceCreatedPayloadSchema>;
export type EvidenceVerifiedPayload = z.infer<typeof EvidenceVerifiedPayloadSchema>;
export type EvidenceLinkedToReviewPayload = z.infer<typeof EvidenceLinkedToReviewPayloadSchema>;
export type EvidenceUnlinkedFromReviewPayload = z.infer<typeof EvidenceUnlinkedFromReviewPayloadSchema>;
export type EvidenceImportedPayload = z.infer<typeof EvidenceImportedPayloadSchema>;
export type EvidenceUpdatedPayload = z.infer<typeof EvidenceUpdatedPayloadSchema>;
export type EvidenceArchivedPayload = z.infer<typeof EvidenceArchivedPayloadSchema>;

export type EvidenceCreatedEvent = BaseEvent<'evidence.created', EvidenceCreatedPayload>;
export type EvidenceVerifiedEvent = BaseEvent<'evidence.verified', EvidenceVerifiedPayload>;
export type EvidenceLinkedToReviewEvent = BaseEvent<'evidence.linked_to_review', EvidenceLinkedToReviewPayload>;
export type EvidenceUnlinkedFromReviewEvent = BaseEvent<'evidence.unlinked_from_review', EvidenceUnlinkedFromReviewPayload>;
export type EvidenceImportedEvent = BaseEvent<'evidence.imported', EvidenceImportedPayload>;
export type EvidenceUpdatedEvent = BaseEvent<'evidence.updated', EvidenceUpdatedPayload>;
export type EvidenceArchivedEvent = BaseEvent<'evidence.archived', EvidenceArchivedPayload>;

export type EvidenceEvent =
  | EvidenceCreatedEvent
  | EvidenceVerifiedEvent
  | EvidenceLinkedToReviewEvent
  | EvidenceUnlinkedFromReviewEvent
  | EvidenceImportedEvent
  | EvidenceUpdatedEvent
  | EvidenceArchivedEvent;

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const EVIDENCE_EVENT_TYPES = {
  CREATED: 'evidence.created',
  VERIFIED: 'evidence.verified',
  LINKED_TO_REVIEW: 'evidence.linked_to_review',
  UNLINKED_FROM_REVIEW: 'evidence.unlinked_from_review',
  IMPORTED: 'evidence.imported',
  UPDATED: 'evidence.updated',
  ARCHIVED: 'evidence.archived',
} as const;

// ============================================================================
// EVENT FACTORIES
// ============================================================================

export function createEvidenceCreatedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: EvidenceCreatedPayload
): EvidenceCreatedEvent {
  return {
    metadata,
    type: 'evidence.created',
    payload: EvidenceCreatedPayloadSchema.parse(payload),
  };
}

export function createEvidenceVerifiedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: EvidenceVerifiedPayload
): EvidenceVerifiedEvent {
  return {
    metadata,
    type: 'evidence.verified',
    payload: EvidenceVerifiedPayloadSchema.parse(payload),
  };
}

export function createEvidenceLinkedToReviewEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: EvidenceLinkedToReviewPayload
): EvidenceLinkedToReviewEvent {
  return {
    metadata,
    type: 'evidence.linked_to_review',
    payload: EvidenceLinkedToReviewPayloadSchema.parse(payload),
  };
}

export function createEvidenceImportedEvent(
  metadata: z.infer<typeof EventMetadataSchema>,
  payload: EvidenceImportedPayload
): EvidenceImportedEvent {
  return {
    metadata,
    type: 'evidence.imported',
    payload: EvidenceImportedPayloadSchema.parse(payload),
  };
}
