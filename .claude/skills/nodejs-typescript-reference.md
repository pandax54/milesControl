---
name: nodejs-typescript-reference
description: Complete Node.js and TypeScript standards with condensed rules and detailed examples for class properties, array methods, imports/exports, circular dependencies, utility types, Koa middleware patterns, PostgreSQL query patterns, Firebase auth integration, environment config with Zod, Docker conventions, and REST API response formats. Use when implementing Koa routes, writing database queries, setting up middleware, or configuring Docker.
---

# Node.js/TypeScript Standards

## Condensed Rules

### TypeScript

- All source code in TypeScript (`.ts` files)
- `strict: true` in `tsconfig.json`
- Run `npx tsc --noEmit` before finishing any task
- Install `@types/*` packages for untyped dependencies

### Package Manager

- pnpm only (no yarn, no npm)

### Class Properties

- Always `private` or `readonly`; avoid `public` properties
- Use constructor injection for dependencies

### Array Methods

- Prefer `find`, `filter`, `map`, `reduce` over `for`/`while`

### Imports & Exports

- Always `import`/`export`; never `require`/`module.exports`
- Single export → `export default`; multiple exports → named exports
- No circular dependencies; extract shared logic into a third module

### Utility Types

- Use `Partial`, `Pick`, `Omit`, `Readonly`, `Record` when appropriate

### Koa Patterns

- One responsibility per middleware
- `ctx.state.user` for authenticated user; typed with `AuthenticatedContext`
- Error handler middleware at the top of the stack

### Database (TypeORM + PostgreSQL)

- Always parameterized queries; never string interpolation
- Use transactions for multi-step operations
- Use `select` or `QueryBuilder` to fetch only needed fields; avoid N+1 with eager relations or `leftJoinAndSelect`
- Use TypeORM migrations: `typeorm migration:generate` for development; `typeorm migration:run` for production
- Define entities as classes with decorators (`@Entity`, `@Column`, `@PrimaryGeneratedColumn`)
- Use repository pattern via `DataSource.getRepository()` or custom repositories

### Firebase Auth

- Centralized `verifyFirebaseToken()` function
- Typed `AuthenticatedState` interface on `ctx.state`

### Environment Config

- Never access `process.env` directly in code
- Centralized config validated with Zod schema
- Load with `dotenv`, validate with `z.object().parse(process.env)`

### Docker

- Multi-stage builds: builder → runner
- `node:20-alpine` base image; `USER node` in production
- `pnpm install --frozen-lockfile` for installs (not `pnpm install`)

### REST API Responses

- Consistent envelope: `{ data: T, meta?: { page, perPage, total } }`
- Consistent errors: `{ error: { code: string, message: string } }`

### Local toolchain lock

Before installing dependencies or running scripts, use the pinned runtime versions:

```bash
nvm use
pnpm install --frozen-lockfile
```

---

## Detailed Examples

> Language-agnostic coding standards (naming, formatting, conditionals, immutability, type safety, async/await, error handling, etc.) are defined in `code-standards-reference` skill. This file covers **Node.js and TypeScript-specific** conventions only.

## TypeScript

All source code must be written in TypeScript.

**Example:**

```typescript
// ✅ Prefer .ts files
// user.service.ts
interface User {
  id: string
  name: string
  email: string
}

export class UserService {
  getUser(id: string): User {
    // implementation
  }
}
```

## Package Manager

Use npm as the standard tool for managing dependencies and running scripts.

**Example:**

```bash
# Install dependencies
npm install

# Add a new dependency
npm install axios

# Add a development dependency
npm install --save-dev @types/jest

# Run scripts
npm run dev
npm test
npm run build
```

## Library Types

When necessary, install type definitions for libraries, for example: `jest` and `@types/jest`.

**Example:**

```bash
npm install jest --save-dev
npm install @types/jest --save-dev

npm install express
npm install @types/express --save-dev
```

## Type Validation

Before finishing a task, always validate that the typing is correct.

**Example:**

```bash
# Run type checking
npx tsc --noEmit

# Configure in package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "build": "npm run type-check && tsc"
  }
}
```

## Class Properties

Always declare class properties as `private` or `readonly`, avoiding the use of `public`.

**Example:**

```typescript
// ❌ Avoid
class UserService {
  public database: Database
  public config: Config
}

// ✅ Prefer
class UserService {
  private readonly database: Database
  private readonly config: Config

  constructor(database: Database, config: Config) {
    this.database = database
    this.config = config
  }

  public getUser(id: string): User {
    return this.database.findUser(id)
  }
}
```

## Array Methods

Prefer the use of `find`, `filter`, `map`, and `reduce` over `for` and `while`.

**Example:**

```typescript
const users = [
  { id: 1, name: 'John', age: 30 },
  { id: 2, name: 'Jane', age: 25 },
  { id: 3, name: 'Bob', age: 35 },
]

// ❌ Avoid
const result = []
for (let i = 0; i < users.length; i++) {
  if (users[i].age > 25) {
    result.push(users[i].name)
  }
}

// ✅ Prefer
const result = users.filter((user) => user.age > 25).map((user) => user.name)

// Find
const user = users.find((u) => u.id === 2)

// Reduce
const totalAge = users.reduce((sum, user) => sum + user.age, 0)
```

## Imports and Exports

Never use `require` to import modules; always use `import`. Never use `module.exports` to export modules; always use `export`.

**Example:**

```typescript
// ❌ Avoid
const express = require('express')
const { UserService } = require('./user.service')
module.exports = { createUser }

// ✅ Prefer
import express from 'express'
import { UserService } from './user.service'
export { createUser }
```

