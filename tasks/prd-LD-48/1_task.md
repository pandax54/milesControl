# Task 1.0: Create `getTransferConversionData` Server Action

## Overview

Create a new server action that fetches CPM (cost-per-milheiro) averages for source and destination programs and queries active promotions for the destination program. This is the data foundation for all BRL conversion display features.

<vision>
### What are we building?

A server action `getTransferConversionData` in `src/actions/transfers.ts` that returns CPM data for two programs and the best active promotion for the destination program — all in a single server round-trip.

### Why are we building it?

The client needs CPM data to calculate BRL equivalents for miles amounts. Bundling CPM lookups and promotion queries into one action avoids waterfall requests when the user changes program selection.

### How does it connect to everything else?

- **Consumes**: `getUserAverageCostPerMilheiro()` from transfer service, `listPromotions()` from promotion service, `listPrograms()` from program-enrollment service.
- **Consumed by**: `useTransferConversion` hook (Task 3.0), transfers page server component (Task 6.0).

### What does success look like?

Calling `getTransferConversionData({ sourceProgramName: 'Livelo', destProgramName: 'Smiles' })` returns `{ sourceCpm: 15.50, destCpm: 12.00, activePromotion: { id: '...', bonusPercent: 100, title: 'Smiles Duplo' } }` — or `null` values when data is unavailable.
</vision>

<critical>Read the prd.md and techspec.md files in this folder; if you do not read these files, your task will be invalidated</critical>

<requirements>
- FR-1, FR-2: CPM data is needed to calculate BRL values for source and destination programs
- FR-5: Must return `null` when a program has no CPM history
- FR-11: Must query active promotions for the destination program and return the one with the highest bonus
- Tech spec: Single server action replaces 3 separate fetches (source CPM + dest CPM + active promotion)
</requirements>

## Implementation Details

Refer to `techspec.md` sections:
- **Key Interfaces** — `TransferConversionRequest` and `TransferConversionData` types
- **Integration Points** — service functions consumed and promotion query pattern
- **API Endpoints** — server action specification

<foundation>
### Data Model

No new database models or schema changes. Uses existing data from:
- `TransferLog` (via `getUserAverageCostPerMilheiro`)
- `Promotion` (via `listPromotions`)
- `Program` (via `listPrograms` / `resolveProgramId`)

#### Migrations

None required.

#### Seed Data

None required.

### Dependencies

#### Requires (inputs)

- `src/lib/services/transfer.service.ts` — `getUserAverageCostPerMilheiro(userId, program)`
- `src/lib/services/promotion.service.ts` — `listPromotions({ status, type, programId, sortBy, sortOrder, limit })`
- `src/lib/services/program-enrollment.service.ts` — `listPrograms()` or `resolveProgramId()`
- Auth: `requireUserId()` from existing auth module

#### Provides (outputs)

- `getTransferConversionData(input: TransferConversionRequest): Promise<TransferConversionData>`
- Types: `TransferConversionRequest`, `TransferConversionData` (exported from `src/actions/transfers.ts` or a shared types file)

#### Third-party integrations

None.
</foundation>

<implementation>
## Core Behavior

1. Validate input using a Zod schema (sourceProgramName and destProgramName are required non-empty strings).
2. Authenticate user via `requireUserId()`.
3. Resolve destination program name to ID using `resolveProgramId()` (needed for promotion query).
4. Fetch CPM data for both programs in parallel using `Promise.all([getUserAverageCostPerMilheiro(userId, sourceProgramName), getUserAverageCostPerMilheiro(userId, destProgramName)])`.
5. Query active promotions for the destination program: `listPromotions({ status: 'ACTIVE', type: 'TRANSFER_BONUS', programId: destProgramId, sortBy: 'bonusPercent', sortOrder: 'desc', limit: 1 })`.
6. Filter promotion results to only include promotions where the destination program matches (since `programId` filter matches both source and dest).
7. Return `{ sourceCpm, destCpm, activePromotion }` — with `null` for unavailable data.

## Edge Cases

