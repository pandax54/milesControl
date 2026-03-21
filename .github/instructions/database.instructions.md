---
applyTo: "src/**/*.ts"
---
# Database (TypeORM + PostgreSQL)

## Data source and config

- Use a single `DataSource` instance exported from a dedicated module.
- Configure via environment-based validated config.
- Keep `synchronize: false`; use migrations only.

## Entities and repositories

- Register entities explicitly.
- Use repository pattern via `dataSource.getRepository(Entity)`.
- Avoid raw SQL for entity operations when repository/query builder is appropriate.
- Use parameterized queries.

## Runtime behavior

- Use transactions for multi-step operations.
- Avoid N+1 queries (`leftJoinAndSelect` or equivalent strategy).
- Fetch only needed fields.

## Naming and migrations

- Prefer snake_case naming strategy for PostgreSQL.
- Store migrations under `src/modules/database/migrations/` when applicable.
- Generate migrations from schema diffs when possible.