# Technical Specification — [Feature Name]

## Executive Summary

[1–2 paragraphs: solution approach, key architectural decisions, implementation strategy.]

## System Architecture

### Component Overview

[Main components and responsibilities:

- Component name → primary function
- Key relationships and data flow between components
- New vs. modified components clearly labeled]

### Component Diagram

```
[User] → [Component A] → [Component B] → [Database]
                ↘ [External Service]
```

## Implementation Design

### Key Interfaces

[Service interfaces (≤20 lines per example):

```typescript
interface ServiceName {
  methodName(input: InputType): Promise<OutputType>
}
```

]

### Data Models

[Core entities and schemas:

```prisma
model EntityName {
  id        String   @id @default(cuid())
  field     Type     @description
  createdAt DateTime @default(now())
}
```

]

### API Endpoints

[Endpoints with request/response shapes:

| Method | Path                | Description      | Auth     |
| ------ | ------------------- | ---------------- | -------- |
| POST   | `/api/resource`     | Creates resource | Required |
| GET    | `/api/resource/:id` | Gets resource    | Required |

]

## Integration Points

[External services, APIs, authentication requirements, error handling approach.
Include only if the feature requires external integrations.]

## Key Decisions

[For each significant technical choice:

### Decision: [What was decided]

**Options considered:**

1. [Option A] — [pros/cons]
2. [Option B] — [pros/cons]

**Chosen:** [option and justification]
**Trade-off:** [what was given up]
]

## Testing Strategy

### Unit Tests

[Services and utilities to test in isolation. Mock boundaries. Edge cases. Coverage targets.]

### Integration Tests

[API flows to validate. Database setup/teardown. Auth verification.]

### E2E Tests

[Critical workflows. External service stubs. Performance thresholds. Only if needed.]

## Development Sequencing

### Build Order

[Implementation sequence with dependency reasoning:

1. [Component] — [why first: no dependencies, blocks others]
2. [Component] — [depends on #1]
3. [Component] — [can parallel with #2]
   ]

### Blocking Dependencies

[Required infrastructure, external service availability, env vars needed]

## Monitoring & Observability

[Key logs and levels. Metrics to track (latency, error rates). Alerting thresholds.]

## Known Risks

| Risk   | Impact       | Likelihood   | Mitigation |
| ------ | ------------ | ------------ | ---------- |
| [risk] | High/Med/Low | High/Med/Low | [approach] |

## Standards Compliance

[Rules from @.claude/rules that apply:

| Rule        | Applies To         |
| ----------- | ------------------ |
| [rule file] | [which components] |

]

## Relevant Files

[Files to create, modify, or reference:

| Status  | Path      | Purpose          |
| ------- | --------- | ---------------- |
| 🆕 New  | `src/...` | [what]           |
| ✏️ Edit | `src/...` | [what changes]   |
| 📖 Read | `src/...` | [reference only] |

]
