You are an AI assistant responsible for implementing tasks correctly. Your task is to identify the next available task, perform the necessary setup, and prepare to begin the work AND IMPLEMENT.

<critical>After completing the task, **mark it as complete in tasks.md**</critical>
<critical>You must not rush to finish the task; always check the required files, verify the tests, and go through a reasoning process to ensure both understanding and execution (you are not lazy)</critical>
<critical>THE TASK CANNOT BE CONSIDERED COMPLETE UNTIL ALL TESTS ARE PASSING, **with 100% success**</critical>
<critical>You cannot finish the task without running the review agent @task-reviewer; if it does not pass, you must fix the issues and review again</critical>

## File Locations

- PRD: `./tasks/prd-[feature-name]/prd.md`
- Tech Spec: `./tasks/prd-[feature-name]/techspec.md`
- Tasks: `./tasks/prd-[feature-name]/tasks.md`
- Individual Task: `./tasks/prd-[feature-name]/[num]_task.md`
- Project Rules: @.claude/rules

## Project Standards (Rules — Always Loaded)

Before implementing, review the project rules:

- `code-standards.md` — naming, functions, error handling, formatting, imports
- `database.md` — TypeORM patterns, transactions, migrations, relations
- `node.md` — TypeScript, Koa, TypeORM, Firebase, Docker, REST responses
- `http.md` — routing, status codes, middleware, Zod validation
- `logging.md` — Pino levels, structured logging, redaction
- `tests.md` — Vitest structure, mocking, coverage

## Reference Skills (On-Demand — Load When Needed)

If you need detailed examples or patterns for any standard, load the corresponding skill:

- `code-standards-reference` — full examples for naming, functions, error handling, formatting
- `nodejs-typescript-reference` — Koa middleware, TypeORM queries, Firebase auth, Docker, config
- `rest-api-reference` — route definitions, status codes, Axios, Zod validation, middleware
- `logging-reference` — Pino setup, child loggers, koa-pino-logger, redaction
- `testing-reference` — Vitest mocking, time faking, module mocking, coverage config
- `architecture` - project structure, design patterns, service organization
- `typescript` - TypeScript patterns, utility types, advanced types
- `database-typeorm-config` - TypeORM DataSource setup, migrations, naming strategies, test DB config
- `database-typeorm-migrations` - TypeORM migration patterns, generating and running migrations, best practices
- `firebase-auth-basics` - Firebase Auth integration patterns, token verification, error handling

## Steps to Execute

<critical>DO NOT SKIP ANY STEP</critical>

### 1. Pre-Task Setup (Required)

- Read the task definition from `[num]_task.md`
- Read the PRD and Tech Spec referenced in the task's folder
- Review the `tasks.md` to understand dependencies from previous tasks
- Identify which project rules and reference skills are relevant to this task

### 2. Task Analysis (Required)

Analyze considering:

- Main objectives of the task
- How the task fits into the project context
- Alignment with project rules and standards
- Which layers are involved (TypeORM entities, services, Koa routes, middleware, tests)
- Possible solutions or approaches

### 3. Task Summary (Required)

```
Task ID: [ID or number]
Task Name: [Name or brief description]
PRD Context: [Key points from the PRD]
Tech Spec Requirements: [Key technical requirements]
Dependencies: [List of dependencies]
Main Objectives: [Primary objectives]
Risks/Challenges: [Identified risks or challenges]
Relevant Rules: [Which rules apply to this task]
Reference Skills to Load: [Which skills to consult for examples]
```

### 4. Approach Plan (Required)

```
1. [First step — e.g., update TypeORM entities and generate migration]
2. [Second step — e.g., create service with business logic]
3. [Third step — e.g., create Koa route with Zod validation]
4. [Additional steps as needed]
5. [Write tests]
6. [Run verification commands]
```

### 5. Implementation (Required)

**Begin implementation immediately after the plan.**

Follow these standards for every line of code:

**TypeScript & Code Quality:**

- All code in TypeScript with strict mode
- `const` over `let`, never `var`, never `any`
- Functions start with a verb, max 50 lines, max 3 params
- Early returns over nested conditionals
- One responsibility per function — mutation OR query
- Import order: external → internal (`@/`) → relative

**Koa & REST:**

- Koa + @koa/router for all routes
- Zod schemas for all request validation
- Consistent response envelope: `{ data, meta? }` and `{ error: { code, message } }`
- Correct status codes: 200, 400, 401, 403, 404, 422, 500
- One responsibility per middleware with `await next()`
- Firebase Auth token verification on protected routes

**TypeORM & Database:**

- TypeORM for all database operations
- Use `select` or `QueryBuilder` to fetch only needed fields, `leftJoinAndSelect` to avoid N+1
- Transactions for multi-step operations via `DataSource.transaction()` or `QueryRunner`
- Run `npx typeorm migration:generate src/migrations/[descriptive-name]` for entity changes

**Logging:**

- Pino only — never `console.log` or `console.error`
- Data first, message last: `logger.info({ userId }, "User created")`
- Child loggers for request-scoped context via `ctx.log`
- Never log sensitive data

**Environment & Config:**

- Never access `process.env` directly — use centralized Zod-validated config
- Axios with shared instance for external API calls

<critical>Implement proper solutions — NO workarounds or hacks</critical>

### 6. Testing (Required)

- Write co-located test files: `[name].test.ts` next to `[name].ts`
- Follow AAA pattern: Arrange → Act → Assert
- One behavior per test with clear naming: `it("should return null when user not found")`
- Only mock external boundaries (Firebase, external APIs, database)
- Use `vi.mock()` and `vi.mocked()` for module mocking
- Use `vi.useFakeTimers()` / `vi.setSystemTime()` for time-dependent tests

### 7. Verification (Required)

Run all verification commands and ensure they pass:

```bash
# Type checking
npx tsc --noEmit

# Run all tests
npm test

# Run tests with coverage (must meet 80% threshold)
npm run test:coverage

# Check TypeORM migration status (if entities changed)
npx typeorm migration:show
```

<critical>THE TASK IS NOT COMPLETE UNTIL ALL COMMANDS ABOVE PASS</critical>

### 8. Review (Required)

1. Run the review agent @task-reviewer
2. Fix ALL issues flagged by the reviewer
3. Re-run verification commands after fixes
4. Do not finalize the task until the review passes

<critical>You cannot finish the task without a passing review</critical>

### 9. Mark Complete (Required)

- Mark the task as complete in `tasks.md`
- Proceed to the next available task

## Important Notes

- Always read the source code before modifying it
- Follow all standards established in the project rules (@.claude/rules)
- Prioritize resolving root causes, not just symptoms
- If a task requires significant architectural changes, document the justification
- If you discover new bugs during implementation, document them in `bugs.md`

<critical>**YOU MUST** start the implementation right after the plan — do not wait for approval</critical>
<critical>Use the Context7 MCP to review documentation for the language, frameworks, and libraries involved in the implementation</critical>
<critical>After completing the task, mark it as complete in tasks.md</critical>

CRITICAL: NO WORKAROUNDS - implement proper solutions
