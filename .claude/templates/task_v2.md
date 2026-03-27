# Task [X.0]: [Task Title]

> **How to use this template:** Replace all `[bracketed]` placeholders with real values. Delete any section marked `<!-- optional -->` that doesn't apply. The more concrete detail you provide, the fewer assumptions the LLM will make — and the fewer corrections you'll need.

---

## Overview

[2–3 sentences. What is being built, why it exists, and what system/user problem it solves.]

---

## ⚠️ Pre-Conditions — Read Before Writing Any Code

> Skipping these files invalidates the task. If any file is missing or unreadable, **STOP and report it. Do not invent values.**

| File                    | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `[path/to/spec.md]`     | [What it contains — e.g., API contracts, data shapes] |
| `[path/to/design.json]` | [e.g., Design tokens — exact colors, spacing, radii]  |
| `[path/to/reference]`   | [e.g., Existing pattern to follow]                    |

---

## Constraints

### Must Have

- [ ] [Non-negotiable. Be specific — e.g., "All API calls go through `/api/*`, never directly to third-party services."]
- [ ] [e.g., "Strict TypeScript — no `any` types."]
- [ ] [e.g., "All user-facing strings in the language defined in the project i18n config."]

### Must NOT Have

- [ ] [Anti-pattern to avoid — e.g., "No inline styles."]
- [ ] [e.g., "No `console.log` in production code."]
- [ ] [e.g., "No business logic inside UI components."]

### Follow Existing Patterns From

- `[path/to/file]` — [what pattern to replicate, e.g., "error handling shape"]
- `[path/to/file]` — [e.g., "hook structure and return type convention"]

---

## Dependencies

### Requires (must exist before this task starts)

- [ ] `[service / endpoint / table]` — [what it provides]
- [ ] `[env variable]` — [what it is, where to get it]
- [ ] `[npm/pip/brew package]` — [version if important]

### Install Before Starting

```bash
# Run this first — do not skip
cd [workspace] && [package manager] add [package1] [package2]
```

### Provides (what this task exposes when done)

- `[exported module / endpoint / component]` — [who consumes it and how]

---

## File Map

> The LLM must not create files outside this list without explicit justification.

| Status  | Path                 | Description                    |
| ------- | -------------------- | ------------------------------ |
| 🆕 New  | `[src/path/file.ts]` | [What it contains]             |
| 🆕 New  | `[src/path/file.ts]` | [What it contains]             |
| ✏️ Edit | `[src/path/file.ts]` | [What changes]                 |
| 📖 Read | `[path/to/spec]`     | Reference only — do not modify |

---

## Implementation Spec

### Data / Type Contracts

> Paste exact interfaces, schemas, or data shapes here. Do not reference an external file — having them in context prevents type mismatches.

```ts
// Types the LLM must use exactly as written

export interface [Name] {
  field: type   // description
  field?: type  // optional — description
}
```

### Core Logic

For each function, hook, service, or module being built:

#### `[functionOrModuleName]`

**Signature:** `[functionName](arg: Type): ReturnType`

**Rules:**

- [Rule 1 — be literal. e.g., "Returns `null` when input is empty string, never throws."]
- [Rule 2]
- [Edge case — e.g., "Unknown enum values default to `'unknown'`, log a warning in dev only."]

### Component / Endpoint Behavior <!-- optional -->

#### `[ComponentOrEndpointName]`

**Inputs / Props:**

```ts
// exact shape
```

**Behavior:**

- [What it renders or returns on success]
- [What it does on user interaction]
- [How it behaves while loading]
- [How it behaves on error]

**Must NOT:**

- [Anti-pattern specific to this unit]

---

## Edge Cases

> The LLM must handle every row. "Not specified" is not an acceptable implementation.