- Program name not found: return `null` CPM for that program, `null` promotion if dest not found.
- No transfer history for a program: `getUserAverageCostPerMilheiro` returns `null` — pass through.
- No active promotions: return `activePromotion: null`.
- Multiple active promotions: sorted by `bonusPercent` desc, take first (highest bonus per OQ-1).
- Auth failure: throw `AuthenticationError` (same pattern as existing actions).
- Service errors: log at error level, return graceful fallbacks (`null` values) rather than throwing.
</implementation>

<constraints>
## Must Have
- Follow existing server action pattern in `src/actions/transfers.ts` (Zod validation, auth check, error handling, logging)
- Return `null` (not 0 or undefined) when CPM data is unavailable
- Handle auth errors consistently with existing actions
- Parallel fetch of source and dest CPM data

## Must NOT Have
- No new API routes — use server action pattern only
- No schema changes or new database models
- No caching beyond what Prisma/Next.js provides by default
- Do not add `any` types

## Follow Existing Patterns From
- `src/actions/transfers.ts` — `logTransfer`, `editTransfer` for action structure
- `src/lib/validators/transfer.schema.ts` — for Zod schema pattern
</constraints>

<quality_gates>
## No Gaping Problems

- [ ] Server action validates input before any DB calls
- [ ] Auth check happens before data fetching
- [ ] Parallel CPM fetches (not sequential)
- [ ] Error responses return graceful fallbacks, not thrown errors
- [ ] Promotion filter correctly matches destination program

## Ready to Ship

- [ ] TypeScript strict mode — no `any` types
- [ ] Exported types for `TransferConversionRequest` and `TransferConversionData`
- [ ] Logging at appropriate levels (debug for missing data, error for failures)
- [ ] All tests pass
</quality_gates>

<questions>
## Clarify Before Starting

- [ ] Is `resolveProgramId` from promotion service the right way to resolve program names, or should we use `listPrograms` and filter?
- [ ] Should the Zod schema for this action be added to `transfer.schema.ts` or kept inline?
</questions>

<context>
## Reference Materials
- PRD: `tasks/prd-LD-48/prd.md` — FR-1, FR-2, FR-5, FR-11
- Tech Spec: `tasks/prd-LD-48/techspec.md` — Key Interfaces, Integration Points

## Codebase Location
- Feature path: `src/actions/transfers.ts`
- Related code: `src/lib/services/transfer.service.ts`, `src/lib/services/promotion.service.ts`
- Validators: `src/lib/validators/transfer.schema.ts`
</context>

## Subtasks

- [ ] 1.1 Define `TransferConversionRequest` and `TransferConversionData` types (can be in action file or shared types)
- [ ] 1.2 Create Zod schema for input validation (`transferConversionSchema`)
- [ ] 1.3 Implement `getTransferConversionData` server action with auth, validation, parallel CPM fetch, and promotion query
- [ ] 1.4 Write unit tests for the server action

## Success Criteria

- Server action returns correct CPM values for programs with transfer history
- Server action returns `null` CPM for programs without transfer history
- Server action returns the highest-bonus active promotion for the destination program
- Server action returns `null` promotion when no active promotions exist
- Server action handles authentication errors consistently
- All unit tests pass

## Task Tests

### Unit Tests (`src/actions/transfers.test.ts` — extended)

- [ ] Returns `sourceCpm` and `destCpm` when both programs have transfer history
- [ ] Returns `null` for `sourceCpm` when source program has no history
- [ ] Returns `null` for `destCpm` when destination program has no history
- [ ] Returns active promotion with highest `bonusPercent` for destination program
- [ ] Returns `null` promotion when no active promotions exist
- [ ] Returns `null` promotion when destination program ID cannot be resolved
- [ ] Validates input — rejects empty program names
- [ ] Throws/handles auth error when user is not authenticated
- [ ] Logs at debug level when CPM data is unavailable
- [ ] Logs at error level when service call fails

<critical>ALWAYS CREATE AND RUN THE TASK TESTS BEFORE CONSIDERING IT COMPLETE</critical>

## Relevant Files

- `src/actions/transfers.ts` — Add server action here
- `src/actions/transfers.test.ts` — Add tests here
- `src/lib/validators/transfer.schema.ts` — Add Zod schema here (or inline)
- `src/lib/services/transfer.service.ts` — `getUserAverageCostPerMilheiro()` (read-only)
- `src/lib/services/promotion.service.ts` — `listPromotions()`, `resolveProgramId()` (read-only)