## Default vs Named Exports

If the file has only one thing being exported, use `default`; otherwise, use named exports.

**Example:**

```typescript
// user.service.ts — only one class
export default class UserService {
  // ...
}

// user.utils.ts — multiple functions
export function validateEmail(email: string): boolean {
  // ...
}

export function formatName(name: string): string {
  // ...
}

export function calculateAge(birthDate: Date): number {
  // ...
}
```

## Circular Dependencies

Avoid circular dependencies.

**Example:**

```typescript
// ❌ Avoid
// user.service.ts
import { OrderService } from './order.service'

export class UserService {
  constructor(private orderService: OrderService) {}
}

// order.service.ts
import { UserService } from './user.service'

export class OrderService {
  constructor(private userService: UserService) {}
}

// ✅ Prefer
// user.service.ts
export class UserService {
  getUser(id: string): User {}
}

// order.service.ts
export class OrderService {
  getOrders(userId: string): Order[] {}
}

// user-order.service.ts
import { UserService } from './user.service'
import { OrderService } from './order.service'

export class UserOrderService {
  constructor(
    private userService: UserService,
    private orderService: OrderService,
  ) {}

  getUserWithOrders(userId: string) {
    const user = this.userService.getUser(userId)
    const orders = this.orderService.getOrders(userId)
    return { ...user, orders }
  }
}
```

## Utility Types

Use TypeScript utility types when appropriate.

**Example:**

```typescript
interface User {
  id: string
  name: string
  email: string
  password: string
}

// Partial — all fields optional
type UserUpdate = Partial<User>

// Pick — select specific fields
type UserPublic = Pick<User, 'id' | 'name' | 'email'>

// Omit — exclude specific fields
type UserCreate = Omit<User, 'id'>

// Readonly — make immutable
type UserReadonly = Readonly<User>

// Record — create object with specific keys
type UserMap = Record<string, User>
```

## Koa Middleware Patterns

Separate middleware by responsibility. Each middleware should do one thing.

**Example:**

```typescript
// ❌ Avoid — mixing concerns in a single middleware
app.use(async (ctx) => {
  try {
    const token = ctx.headers.authorization
    const user = await verifyFirebaseToken(token)
    ctx.state.user = user
    const data = await fetchData(user.id)
    ctx.body = data
  } catch (error) {
    ctx.status = 500
    ctx.body = { error: 'Something went wrong' }
  }
})

// ✅ Prefer — separated middleware with clear responsibilities
const authenticate = async (ctx: Context, next: Next) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    ctx.throw(401, 'Missing authorization token')
  }
  ctx.state.user = await verifyFirebaseToken(token)
  await next()
}

const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    if (error instanceof AppError) {
      ctx.status = error.statusCode
      ctx.body = { error: error.message }
      return
    }
    ctx.status = 500
    ctx.body = { error: 'Internal server error' }
  }
}
```

## Database Query Patterns (PostgreSQL)

Always use parameterized queries. Use transactions for multi-step operations.

**Example:**

```typescript
// ❌ Avoid — string interpolation in queries
async function getUser(id: string) {
  return db.query(`SELECT * FROM users WHERE id = '${id}'`)
}

// ✅ Prefer — parameterized queries
async function getUser(id: string): Promise<User | null> {
  const result = await db.query<User>(
    'SELECT id, name, email FROM users WHERE id = $1',
    [id],
  )
  return result.rows[0] ?? null
}

// ✅ Prefer — transactions for multi-step operations
async function transferFunds(fromId: string, toId: string, amount: number) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId],
    )
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

## Firebase Auth Patterns

Type the authenticated user in Koa state. Centralize token verification.

**Example:**

```typescript
interface AuthenticatedState {
  user: {
    uid: string
    email: string
    role: string
  }
}

type AuthenticatedContext = Context & { state: AuthenticatedState }

async function verifyFirebaseToken(token: string): Promise<DecodedIdToken> {
  try {
    return await admin.auth().verifyIdToken(token)
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token')
  }
}
```

## Environment Variables and Configuration

Centralize configuration with validation. Never access `process.env` directly throughout the code.

**Example:**

```typescript
// ❌ Avoid — accessing process.env directly throughout the code
const port = process.env.PORT
const dbUrl = process.env.DATABASE_URL

// ✅ Prefer — centralized, validated config
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  FIREBASE_PROJECT_ID: z.string().min(1),
})

export const config = envSchema.parse(process.env)
```

## Docker Development Conventions

Use multi-stage builds for smaller production images.

**Example:**

```dockerfile
# ✅ Prefer — multi-stage builds
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER node
CMD ["node", "dist/server.js"]
```

## REST API Response Conventions

Use a consistent response envelope for all API endpoints.

**Example:**

```typescript
interface ApiResponse<T> {
  data: T
  meta?: {
    page: number
    perPage: number
    total: number
  }
}

interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// Usage in a Koa route
router.get('/users', async (ctx: AuthenticatedContext) => {
  const { page, perPage } = parsePagination(ctx.query)
  const { users, total } = await userService.listUsers({ page, perPage })
  ctx.body = {
    data: users,
    meta: { page, perPage, total },
  } satisfies ApiResponse<User[]>
})

// Error responses
router.get('/users/:id', async (ctx: AuthenticatedContext) => {
  const user = await userService.getUser(ctx.params.id)
  if (!user) {
    ctx.status = 404
    ctx.body = {
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    } satisfies ApiError
    return
  }
  ctx.body = { data: user } satisfies ApiResponse<User>
})
```
