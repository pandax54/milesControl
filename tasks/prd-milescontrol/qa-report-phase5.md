# QA Report — Phase 5: Flight Search

## Summary
- Date: 2026-03-24
- Status: APPROVED
- Total Requirements: 10 (PRD F4.1–F4.10) + 8 tasks (5.0–5.7)
- Requirements Met: 10/10
- Tasks Completed: 8/8 (task 5.7 implemented but tasks file not updated — BUG-01)
- Bugs Found: 1 (Low severity — documentation only)

---

## Requirements Verified

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| F4.1 | Search flights by origin, destination, date range, cabin class, passengers | PASSED | `flightSearchParamsSchema` validates all params; `searchFlightsAction` delegates to `searchFlights()` |
| F4.2 | Show cash prices from Google Flights via SerpApi | PASSED | `searchCashFlights()` in `serp-api.ts`; 6h in-memory cache; retry logic on 5xx |
| F4.3 | Show award availability from Seats.aero Pro API | PASSED | `searchAvailability()` in `seats-aero.ts`; exponential backoff; Zod-validated responses |
| F4.4 | Calculate miles value = cash_price / miles_required | PASSED | `computeFlightMilesValue()` delegates to `computeRedemptionAdvisor()`; uses user's personal avg cost |
| F4.5 | Users can save watchlist routes with target miles/cash price | PASSED | `FlightWatchlist` model; CRUD via `flight-watchlist.service.ts`; requires at least one target price |
| F4.6 | Monitor watchlist and alert when prices drop | PASSED | `checkAllActiveWatchlistItems()` runs every 6h via Vercel Cron; creates IN_APP notifications |
| F4.7 | Display results with airline, duration, stops, cash price, miles price, value per mile | PASSED | `CashFlight` and `AwardFlight` interfaces include all required fields |
| F4.8 | Explore destinations by region, date type (holidays/weekends/flexible), sorted by value | PASSED | `explore-destinations.service.ts`; 5 regions × 5 airports; 3 date types; 3 sort options |
| F4.9 | Save favorite flight filters for quick reuse | PASSED | `saved-flight-filter.service.ts` + `SavedFiltersPanel` UI component; full CRUD |
| F4.10 | Integrate Miles Value Advisor into every flight result card | PASSED | `MilesValueBadge` in `award-flight-card.tsx`; values pre-computed in server action |

---

## Task Completion Verified

| Task | Description | Status | Notes |
|------|-------------|--------|-------|
| 5.0 | Flight search UI — form, results, Miles Value Advisor per card | PASSED | `flight-search-page.tsx`, `flight-results.tsx`, `award-flight-card.tsx` |
| 5.1 | Seats.aero integration — client library, cached search, error handling | PASSED | `seats-aero.ts`; exponential backoff; cabin/program mapping |
| 5.2 | SerpApi Google Flights integration — client library, 6h cache | PASSED | `serp-api.ts`; in-memory cache with TTL; retry on 5xx |
| 5.3 | Miles value comparison per result using user's cost data | PASSED | `miles-value-comparison.service.ts`; uses personal avg vs generic fallback |
| 5.4 | Flight watchlist — CRUD, target price alerts | PASSED | `flight-watchlist.service.ts`; full CRUD + toggle active |
| 5.5 | Cron job check-flights — Vercel Cron every 6h | PASSED | `vercel.json` schedule `0 */6 * * *`; `maxDuration = 300` |
| 5.6 | Explore destinations by region/date type, sorted by value | PASSED | `explore-destinations.service.ts`; `explore-destinations-page.tsx` |
| 5.7 | Saved flight filters — save common searches for quick reuse | PASSED | `saved-flight-filter.service.ts`; `saved-filters-panel.tsx`; tasks file not updated (BUG-01) |

---

## API Endpoints / Server Actions Tested

