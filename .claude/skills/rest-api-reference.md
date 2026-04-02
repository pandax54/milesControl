---
name: rest-api-reference
description: Complete REST/HTTP standards with condensed rules and detailed Koa examples for routing, resource naming, mutations, data format, HTTP status codes (200/400/401/403/404/422/500), Axios HTTP client patterns, Koa middleware composition, and Zod request validation. Use when creating new API endpoints, implementing middleware, handling HTTP errors, or setting up Axios clients.
---

# REST/HTTP

## Condensed Rules

### Framework

- Koa + `@koa/router` + `koa-bodyparser`

### Resource Naming

- English, plural, kebab-case: `GET /payment-methods`
- Max 3 levels deep: `GET /playlists/:playlistId/videos` (not deeper)

### Mutations

- POST + verb for actions: `POST /orders/:orderId/cancel`
- PUT only for full resource replacement
- No generic PUT for specific actions

### Request Validation

- Zod schemas for all request payloads
- Return 400 with `result.error.flatten().fieldErrors` on validation failure

### Data Format

- JSON for all request/response payloads
- All dates in ISO 8601 format

### Status Codes

- `200` success
- `400` malformed request / validation error
- `401` not authenticated
- `403` not authorized (authenticated but no permission)
- `404` resource not found
- `422` business rule violation
- `500` unexpected server error

### HTTP Client

- Axios for external API calls
- Create shared instance with `axios.create()` for base URL, timeout, interceptors

### Middleware

- One responsibility per middleware
- Order: error handler → authentication → validation → route handler
- Use `await next()` (Koa async middleware)

---

## Detailed Examples

## Framework

Use Koa to map endpoints, with `@koa/router` for routing.

**Example:**

```typescript
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'

const app = new Koa()
const router = new Router()

app.use(bodyParser())

router.get('/users', async (ctx) => {
  // implementation
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

## REST Pattern

Use the REST pattern for queries, keeping resource names in English and plural, allowing navigability across related resources.

**Example:**

```typescript
// ✅ Prefer
GET /users
GET /users/:userId
GET /playlists/:playlistId/videos
GET /customers/:customerId/invoices

// ❌ Avoid
GET /getUsers
GET /user/:userId (singular)
GET /usuario/:usuarioId (non-English)
```

## Resource Naming

Resources and compound verbs must use kebab-case.

**Example:**

```typescript
// ✅ Prefer
GET /scheduled-events
POST /users/:userId/change-password
GET /payment-methods
POST /orders/:orderId/process-payment

// ❌ Avoid
GET /scheduledEvents (camelCase)
GET /scheduled_events (snake_case)
```

## Resource Depth

Avoid creating endpoints with more than 3 resources.

**Example:**

```typescript
// ❌ Avoid — too deep
GET /channels/:channelId/playlists/:playlistId/videos/:videoId/comments

// ✅ Prefer — more direct
GET /videos/:videoId/comments
GET /comments?videoId=:videoId

// ✅ Or organize in a flatter structure
GET /channels/:channelId/playlists
GET /playlists/:playlistId/videos
GET /videos/:videoId/comments
```

## Mutations and Actions

For mutations, do not follow REST strictly. Use a combination of REST to navigate resources and verbs to represent actions being performed, always with POST.

**Example:**

```typescript
// ✅ Prefer — verbs for specific actions
POST /users/:userId/change-password
POST /orders/:orderId/cancel
POST /invoices/:invoiceId/send-reminder
POST /accounts/:accountId/activate

// ❌ Avoid — generic PUT for specific actions
PUT /users/:userId
PUT /orders/:orderId

// ✅ PUT is appropriate for full resource replacement
PUT /users/:userId
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

## Data Format

The request and response payload format must always be JSON, unless otherwise specified.

**Example:**

```typescript
import bodyParser from 'koa-bodyparser'

app.use(bodyParser())

router.post('/users', async (ctx) => {
  const { name, email } = ctx.request.body
  const user = await createUser({ name, email })
  ctx.body = { id: user.id, name: user.name, email: user.email }
})

// Request
// Content-Type: application/json
// { "name": "John Doe", "email": "john@example.com" }

// Response
// Content-Type: application/json
// { "id": "123", "name": "John Doe", "email": "john@example.com" }
```

## HTTP Status Codes

### 200 - OK

Return when the request is successful.

**Example:**

```typescript
router.get('/users/:userId', async (ctx) => {
  const user = await getUser(ctx.params.userId)
  ctx.status = 200
  ctx.body = user
})

router.post('/users', async (ctx) => {
  const user = await createUser(ctx.request.body)
  ctx.status = 200
  ctx.body = user
})
```

### 404 - Not Found

Return if a resource is not found.

**Example:**

