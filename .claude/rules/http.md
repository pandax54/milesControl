# REST/HTTP

> Full examples and patterns: see `rest-api-reference` skill

## Framework

- Koa + `@koa/router` + `koa-bodyparser`

## Resource Naming

- English, plural, kebab-case: `GET /payment-methods`
- Max 3 levels deep: `GET /playlists/:playlistId/videos` (not deeper)

## Mutations

- POST + verb for actions: `POST /orders/:orderId/cancel`
- PUT only for full resource replacement
- No generic PUT for specific actions

## Request Validation

- Zod schemas for all request payloads
- Return 400 with `result.error.flatten().fieldErrors` on validation failure

## Data Format

- JSON for all request/response payloads
- All dates in ISO 8601 format

## Status Codes

- `200` success
- `400` malformed request / validation error
- `401` not authenticated
- `403` not authorized (authenticated but no permission)
- `404` resource not found
- `422` business rule violation
- `500` unexpected server error

## HTTP Client

- Axios for external API calls
- Create shared instance with `axios.create()` for base URL, timeout, interceptors

## Middleware

- One responsibility per middleware
- Order: error handler → authentication → validation → route handler
- Use `await next()` (Koa async middleware)
