---
applyTo: "src/**/*.ts"
---
# REST and HTTP

- Use Koa, `@koa/router`, and `koa-bodyparser`.
- Name resources in English, plural, kebab-case.
- Use `POST` for actions (for example `POST /orders/:orderId/cancel`).
- Use `PUT` only for full replacement.

## Validation and responses

- Validate request payloads with Zod.
- On validation errors, return `400` with flattened field errors.
- Use JSON for all request and response payloads.
- Use ISO 8601 for dates.

## Status codes

- `200` success
- `400` malformed request / validation error
- `401` unauthenticated
- `403` unauthorized
- `404` not found
- `422` business rule violation
- `500` unexpected server error

## Middleware

- One responsibility per middleware.
- Preferred order: error handler, authentication, validation, route handler.
- Always `await next()` in async middleware.