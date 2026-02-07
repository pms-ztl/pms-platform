# ADR-001: Modular Monolith Architecture

## Status
Accepted

## Context
We need to decide on the overall system architecture for the PMS platform. The options considered were:
1. Traditional Monolith
2. Microservices
3. Modular Monolith with event-driven communication

## Decision
We will use a **Modular Monolith** architecture with well-defined module boundaries and event-driven communication between modules.

## Rationale

### Why Not Traditional Monolith?
- Tends toward "big ball of mud" without discipline
- Hard to scale individual components
- Difficult to enforce boundaries
- Challenging for team ownership

### Why Not Microservices (Initially)?
- Premature complexity for an MVP
- Distributed system challenges (network failures, data consistency)
- Operational overhead (multiple deployments, service discovery)
- Team size doesn't warrant the coordination overhead
- Can migrate later if needed

### Why Modular Monolith?
- **Developer Productivity**: Single codebase, simple debugging, easy local development
- **Clear Boundaries**: Modules communicate via well-defined interfaces
- **Scalability Path**: Can extract modules to services when needed
- **Event-Driven**: Loose coupling via events enables future decomposition
- **Transaction Safety**: Can use database transactions across modules when needed
- **Performance**: No network overhead between modules

## Consequences

### Positive
- Faster development velocity
- Simpler deployment pipeline
- Easier debugging and monitoring
- Lower operational costs

### Negative
- Requires discipline to maintain module boundaries
- Single deployment unit (all or nothing)
- Resource scaling is coarse-grained

### Risks and Mitigations
- **Risk**: Module boundaries erode over time
  - **Mitigation**: Enforce boundaries via linting rules, code reviews, and architectural fitness functions
- **Risk**: Single point of failure
  - **Mitigation**: Multiple instances behind load balancer, health checks, auto-restart

## Module Structure
```
/apps/api/src/modules/
├── auth/        # Authentication & Authorization
├── users/       # User management
├── goals/       # Goals & OKRs
├── reviews/     # Review cycles & reviews
├── feedback/    # Continuous feedback
├── calibration/ # Calibration sessions
├── analytics/   # Analytics & reporting
├── notifications/ # Notification delivery
└── integrations/  # Third-party integrations
```

## Communication Patterns
1. **Synchronous**: Direct function calls within module, HTTP API between frontend and backend
2. **Asynchronous**: Event bus for cross-module communication

## References
- [ModularMonolith.net](https://www.modularmonolith.net/)
- [MonolithFirst - Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html)
