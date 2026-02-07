// Core types
export * from './types';

// Event bus
export * from './event-bus';

// Domain events
export * from './goals.events';
export * from './reviews.events';
export * from './feedback.events';
export * from './calibration.events';
export * from './user.events';
export * from './integration.events';
export * from './compensation.events';
export * from './promotion.events';
export * from './evidence.events';

// All event types combined
export type { GoalEvent } from './goals.events';
export type { ReviewEvent } from './reviews.events';
export type { FeedbackEvent } from './feedback.events';
export type { CalibrationEvent } from './calibration.events';
export type { UserEvent } from './user.events';
export type { IntegrationEvent } from './integration.events';
export type { CompensationEvent } from './compensation.events';
export type { PromotionEvent } from './promotion.events';
export type { EvidenceEvent } from './evidence.events';

// All event constants combined
export {
  GOAL_EVENTS,
} from './goals.events';

export {
  REVIEW_EVENTS,
} from './reviews.events';

export {
  FEEDBACK_EVENTS,
} from './feedback.events';

export {
  CALIBRATION_EVENTS,
} from './calibration.events';

export {
  USER_EVENTS,
} from './user.events';

export {
  INTEGRATION_EVENTS,
} from './integration.events';

export {
  COMPENSATION_EVENT_TYPES,
} from './compensation.events';

export {
  PROMOTION_EVENT_TYPES,
} from './promotion.events';

export {
  EVIDENCE_EVENT_TYPES,
} from './evidence.events';
