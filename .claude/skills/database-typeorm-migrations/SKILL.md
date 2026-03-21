---
name: database-typeorm-migrations
description: TypeORM migration workflow for Yarn/Turbo monorepos with app-level CLI configs.
---

# TypeORM Migrations (Monorepo)

## Applicability

Use this skill only when all are true:

- the target repository is a Turbo/workspace monorepo
- the repository has an `apps/` and/or `packages/` folder at root
- TypeORM migration work is being performed inside that monorepo repository
- TypeORM CLI runs from an app workspace (e.g. `apps/api`) and reads compiled `dist/` paths

If these signals are missing, do not apply this skill.

## Golden Rules

1. **Generate schema migrations, do not hand-write them.**
2. **Run the generator from the app that owns TypeORM CLI config.**
3. **Build first when the CLI reads `dist/**` paths.\*\*
4. **Only use empty/custom migrations for data backfills, triggers, functions, or non-diff-safe SQL.**
5. **Never change old migrations after they are applied in shared environments.**
6. **Never manually rename migration files or manually add timestamp prefixes in command arguments.**

## Monorepo Discovery Checklist

Before proposing migration changes, verify these files in the target repo:

1. root `package.json` (workspace layout and package manager)
2. app-level TypeORM config (for example `apps/api/typeorm.config.cjs`)
3. app `package.json` migration scripts
4. migration index/glob loader (if present)
5. root module runtime migration settings (`migrationsRun` behavior)

Do not assume names/paths; confirm with tools.

## Typical Workflow

### 1) Change entities first

- Add/update entity classes and relations.
- Ensure the entity is actually loaded by TypeORM in runtime and in CLI context.

### 2) Generate migration from the app workspace

Example pattern:

```bash
cd apps/<app-owning-typeorm>
yarn build
yarn migration:generate src/modules/database/migrations/<name>
```

Filename rule:

- Pass only the migration path and logical name (no timestamp prefix).
- TypeORM auto-generates `<timestamp>-<name>.ts`.
- Do not rename generated migration files.

If your script already builds first, use the script directly.

### 3) Review generated SQL

Check for accidental destructive operations:

- dropped columns/tables
- unexpected index changes
- nullability flips
- enum recreation churn

### 4) Apply and verify

```bash
yarn migration:run
```

Then verify:

- schema matches entity intent
- app boots cleanly
- tests using DB template/migration setup still pass

## Shared Package Entity Pitfall

In monorepos, entities may live under `packages/*`. A common failure mode is:

- runtime loads entity via `autoLoadEntities` or module imports
- but TypeORM CLI generator misses it because `entities` glob only includes app `dist/**`

When this happens, fix CLI discovery (or entity registration path) before generating.

## When To Use Empty/Manual Migrations

Use `migration:create` (empty file) only for:

- trigger/function creation
- data migrations/backfills
- database-specific DDL not reliably generated

For these, include explicit and reversible `up`/`down` logic whenever feasible.

Use this pattern for empty migrations:

```bash
yarn migration:create src/modules/database/migrations/<name>
```

As with `migration:generate`, pass only `<name>` (no timestamp prefix) and do not rename generated files.

## Review Checklist

- Correct app workspace used for generation
- Migration filename/class follows repo naming pattern
- No unrelated SQL noise in generated file
- `down` path is safe and coherent
- Runtime and CLI entity discovery are aligned
- Test setup that depends on migrations still works

## Anti-Patterns

- Writing schema migrations by hand when diff generation is possible
- Running generator from repo root when scripts/config are app-scoped
- Passing `<timestamp>-<name>` into `migration:generate` or `migration:create`
- Renaming generated migration files manually
- Editing historical migration files to "fix" current schema
- Assuming package entities are auto-discovered by CLI without verifying config
