# Technical Specification: Currency Conversion Display on Transfer Page

## Executive Summary

This feature adds BRL monetary value context to the transfer workflow by leveraging the existing `getUserAverageCostPerMilheiro()` service function. The implementation is entirely frontend-driven with one new server action to fetch CPM data and active promotions. No schema changes are required.

The approach adds a new server action (`getTransferConversionData`) that returns CPM averages and active promotions for selected programs. On the client side, the `TransferFormDialog` gains real-time BRL conversion display with a debounced calculation hook (`useTransferConversion`). The transfers page server component is extended to compute and pass BRL values for the history table. A shared `NetValueBadge` component handles the color-coded net value indicator used in both the form dialog and the history table.

## System Architecture

### Component Overview

- **`getTransferConversionData` server action** — New action in `src/actions/transfers.ts` that fetches CPM averages for source and destination programs and queries active promotions for the destination program. Single round-trip replaces multiple client calls.
- **`useTransferConversion` hook** — New client hook in `src/hooks/use-transfer-conversion.ts` that debounces miles input (300ms), calls the server action when programs change, and computes BRL values locally from cached CPM data.
- **`NetValueBadge` component** — New shared component in `src/components/dashboard/net-value-badge.tsx` displaying the BRL difference with green/red/gray color coding and accessible text labels.
- **`TransferFormDialog` (modified)** — Extended to display BRL values below miles amounts and the net value badge between program selectors. Receives CPM data via the hook and auto-fills bonus from active promotions.
- **`TransfersPage` (modified)** — Extended server component that fetches CPM data for all programs appearing in history and passes computed BRL values to the table rows.

**Data flow:**

1. User selects source + destination programs → hook calls `getTransferConversionData` → returns `{ sourceCpm, destCpm, activePromotion }`.
2. User types miles amount → hook debounces (300ms) → computes `sourceBrl = miles × cpm / 1000` and `destBrl = receivedMiles × cpm / 1000` locally.
3. Net value = `destBrl − sourceBrl` → badge color determined by ±5% threshold.

## Implementation Design

### Key Interfaces

```typescript
// Server action input/output
interface TransferConversionRequest {
  sourceProgramName: string;
  destProgramName: string;
}

interface TransferConversionData {
  sourceCpm: number | null;
  destCpm: number | null;
  activePromotion: {
    id: string;
    bonusPercent: number;
    title: string;
  } | null;
}

// Hook return type
interface TransferConversionResult {
  sourceBrl: number | null;
  destBrl: number | null;
  netValue: number | null;
  netValueType: 'positive' | 'negative' | 'neutral' | null;
  sourceCpm: number | null;
  destCpm: number | null;
  activePromotion: { id: string; bonusPercent: number; title: string } | null;
  isLoading: boolean;
}

// Hook signature
function useTransferConversion(
  sourceProgramName: string,
  destProgramName: string,
  pointsTransferred: number,
  milesReceived: number,
): TransferConversionResult;
```

### Data Models

No new database models or schema changes. The feature uses existing data:

- `TransferLog.totalCost`, `TransferLog.milesReceived` — via `getUserAverageCostPerMilheiro()`
- `Promotion.bonusPercent`, `Promotion.status`, `Promotion.destProgramId` — via `listPromotions()`
- `Program.name`, `Program.id` — via `listPrograms()`

### API Endpoints

No new REST endpoints. The feature uses Next.js Server Actions:

- **`getTransferConversionData(input: TransferConversionRequest): Promise<TransferConversionData>`** — New server action in `src/actions/transfers.ts`. Validates input, resolves program names to IDs, calls `getUserAverageCostPerMilheiro()` for each program, and queries active `TRANSFER_BONUS` promotions for the destination program (sorted by `bonusPercent` descending, taking the highest).

## Integration Points

**Existing services consumed:**