```typescript
router.get('/users/:userId', async (ctx) => {
  const user = await getUser(ctx.params.userId)
  if (!user) {
    ctx.status = 404
    ctx.body = {
      error: 'User not found',
      userId: ctx.params.userId,
    }
    return
  }
  ctx.body = user
})
```

### 500 - Internal Server Error

Return if it is an unexpected error.

**Example:**

```typescript
router.get('/users', async (ctx) => {
  try {
    const users = await getUsers()
    ctx.body = users
  } catch (error) {
    logger.error('Unexpected error fetching users', { error })
    ctx.status = 500
    ctx.body = {
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    }
  }
})
```

### 422 - Unprocessable Entity

Return if it is a business error.

**Example:**

```typescript
router.post('/orders/:orderId/cancel', async (ctx) => {
  const order = await getOrder(ctx.params.orderId)

  if (order.status === 'shipped') {
    ctx.status = 422
    ctx.body = {
      error: 'Cannot cancel shipped order',
      orderId: order.id,
      currentStatus: order.status,
    }
    return
  }

  await cancelOrder(order.id)
  ctx.body = { message: 'Order cancelled successfully' }
})
```

### 400 - Bad Request

Return if the request is not well-formed.

**Example:**

```typescript
router.post('/users', async (ctx) => {
  const { name, email } = ctx.request.body

  if (!name || !email) {
    ctx.status = 400
    ctx.body = {
      error: 'Missing required fields',
      required: ['name', 'email'],
    }
    return
  }

  if (!isValidEmail(email)) {
    ctx.status = 400
    ctx.body = {
      error: 'Invalid email format',
      field: 'email',
    }
    return
  }

  const user = await createUser({ name, email })
  ctx.body = user
})
```

### 401 - Unauthorized

Return if the user is not authenticated.

**Example:**

```typescript
router.get('/profile', async (ctx) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    ctx.status = 401
    ctx.body = {
      error: 'Authentication required',
      message: 'Please provide a valid token',
    }
    return
  }

  const user = await verifyFirebaseToken(token)
  if (!user) {
    ctx.status = 401
    ctx.body = {
      error: 'Invalid token',
      message: 'Token is expired or invalid',
    }
    return
  }

  ctx.body = user
})
```

### 403 - Forbidden

Return if the user is not authorized.

**Example:**

```typescript
router.delete('/users/:userId', async (ctx) => {
  const currentUser = ctx.state.user
  const targetUserId = ctx.params.userId

  // User is authenticated (401), but does not have permission
  if (currentUser.role !== 'admin' && currentUser.uid !== targetUserId) {
    ctx.status = 403
    ctx.body = {
      error: 'Insufficient permissions',
      message: 'You are not allowed to delete this user',
    }
    return
  }

  await deleteUser(targetUserId)
  ctx.body = { message: 'User deleted successfully' }
})
```

## HTTP Client

Use Axios for making calls to external APIs.

**Example:**

```typescript
import axios from 'axios'

// GET request
async function getExternalUser(userId: string) {
  try {
    const response = await axios.get(`https://api.example.com/users/${userId}`)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('API request failed', {
        status: error.response?.status,
        message: error.message,
      })
    }
    throw error
  }
}

// POST request
async function createExternalUser(userData: CreateUserData) {
  const response = await axios.post('https://api.example.com/users', userData, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

// Configure instance with defaults
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

## Middleware

Use middleware for cross-cutting concerns. Each middleware should have a single responsibility.

**Example:**

```typescript
import { Context, Next } from 'koa'

// Authentication middleware
async function authenticate(ctx: Context, next: Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    ctx.status = 401
    ctx.body = { error: 'Authentication required' }
    return
  }

  const user = await verifyFirebaseToken(token)
  if (!user) {
    ctx.status = 401
    ctx.body = { error: 'Invalid token' }
    return
  }

  ctx.state.user = user
  await next()
}

// Validation middleware
async function validateUserInput(ctx: Context, next: Next) {
  const { name, email } = ctx.request.body

  if (!name || !email) {
    ctx.status = 400
    ctx.body = { error: 'Missing required fields' }
    return
  }

  await next()
}

// Usage with @koa/router
router.post('/users', authenticate, validateUserInput, async (ctx) => {
  const user = await createUser(ctx.request.body)
  ctx.body = user
})
```

## Request Validation with Zod

Use Zod to validate request payloads with type-safe schemas.

**Example:**

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
})

type CreateUserInput = z.infer<typeof createUserSchema>

router.post('/users', authenticate, async (ctx) => {
  const result = createUserSchema.safeParse(ctx.request.body)

  if (!result.success) {
    ctx.status = 400
    ctx.body = {
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    }
    return
  }

  const user = await createUser(result.data)
  ctx.body = { data: user }
})
```
