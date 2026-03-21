---
applyTo: "**/*.test.ts"
---
# Testing

- Use Vitest for unit and integration tests.
- Co-locate tests next to implementation files.
- Follow AAA pattern: Arrange, Act, Assert.
- Keep tests independent and focused on one behavior.
- Mock only external boundaries.
- Use clear test names describing expected behavior.

## Assertions and quality

- Verify relevant outputs completely.
- Prefer `toBe` for primitives and `toEqual` for objects.
- Restore timers and mocks after use.
- Maintain coverage thresholds (80% branches/functions/lines/statements).