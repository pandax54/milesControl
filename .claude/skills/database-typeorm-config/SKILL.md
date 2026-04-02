````skill
---
name: database-typeorm-config
description: TypeORM DataSource configuration patterns with condensed database rules for Koa/PostgreSQL projects with Zod-validated env, CLI config, entity registration, naming strategy setup, migrations, and repository pattern. Use when configuring database connections, writing entities, setting up migrations, or implementing repository pattern.
---

# TypeORM Database Configuration

## Condensed Rules

### DataSource

- One `DataSource` instance per application, exported from a dedicated module
- Configure via `DataSource` constructor; never use deprecated `createConnection`
- Use environment config (Zod-validated) for all connection parameters; never inline credentials
- Set `synchronize: false` in all environments; use migrations exclusively

### Entity Registration

- Register entities explicitly via `entities` array or glob pattern
- Never rely on `autoLoadEntities` alone in projects where CLI migration generation is used
- Entity paths must resolve correctly for both runtime (`.ts`) and CLI/build (`.js`/`dist/`)

### Connection Options

- `ssl: { rejectUnauthorized: true }` for production; disable only in local development
- Set `connectTimeoutMS` and pool size (`extra.max`) appropriate to environment
- Enable `logging: true` only in development; use `["error", "warn"]` in production
- Set `migrationsRun: true` in production to auto-apply pending migrations on startup

### Migrations Config

- Separate CLI config file (`typeorm.config.ts`) that exports `DataSource` for CLI usage
- Migrations directory: `src/modules/database/migrations/`
- Always use `migration:generate` for schema changes; `migration:create` only for data/manual SQL
- Never hand-write schema migrations when diff generation is available

### Repository Pattern

- Access repositories via `dataSource.getRepository(Entity)` or custom repository classes
- Never call `dataSource.query()` for entity operations; use repository/QueryBuilder
- Custom repositories extend `Repository<Entity>` and encapsulate complex queries

### Naming Strategy

- Use `SnakeNamingStrategy` (from `typeorm-naming-strategies`) for PostgreSQL-idiomatic column/table names
- Tables: plural snake_case (`user_profiles`)
- Columns: snake_case (`created_at`, `is_active`)

### Testing

- Use a separate test database; never share with development
- Run migrations before test suites; truncate tables between tests
- Use `DataSource.dropDatabase()` only in test teardown, never in production code

---

## Detailed Examples & Patterns

## Purpose

Provides concrete patterns for setting up TypeORM `DataSource` configuration in a Koa + PostgreSQL project: environment-driven connection, entity registration, migration paths, CLI config, naming strategy, and test database setup.

## Source of Truth Hierarchy

When rules conflict, apply in this order:

1. Repository lint + compiler rules
2. Existing local pattern in the nearest module
3. Condensed rules above
4. This skill's defaults

## Environment Config

Database connection parameters come from centralized Zod-validated config. Never access `process.env` directly.

```typescript
// src/config.ts
import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})

export const config = envSchema.parse(process.env)
```

## DataSource Setup

Single `DataSource` instance exported from a dedicated database module.

```typescript
// src/modules/database/data-source.ts
import { DataSource } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { config } from '../../config'

export const dataSource = new DataSource({
  type: 'postgres',
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  ssl: config.DB_SSL ? { rejectUnauthorized: true } : false,
  synchronize: false,
  logging: config.NODE_ENV === 'development',
  namingStrategy: new SnakeNamingStrategy(),
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  migrationsRun: config.NODE_ENV === 'production',
})
```

Key points:

- `synchronize: false` always — schema changes go through migrations only
- `SnakeNamingStrategy` maps `camelCase` properties to `snake_case` columns
- Entity glob covers both `.ts` (development/tests) and `.js` (compiled output)
- `migrationsRun: true` in production auto-applies pending migrations on startup
- `logging: true` only in development; use `["error", "warn"]` array for production if partial logging is needed

