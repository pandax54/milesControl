# Code Standards

> Full examples and patterns: see `code-standards-reference` skill

## Language

- All code, variables, functions, classes, comments, and documentation in English

## Naming

- `camelCase`: methods, functions, variables
- `PascalCase`: classes, interfaces
- `SCREAMING_SNAKE_CASE`: constants, environment variables
- `kebab-case`: files, directories
- No abbreviations, no names over 30 characters

## Functions & Methods

- Name starts with a verb, never a noun
- Max 3 parameters; use an object for more
- Max 50 lines per method, 300 lines per class
- One action per function: mutation OR query, never both
- No flag parameters — extract separate functions instead

## Control Flow

- Max 2 levels of if/else nesting; prefer early returns
- Always use async/await; never mix `.then()` with `await`

## Variables & Types

- `const` over `let`; never `var`
- Never use `any`; use `unknown` with type guards
- Prefer union types over enums for simple strings
- One variable per line; declare close to usage
- Use `readonly` on properties that shouldn't change

## Error Handling

- Custom error classes for domain errors
- Never swallow exceptions; handle meaningfully or re-throw
- Handle errors at boundaries (controllers/handlers)

## Formatting & Comments

- Blank lines sparingly, only to separate logical blocks
- No "what" comments; only "why" comments for non-obvious decisions
- One variable declaration per line

## Imports & File Structure

- Import order: external libs → internal modules (`@/`) → relative
- File order: imports → constants → types → main logic → exports
- Constants co-located with usage or in shared constants file

## Constants

- No magic numbers; extract to named SCREAMING_SNAKE_CASE constants
