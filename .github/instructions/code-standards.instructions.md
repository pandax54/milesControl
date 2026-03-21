---
applyTo: "**/*.{ts,tsx,js,jsx,json,md}"
---
# Code Standards

## Language and naming

- Write code, identifiers, and docs in English.
- `camelCase` for functions, methods, and variables.
- `PascalCase` for classes and interfaces.
- `SCREAMING_SNAKE_CASE` for constants and env vars.
- `kebab-case` for files and directories.
- Avoid abbreviations and very long names.

## Functions and methods

- Start function names with verbs.
- Keep max 3 parameters; use object params for more.
- Keep functions focused on one responsibility.
- Prefer early returns and shallow nesting.
- Use `async/await`; do not mix with `.then()`.

## Variables and types

- Prefer `const` over `let`; never use `var`.
- Do not use `any`; prefer `unknown` with type guards.
- Use union types over enums for simple string sets.
- Avoid magic numbers; extract named constants.

## Formatting and structure

- Keep comments only for non-obvious why decisions.
- Import order: external, internal (`@/`), relative.
- Keep file order: imports, constants, types, logic, exports.