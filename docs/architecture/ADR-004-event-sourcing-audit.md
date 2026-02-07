# ADR-004: Event Sourcing for Audit Trail

## Status
Accepted

## Context
Performance management systems handle sensitive data that may be subject to legal scrutiny:
- Review content and ratings
- Calibration decisions
- Rating adjustments
- Feedback given

Requirements:
- Immutable audit trail
- Point-in-time reconstruction
- Legal defensibility
- Compliance with employment regulations

## Decision
We will use **Event Sourcing** for audit-critical entities, maintaining an immutable event log alongside the current state.

## Implementation

### Hybrid Approach
- **Event Log**: Immutable append-only log of all changes
- **Current State**: Traditional tables for efficient queries
- **Best of Both**: Fast reads + complete history

### Event Store Schema
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_audit_tenant ON audit_events(tenant_id);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_events(user_id);
CREATE INDEX idx_audit_created ON audit_events(created_at);

-- Make table append-only
REVOKE UPDATE, DELETE ON audit_events FROM app_user;
```

### Audited Actions
| Entity | Actions Logged |
|--------|----------------|
| User | created, updated, deactivated, role_changed, password_changed |
| Goal | created, updated, progress_updated, status_changed, deleted |
| Review | created, updated, submitted, calibrated, finalized, shared |
| Feedback | created, visibility_changed, deleted |
| Calibration | session_started, rating_adjusted, session_completed |
| Integration | connected, disconnected, sync_completed |

### Event Structure
```typescript
interface AuditEvent {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: object;
  newState?: object;
  metadata: {
    correlationId?: string;
    source?: string;
    reason?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
```

### Example: Review Calibration Audit
```typescript
await auditLogger('REVIEW_CALIBRATED', userId, tenantId, 'review', reviewId, {
  previousState: { rating: 3.5 },
  newState: { rating: 4.0, calibratedRating: 4.0 },
  metadata: {
    sessionId: calibrationSessionId,
    rationale: 'Adjusted based on additional project context',
    discussionNotes: 'Team agreed rating should reflect Q3 delivery'
  }
});
```

## Consequences

### Positive
- Complete, immutable history of all changes
- Legal defensibility for employment decisions
- Can reconstruct state at any point in time
- Compliance with audit requirements

### Negative
- Storage growth over time
- Query complexity for historical data
- Must be careful not to log sensitive data in plain text

## Retention Policy
- Active data: Indefinite
- Archived data: 7 years (employment law requirement)
- Deleted tenant data: Anonymized after 90 days, deleted after 1 year

## Legal Hold Support
```sql
-- Mark entity for legal hold (prevents deletion)
CREATE TABLE legal_holds (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  released_by UUID
);
```

## Query Patterns

### Get Entity History
```sql
SELECT * FROM audit_events
WHERE entity_type = 'review' AND entity_id = $1
ORDER BY created_at ASC;
```

### Reconstruct State at Time
```sql
SELECT new_state FROM audit_events
WHERE entity_type = 'review' AND entity_id = $1
  AND created_at <= $2
ORDER BY created_at DESC
LIMIT 1;
```

### User Activity Report
```sql
SELECT action, entity_type, COUNT(*) as count
FROM audit_events
WHERE user_id = $1 AND created_at >= $2
GROUP BY action, entity_type;
```

## References
- [Event Sourcing Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [EEOC Record Retention Requirements](https://www.eeoc.gov/employers/recordkeeping-requirements)
