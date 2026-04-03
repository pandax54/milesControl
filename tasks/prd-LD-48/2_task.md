# Task 2.0: Create `NetValueBadge` Component

## Overview

Create a standalone presentational component that displays the BRL difference between destination and source values as a color-coded badge (green/red/gray). This component is used in both the transfer form dialog and the transfer history table.

<vision>
### What are we building?

A `NetValueBadge` React component in `src/components/dashboard/net-value-badge.tsx` that renders a colored badge showing the net monetary value of a transfer (e.g., "+R$12.50" in green, "-R$8.00" in red).

### Why are we building it?

A single visual indicator lets users instantly assess transfer value without mentally comparing two numbers. The badge provides at-a-glance feedback on whether a transfer is financially favorable.

### How does it connect to everything else?

- **Consumed by**: `TransferFormDialog` (Task 4.0) — displayed between program cards, and `TransfersPage` (Task 6.0) — displayed in each history table row.
- **Depends on**: `formatCurrency()` from `src/lib/utils/format.ts`, `Badge` from `src/components/ui/badge.tsx`.

### What does success look like?

A badge that clearly communicates "+R$12.50" in green for positive transfers, "-R$8.00" in red for negative, and "~R$0.50" in gray for neutral — with accessible text labels that don't rely solely on color.
</vision>

<critical>Read the prd.md and techspec.md files in this folder; if you do not read these files, your task will be invalidated</critical>

<requirements>
- FR-6: Display a net value badge showing the BRL difference (destination BRL − source BRL)
- FR-7: Green when net value is positive (difference > +5%)
- FR-8: Red when net value is negative (difference < −5%)
- FR-9: Gray when net value is neutral (difference within ±5%)
- FR-10: Badge not displayed when either program lacks CPM data
- Accessibility: Color-coded badges must include text labels (e.g., "+R$12.50"), not rely solely on color
- Accessibility: ARIA labels for screen readers
</requirements>

## Implementation Details

Refer to `techspec.md` sections:
- **Component Overview** — `NetValueBadge` description
- **Testing Approach** — Unit tests for badge component

<foundation>
### Data Model

No data model. This is a purely presentational component.

### Dependencies

#### Requires (inputs)

- Props: `netValue: number | null`, `netValueType: 'positive' | 'negative' | 'neutral' | null`
- `src/lib/utils/format.ts` — `formatCurrency()` for BRL formatting
- `src/components/ui/badge.tsx` — Base `Badge` component with variant system

#### Provides (outputs)

- `NetValueBadge` component exported from `src/components/dashboard/net-value-badge.tsx`

#### Third-party integrations

None.
</foundation>

<implementation>
## Core Behavior

1. Accept `netValue` (number | null) and `netValueType` ('positive' | 'negative' | 'neutral' | null) as props.
2. If `netValue` is `null` or `netValueType` is `null`, render nothing (return `null`).
3. Format the BRL value using `formatCurrency(Math.abs(netValue))`.
4. Prefix with `+` for positive, `−` for negative, `~` for neutral.
5. Map `netValueType` to badge variant/color:
   - `positive` → green styling (could use a custom variant or className)
   - `negative` → destructive variant (red)
   - `neutral` → secondary/outline variant (gray)
6. Add `aria-label` describing the net value (e.g., "Transfer net value: positive R$12.50").

## Edge Cases

- `netValue` is `null` → render nothing
- `netValueType` is `null` → render nothing
- `netValue` is exactly 0 → show as neutral with "~R$0.00"
- Very large values → should still format correctly via `formatCurrency()`
</implementation>

<constraints>
## Must Have
- Accessible text labels (not color-only)
- ARIA label for screen readers
- Must handle `null` gracefully (render nothing)
- Must use existing `Badge` component as base
- Must use `formatCurrency()` for consistent BRL formatting

## Must NOT Have
- No internal state — purely presentational/stateless
- No data fetching or calculations — receives pre-computed values
- No `any` types

## Follow Existing Patterns From
- `src/components/ui/badge.tsx` — Badge variant system
- `src/components/dashboard/dashboard-transfers.tsx` — Badge usage with rating colors
</constraints>

<quality_gates>
## No Gaping Problems

- [ ] Renders nothing when netValue is null (not an empty badge)
- [ ] Color is not the only indicator — text prefix (+/−/~) provides meaning
- [ ] ARIA label present for screen reader accessibility

## Ready to Ship

- [ ] Component is typed with proper TypeScript interfaces
- [ ] All visual states tested (positive, negative, neutral, null)
- [ ] Accessible text verified
- [ ] All tests pass
</quality_gates>

<questions>
## Clarify Before Starting

- [ ] Should we use existing badge variants (destructive/secondary) or create custom green/gray variants?
- [ ] What exact ARIA label text format should be used?
</questions>

<context>
## Reference Materials
- PRD: `tasks/prd-LD-48/prd.md` — FR-6 through FR-10, Accessibility section
- Tech Spec: `tasks/prd-LD-48/techspec.md` — NetValueBadge component description

## Codebase Location
- Feature path: `src/components/dashboard/net-value-badge.tsx`
- Related code: `src/components/ui/badge.tsx`, `src/components/dashboard/dashboard-transfers.tsx`
</context>

## Subtasks

- [ ] 2.1 Define `NetValueBadgeProps` interface
- [ ] 2.2 Implement `NetValueBadge` component with color mapping, text prefix, and ARIA label
- [ ] 2.3 Write unit tests for all visual states

## Success Criteria

- Green badge with "+" prefix for positive net values
- Red badge with "−" prefix for negative net values
- Gray badge with "~" prefix for neutral net values
- Nothing rendered when `netValue` or `netValueType` is `null`
- Screen readers can announce the net value via ARIA label
- All unit tests pass

## Task Tests

### Unit Tests (`src/components/dashboard/net-value-badge.test.tsx`)

- [ ] Renders green badge with "+" prefix for positive net value
- [ ] Renders red badge with "−" prefix for negative net value
- [ ] Renders gray badge with "~" prefix for neutral net value
- [ ] Renders nothing when `netValue` is `null`
- [ ] Renders nothing when `netValueType` is `null`
- [ ] Displays formatted BRL value using `formatCurrency()`
- [ ] Has accessible `aria-label` attribute
- [ ] Does not render when both values are null

<critical>ALWAYS CREATE AND RUN THE TASK TESTS BEFORE CONSIDERING IT COMPLETE</critical>

## Relevant Files

- `src/components/dashboard/net-value-badge.tsx` — New component file
- `src/components/dashboard/net-value-badge.test.tsx` — New test file
- `src/components/ui/badge.tsx` — Base Badge component (read-only)
- `src/lib/utils/format.ts` — `formatCurrency()` (read-only)
- `src/components/dashboard/dashboard-transfers.tsx` — Reference for badge usage pattern (read-only)
