# Task 6.0: Add BRL Values and Net Value Badges to Transfer History Table

## Overview

Extend the transfers page server component to compute BRL values for each historical transfer and display them with net value badges in the history table.

<vision>
### What are we building?

Enhancing the transfer history table on the transfers page to show BRL equivalent values for each past transfer's source and destination miles, along with a color-coded net value badge per row.

### Why are we building it?

Users currently see only raw miles numbers and CPM in the history table. Adding BRL context lets users review the monetary value of past transfers at a glance, without manual calculation.

### How does it connect to everything else?

- **Consumes**: `getUserAverageCostPerMilheiro()` from transfer service (server-side), `NetValueBadge` component (Task 2.0).
- **Modifies**: `src/app/(dashboard)/transfers/page.tsx`.
- **Data flow**: Server component fetches CPM for all unique programs in history → computes BRL per row → passes to table for rendering.

### What does success look like?

Each row in the transfer history table shows "R$150,00" sent, "R$120,00" received, and a red "−R$30,00" badge — all computed from the user's current average CPM per program.
</vision>

<critical>Read the prd.md and techspec.md files in this folder; if you do not read these files, your task will be invalidated</critical>

<requirements>
- FR-14: Each history row displays BRL equivalent of source miles sent
- FR-15: Each history row displays BRL equivalent of destination miles received
- FR-16: Each row displays net value badge (green/red/gray) with ±5% threshold
- FR-17: BRL values use current average CPM (not historical snapshot)
- FR-18: "No data" placeholder when CPM is unavailable
</requirements>

## Implementation Details

Refer to `techspec.md` sections:
- **TransfersPage (modified)** — server component enhancement
- **Known Risks** — performance with many programs

<foundation>
### Data Model

No data model changes.

### Dependencies

#### Requires (inputs)

- `getUserAverageCostPerMilheiro(userId, program)` from `src/lib/services/transfer.service.ts`
- `NetValueBadge` component from `src/components/dashboard/net-value-badge.tsx` (Task 2.0)
- `formatCurrency()` from `src/lib/utils/format.ts`
- Existing `TransferData` type and transfers page structure

#### Provides (outputs)

- Enhanced transfers page with BRL columns and net value badges in history table

#### Third-party integrations

None.
</foundation>

<implementation>
## Core Behavior

1. **Deduplicate programs**: After fetching transfers, collect all unique program names (both source and destination) from the transfer list.
2. **Batch CPM fetch**: For each unique program, call `getUserAverageCostPerMilheiro(userId, programName)`. Use `Promise.all` for parallel fetching. Store results in a `Map<string, number | null>`.
3. **Compute BRL per row**: For each transfer row:
   - `sourceBrl = pointsTransferred × sourceCpm / 1000` (or `null` if CPM is `null`)
   - `destBrl = milesReceived × destCpm / 1000` (or `null` if CPM is `null`)
   - `netValue = destBrl - sourceBrl` (or `null` if either is `null`)
   - Classify net value type using the same ±5% threshold logic as the hook
4. **Render in table**: Add BRL value display to each row (muted text below or beside miles amounts). Add `NetValueBadge` to each row.
5. **No data handling**: When CPM is `null` for a program, show "Sem dados" (No data) placeholder.

## Edge Cases

- User has transfers across 20+ programs → deduplicated fetch means at most 20 CPM queries, not 20×N
- Program with no transfer history (CPM is null) → "Sem dados" placeholder, no badge for that row
- User has no transfers → empty state (already handled, no change needed)
- Transfer with 0 miles → BRL shows R$0,00
</implementation>

<constraints>
## Must Have
- Deduplicated CPM fetching (one call per unique program, not per row)
- BRL display consistent with form dialog styling (muted, smaller text)
- Net value badge consistent with form dialog behavior (same thresholds)
- "No data" placeholder for missing CPM

## Must NOT Have
- No client-side computation — this is a server component, all BRL values computed server-side
- No changes to existing table columns (BRL is additive)
- No sorting/filtering on BRL values (per OQ-2 decision)

## Follow Existing Patterns From
- `src/app/(dashboard)/transfers/page.tsx` — Current page structure, data transformation, table rendering
- `src/components/dashboard/dashboard-transfers.tsx` — Badge and formatting patterns
</constraints>

<quality_gates>
## No Gaping Problems

- [ ] CPM fetching is deduplicated (not N+1)
- [ ] BRL values computed server-side (not client)
- [ ] Existing table functionality preserved
- [ ] No data placeholder renders correctly

## Ready to Ship

- [ ] BRL values appear in each history row
- [ ] Net value badges appear with correct colors
- [ ] Performance acceptable with many programs
- [ ] All tests pass
</quality_gates>

<questions>
## Clarify Before Starting

- [ ] Should BRL values be in separate columns or inline with existing miles columns?
- [ ] Should the NetValueBadge be a separate column or inline within an existing column?
</questions>

<context>
## Reference Materials
- PRD: `tasks/prd-LD-48/prd.md` — FR-14 through FR-18, UX → Transfer History Table
- Tech Spec: `tasks/prd-LD-48/techspec.md` — TransfersPage modification, Known Risks

## Codebase Location
- Feature path: `src/app/(dashboard)/transfers/page.tsx`
- Related code: `src/lib/services/transfer.service.ts`, `src/components/dashboard/net-value-badge.tsx`
</context>

## Subtasks

- [ ] 6.1 Extract unique program names from transfer list and batch-fetch CPM data
- [ ] 6.2 Create a helper function to compute BRL values and net value type for a transfer row
- [ ] 6.3 Extend `TransferData` type (or create enriched type) to include BRL values and net value
- [ ] 6.4 Add BRL display to each table row with muted styling
- [ ] 6.5 Add `NetValueBadge` to each table row
- [ ] 6.6 Handle "no data" placeholder for missing CPM
- [ ] 6.7 Write integration tests

## Success Criteria

- Each history row shows BRL value for source miles sent
- Each history row shows BRL value for destination miles received
- Each history row shows a net value badge with correct color
- CPM is fetched once per unique program (deduplicated)
- "No data" placeholder shows when CPM is unavailable
- Existing table functionality is unaffected
- All tests pass

## Task Tests

### Integration Tests (`src/app/(dashboard)/transfers/page.test.tsx` or similar)

- [ ] History rows display BRL value for source miles
- [ ] History rows display BRL value for destination miles
- [ ] History rows display net value badge with correct color
- [ ] "No data" placeholder shown when source program has no CPM
- [ ] "No data" placeholder shown when destination program has no CPM
- [ ] CPM fetching is deduplicated (mock verifies one call per unique program)
- [ ] Net value badge not displayed when either CPM is null
- [ ] BRL values use current CPM (not snapshot)
- [ ] Empty transfer list renders correctly (no errors)

<critical>ALWAYS CREATE AND RUN THE TASK TESTS BEFORE CONSIDERING IT COMPLETE</critical>

## Relevant Files

- `src/app/(dashboard)/transfers/page.tsx` — Modify this page
- `src/app/(dashboard)/transfers/page.test.tsx` — New or extended test file
- `src/lib/services/transfer.service.ts` — `getUserAverageCostPerMilheiro()` (read-only)
- `src/components/dashboard/net-value-badge.tsx` — Badge component (Task 2.0, read-only)
- `src/lib/utils/format.ts` — `formatCurrency()` (read-only)
- `src/lib/validators/transfer.schema.ts` — `TransferData` type (may extend)
