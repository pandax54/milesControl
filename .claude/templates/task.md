# Task X.0: [Task Title]

## Overview

[Brief description of the task]

<vision>
### What are we building?
[Clear description of what this service/API/feature does]

### Why are we building it?

[Business value, problem being solved, or system need addressed]

### How does it connect to everything else?

[Where does data flow from/to? What other services, databases, or queues does this touch?]

### What does success look like?

[Concrete outcome — what should the API consumer or system be able to do when this is done?]
</vision>

<critical>Read the prd.md and techspec.md files in this folder; if you do not read these files, your task will be invalidated</critical>

<requirements>
[List of mandatory requirements]
</requirements>

## Implementation Details

[Relevant sections from the technical spec **YOU DO NOT NEED TO SHOW THE ENTIRE IMPLEMENTATION, JUST REFERENCE techspec.md**]

<foundation>
### Data Model

#### Entities

[Define the core entities, their fields, types, and relationships. Include database table/collection names if applicable.]

```
Entity: [EntityName] (table: [table_name])
- field1: type (required/optional) - description
- field2: type (required/optional) - description
- indexes: [fields that need indexing and why]
- relationships: [foreign keys, references to other entities]
```

#### Migrations

[List any database migrations needed — new tables, columns, indexes, or data transformations]

#### Seed Data

[Initial data needed — reference data, default configurations, enum values, etc.]

```json
{
  "example": "seed data structure"
}
```

### Dependencies

#### Requires (inputs)

- [What existing database tables, services, or APIs does this depend on?]
- [What environment variables or configuration must exist?]
- [What must be migrated or seeded before this can work?]

#### Provides (outputs)

- [What API endpoints does this expose?]
- [What events, messages, or webhooks does this emit?]
- [What data does this create or make available to other services?]

#### Third-party integrations

- [External APIs, SDKs, or services needed]
- [Authentication method (API key, OAuth, etc.)]
- [Rate limits or usage constraints to be aware of]
  </foundation>

<implementation>
## Core Behavior

[Describe the main request/response flows and service logic:

- What happens on each API endpoint call?
- Validation rules and middleware applied
- Business logic and data transformations
- Database operations (reads, writes, transactions)]

## Edge Cases

[What happens when things go wrong?

- Invalid or malformed request payloads
- Resource not found or already exists (conflict)
- Database constraint violations
- External service timeouts or failures
- Unauthorized or forbidden access attempts
- Rate limit exceeded scenarios]
  </implementation>

<constraints>
## Must Have
- [Non-negotiable requirement]
- [Non-negotiable requirement]

## Must NOT Have

- [What to avoid — tech debt, anti-patterns, over-engineering]
- [What to avoid]

## Follow Existing Patterns From

- [Reference service/module to match]
- [Reference file/controller to match]
  </constraints>

<quality_gates>

## No Gaping Problems

- [ ] [Database migrations are reversible or safe to roll forward]
- [ ] [API contracts are stable and backward-compatible]
- [ ] [No N+1 queries or unindexed lookups on large tables]
- [ ] [Error responses follow the project's standard format]

## Ready to Ship

- [ ] [All endpoints return correct status codes and response shapes]
- [ ] [Input validation covers required fields and edge cases]
- [ ] [Logging and error handling are in place for production debugging]
      </quality_gates>

<questions>
## Clarify Before Starting

> If any of the following are unclear or missing, **ASK before implementing**. Do not assume or invent solutions.

- [ ] Is the data model complete? Any missing fields, indexes, or relationships?
- [ ] Are all dependencies (services, databases, env vars) available and accessible?
- [ ] Are there existing patterns in the codebase to follow for this type of service/controller?
- [ ] What's the priority — speed to ship or polish?
- [ ] Are there API versioning or backward-compatibility constraints?
- [ ] [Add task-specific questions here]
      </questions>

<context>
## Reference Materials
- [Link to relevant PRD or tech spec]
- [Link to similar service/module in codebase]
- [Link to third-party API docs]
- [Link to database schema or ERD]

## Codebase Location

- Feature path: `[where this service/module should live]`
- Related code: `[existing services or controllers to reference]`
  </context>

## Subtasks

- [ ] X.1 [Subtask description]
- [ ] X.2 [Subtask description]

## Success Criteria

- [Measurable outcomes — e.g., endpoint responds in < 200ms under expected load]
- [Quality requirements — e.g., test coverage ≥ 80% on new code]
- [Functional requirements — e.g., all CRUD operations work correctly]

## Task Tests

- [ ] Unit tests (services, utilities, validators)
- [ ] Integration tests (API endpoints, database operations)
- [ ] E2E tests (critical flows, if applicable)

<critical>ALWAYS CREATE AND RUN THE TASK TESTS BEFORE CONSIDERING IT COMPLETE</critical>

## Relevant Files

- [Relevant files for this task]
