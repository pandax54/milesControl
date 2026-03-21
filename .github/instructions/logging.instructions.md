---
applyTo: "src/**/*.ts"
---
# Logging

- Use Pino for logging.
- Do not use `console.log` or `console.error`.
- Prefer structured logs with data first, message last.
- Include errors via `{ err: error }`.
- Use child loggers for request-scoped context.
- Do not log sensitive data.
- Keep messages concise and specific.