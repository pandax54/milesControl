# Task 4.0: Integrate BRL Display and Net Value Badge into Transfer Form Dialog

## Overview

Extend the existing `TransferFormDialog` to display BRL equivalent values below each miles amount field and show the net value badge between program selectors. This is the primary user-facing integration point.

<vision>
### What are we building?

Enhancing the `TransferFormDialog` component to show real-time BRL monetary context for miles transfers. Users see the BRL value they're giving up (source) and receiving (destination), plus a color-coded badge indicating whether the transfer is financially favorable.

### Why are we building it?

This is the primary decision point — users need monetary context before confirming a transfer. Without this, users are comparing raw miles numbers without understanding the actual monetary trade-off.

### How does it connect to everything else?

- **Consumes**: `useTransferConversion` hook (Task 3.0), `NetValueBadge` component (Task 2.0).
- **Modifies**: `src/components/dashboard/transfer-form-dialog.tsx`.
- **Data flow**: User selects programs → hook fetches CPM → user types miles → hook debounces and computes BRL → component renders values.

### What does success look like?

When a user selects "Livelo" → "Smiles" and types 10000 miles, they immediately see "~R$150.00" below the source field, "~R$120.00" below the destination field, and a red badge showing "−R$30.00" indicating a net loss.
</vision>

<critical>Read the prd.md and techspec.md files in this folder; if you do not read these files, your task will be invalidated</critical>

<requirements>
- FR-1: Display BRL equivalent below source miles amount
- FR-2: Display BRL equivalent below destination miles amount (including bonus)
- FR-3: BRL values update within 300ms of input change (handled by hook)
- FR-4: BRL values in smaller, muted font below miles amounts
- FR-5: "No data" placeholder when CPM is unavailable
- FR-5.1: Tooltip/helper text encouraging transfers when CPM is unavailable
- FR-6: Net value badge between program cards
- FR-7/8/9: Badge colors (green/red/gray)
- FR-10: No badge when either CPM is unavailable
</requirements>

## Implementation Details

Refer to `techspec.md` sections:
- **TransferFormDialog (modified)** — component enhancement description
- **User Experience → Transfer Form Dialog** — layout and interaction specs

<foundation>
### Data Model

No data model changes.

### Dependencies

#### Requires (inputs)

- `useTransferConversion` hook (Task 3.0) — provides `sourceBrl`, `destBrl`, `netValue`, `netValueType`, `sourceCpm`, `destCpm`, `isLoading`
- `NetValueBadge` component (Task 2.0) — renders net value indicator
- `formatCurrency()` from `src/lib/utils/format.ts` — BRL formatting
- Existing `TransferFormDialog` component and its current props/state

#### Provides (outputs)

- Enhanced `TransferFormDialog` with BRL display and net value badge

#### Third-party integrations

None.
</foundation>

<implementation>
## Core Behavior

1. **Wire the hook**: Call `useTransferConversion(sourceProgramName, destProgramName, pointsTransferred, milesReceived)` inside the dialog component.
2. **Source BRL display**: Below the source miles amount input (`pointsTransferred`), render BRL value in a `<p>` or `<span>` with muted/small styling. Use `formatCurrency(sourceBrl)` when available.
3. **Destination BRL display**: Below the destination miles amount input (`milesReceived`), render BRL value similarly. This already reflects bonus since `milesReceived` includes the bonus calculation.
4. **Net value badge**: Between the source and destination program selectors, render `<NetValueBadge netValue={netValue} netValueType={netValueType} />`.
5. **No data state**: When `sourceCpm` or `destCpm` is `null`, show a muted "Sem dados de custo" (No cost data) placeholder instead of the BRL value. Optionally include a tooltip with "Registre transferências para calcular o valor em R$" (Log transfers to calculate BRL value).
6. **Loading state**: While `isLoading` is true, show a subtle loading indicator or skeleton for BRL values.

## Edge Cases

