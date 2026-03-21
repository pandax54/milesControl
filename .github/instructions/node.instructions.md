---
applyTo: "src/**/*.ts"
---
# Node.js and TypeScript

- All source code must be TypeScript.
- Assume strict mode and type-safe implementations.
- Prefer `import` and `export`; avoid CommonJS.
- Prefer utility types (`Pick`, `Omit`, `Partial`, `Readonly`, `Record`) when useful.
- Avoid circular dependencies.

## Config and environment

- Never access `process.env` directly in feature code.
- Use centralized, validated config.

## API patterns

- Consistent API response envelope:
  - success: `{ data: T, meta?: { page, perPage, total } }`
  - error: `{ error: { code: string, message: string } }`

## Docker and install

- Use npm.
- Prefer reproducible installs (`npm ci`) in CI/containers.