| Service | Function | Usage |
|---------|----------|-------|
| `transfer.service.ts` | `getUserAverageCostPerMilheiro(userId, program)` | Fetch weighted average CPM per program |
| `promotion.service.ts` | `listPromotions({ status, type, programId })` | Query active transfer bonus promotions for destination |
| `program-enrollment.service.ts` | `listPrograms()` | Resolve program names to IDs (already used by page) |

**Promotion query for auto-detection:**

The existing `listPromotions` accepts `status`, `type`, and `programId` filters. To find active promotions for a destination program:

```typescript
const promos = await listPromotions({
  status: 'ACTIVE',
  type: 'TRANSFER_BONUS',
  programId: destProgramId,
  sortBy: 'bonusPercent',
  sortOrder: 'desc',
  limit: 1,
});
```

This returns the promotion with the highest bonus for the destination program (per OQ-1 decision in the PRD). The `programId` filter matches on both source and destination program, so results should be filtered client-side to only include promotions where `destProgramId` matches.

**Program name → ID resolution:**

The `listPromotions` filter requires `programId` (not name). The server action will resolve program names to IDs using `listPrograms()` and matching by name. This lookup can be cached in the action since programs change rarely.

## Testing Approach

### Unit Tests

**`src/hooks/use-transfer-conversion.test.ts`:**
- BRL calculation: `10000 miles × R$15/k CPM / 1000 = R$150.00`
- Returns `null` when CPM is `null` (no data scenario)
- Net value type: positive (>5%), negative (<-5%), neutral (within ±5%)
- Net value badge hidden when either CPM is null
- Debounce: only recalculates after 300ms of inactivity
- Mock `getTransferConversionData` server action

**`src/components/dashboard/net-value-badge.test.tsx`:**
- Green badge for positive net value
- Red badge for negative net value
- Gray badge for neutral net value
- Not rendered when `netValue` is null
- Accessible text labels present (e.g., "+R$12.50", not just color)

**`src/actions/transfers.test.ts` (extended):**
- `getTransferConversionData` returns CPMs and active promotion
- Returns `null` CPM when no transfer history exists
- Returns `null` promotion when no active promotion exists
- Handles program not found gracefully

### Integration Tests

- Transfer form dialog renders BRL values below miles inputs when CPM data is available
- BRL values update when miles amount changes (after debounce)
- Bonus field auto-fills when active promotion is detected
- User can override auto-filled bonus
- "No data" placeholder shown when CPM is null
- History table rows display BRL values and net value badges

### E2E Tests

Not required for this iteration. The feature is purely display-oriented with no new data mutations. Visual validation through integration tests is sufficient.

## Development Sequencing

### Build Order

1. **Server action `getTransferConversionData`** (Phase 1) — Foundation for all client-side work. Depends on existing `getUserAverageCostPerMilheiro()` and `listPromotions()`. No new DB queries.

2. **`NetValueBadge` component** (Phase 2) — Standalone presentational component. No dependencies beyond `formatCurrency()`. Can be built and tested in isolation.

3. **`useTransferConversion` hook** (Phase 3) — Client-side logic layer. Depends on the server action from Phase 1. Handles debouncing, CPM caching, and BRL calculation.

4. **Transfer form dialog enhancement** (Phase 4) — Wire the hook and badge into the existing `TransferFormDialog`. Add BRL display below miles inputs, net value badge between program cards, and promotion auto-fill.

5. **Transfer history table enhancement** (Phase 5) — Extend `TransfersPage` server component to fetch CPM data and compute BRL values for each row. Add BRL columns and net value badges to the table.

6. **Testing and polish** (Phase 6) — Unit tests for hook and badge, integration tests for form and table, accessibility audit for ARIA labels and color-independent indicators.

### Technical Dependencies

- No infrastructure changes required
- No new packages needed — uses existing `formatCurrency()`, `Badge`, `Tooltip` components
- The `getUserAverageCostPerMilheiro()` function already exists and handles the null case
- The `listPromotions()` function already supports status/type/programId filtering

## Monitoring and Observability

