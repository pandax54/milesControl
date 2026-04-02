# CLAUDE.md — MilesControl

## Project

Miles & points management platform for the Brazilian market. Next.js 16+ App Router, PostgreSQL via Prisma, TypeScript strict mode.

Check `milescontrol-project` skill for full project details.

## Environment

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm test             # Run all tests
pnpm run test:coverage # Tests with coverage (80% threshold)
npx tsc --noEmit      # Type checking

# Database
pnpm prisma db push   # Sync schema to database
pnpm prisma generate  # Regenerate Prisma client
pnpm prisma studio    # Visual database browser
```

## Workflow

This project uses a structured **architect → implement → review → QA** pipeline:

```
create-prd → create-techspec → create-tasks → execute-task → execute-review → execute-qa → execute-bugfix
```

All commands are in `.claude/commands/`. Templates are in `.claude/templates/`.
Task artifacts live in `./tasks/prd-[feature-name]/`.

For automated multi-task execution, use `ralph-once.sh` (single task with human checkpoints) or `run-phase.sh` (full phase).

## Standards & Conventions

Before writing code, load the relevant skill. Each skill contains the full reference with rules and examples.

| Domain                                                | Skill                         |
| ----------------------------------------------------- | ----------------------------- |
| Code standards (naming, functions, types, formatting) | `code-standards-reference`    |
| Testing (structure, coverage, mocking, assertions)    | `testing-reference`           |
| Database (Prisma, entities, migrations, repository)   | `database-typeorm-config`     |
| REST/HTTP (routing, status codes, validation)         | `rest-api-reference`          |
| Node.js/TypeScript (strict mode, imports, env config) | `nodejs-typescript-reference` |
| Logging (Pino, levels, redaction, structured JSON)    | `logging-reference`           |
| Command safety (destructive ops, approval flow)       | `command-safety`              |
| Architecture (SOLID, Clean Code, patterns)            | `architecture`                |
| Next.js (App Router, RSC, Server Actions)             | `nextjs`                      |
| React (hooks, state, performance)                     | `reactjs`                     |

## Key Rules

- **Read before write** — always read existing source code before modifying it
- **No `any`** — use `unknown` with type guards or proper types
- **No `console.log`** — use Pino for all logging
- **No direct `process.env`** — use Zod-validated config
- **Tests are not optional** — every feature ships with co-located `.test.ts` files
- **English only** — all code, comments, and commit messages in English