## CLI Config

Separate file that exports the same `DataSource` for TypeORM CLI commands (`migration:generate`, `migration:run`, etc.).

```typescript
// typeorm.config.ts (project root)
import { dataSource } from './src/modules/database/data-source'

export default dataSource
```

Package scripts:

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d typeorm.config.ts",
    "migration:generate": "npm run typeorm -- migration:generate src/modules/database/migrations/$npm_config_name",
    "migration:create": "npm run typeorm -- migration:create src/modules/database/migrations/$npm_config_name",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

Usage:

```bash
npm run migration:generate --name=AddUserTable
npm run migration:run
```

## Entity Example

```typescript
// src/modules/user/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @CreateDateColumn()
  readonly createdAt!: Date

  @UpdateDateColumn()
  readonly updatedAt!: Date
}
```

With `SnakeNamingStrategy`, `isActive` maps to column `is_active`, `createdAt` to `created_at`, etc.

## Initialization in Koa

```typescript
// src/server.ts
import Koa from 'koa'
import { dataSource } from './modules/database/data-source'
import { config } from './config'
import { logger } from './modules/logger'

const app = new Koa()

async function startServer(): Promise<void> {
  await dataSource.initialize()
  logger.info('Database connection established')

  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Server started')
  })
}

startServer().catch((error) => {
  logger.error({ err: error }, 'Failed to start server')
  process.exit(1)
})
```

## Repository Pattern

```typescript
// src/modules/user/user.repository.ts
import { Repository } from 'typeorm'
import { dataSource } from '../database/data-source'
import { User } from './user.entity'

export const userRepository: Repository<User> = dataSource.getRepository(User)
```

For complex queries, create a custom repository:

```typescript
// src/modules/user/user.repository.ts
import { Repository } from 'typeorm'
import { dataSource } from '../database/data-source'
import { User } from './user.entity'

class UserRepository extends Repository<User> {
  async findActiveByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: { email, isActive: true },
      select: ['id', 'name', 'email'],
    })
  }
}

export const userRepository = new UserRepository(
  User,
  dataSource.createEntityManager(),
)
```

## Test DataSource

Separate database for tests. Initialize before suites, destroy after.

```typescript
// src/modules/database/test-data-source.ts
import { DataSource } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { config } from '../../config'

export const testDataSource = new DataSource({
  type: 'postgres',
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: `${config.DB_NAME}_test`,
  synchronize: false,
  logging: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [`${__dirname}/../**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  migrationsRun: true,
})
```

Vitest global setup:

```typescript
// vitest.setup.ts
import { testDataSource } from './src/modules/database/test-data-source'

beforeAll(async () => {
  await testDataSource.initialize()
  await testDataSource.runMigrations()
})

afterAll(async () => {
  await testDataSource.destroy()
})
```

## Required Dependencies

```bash
npm install typeorm pg typeorm-naming-strategies
npm install --save-dev @types/pg
```

## Anti-Patterns

- Using `synchronize: true` outside of quick prototyping
- Inlining connection strings or credentials instead of using validated config
- Creating multiple `DataSource` instances for the same database in production code
- Using `createConnection` (deprecated) instead of `DataSource`
- Accessing `process.env.DB_*` directly in the data source file
- Missing `ssl` configuration for production deployments
- Using `autoLoadEntities` without verifying CLI migration generation still works
- Hand-writing schema migrations instead of using `migration:generate`
- Sharing development database with test suites

## Rules

- One `DataSource` per application, in `src/modules/database/data-source.ts`
- All connection params from Zod-validated config
- `synchronize: false` in every environment
- `SnakeNamingStrategy` for PostgreSQL-idiomatic names
- Separate CLI config at project root exporting the same `DataSource`
- Entity glob covers both `.ts` and `.js` extensions
- Separate test database with `_test` suffix
- Migrations in `src/modules/database/migrations/`
- `migrationsRun: true` in production only

````