- **Logging**: The server action logs at `debug` level when CPM data is unavailable for a program, using the existing Pino logger: `logger.debug({ userId, program }, 'No CPM data available for conversion display')`
- **No new metrics**: This is a display-only feature with no new data writes. Performance is bounded by the existing `getUserAverageCostPerMilheiro()` query (two simple aggregations).
- **Error tracking**: Server action errors are logged at `error` level and return graceful fallbacks (`null` values) rather than throwing.

## Technical Considerations

### Key Decisions

1. **Server action over API route**: Consistent with existing transfer actions pattern. Avoids creating a new API route for a feature that only serves authenticated UI components.

2. **CPM calculation stays server-side, BRL calculation moves client-side**: CPM requires DB access (server). BRL is simple arithmetic (`miles × cpm / 1000`) that should update instantly as the user types — doing this client-side avoids a round-trip on every keystroke.

3. **Single server action for both CPM and promotions**: One `getTransferConversionData` call replaces what would be 3 separate fetches (source CPM + dest CPM + active promotion). Reduces waterfall requests when program selection changes.

4. **Current CPM for history (not snapshot)**: Per PRD FR-17, historical transfers use current average CPM. This avoids schema changes and keeps the feature purely additive.

5. **Highest bonus promotion auto-fill**: Per PRD OQ-1 decision, when multiple active promotions exist, the one with the highest `bonusPercent` is pre-filled. The user can override manually.

### Known Risks

1. **CPM data availability**: New users or programs with no transfer history will show "no data" placeholders. This is expected and handled, but may reduce initial feature utility. Mitigation: clear "no data" messaging with encouragement to log transfers.

2. **Stale promotion data**: Promotions may expire between page load and form submission. Mitigation: the bonus field is always editable, and the actual transfer logic doesn't depend on the auto-filled value being current.

3. **Performance with many programs in history**: The history table computes BRL for every row using per-program CPM. For users with many transfers across many programs, this could mean multiple `getUserAverageCostPerMilheiro()` calls. Mitigation: batch CPM lookups by deduplicating program names and fetching once per unique program.

### Standards Compliance

- **Code standards** (`code-standards-reference`): camelCase for functions/variables, PascalCase for components/interfaces, verb-first function names, max 3 params (object for more), no `any` types.
- **TypeScript** (`typescript`): Strict mode, proper typing for all interfaces, `const` over `let`, no `any`.
- **Architecture** (`architecture`): Single responsibility — server action handles data fetching, hook handles state/debouncing, component handles rendering. Composition over inheritance.
- **Testing** (`testing-reference`): Co-located test files, AAA pattern, mock only external boundaries (server action), Vitest framework.
- **Logging** (`logging-reference`): Pino logger, data-first syntax, appropriate log levels (debug for missing data, error for failures).
- **React** (`reactjs`): Functional components with hooks, custom hook for reusable logic, server components for data fetching.

### Relevant and Dependent Files

**Modified files:**
- `src/actions/transfers.ts` — Add `getTransferConversionData` server action
- `src/components/dashboard/transfer-form-dialog.tsx` — Add BRL display, net value badge, promotion auto-fill
- `src/app/(dashboard)/transfers/page.tsx` — Add BRL columns and net value badges to history table

**New files:**
- `src/hooks/use-transfer-conversion.ts` — Debounced conversion hook
- `src/components/dashboard/net-value-badge.tsx` — Color-coded net value indicator

**Dependent files (read-only):**
- `src/lib/services/transfer.service.ts` — `getUserAverageCostPerMilheiro()`
- `src/lib/services/promotion.service.ts` — `listPromotions()`
- `src/lib/services/program-enrollment.service.ts` — `listPrograms()`
- `src/lib/utils/format.ts` — `formatCurrency()`, `formatNumber()`
- `src/lib/validators/transfer.schema.ts` — Existing transfer schemas
- `src/components/ui/badge.tsx` — Badge component
- `src/components/dashboard/transfer-form-utils.ts` — Form parsing utilities
