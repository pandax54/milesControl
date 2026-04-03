# Task 3.0: Create `useTransferConversion` Hook

## Overview

Create a custom React hook that manages the client-side logic for BRL conversion display: calling the server action when programs change, debouncing miles input, and computing BRL values from cached CPM data.

<vision>
### What are we building?

A `useTransferConversion` hook in `src/hooks/use-transfer-conversion.ts` that encapsulates all conversion logic: fetching CPM data via the server action, debouncing user input, calculating BRL values, and determining net value type.

### Why are we building it?

Separating conversion logic into a hook keeps the `TransferFormDialog` component clean and makes the logic independently testable. The hook handles the complexity of debouncing, async data fetching, and derived state calculations.

### How does it connect to everything else?

- **Consumes**: `getTransferConversionData` server action (Task 1.0).
- **Consumed by**: `TransferFormDialog` (Task 4.0).

### What does success look like?

The hook returns real-time BRL values that update within 300ms of input changes, with `null` values when CPM data is unavailable, and correct net value classification (positive/negative/neutral).
</vision>

<critical>Read the prd.md and techspec.md files in this folder; if you do not read these files, your task will be invalidated</critical>

<requirements>
- FR-1: Calculate source BRL as `source miles × source CPM / 1000`
- FR-2: Calculate destination BRL as `received miles × dest CPM / 1000`
- FR-3: BRL values update within 300ms of input change (debounced)
- FR-5: Return `null` BRL when CPM is `null`
- FR-6: Compute net value as `destBrl − sourceBrl`
- FR-7/8/9: Classify net value as positive (>+5%), negative (<−5%), or neutral (within ±5%)
- FR-10: Net value is `null` when either CPM is unavailable
- FR-11: Return active promotion data from server action
</requirements>

## Implementation Details

Refer to `techspec.md` sections:
- **Key Interfaces** — `TransferConversionResult` type and hook signature
- **Data flow** — steps 1-3 describing the computation pipeline

<foundation>
### Data Model

No data model. This is a client-side logic hook.

### Dependencies

#### Requires (inputs)

- `getTransferConversionData` server action from `src/actions/transfers.ts` (Task 1.0)
- Hook params: `sourceProgramName`, `destProgramName`, `pointsTransferred`, `milesReceived`

#### Provides (outputs)

- `TransferConversionResult` interface with: `sourceBrl`, `destBrl`, `netValue`, `netValueType`, `sourceCpm`, `destCpm`, `activePromotion`, `isLoading`

#### Third-party integrations

None.
</foundation>

<implementation>
## Core Behavior

1. **Program change detection**: When `sourceProgramName` or `destProgramName` changes, call `getTransferConversionData` to fetch fresh CPM data and active promotion. Store CPM values in state.
2. **Debounced calculation**: When `pointsTransferred` or `milesReceived` changes, debounce for 300ms, then compute:
   - `sourceBrl = pointsTransferred × sourceCpm / 1000` (or `null` if CPM is `null`)
   - `destBrl = milesReceived × destCpm / 1000` (or `null` if CPM is `null`)
3. **Net value computation**: If both `sourceBrl` and `destBrl` are available:
   - `netValue = destBrl - sourceBrl`
   - If `sourceBrl === 0`: type is `neutral` (avoid division by zero)
   - Else compute percentage: `(netValue / sourceBrl) * 100`
     - `> +5%` → `positive`
     - `< -5%` → `negative`
     - Within ±5% → `neutral`
4. **Loading state**: `isLoading` is `true` while the server action is in flight.
5. **Reset**: When programs change, reset BRL values while new CPM data loads.

## Edge Cases

- Both program names empty → don't fetch, return all nulls
- Same source and destination program → still fetch (valid scenario)
- `pointsTransferred` or `milesReceived` is 0 → BRL is `R$0.00`, not `null`
- CPM is `null` for one program → that program's BRL is `null`, net value is `null`
- Server action fails → log error, return `null` values, `isLoading` false
- Rapid program changes → only the latest fetch result should be applied (race condition handling)
</implementation>

