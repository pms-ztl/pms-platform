# ADR-002: Multi-Tenancy Strategy

## Status
Accepted

## Context
The PMS platform must support multiple organizations (tenants) while ensuring:
- Data isolation between tenants
- Cost-effective resource utilization
- Tenant-specific customization
- Compliance with data residency requirements

Options considered:
1. **Silo Model**: Separate database per tenant
2. **Bridge Model**: Separate schema per tenant, shared database
3. **Pool Model**: Shared schema with tenant_id column

## Decision
We will use the **Pool Model** (shared schema with tenant_id isolation) as the default, with optional schema-per-tenant for enterprise customers requiring full isolation.

## Rationale

### Why Pool Model as Default?
- **Cost Efficiency**: Single database reduces infrastructure costs
- **Operational Simplicity**: One schema to migrate, one backup strategy
- **Connection Pool**: Shared connections more efficient
- **Query Patterns**: Most queries are tenant-scoped anyway

### Row-Level Security Implementation
```sql
-- PostgreSQL RLS policy example
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Application-Level Enforcement
```typescript
// Middleware extracts tenant from token
const tenantId = req.user.tenantId;

// All queries automatically scoped
const goals = await prisma.goal.findMany({
  where: { tenantId } // Always included
});
```

## Data Model Requirements

### Every Table Includes:
- `tenant_id UUID NOT NULL` - Foreign key to tenants table
- Index on `tenant_id` for all frequently queried tables
- Composite unique constraints include `tenant_id`

### Cross-Tenant Operations
- Prohibited at application level
- Database RLS provides defense-in-depth
- Audit logging for any cross-tenant queries (admin only)

## Consequences

### Positive
- Lower infrastructure costs at scale
- Simpler operational model
- Faster onboarding of new tenants
- Efficient resource utilization

### Negative
- "Noisy neighbor" risk (mitigated by rate limiting)
- More complex queries (always include tenant_id)
- Larger tables (requires proper indexing)

### Enterprise Isolation Option
For regulated industries (healthcare, government), offer:
- Dedicated schema per tenant
- Dedicated database per tenant (highest isolation)
- Customer-managed encryption keys

## Security Considerations

1. **Defense in Depth**
   - Application-level tenant scoping
   - Database RLS policies
   - API authentication validates tenant

2. **Tenant Context**
   - Set at request start
   - Cleared at request end
   - Never cached across requests

3. **Audit Trail**
   - All tenant-scoped operations logged
   - Cross-tenant access attempts flagged

## References
- [Microsoft Azure SaaS Tenancy Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
