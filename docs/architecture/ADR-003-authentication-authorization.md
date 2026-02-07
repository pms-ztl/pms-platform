# ADR-003: Authentication and Authorization Strategy

## Status
Accepted

## Context
Enterprise PMS requires robust authentication and fine-grained authorization to protect sensitive employee performance data.

Requirements:
- SSO integration (SAML 2.0, OIDC)
- Multi-factor authentication
- Role-based and attribute-based access control
- Session management
- Audit logging

## Decision

### Authentication
- **Primary**: SSO via SAML 2.0 and OIDC using Passport.js
- **Fallback**: Email/password with bcrypt hashing
- **MFA**: TOTP (RFC 6238) with WebAuthn/FIDO2 support
- **Sessions**: JWT access tokens + refresh tokens, Redis-backed sessions

### Authorization
- **RBAC**: Role-Based Access Control for coarse permissions
- **ABAC**: Attribute-Based Access Control for fine-grained rules

## Authentication Flow

### SSO Flow (SAML 2.0)
```
1. User clicks "Login with SSO"
2. Redirect to IdP (Okta, Azure AD, etc.)
3. IdP authenticates user
4. IdP sends SAML assertion to /auth/saml/callback
5. System validates assertion
6. System creates/updates user (JIT provisioning)
7. System issues JWT tokens
8. Redirect to application
```

### Password Flow
```
1. User submits email/password
2. System validates credentials
3. If MFA enabled:
   a. Return temporary token
   b. User submits TOTP code
   c. System validates TOTP
4. System issues JWT tokens
```

### Token Structure
```typescript
// Access Token (15 min expiry)
{
  sub: "user-uuid",
  tid: "tenant-uuid",
  email: "user@company.com",
  roles: ["employee", "manager"],
  permissions: ["goals:read", "goals:write", "reviews:read"],
  iat: 1234567890,
  exp: 1234568790
}

// Refresh Token (7 day expiry)
{
  sub: "user-uuid",
  tid: "tenant-uuid",
  type: "refresh",
  iat: 1234567890,
  exp: 1235172690
}
```

## Authorization Model

### Roles (RBAC)
| Role | Description |
|------|-------------|
| Employee | Basic access to own data |
| Manager | Access to team data, review capabilities |
| HR Admin | Configure cycles, view reports |
| HR Business Partner | Analytics, calibration facilitation |
| Executive | Organization-wide dashboards |
| System Admin | User management, integrations |

### Permissions Matrix
| Permission | Employee | Manager | HR Admin | Executive |
|------------|----------|---------|----------|-----------|
| goals:read:own | ✓ | ✓ | ✓ | ✓ |
| goals:read:team | - | ✓ | ✓ | ✓ |
| goals:read:all | - | - | ✓ | ✓ |
| goals:write:own | ✓ | ✓ | ✓ | - |
| reviews:read:own | ✓ | ✓ | ✓ | ✓ |
| reviews:write:manager | - | ✓ | - | - |
| calibration:participate | - | ✓ | ✓ | - |
| calibration:admin | - | - | ✓ | - |
| analytics:view | - | ✓ | ✓ | ✓ |
| users:manage | - | - | ✓ | - |

### ABAC Attributes
- `department`: User's department
- `level`: Employee level (1-10)
- `location`: Geographic location
- `manager_chain`: Reporting hierarchy
- `data_sensitivity`: Classification level

### Example ABAC Rule
```javascript
// Manager can view reviews of direct reports only
canViewReview(user, review) {
  return user.roles.includes('manager') &&
         review.reviewee.managerId === user.id;
}

// HR can view reviews in their assigned departments
canViewReview(user, review) {
  return user.roles.includes('hr_admin') &&
         user.assignedDepartments.includes(review.reviewee.departmentId);
}
```

## Session Management

### Security Measures
- Tokens stored in httpOnly cookies (web) or secure storage (mobile)
- Refresh token rotation on each use
- Token blacklisting on logout
- Session invalidation on password change
- Configurable session timeout (default: 8 hours)

### Redis Session Store
```
session:{userId} -> { roles, permissions, lastActivity }
token:blacklist:{token} -> true (TTL = token expiry)
mfa:temp:{token} -> userId (TTL = 5 min)
```

## Consequences

### Positive
- Enterprise-grade SSO support
- Flexible authorization model
- Strong session security
- Audit trail for compliance

### Negative
- Complexity of ABAC rules
- Token management overhead
- IdP integration requires maintenance

## Security Checklist
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT signed with HS256/RS256
- [x] HTTPS enforced in production
- [x] CSRF protection for session cookies
- [x] Rate limiting on auth endpoints
- [x] Failed login attempt lockout
- [x] Audit logging for all auth events

## References
- [OWASP Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [SAML 2.0 Technical Overview](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
