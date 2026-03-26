---
name: code-standards-reference
description: Complete coding standards with condensed rules and detailed examples for naming conventions, function design, error handling, immutability, type safety, async patterns, formatting, and file structure. Use when checking specific coding patterns, reviewing code quality, or writing new modules.
---

# Coding Standards

## Condensed Rules

### Language

- All code, variables, functions, classes, comments, and documentation in English

### Naming

- `camelCase`: methods, functions, variables
- `PascalCase`: classes, interfaces
- `SCREAMING_SNAKE_CASE`: constants, environment variables
- `kebab-case`: files, directories
- No abbreviations, no names over 30 characters

### Functions & Methods

- Name starts with a verb, never a noun
- Max 3 parameters; use an object for more
- Max 50 lines per method, 300 lines per class
- One action per function: mutation OR query, never both
- No flag parameters — extract separate functions instead

### Control Flow

- Max 2 levels of if/else nesting; prefer early returns
- Always use async/await; never mix `.then()` with `await`

### Variables & Types

- `const` over `let`; never `var`
- Never use `any`; use `unknown` with type guards
- Prefer union types over enums for simple strings
- One variable per line; declare close to usage
- Use `readonly` on properties that shouldn't change

### Error Handling

- Custom error classes for domain errors
- Never swallow exceptions; handle meaningfully or re-throw
- Handle errors at boundaries (controllers/handlers)

### Formatting & Comments

- Blank lines sparingly, only to separate logical blocks
- No "what" comments; only "why" comments for non-obvious decisions
- One variable declaration per line

### Imports & File Structure

- Import order: external libs → internal modules (`@/`) → relative
- File order: imports → constants → types → main logic → exports
- Constants co-located with usage or in shared constants file

### Constants

- No magic numbers; extract to named SCREAMING_SNAKE_CASE constants

---

## Detailed Examples

## Language

All source code must be written in English, including variable names, functions, classes, comments, and documentation.

**Example:**

```typescript
// ❌ Avoid
const nomeDoProduto = 'Laptop'
function calcularPreco() {}

// ✅ Prefer
const productName = 'Laptop'
function calculatePrice() {}
```

## Naming Conventions

### camelCase

Use for methods, functions, and variables.

**Example:**

```typescript
const userName = 'John'
const isActive = true
function getUserById(id: string) {}
```

### PascalCase

Use for classes and interfaces.

**Example:**

```typescript
class UserRepository {}
interface PaymentGateway {}
```

### SCREAMING_SNAKE_CASE

Use for constants and environment variables.

**Example:**

```typescript
const MINIMUM_AGE = 18
const ONE_HOUR_IN_MS = 60 * 60 * 1000
const API_BASE_URL = process.env.API_BASE_URL
```

### kebab-case

Use for files and directories.

**Example:**

```
user-repository.ts
payment-gateway.service.ts
api-controllers/
```

## Clear Naming

Avoid abbreviations, but also do not write overly long names (more than 30 characters).

**Example:**

```typescript
// ❌ Avoid
const usrNm = 'John' // too abbreviated
const userNameFromDatabaseQueryResult = 'John' // too long

// ✅ Prefer
const userName = 'John'
const dbUserName = 'John'
```

## Constants and Magic Numbers

Declare constants to represent magic numbers for readability. Constants should be co-located with their usage when specific to a single module, or placed in a dedicated constants file when shared across modules.

**Example:**

```typescript
// ❌ Avoid
if (user.age >= 18) {
}
setTimeout(() => {}, 3600000)

// ✅ Prefer
const MINIMUM_AGE = 18
const ONE_HOUR_IN_MS = 60 * 60 * 1000

if (user.age >= MINIMUM_AGE) {
}
setTimeout(() => {}, ONE_HOUR_IN_MS)
```

## Methods and Functions

Methods and functions should perform a clear and well-defined action, and this should be reflected in their name, which must start with a verb, never a noun.

**Example:**

```typescript
// ❌ Avoid
function user(id: string) {}
function userData() {}

// ✅ Prefer
function getUser(id: string) {}
function fetchUserData() {}
function createUser(data: UserData) {}
function updateUserEmail(id: string, email: string) {}
```

## Parameters

Whenever possible, avoid passing more than 3 parameters. Prefer using objects when necessary.

**Example:**

```typescript
// ❌ Avoid
function createUser(
  name: string,
  email: string,
  age: number,
  address: string,
  phone: string,
) {}

// ✅ Prefer
interface CreateUserParams {
  name: string
  email: string
  age: number
  address: string
  phone: string
}

function createUser(params: CreateUserParams) {}
```