<constraints>
## Must Have
- 300ms debounce on miles input changes
- Server action called only when programs change (not on every keystroke)
- BRL calculation is client-side (no server round-trip per keystroke)
- Proper cleanup of debounce timers on unmount
- Race condition handling for rapid program changes

## Must NOT Have
- No direct database access — all data via server action
- No `any` types
- No unnecessary re-renders — memoize where appropriate

## Follow Existing Patterns From
- `src/hooks/use-mobile.ts` — Hook structure and cleanup pattern
- React `useEffect` + `useState` patterns used in `TransferFormDialog`
</constraints>

<quality_gates>
## No Gaping Problems

- [ ] Debounce timer is cleaned up on unmount
- [ ] Race conditions handled (stale server action responses discarded)
- [ ] No division by zero in net value percentage calculation
- [ ] Returns `null` (not `NaN` or `undefined`) for unavailable values

## Ready to Ship

- [ ] TypeScript strict mode — no `any` types
- [ ] `TransferConversionResult` interface exported
- [ ] All edge cases handled
- [ ] All tests pass
</quality_gates>

<questions>
## Clarify Before Starting

- [ ] Should the hook re-fetch CPM when the component re-mounts (e.g., dialog re-opened), or cache across dialog opens?
- [ ] Should the debounce apply only to BRL calculation or also to the server action call?
</questions>

<context>
## Reference Materials
- PRD: `tasks/prd-LD-48/prd.md` — FR-1 through FR-5, FR-6 through FR-10
- Tech Spec: `tasks/prd-LD-48/techspec.md` — Key Interfaces, Data flow

## Codebase Location
- Feature path: `src/hooks/use-transfer-conversion.ts`
- Related code: `src/hooks/use-mobile.ts` (hook pattern), `src/actions/transfers.ts` (server action)
</context>

## Subtasks

- [ ] 3.1 Define `TransferConversionResult` interface
- [ ] 3.2 Implement server action fetching with program change detection and race condition handling
- [ ] 3.3 Implement debounced BRL calculation logic (300ms)
- [ ] 3.4 Implement net value computation with ±5% threshold classification
- [ ] 3.5 Write unit tests for the hook

## Success Criteria

- BRL values are calculated correctly: `miles × cpm / 1000`
- BRL values update after 300ms debounce when miles inputs change
- Server action is called when programs change (not on every keystroke)
- Net value is classified correctly: positive (>+5%), negative (<−5%), neutral (±5%)
- Returns `null` values when CPM is unavailable
- Loading state reflects server action in-flight status
- All unit tests pass

## Task Tests

### Unit Tests (`src/hooks/use-transfer-conversion.test.ts`)

- [ ] Calculates BRL correctly: `10000 miles × R$15/k CPM / 1000 = R$150.00`
- [ ] Returns `null` sourceBrl when source CPM is `null`
- [ ] Returns `null` destBrl when destination CPM is `null`
- [ ] Returns `null` netValue when either CPM is `null`
- [ ] Classifies net value as `positive` when difference > +5%
- [ ] Classifies net value as `negative` when difference < −5%
- [ ] Classifies net value as `neutral` when difference within ±5%
- [ ] Debounces: only recalculates after 300ms of inactivity
- [ ] Calls server action when program names change
- [ ] Does not call server action when only miles amounts change
- [ ] Returns `isLoading: true` while server action is in flight
- [ ] Returns active promotion from server action response
- [ ] Handles server action failure gracefully (returns null values)

<critical>ALWAYS CREATE AND RUN THE TASK TESTS BEFORE CONSIDERING IT COMPLETE</critical>

## Relevant Files

- `src/hooks/use-transfer-conversion.ts` — New hook file
- `src/hooks/use-transfer-conversion.test.ts` — New test file
- `src/actions/transfers.ts` — `getTransferConversionData` (from Task 1.0)
- `src/hooks/use-mobile.ts` — Reference for hook pattern (read-only)
