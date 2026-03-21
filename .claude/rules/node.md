# Node.js/TypeScript

> Full examples and patterns: see `nodejs-typescript-reference` skill

## TypeScript

- All source code in TypeScript (`.ts` files)
- `strict: true` in `tsconfig.json`
- Run `npx tsc --noEmit` before finishing any task
- Install `@types/*` packages for untyped dependencies

## Package Manager

- pnpm only (no yarn, no npm)

## Class Properties

- Always `private` or `readonly`; avoid `public` properties
- Use constructor injection for dependencies

## Array Methods

- Prefer `find`, `filter`, `map`, `reduce` over `for`/`while`

## Imports & Exports

- Always `import`/`export`; never `require`/`module.exports`
- Single export → `export default`; multiple exports → named exports
- No circular dependencies; extract shared logic into a third module

## Utility Types

- Use `Partial`, `Pick`, `Omit`, `Readonly`, `Record` when appropriate

## Koa Patterns

- One responsibility per middleware
- `ctx.state.user` for authenticated user; typed with `AuthenticatedContext`
- Error handler middleware at the top of the stack

## Database (TypeORM + PostgreSQL)

- Always parameterized queries; never string interpolation
- Use transactions for multi-step operations
- Use `select` or `QueryBuilder` to fetch only needed fields; avoid N+1 with eager relations or `leftJoinAndSelect`
- Use TypeORM migrations: `typeorm migration:generate` for development; `typeorm migration:run` for production
- Define entities as classes with decorators (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`)
- Use repository pattern via `DataSource.getRepository()` or custom repositories

## Firebase Auth

- Centralized `verifyFirebaseToken()` function
- Typed `AuthenticatedState` interface on `ctx.state`

## Environment Config

- Never access `process.env` directly in code
- Centralized config validated with Zod schema
- Load with `dotenv`, validate with `z.object().parse(process.env)`

## Docker

- Multi-stage builds: builder → runner
- `node:20-alpine` base image; `USER node` in production
- `pnpm install --frozen-lockfile` for installs (not `pnpm install`)

## REST API Responses

- Consistent envelope: `{ data: T, meta?: { page, perPage, total } }`
- Consistent errors: `{ error: { code: string, message: string } }`

## Local toolchain lock

Before installing dependencies or running scripts, use the pinned runtime versions:

```bash
nvm use
pnpm install --frozen-lockfile
```

This repository uses `.nvmrc` (Node 20) and `package.json` `engines` to avoid Node inconsistency issues.