| Scenario                         | Expected Behavior                                               |
| -------------------------------- | --------------------------------------------------------------- |
| [e.g., Resource not found]       | [e.g., Return 404 with `{ error: "Not found" }`, do not throw]  |
| [e.g., Invalid input]            | [e.g., Return 400, list which fields failed validation]         |
| [e.g., External service timeout] | [e.g., Retry once, then surface generic error to caller]        |
| [e.g., Empty state / no data]    | [e.g., Render empty state UI, not a blank screen]               |
| [e.g., Network offline]          | [e.g., Show cached data if available, else show offline banner] |

---

## Subtasks

> Complete in order unless marked `[parallel]`. Each subtask must include writing its own tests before moving to the next.

### [X.1] — [Setup / Foundation]

- [ ] **[X.1.1]** [Exact action — e.g., "Install dependencies using the command in the Dependencies section and verify `package.json` was updated."]
- [ ] **[X.1.2]** [e.g., "Configure environment variables — copy `.env.example` to `.env.local` and fill in `[VAR_NAME]`."]

### [X.2] — [Core Logic]

- [ ] **[X.2.1]** [Implement `[module]` per the spec in Implementation Spec above.]
- [ ] **[X.2.2]** [Write unit tests for `[module]` covering all rules and edge cases listed above. **Tests must pass before continuing.**]

### [X.3] — [Integration / Wiring]

- [ ] **[X.3.1]** [Connect `[module A]` to `[module B]`.]
- [ ] **[X.3.2]** [Write integration test for the full flow.]

### [X.4] — [Final Checks]

- [ ] **[X.4.1]** Run the full test suite and fix any failures.
- [ ] **[X.4.2]** Run the linter and fix all errors.
- [ ] **[X.4.3]** Run the type checker and fix all errors.
- [ ] **[X.4.4]** Run the app locally and manually verify the success criteria below.

---

## Tests

> All items must be written AND passing before this task is considered done.

### Unit Tests

- [ ] `[module]` — [what behavior is verified. e.g., "returns `'sunny'` for WMO codes 0–1, `'rainy'` for 51–99, defaults to `'cloudy'` for unknown codes"]
- [ ] `[module]` — [e.g., "returns 400 when required field is missing from request body"]

### Integration Tests

- [ ] [e.g., "Full flow: form submit → API call → data rendered on screen with mock server"]
- [ ] [e.g., "Loading state visible during fetch, replaced by data on success"]
- [ ] [e.g., "Error state shown on 4xx/5xx, retry button resets state and re-triggers fetch"]

### Manual Verification Checklist

- [ ] Start the app: `[command to run locally — e.g., bun dev / npm run dev / make dev]`
- [ ] [Observable check — e.g., "Navigate to `/` — dashboard loads without console errors"]
- [ ] [Observable check — e.g., "Search for a valid city — results appear within 2 seconds"]
- [ ] [Observable check — e.g., "Search for an invalid city — friendly error message appears"]
- [ ] [Observable check — e.g., "Resize to mobile width — layout switches to single column"]

---

## Quality Gates

Run all of these. The task is **not done** until every command exits with zero errors.

```bash
[test command]       # e.g., bun test / npm test
[lint command]       # e.g., bun run lint / npm run lint
[typecheck command]  # e.g., bun run typecheck / tsc --noEmit
[build command]      # e.g., bun run build / npm run build
```

---

## Success Criteria

> Observable, unambiguous outcomes. If these are all true, the task is complete.

- [ ] [e.g., "A user can [do X] and see [Y result] without errors."]
- [ ] [e.g., "[Feature] works on both mobile (390px) and desktop (1440px)."]
- [ ] [e.g., "All edge cases in the table above are handled gracefully."]
- [ ] All tests pass.
- [ ] All quality gates pass.

---

## Questions to Resolve Before Starting

> If the answer to any of these is unknown — **ask, do not assume.**

- [ ] [e.g., "Is the `[dependency]` service already running and accessible?"]
- [ ] [e.g., "Is there an existing test setup, or does it need to be configured?"]
- [ ] [e.g., "What is the expected behavior when [ambiguous scenario]?"]
- [ ] [Task-specific question]
