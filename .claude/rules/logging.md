# Logging

> Full examples and patterns: see `logging-reference` skill

## Library

- Pino only; never `console.log` or `console.error`
- `pino-pretty` for development; structured JSON for production
- `koa-pino-logger` for automatic HTTP request logging via `ctx.log`

## Levels

- `debug`: development insights, query durations
- `info`: successful operations, state changes
- `warn`: recoverable issues, deprecation notices
- `error`: failures needing attention

## Syntax

- Data first, message last: `logger.info({ userId }, "User created")`
- Error objects as `err` property: `logger.error({ err: error, orderId }, "Payment failed")`
- Use child loggers for request-scoped context: `logger.child({ requestId })`

## Rules

- Stdout/stderr only; never write to files
- Never log sensitive data (names, emails, cards, tokens, passwords)
- Use Pino `redact` option for automatic field masking
- Never silence exceptions; always log then re-throw or handle
- Clear, concise messages; no verbose sentences, no vague "Error" or "Done"
- Always include structured context (IDs, amounts, error codes)
- Never use string interpolation for log messages
