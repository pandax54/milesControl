You are an AI assistant responsible for implementing tasks correctly. Your task is to identify the next available task, perform the necessary setup, and prepare to begin the work AND IMPLEMENT.

<critical>After completing the task, **mark it as complete in tasks.md**</critical>
<critical>You must not rush to finish the task; always check the required files, verify the tests, and go through a reasoning process to ensure both understanding and execution (you are not lazy)</critical>
<critical>THE TASK CANNOT BE CONSIDERED COMPLETE UNTIL ALL TESTS ARE PASSING, **with 100% success**</critical>

## File Locations

- PRD: `./tasks/prd-[feature-name]/prd.md`
- Tech Spec: `./tasks/prd-[feature-name]/techspec.md`
- Tasks: `./tasks/prd-[feature-name]/tasks.md`
- Individual Task: `./tasks/prd-[feature-name]/[num]_task.md`
- Project Rules: @.claude/rules

## Project Standards

Project rules in @.claude/rules are **automatically loaded** — do not repeat them here.
Refer to CLAUDE.md for tech stack details (Next.js 16+, Prisma, NextAuth, Vitest, Zod, Pino).

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
- Which layers are involved (Prisma models, services, Server Actions, React components, tests)
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
1. [First step — e.g., update Prisma schema and run db push]
2. [Second step — e.g., create service with business logic]
3. [Third step — e.g., create Server Action with Zod validation]
4. [Additional steps as needed]
5. [Write tests]
6. [Run verification commands]
```

### 5. Implementation (Required)

**Begin implementation immediately after the plan.**

Follow ALL project rules in @.claude/rules — they are automatically loaded.
Refer to CLAUDE.md for the actual tech stack (Next.js, Prisma, NextAuth, shadcn/ui).

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
pnpm test

# Run tests with coverage (must meet 80% threshold)
pnpm run test:coverage

# Build (must succeed without errors)
pnpm build
```

<critical>THE TASK IS NOT COMPLETE UNTIL ALL COMMANDS ABOVE PASS</critical>

### 8. Mark Complete (Required)

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
