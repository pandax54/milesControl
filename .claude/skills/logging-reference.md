---
name: logging-reference
description: Complete Pino logging standards with condensed rules and detailed examples for logger setup, log levels, sensitive data redaction, structured logging, exception handling patterns, child loggers for request context, and koa-pino-logger HTTP integration. Use when setting up logging, handling errors, configuring Pino transports, or implementing request-scoped logging.
---

# Logging

## Condensed Rules

### Library

- Pino only; never `console.log` or `console.error`
- `pino-pretty` for development; structured JSON for production
- `koa-pino-logger` for automatic HTTP request logging via `ctx.log`

### Levels

- `debug`: development insights, query durations
- `info`: successful operations, state changes
- `warn`: recoverable issues, deprecation notices
- `error`: failures needing attention

### Syntax

- Data first, message last: `logger.info({ userId }, "User created")`
- Error objects as `err` property: `logger.error({ err: error, orderId }, "Payment failed")`
- Use child loggers for request-scoped context: `logger.child({ requestId })`

### Rules

- Stdout/stderr only; never write to files
- Never log sensitive data (names, emails, cards, tokens, passwords)
- Use Pino `redact` option for automatic field masking
- Never silence exceptions; always log then re-throw or handle
- Clear, concise messages; no verbose sentences, no vague "Error" or "Done"
- Always include structured context (IDs, amounts, error codes)
- Never use string interpolation for log messages

---

## Detailed Examples

## Library

Use Pino as the standard logging library. Use `pino-pretty` for development and structured JSON output for production.

**Example:**

```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})

export default logger
```

## Log Levels

Use log levels appropriately. Use `debug` for development insights and `error` for errors that need to be analyzed. Never use `console.log` or `console.error` directly — always use the Pino logger instance.

**Example:**

```typescript
// ❌ Avoid — raw console methods
console.log('User authentication started', { userId })
console.error('Failed to authenticate user', { userId })

// ✅ Prefer — Pino logger with proper levels
logger.debug({ userId }, 'User authentication started')
logger.debug({ query, duration }, 'Database query executed')

logger.error({ userId, error: error.message }, 'Failed to authenticate user')
logger.error({ error }, 'Database connection failed')
```

## Storage

Never store logs in files. Always redirect through the process itself (stdout/stderr). Pino outputs to stdout by default, which is the correct behavior.

**Example:**

```typescript
// ✅ Prefer — logs go to stdout/stderr by default with Pino
logger.info('User created successfully')
logger.error('Failed to create user')

// Configure your environment to capture logs:
// - Docker: docker logs
// - Kubernetes: kubectl logs
// - Log services: CloudWatch, Datadog, etc.
```

## Sensitive Data

Never log sensitive data such as names, addresses, and credit card numbers. Use Pino's built-in `redact` option to automatically mask sensitive fields.

**Example:**

```typescript
// Configure redaction at logger creation
const logger = pino({
  redact: ['password', 'creditCard', 'ssn', 'token', 'authorization'],
})

// ❌ Avoid
logger.info(
  {
    name: 'John Doe',
    email: 'john@example.com',
    creditCard: '4111-1111-1111-1111',
    ssn: '123-45-6789',
  },
  'User created',
)

// ✅ Prefer — log only identifiers
logger.info(
  {
    userId: 'user_123',
  },
  'User created',
)

// If necessary for debugging, mask sensitive data
function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  return `${name.substring(0, 2)}***@${domain}`
}

logger.info(
  {
    userId: 'user_123',
    email: maskEmail('john@example.com'), // jo***@example.com
  },
  'User created',
)
```

## Clear Messages

Always be clear in log messages, without being excessive or using long text. In Pino, the message is always the last argument.

**Example:**

```typescript
// ❌ Avoid — too verbose
logger.info(
  'The user with the ID 123 has successfully completed the registration process and is now able to access the system with full privileges',
)

// ❌ Avoid — too vague
logger.info('Done')
logger.error('Error')

// ✅ Prefer — clear and concise
logger.info({ userId: '123' }, 'User registered successfully')
logger.error(
  {
    orderId: 'order_456',
    reason: 'insufficient_funds',
  },
  'Payment processing failed',
)
```

## Exception Handling

Never silence exceptions. Always log them properly.

**Example:**

```typescript
// ❌ Avoid
try {
  await processPayment(orderId)
} catch (error) {
  // silently ignored
}

// ❌ Avoid
try {
  await processPayment(orderId)
} catch (error) {
  logger.error(error) // no context
}

// ✅ Prefer — log with context and re-throw
try {
  await processPayment(orderId)
} catch (error) {
  logger.error(
    {
      orderId,
      err: error,
    },
    'Payment processing failed',
  )
  throw error
}

// Or handle appropriately
try {
  await processPayment(orderId)
} catch (error) {
  logger.error({ orderId, err: error }, 'Payment processing failed')
  return { success: false, error: 'payment_failed' }
}
```

## Context in Logs

Always include relevant context in logs to facilitate debugging. Use Pino child loggers to add persistent context to a set of related operations.

**Example:**

```typescript
// ❌ Avoid — no context
logger.info('Operation completed')
logger.error('Failed')

// ✅ Prefer — with context
logger.info(
  {
    orderId: 'order_123',
    amount: 99.99,
    currency: 'USD',
  },
  'Payment processed',
)

logger.error(
  {
    orderId: 'order_123',
    userId: 'user_456',
    errorCode: 'insufficient_funds',
    attemptNumber: 3,
  },
  'Payment failed',
)

// ✅ Prefer — child loggers for request-scoped context
const requestLogger = logger.child({ requestId, userId })
requestLogger.info({ orderId }, 'Order created')
requestLogger.info({ orderId }, 'Payment processed')
// Both logs will include requestId and userId automatically
```

## Log Structure

Use structured objects to facilitate parsing and analysis. Pino outputs JSON by default, so always pass data as the first argument and the message as the second.

**Example:**

```typescript
// ❌ Avoid — unstructured string interpolation
logger.info(`User ${userId} created order ${orderId} with total ${total}`)

// ✅ Prefer — structured object
logger.info(
  {
    userId,
    orderId,
    total,
    source: 'web',
  },
  'Order created',
)

// This makes it easy to query in log systems:
// - Filter by specific userId
// - Search for orders above a value
// - Group by source
```

## HTTP Request Logging

Use `koa-pino-logger` for automatic HTTP request logging in Koa.

**Example:**

```typescript
import Koa from 'koa'
import pinoLogger from 'koa-pino-logger'

const app = new Koa()

app.use(
  pinoLogger({
    logger,
    autoLogging: true,
  }),
)

// Access the request-scoped logger in routes
router.get('/users', async (ctx) => {
  ctx.log.info('Fetching users')
  const users = await getUsers()
  ctx.body = { data: users }
})
```