- Dialog opens with no programs selected → no BRL values shown, no badge
- User changes program after entering miles → BRL values update after CPM loads
- Miles amount is 0 → show "R$0,00"
- Form reset → BRL values clear (hook receives reset values)
</implementation>

<constraints>
## Must Have
- BRL values in smaller, muted font (e.g., `text-sm text-muted-foreground`)
- "No data" placeholder is non-intrusive
- Net value badge positioned between program selectors
- ARIA labels on BRL value elements for accessibility
- Does not break existing form functionality (submission, validation, reset)

## Must NOT Have
- No changes to form submission logic
- No changes to existing form state management beyond adding the hook
- No new form fields (BRL is display-only)
- Do not modify how `milesReceived` is calculated (existing bonus logic)

## Follow Existing Patterns From
- `src/components/dashboard/transfer-form-dialog.tsx` — Current component structure
- `src/components/dashboard/dashboard-transfers.tsx` — Badge and formatting usage
</constraints>

<quality_gates>
## No Gaping Problems

- [ ] Existing form submission still works correctly
- [ ] Form reset clears BRL values
- [ ] No layout shifts when BRL values appear/disappear
- [ ] Loading state doesn't cause flicker

## Ready to Ship

- [ ] BRL values render below both miles inputs
- [ ] Net value badge appears between program cards
- [ ] "No data" placeholder shows when CPM is unavailable
- [ ] All tests pass
</quality_gates>

<questions>
## Clarify Before Starting

- [ ] Exact layout positioning: should BRL be inline with the input or on a new line below?
- [ ] Should the "no data" tooltip link to documentation per OQ-3?
</questions>

<context>
## Reference Materials
- PRD: `tasks/prd-LD-48/prd.md` — FR-1 through FR-10, UX section
- Tech Spec: `tasks/prd-LD-48/techspec.md` — TransferFormDialog modification

## Codebase Location
- Feature path: `src/components/dashboard/transfer-form-dialog.tsx`
- Related code: `src/hooks/use-transfer-conversion.ts`, `src/components/dashboard/net-value-badge.tsx`
</context>

## Subtasks

- [ ] 4.1 Wire `useTransferConversion` hook into `TransferFormDialog`
- [ ] 4.2 Add BRL value display below source miles input with muted styling
- [ ] 4.3 Add BRL value display below destination miles input with muted styling
- [ ] 4.4 Add "no data" placeholder with tooltip when CPM is unavailable
- [ ] 4.5 Add `NetValueBadge` between program selectors
- [ ] 4.6 Add loading state indicator for BRL values
- [ ] 4.7 Write integration tests

## Success Criteria

- BRL values appear below miles inputs when CPM data is available
- BRL values update as user types (after 300ms debounce)
- Net value badge appears between program cards with correct color
- "No data" placeholder shows when CPM is unavailable
- Existing form functionality (submit, reset, validation) is unaffected
- All tests pass

## Task Tests

### Integration Tests (`src/components/dashboard/transfer-form-dialog.test.tsx`)

- [ ] Renders BRL value below source miles input when CPM is available
- [ ] Renders BRL value below destination miles input when CPM is available
- [ ] BRL values update when miles amount changes (after debounce)
- [ ] Shows "no data" placeholder when source CPM is null
- [ ] Shows "no data" placeholder when destination CPM is null
- [ ] Renders `NetValueBadge` between program selectors
- [ ] Does not render `NetValueBadge` when either CPM is null
- [ ] Existing form submission still works correctly
- [ ] Form reset clears BRL display

<critical>ALWAYS CREATE AND RUN THE TASK TESTS BEFORE CONSIDERING IT COMPLETE</critical>

## Relevant Files

- `src/components/dashboard/transfer-form-dialog.tsx` — Modify this component
- `src/components/dashboard/transfer-form-dialog.test.tsx` — New or extended test file
- `src/hooks/use-transfer-conversion.ts` — Hook to wire in (Task 3.0)
- `src/components/dashboard/net-value-badge.tsx` — Badge component (Task 2.0)
- `src/lib/utils/format.ts` — `formatCurrency()` (read-only)