## Side Effects

Avoid side effects. In general, a method or function should either perform a mutation OR a query — never allow a query to have side effects.

**Example:**

```typescript
// ❌ Avoid
function getUsers() {
  const users = database.query('SELECT * FROM users')
  logger.log('Users fetched') // side effect
  cache.set('users', users) // side effect
  return users
}

// ✅ Prefer
function getUsers() {
  return database.query('SELECT * FROM users')
}

function fetchAndCacheUsers() {
  const users = getUsers()
  logger.log('Users fetched')
  cache.set('users', users)
  return users
}
```

## Conditional Structures

Never nest more than two if/else statements. Always prefer early returns.

**Example:**

```typescript
// ❌ Avoid
function processPayment(user: User, amount: number) {
  if (user) {
    if (user.isActive) {
      if (amount > 0) {
        if (user.balance >= amount) {
          return completePayment(user, amount)
        }
      }
    }
  }
  return null
}

// ✅ Prefer
function processPayment(user: User, amount: number) {
  if (!user) return null
  if (!user.isActive) return null
  if (amount <= 0) return null
  if (user.balance < amount) return null

  return completePayment(user, amount)
}
```

## Flag Parameters

Never use flag parameters to toggle the behavior of methods and functions. In such cases, extract into methods and functions with specific behaviors.

**Example:**

```typescript
// ❌ Avoid
function getUser(id: string, includeOrders: boolean) {
  const user = database.getUser(id)
  if (includeOrders) {
    user.orders = database.getOrders(id)
  }
  return user
}

// ✅ Prefer
function getUser(id: string) {
  return database.getUser(id)
}

function getUserWithOrders(id: string) {
  const user = getUser(id)
  user.orders = database.getOrders(id)
  return user
}
```

## Immutability

Prefer `const` over `let`. Never use `var`. Mark interface and type properties as `readonly` when they should not be modified after creation. Avoid direct mutation of function arguments.

**Example:**

```typescript
// ❌ Avoid
let userName = 'John'
var isActive = true

function updateUser(user: User) {
  user.name = 'Jane' // mutates the input directly
}

// ✅ Prefer
const userName = 'John'
const isActive = true

interface User {
  readonly id: string
  readonly email: string
  name: string
}

function updateUser(user: User): User {
  return { ...user, name: 'Jane' }
}
```

## Type Safety

Avoid `any` at all costs. Use `unknown` when the type is truly not known, and narrow it with type guards. Enable strict mode in `tsconfig.json`.

**Example:**

```typescript
// ❌ Avoid
function parseInput(data: any) {
  return data.name
}

// ✅ Prefer
function parseInput(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    return (data as { name: string }).name
  }
  throw new Error('Invalid input: missing name property')
}
```

## Enums vs Union Types

Prefer union types over enums for simple string values. Use enums only when you need reverse mapping or computed values.

**Example:**

```typescript
// ❌ Avoid for simple string sets
enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}

// ✅ Prefer
type Status = 'active' | 'inactive' | 'pending'

// ✅ Enums are acceptable when reverse mapping is needed
enum HttpStatusCode {
  Ok = 200,
  NotFound = 404,
  InternalServerError = 500,
}
```

## Error Handling

Use custom error classes for domain-specific errors. Never swallow exceptions silently. A function should either handle an error meaningfully or let it propagate — never catch and ignore.

**Example:**

```typescript
// ❌ Avoid
try {
  await saveUser(user)
} catch (e) {
  // silently ignored
}

// ❌ Avoid
try {
  await saveUser(user)
} catch (e) {
  console.log(e) // logged but not handled
}

// ✅ Prefer
class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`)
    this.name = 'UserAlreadyExistsError'
  }
}

async function createUser(params: CreateUserParams): Promise<User> {
  const existing = await findUserByEmail(params.email)
  if (existing) {
    throw new UserAlreadyExistsError(params.email)
  }
  return saveUser(params)
}

// At the boundary (controller, handler):
try {
  const user = await createUser(params)
  return res.status(201).json(user)
} catch (error) {
  if (error instanceof UserAlreadyExistsError) {
    return res.status(409).json({ message: error.message })
  }
  throw error // let unexpected errors propagate
}
```

## Async/Await

Always use async/await over raw Promise chains. Never mix `.then()` with `await` in the same function. Always handle rejections explicitly.

**Example:**

```typescript
// ❌ Avoid
function getUser(id: string) {
  return fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then((data) => data.user)
}