| Type | Identifier | Status | Notes |
|------|-----------|--------|-------|
| Server Action | `searchFlightsAction` | PASSED | Validates params, parallel fetch, pre-computes miles values |
| Server Action | `exploreDestinationsAction` | PASSED | Validates params, batches up to 5 destinations |
| Server Action | `listSavedFlightFiltersAction` | PASSED | Auth-guarded, returns user's saved filters |
| Server Action | `createSavedFlightFilterAction` | PASSED | Zod validation, auth-guarded, Pino logging |
| Server Action | `deleteSavedFlightFilterAction` | PASSED | Auth + ownership check via service layer |
| Server Action | `addWatchlistItem` | PASSED | Validates at-least-one-price-target constraint |
| Server Action | `editWatchlistItem` | PASSED | Partial update with ownership check |
| Server Action | `removeWatchlistItem` | PASSED | Ownership enforced; revalidates path |
| Server Action | `setWatchlistItemActive` | PASSED | Toggle active flag |
| Route Handler | `GET /api/cron/check-flights` | PASSED | Bearer token auth; 5-min timeout; structured response |

Note: TechSpec listed `/api/flights/search`, `/api/flights/watchlist`, etc. as Route Handlers. The implementation correctly uses Server Actions per the architecture rule "Server Actions handle mutations; Route Handlers serve as API for external webhook and cron job endpoints." This is a design-level clarification, not a deviation.

---

## Data Integrity

- [x] Database constraints enforced — `FlightWatchlist @@index([userId, isActive])`, `SavedFlightFilter @@index([userId])`, cascade deletes on user
- [x] Ownership checks before mutations — `findFirst({ where: { id, userId } })` before every update/delete
- [x] No orphaned records — cascade delete via `onDelete: Cascade` on user relation
- [x] Prisma schema in sync — build compiled clean with generated client
- [x] `Decimal` type used for monetary values (`targetCashPrice`, `maxCashPrice`) — more precise than `Float`

---

## Error Handling

- [x] Structured error responses on all server actions — `{ success: false, error: string }`
- [x] Custom error classes — `WatchlistItemNotFoundError`, `SavedFlightFilterNotFoundError`, `SeatsAeroError`, `SerpApiError`
- [x] External API failures handled gracefully — `SeatsAeroError` and `SerpApiError` return empty arrays, not 500
- [x] Errors logged with proper Pino context — `logger.error({ err: error }, ...)` throughout
- [x] Unexpected errors do not leak sensitive data — generic messages in action returns

---

## Security

- [x] Authentication enforced on all protected server actions — `auth()` session check before every mutation
- [x] Cron endpoint protected — `CRON_SECRET` bearer token verification
- [x] No sensitive data in responses — API keys, session tokens not included in action results
- [x] Parameterized queries via Prisma — no SQL injection risk
- [x] Resource isolation — all service queries include `userId` to prevent cross-user data access

---

## Test Suite

- Unit tests: **ALL PASSING** (74 test files, 1403 tests)
- Integration tests: N/A (external APIs mocked)
- Type checking: **NO ERRORS** (`npx tsc --noEmit` — clean)
- Coverage: **97.87% statements, 90.79% branches, 97.73% functions** (threshold: 80% — all exceeded)
- Build: **PASSED** — `✓ Compiled successfully in 3.8s`

---

## Bugs Found

| ID | Description | Severity | Location | Reproduction Steps |
|----|-------------|----------|----------|--------------------|
| BUG-01 | Task 5.7 not marked as complete in phase_5_tasks.txt | Low | `logs/phase-5/phase_5_tasks.txt` line 19 | Open file — `[ ]` should be `[x]`; feature fully implemented in commits 4e367cf/256a22b |

---

## Conclusion

Phase 5 (Flight Search) is **APPROVED**. All 10 PRD requirements (F4.1–F4.10) are fully implemented and verified. The test suite is 100% passing with 97.87% code coverage, well above the 80% threshold. The production build is clean. One low-severity documentation bug was found (task 5.7 checkbox not updated in the tasks file). No functional regressions. The implementation correctly uses Next.js Server Actions for flight search interactions, consistent with the established architecture pattern for the project.
