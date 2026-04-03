# Task 5.0: Add Promotion Auto-Detection and Bonus Pre-Fill to Transfer Form Dialog

## Overview

Extend the transfer form dialog to auto-detect active promotions for the selected destination program and pre-fill the bonus percentage field, while keeping it editable for manual override.

<vision>
### What are we building?

When a user selects a destination program in the transfer form, the system automatically checks for active promotions and pre-fills the bonus percentage field with the highest available bonus. This removes manual lookup friction and ensures the BRL conversion calculation reflects the actual bonus.

### Why are we building it?

Users currently need to manually look up active promotions and enter the bonus percentage. Auto-detection reduces input friction and ensures the conversion calculation (from Tasks 3.0/4.0) accurately reflects the actual bonus the user will receive.

### How does it connect to everything else?

- **Consumes**: `activePromotion` from `useTransferConversion` hook (Task 3.0), which gets it from `getTransferConversionData` server action (Task 1.0).
- **Modifies**: `src/components/dashboard/transfer-form-dialog.tsx` (already modified in Task 4.0).
- **Affects**: The `bonusPercent` form field and thereby `milesReceived` calculation and destination BRL display.

### What does success look like?

User selects "Smiles" as destination → bonus field auto-fills with "100" (from an active "Smiles Duplo" promotion) → user sees the correct BRL value reflecting doubled miles → user can still manually change the bonus if desired.
</vision>

<critical>Read the prd.md and techspec.md files in this folder; if you do not read these files, your task will be invalidated</critical>

<requirements>
- FR-11: Auto-detect active promotions for destination program and pre-fill bonus percentage
- FR-12: User can manually override the pre-filled bonus percentage
- FR-13: Destination BRL calculation always uses the current bonus percentage (auto-filled or manual)
- OQ-1: When multiple active promotions exist, use the highest bonus percentage
</requirements>

## Implementation Details

Refer to `techspec.md` sections:
- **Feature 3: Auto-Detection of Active Promotions**
- **Integration Points** — Promotion query pattern

<foundation>
### Data Model

No data model changes.

### Dependencies

#### Requires (inputs)

- `activePromotion` from `useTransferConversion` hook (Task 3.0) — `{ id: string, bonusPercent: number, title: string } | null`
- Existing `bonusPercent` state in `TransferFormDialog`

#### Provides (outputs)

- Enhanced `TransferFormDialog` with auto-filled bonus and promotion indicator

#### Third-party integrations

None.
</foundation>

<implementation>
## Core Behavior

1. **Watch for promotion data**: When `activePromotion` from the hook changes (i.e., destination program changes and a promotion is found):
   - Set `bonusPercent` form field to `activePromotion.bonusPercent`
   - Show a small indicator near the bonus field (e.g., "Auto: Smiles Duplo — 100%") so the user knows why the field was filled
2. **Manual override**: The bonus field remains a normal editable input. If the user changes it, the auto-filled value is replaced. The destination BRL recalculates based on whatever value is in the field.
3. **No promotion found**: When `activePromotion` is `null`, do not change the bonus field. Leave it at its current value (default 0 or user-entered value).
4. **Promotion indicator**: Show the promotion title near the bonus field when auto-filled. This helps the user understand the source of the pre-filled value.

## Edge Cases

- Promotion detected → user overrides → user changes destination program → new promotion detected → override user's manual value (the auto-fill resets on program change)
- Promotion detected → user clears the bonus field to 0 → BRL recalculates with 0 bonus
- Destination program changes to one without promotions → bonus field keeps its current value (doesn't reset to 0)
- Dialog re-opens → fresh data fetched, promotion auto-fill happens if applicable
</implementation>

<constraints>
## Must Have
- Bonus field remains editable at all times
- Auto-fill only triggers on destination program change (not on every render)
- Promotion title displayed as context for the auto-filled value
- Works seamlessly with existing `milesReceived` calculation that uses `bonusPercent`

## Must NOT Have
- Do not prevent manual bonus entry
- Do not show a promotion selector (per OQ-1, just use highest bonus)
- Do not change how `milesReceived` is calculated from `bonusPercent`

## Follow Existing Patterns From
- `src/components/dashboard/transfer-form-dialog.tsx` — Existing form state management
</constraints>

<quality_gates>
## No Gaping Problems

- [ ] Bonus field is always editable
- [ ] Auto-fill only happens on destination program change
- [ ] Existing milesReceived calculation still works correctly with auto-filled bonus

## Ready to Ship

- [ ] Promotion auto-fills bonus field when detected
- [ ] User can override the auto-filled value
- [ ] Promotion title/indicator visible when auto-filled
- [ ] All tests pass
</quality_gates>

<questions>
## Clarify Before Starting

- [ ] Should the promotion indicator be a tooltip, a small text label, or an info icon?
- [ ] When the user manually overrides the bonus, should the promotion indicator disappear?
</questions>

<context>
## Reference Materials
- PRD: `tasks/prd-LD-48/prd.md` — FR-11 through FR-13, OQ-1
- Tech Spec: `tasks/prd-LD-48/techspec.md` — Feature 3 description

## Codebase Location
- Feature path: `src/components/dashboard/transfer-form-dialog.tsx`
- Related code: `src/hooks/use-transfer-conversion.ts` (provides `activePromotion`)
</context>

## Subtasks

- [ ] 5.1 Add `useEffect` to watch `activePromotion` changes and auto-fill `bonusPercent`
- [ ] 5.2 Add promotion indicator text near the bonus field
- [ ] 5.3 Ensure manual override works correctly (user can change auto-filled value)
- [ ] 5.4 Write integration tests

## Success Criteria

- Bonus field auto-fills when an active promotion exists for the destination program
- Promotion title is displayed as an indicator near the bonus field
- User can manually change the auto-filled bonus value
- Destination BRL updates correctly with auto-filled or manually entered bonus
- No regression in existing form behavior
- All tests pass

## Task Tests

### Integration Tests (`src/components/dashboard/transfer-form-dialog.test.tsx` — extended)

- [ ] Bonus field auto-fills when active promotion exists for destination program
- [ ] Promotion title/indicator shown when bonus is auto-filled
- [ ] User can manually override the auto-filled bonus
- [ ] Bonus field not changed when no active promotion exists
- [ ] Changing destination program triggers new auto-fill
- [ ] Destination BRL recalculates with auto-filled bonus
- [ ] Destination BRL recalculates when user overrides bonus

<critical>ALWAYS CREATE AND RUN THE TASK TESTS BEFORE CONSIDERING IT COMPLETE</critical>

## Relevant Files

- `src/components/dashboard/transfer-form-dialog.tsx` — Modify this component (already modified in Task 4.0)
- `src/components/dashboard/transfer-form-dialog.test.tsx` — Extend tests (from Task 4.0)
- `src/hooks/use-transfer-conversion.ts` — Provides `activePromotion` (read-only)