// ❌ Avoid mixing styles
async function getUser(id: string) {
  const data = await fetch(`/api/users/${id}`).then((res) => res.json())
  return data.user
}

// ✅ Prefer
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`)
  }
  const data = await response.json()
  return data.user
}
```

## Method and Class Size

- Avoid long methods with more than 50 lines
- Avoid long classes with more than 300 lines

These limits are guidelines, not rigid rules. Exceptions are acceptable when splitting would hurt readability (e.g., a switch statement mapping many cases, or a configuration object). When exceeding these limits, ensure the method or class still has a single clear responsibility.

**Example:**

```typescript
// ❌ Avoid
class UserService {
  // 500 lines of code mixing auth, profile, and notifications
}

// ✅ Prefer
class UserAuthService {}
class UserProfileService {}
class UserNotificationService {}
```

## Formatting

Use blank lines sparingly inside methods and functions. Blank lines may be used to separate distinct logical blocks within longer functions, but avoid excessive or arbitrary blank lines.

**Example:**

```typescript
// ❌ Avoid — blank lines between every statement
function calculateTotal(items: Item[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)

  const tax = subtotal * 0.1

  return subtotal + tax
}

// ✅ Prefer — compact, no unnecessary gaps
function calculateTotal(items: Item[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const tax = subtotal * 0.1
  return subtotal + tax
}

// ✅ Also acceptable — blank line separating logical blocks
async function processOrder(order: Order) {
  validateOrder(order)
  const pricing = calculatePricing(order)

  const payment = await chargeCustomer(order.customerId, pricing.total)
  await recordTransaction(payment)

  await sendConfirmationEmail(order.customerId, order.id)
  return { orderId: order.id, transactionId: payment.id }
}
```

## Comments

Avoid comments that describe _what_ the code does — the code should be self-explanatory. Use comments to explain _why_ a non-obvious decision was made.

**Example:**

```typescript
// ❌ Avoid — describes what the code does
// Check if user is adult
if (user.age >= 18) {
}

// ❌ Avoid — redundant
// Increment counter by one
counter++

// ✅ Prefer — self-explanatory code
const isAdult = user.age >= MINIMUM_LEGAL_AGE
if (isAdult) {
}

// ✅ Prefer — explains why
// We retry 3 times because the payment gateway occasionally returns
// transient 503 errors under load (see incident #1247)
const MAX_PAYMENT_RETRIES = 3
```

## Variable Declarations

Never declare more than one variable on the same line.

**Example:**

```typescript
// ❌ Avoid
const name = 'John',
  age = 30,
  email = 'john@example.com'

// ✅ Prefer
const name = 'John'
const age = 30
const email = 'john@example.com'
```

## Variable Scope

Declare variables as close as possible to where they will be used.

**Example:**

```typescript
// ❌ Avoid
function processOrder(orderId: string) {
  const user = getUser()
  const product = getProduct()
  const discount = calculateDiscount()

  validateOrder(orderId)
  checkInventory(orderId)

  // user is only used here, 5 lines later
  notifyUser(user)
}

// ✅ Prefer
function processOrder(orderId: string) {
  validateOrder(orderId)
  checkInventory(orderId)

  const user = getUser()
  notifyUser(user)
}
```

## Import Order

Organize imports into groups, separated by a blank line, in the following order:

1. External libraries (node_modules)
2. Internal/shared modules (aliases like `@/`)
3. Relative imports (same module)

Within each group, sort alphabetically.

**Example:**

```typescript
// ❌ Avoid — mixed and unorganized
import { UserService } from './user.service'
import express from 'express'
import { Logger } from '@/shared/logger'
import { z } from 'zod'
import { UserRepository } from './user.repository'

// ✅ Prefer — grouped and sorted
import express from 'express'
import { z } from 'zod'

import { Logger } from '@/shared/logger'

import { UserRepository } from './user.repository'
import { UserService } from './user.service'
```

## File Structure

Organize each file in a consistent order:

1. Imports
2. Constants and configuration
3. Types, interfaces, and enums
4. Main logic (functions, classes)
5. Exports (if not using inline exports)

**Example:**

```typescript
// 1. Imports
import { z } from 'zod'

import { database } from '@/shared/database'

// 2. Constants
const MAX_RETRIES = 3

// 3. Types
interface CreateUserParams {
  name: string
  email: string
}

// 4. Main logic
export class UserService {
  async createUser(params: CreateUserParams): Promise<User> {
    return database.create('users', params)
  }
}
```
