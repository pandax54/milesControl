---
name: testing-reference
description: Complete Vitest testing standards with condensed rules and detailed examples for test structure, AAA pattern, time mocking, focused tests, coverage configuration, consistent assertions, test naming, module mocking for Firebase and external services, and co-located file organization. Use when writing tests, setting up mocks, or configuring coverage.
---

# Testing

## Condensed Rules

### Framework

- Vitest for unit and integration tests; Playwright for E2E
- Co-located test files: `user.service.test.ts` next to `user.service.ts`

### Execution

- `npm test` → `vitest run`
- `npm run test:watch` → `vitest` (watch mode)
- `npm run test:coverage` → `vitest run --coverage`

### Structure

- AAA pattern: Arrange → Act → Assert
- One behavior per test; keep tests small and focused
- Clear naming: `it("should return null when user not found")`
- No dependencies between tests; each test sets up its own data

### Assertions

- Verify all relevant outputs; don't skip fields
- Use `expect(x).toBe()` for primitives, `expect(x).toEqual()` for objects

### Mocking

- Only mock external boundaries: APIs, databases, Firebase, third-party services
- Never mock the code under test
- Use `vi.mock()` and `vi.mocked()` for module mocking
- Use `vi.useFakeTimers()` / `vi.setSystemTime()` for time-dependent tests
- Always clean up: `vi.useRealTimers()`, `vi.restoreAllMocks()`

### Coverage

- Provider: `v8`
- Threshold: 80% for branches, functions, lines, statements
- Configure in `vitest.config.ts`

---

## Detailed Examples

## Framework

Use Vitest for defining test scenarios and expectations.

**Example:**

```typescript
import { describe, it, expect } from 'vitest'

describe('UserService', () => {
  it('should create a new user', () => {
    const user = createUser({ name: 'John', email: 'john@example.com' })
    expect(user.name).toBe('John')
  })
})
```

## Execution

To run tests, use the command:

```bash
npm test
```

Configure in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Independence

Do not create dependencies between tests. It must be possible to run each one independently.

**Example:**

```typescript
// ❌ Avoid
let sharedUser: User

it('should create user', () => {
  sharedUser = createUser({ name: 'John' })
})

it('should update user', () => {
  // depends on the previous test
  updateUser(sharedUser.id, { name: 'Jane' })
})

// ✅ Prefer
it('should create user', () => {
  const user = createUser({ name: 'John' })
  expect(user.name).toBe('John')
})

it('should update user', () => {
  const user = createUser({ name: 'John' })
  const updated = updateUser(user.id, { name: 'Jane' })
  expect(updated.name).toBe('Jane')
})
```

## AAA/GWT Structure

Follow the **Arrange, Act, Assert** or **Given, When, Then** principle to ensure maximum organization and readability within tests.

**Example:**

```typescript
it('should calculate total price with discount', () => {
  // Arrange (Given)
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ]
  const discountPercentage = 10

  // Act (When)
  const total = calculateTotal(items, discountPercentage)

  // Assert (Then)
  expect(total).toBe(225) // (200 + 50) * 0.9
})
```

## Mocks and Time

If testing behavior that depends on a Date, and that is important for what is being tested, use a mock to ensure the test is repeatable.

**Example:**

```typescript
import { vi } from 'vitest'

it('should set created date correctly', () => {
  // Arrange
  const mockDate = new Date('2024-01-01T12:00:00Z')
  vi.useFakeTimers()
  vi.setSystemTime(mockDate)

  // Act
  const user = createUser({ name: 'John' })

  // Assert
  expect(user.createdAt).toEqual(mockDate)

  // Cleanup
  vi.useRealTimers()
})
```

## Focus and Clarity

Focus on testing one behavior per test. Avoid writing very large tests.

**Example:**

```typescript
// ❌ Avoid
it('should handle user operations', () => {
  const user = createUser({ name: 'John' })
  expect(user.name).toBe('John')

  const updated = updateUser(user.id, { email: 'john@example.com' })
  expect(updated.email).toBe('john@example.com')

  deleteUser(user.id)
  const deleted = getUser(user.id)
  expect(deleted).toBeNull()
})

// ✅ Prefer
describe('UserService', () => {
  it('should create a new user', () => {
    const user = createUser({ name: 'John' })
    expect(user.name).toBe('John')
  })

  it('should update user email', () => {
    const user = createUser({ name: 'John' })
    const updated = updateUser(user.id, { email: 'john@example.com' })
    expect(updated.email).toBe('john@example.com')
  })

  it('should delete user', () => {
    const user = createUser({ name: 'John' })
    deleteUser(user.id)
    const deleted = getUser(user.id)
    expect(deleted).toBeNull()
  })
})
```

## Coverage

Ensure that the code being written is fully covered by tests.

**Example:**

```bash
# Check coverage
npm run test:coverage
```

Configure in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
})
```

## Consistent Expectations

Create consistent expectations, ensuring that everything being tested is actually verified.

**Example:**

```typescript
// ❌ Avoid
it('should create user with full details', () => {
  const user = createUser({
    name: 'John',
    email: 'john@example.com',
    age: 30,
  })
  expect(user.name).toBe('John')
  // forgot to test email and age
})

// ✅ Prefer
it('should create user with full details', () => {
  const user = createUser({
    name: 'John',
    email: 'john@example.com',
    age: 30,
  })
  expect(user.name).toBe('John')
  expect(user.email).toBe('john@example.com')
  expect(user.age).toBe(30)
  expect(user.id).toBeDefined()
  expect(user.createdAt).toBeInstanceOf(Date)
})
```

## Test Naming

Use clear and descriptive names that explain the expected behavior.

**Example:**

```typescript
// ❌ Avoid
it('test user', () => {})
it('works', () => {})

// ✅ Prefer
it('should create user with valid email', () => {})
it('should throw error when email is invalid', () => {})
it('should return null when user not found', () => {})
```

## Mocking External Dependencies

Only mock external boundaries (APIs, databases, third-party services). Never mock the code under test.

**Example:**

```typescript
import { vi } from 'vitest'

// ✅ Prefer — mock external service
vi.mock('../lib/firebase', () => ({
  verifyIdToken: vi.fn(),
}))

it('should authenticate user with valid token', async () => {
  const { verifyIdToken } = await import('../lib/firebase')
  vi.mocked(verifyIdToken).mockResolvedValue({
    uid: 'user_123',
    email: 'john@example.com',
  })

  const result = await authenticate('valid-token')

  expect(result.uid).toBe('user_123')
  expect(verifyIdToken).toHaveBeenCalledWith('valid-token')
})
```

## File Organization

Place test files next to the source files they test, using the `.test.ts` suffix.

**Example:**

```
src/
  users/
    user.service.ts
    user.service.test.ts
    user.repository.ts
    user.repository.test.ts
```
