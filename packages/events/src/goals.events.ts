import { z } from 'zod';
import type { BaseEvent } from './types';

// Goal event payload schemas
export const GoalCreatedPayloadSchema = z.object({
  goalId: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  type: z.enum(['INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'COMPANY', 'OKR_OBJECTIVE', 'OKR_KEY_RESULT']),
  parentGoalId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const GoalUpdatedPayloadSchema = z.object({
  goalId: z.string().uuid(),
  changes: z.record(z.unknown()),
  previousValues: z.record(z.unknown()),
});

export const GoalProgressUpdatedPayloadSchema = z.object({
  goalId: z.string().uuid(),
  previousProgress: z.number(),
  newProgress: z.number(),
  previousValue: z.number().optional(),
  newValue: z.number().optional(),
  updatedById: z.string().uuid(),
});

export const GoalStatusChangedPayloadSchema = z.object({
  goalId: z.string().uuid(),
  previousStatus: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']),
  newStatus: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD']),
});

export const GoalAlignedPayloadSchema = z.object({
  fromGoalId: z.string().uuid(),
  toGoalId: z.string().uuid(),
  alignmentType: z.string(),
  contributionWeight: z.number(),
});

export const GoalDeletedPayloadSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string(),
  deletedById: z.string().uuid(),
});

// Event types
export type GoalCreatedEvent = BaseEvent<'goal.created', z.infer<typeof GoalCreatedPayloadSchema>>;
export type GoalUpdatedEvent = BaseEvent<'goal.updated', z.infer<typeof GoalUpdatedPayloadSchema>>;
export type GoalProgressUpdatedEvent = BaseEvent<'goal.progress_updated', z.infer<typeof GoalProgressUpdatedPayloadSchema>>;
export type GoalStatusChangedEvent = BaseEvent<'goal.status_changed', z.infer<typeof GoalStatusChangedPayloadSchema>>;
export type GoalAlignedEvent = BaseEvent<'goal.aligned', z.infer<typeof GoalAlignedPayloadSchema>>;
export type GoalDeletedEvent = BaseEvent<'goal.deleted', z.infer<typeof GoalDeletedPayloadSchema>>;

export type GoalEvent =
  | GoalCreatedEvent
  | GoalUpdatedEvent
  | GoalProgressUpdatedEvent
  | GoalStatusChangedEvent
  | GoalAlignedEvent
  | GoalDeletedEvent;

// Event type constants
export const GOAL_EVENTS = {
  CREATED: 'goal.created',
  UPDATED: 'goal.updated',
  PROGRESS_UPDATED: 'goal.progress_updated',
  STATUS_CHANGED: 'goal.status_changed',
  ALIGNED: 'goal.aligned',
  DELETED: 'goal.deleted',
} as const;
