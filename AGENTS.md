<!-- BEGIN:nextjs-agent-rules -->

## Project

Miles & points management platform for the Brazilian market. Next.js 16+ App Router, PostgreSQL via Prisma, TypeScript strict mode.

Check `milescontrol-project` skill for full details.

## Standards & Conventions

Load the relevant skill before writing code:

| Domain             | Skill                         |
| ------------------ | ----------------------------- |
| Code standards     | `code-standards-reference`    |
| Testing            | `testing-reference`           |
| Database           | `database-typeorm-config`     |
| REST/HTTP          | `rest-api-reference`          |
| Node.js/TypeScript | `nodejs-typescript-reference` |
| Logging            | `logging-reference`           |
| Command safety     | `command-safety`              |

## Key Rules

- Read existing source code before modifying it
- No `any` — use `unknown` with type guards
- No `console.log` — use Pino
- No direct `process.env` — use Zod-validated config
- Every feature ships with `.test.ts` files
- English only in all code and comments
<!-- END:nextjs-agent-rules -->
