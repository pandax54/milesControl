# Database (TypeORM + PostgreSQL)

> Full examples and patterns: see `database-typeorm-config` skill

## DataSource

- One `DataSource` instance per application, exported from a dedicated module
- Configure via `DataSource` constructor; never use deprecated `createConnection`
- Use environment config (Zod-validated) for all connection parameters; never inline credentials
- Set `synchronize: false` in all environments; use migrations exclusively

## Entity Registration

- Register entities explicitly via `entities` array or glob pattern
- Never rely on `autoLoadEntities` alone in projects where CLI migration generation is used
- Entity paths must resolve correctly for both runtime (`.ts`) and CLI/build (`.js`/`dist/`)

## Connection Options

- `ssl: { rejectUnauthorized: true }` for production; disable only in local development
- Set `connectTimeoutMS` and pool size (`extra.max`) appropriate to environment
- Enable `logging: true` only in development; use `["error", "warn"]` in production
- Set `migrationsRun: true` in production to auto-apply pending migrations on startup

## Migrations Config

- Separate CLI config file (`typeorm.config.ts`) that exports `DataSource` for CLI usage
- Migrations directory: `src/modules/database/migrations/`
- Always use `migration:generate` for schema changes; `migration:create` only for data/manual SQL
- Never hand-write schema migrations when diff generation is available

## Repository Pattern

- Access repositories via `dataSource.getRepository(Entity)` or custom repository classes
- Never call `dataSource.query()` for entity operations; use repository/QueryBuilder
- Custom repositories extend `Repository<Entity>` and encapsulate complex queries

## Naming Strategy

- Use `SnakeNamingStrategy` (from `typeorm-naming-strategies`) for PostgreSQL-idiomatic column/table names
- Tables: plural snake_case (`user_profiles`)
- Columns: snake_case (`created_at`, `is_active`)

## Testing

- Use a separate test database; never share with development
- Run migrations before test suites; truncate tables between tests
- Use `DataSource.dropDatabase()` only in test teardown, never in production code
