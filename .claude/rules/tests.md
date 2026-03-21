# Testing

> Full examples and patterns: see `testing-reference` skill

## Framework

- Vitest for unit and integration tests; Playwright for E2E
- Co-located test files: `user.service.test.ts` next to `user.service.ts`

## Execution

- `npm test` → `vitest run`
- `npm run test:watch` → `vitest` (watch mode)
- `npm run test:coverage` → `vitest run --coverage`

## Structure

- AAA pattern: Arrange → Act → Assert
- One behavior per test; keep tests small and focused
- Clear naming: `it("should return null when user not found")`
- No dependencies between tests; each test sets up its own data

## Assertions

- Verify all relevant outputs; don't skip fields
- Use `expect(x).toBe()` for primitives, `expect(x).toEqual()` for objects

## Mocking

- Only mock external boundaries: APIs, databases, Firebase, third-party services
- Never mock the code under test
- Use `vi.mock()` and `vi.mocked()` for module mocking
- Use `vi.useFakeTimers()` / `vi.setSystemTime()` for time-dependent tests
- Always clean up: `vi.useRealTimers()`, `vi.restoreAllMocks()`

## Coverage

- Provider: `v8`
- Threshold: 80% for branches, functions, lines, statements
- Configure in `vitest.config.ts`
