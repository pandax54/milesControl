# Implementation Tasks for MilesControl — v2

## Overview

Full task breakdown for the MilesControl miles management platform. Organized into 7 phases. Updated with competitive insights from AwardWallet and Oktoplus analysis.

## Task List

### Phase 1: Foundation

- [x] 1.0 Project scaffolding — Next.js 16 App Router, TypeScript strict, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui
- [x] 1.1 Database schema — Full Prisma schema with ALL models (including v2-planned: PointsSale, TrackedBenefit, FamilyMember, SavedFlightFilter)
- [x] 1.2 Seed data — Programs, club tiers, miles calendar events, sample promotions
- [x] 1.3 Authentication — NextAuth.js with credentials + Google OAuth, role-based middleware (USER, ADMIN)
- [x] 1.4 App shell layout — Responsive sidebar, top nav, dark mode toggle, route groups, onboarding wizard skeleton

### Phase 2: Core Dashboard

- [x] 2.0 Program enrollment CRUD — Register/edit/delete airline and banking programs with balance, tier, expiration date
- [x] 2.1 **Quick-update UX** — "+1000"/"-5000"/"set to X" balance update in max 2 taps. Staleness indicator with color coding (green < 7d, yellow 7-30d, red > 30d). [Competitive insight: frictionless to compete with auto-sync]
- [x] 2.2 Club subscription management — Create subscriptions with tier selection, accrual schedule builder (phase-based), billing tracking
- [x] 2.3 Accrual projector service — Calculate projected balances at 3/6/12 months based on subscription schedules
- [x] 2.4 Credit card registry — Add/edit/remove cards with bank, name, points program, rates, annual fee, benefits
- [x] 2.5 Dashboard page — Consolidated view: balances, subscriptions, projections, recent transfers, staleness alerts
- [x] 2.6 Transfer logging — Log transfers with source/dest program, amount, bonus %, cost, linked promotion
- [x] 2.7 **Potential balance calculator** — "If you transferred all Livelo + Esfera to Smiles, you'd have X miles." Show per-airline consolidation options. [Inspired by Oktoplus]
- [x] 2.8 **One-click program links** — Direct link to each program's website from enrollment card. [Inspired by AwardWallet]
- [x] 2.9 **Balance change digest** — Weekly email: "This week: Smiles +2,000, Livelo -10,000, Esfera unchanged." Cron job + Resend template. [Inspired by AwardWallet]
- [x] 2.10 **Benefit tracking** — CRUD for TrackedBenefit: free nights, companion passes, upgrade credits, lounge access, travel credits. Expiration alerts. [Inspired by AwardWallet Plus]
- [x] 2.11 **Family member profiles** — Add family members with their own program enrollments. Manage balances under one account. [Inspired by both competitors]

### Phase 3: Promotions Engine

- [x] 3.0 Base scraper infrastructure — Abstract scraper class, rate limiting, robots.txt, retry, logging, ScraperRun persistence
- [x] 3.1 Passageiro de Primeira scraper
- [x] 3.2 Melhores Cartões scraper
- [x] 3.3 Pontos Pra Voar scraper
- [x] 3.4 Comparemania scraper
- [x] 3.5 Promotion deduplication and storage
- [x] 3.6 Cost calculator service — Pure functions: calculateCostPerMilheiro, ratePromotion, compareScenarios
- [x] 3.7 Calculator UI page — Interactive form, presets, comparison, embedded in promo cards
- [x] 3.8 **Miles Value Advisor (Redemption Advisor)** — "This flight values your miles at R$80/k based on YOUR cost history." Uses user's actual transfer history average, not generic. [Key differentiator vs Oktoplus "Dica"]
- [x] 3.9 Promotion feed page — Active promos sorted by value, filters, deadline countdown, source links
- [ ] 3.10 **Personalized promo matching** — Highlight promos relevant to user's enrolled programs. "Relevant for you: you have 15,000 Livelo points." [Neither competitor does this]
- [ ] 3.11 Cron job: scrape-promos — Vercel Cron every 30 min
- [ ] 3.12 Miles calendar page — Calendar view with expected promo periods, historical notes

### Phase 4: Alerts & Notifications

- [ ] 4.0 Alert configuration UI — Create/edit rules: programs, promo types, min bonus %, max cost/milheiro, channels
- [ ] 4.1 Alert matching engine — Match new promos against active alerts
- [ ] 4.2 Telegram bot — Setup, webhook, commands (/start, /alerts, /promos, /calc), chat ID registration
- [ ] 4.3 Email notifications — Resend: alert emails, weekly digest, balance change digest (from 2.9)
- [ ] 4.4 In-app notification center — List, read/unread, badge in nav
- [ ] 4.5 Web push notifications

### Phase 5: Flight Search

- [ ] 5.0 Flight search UI — Search form, results display with Miles Value Advisor integrated per card
- [ ] 5.1 Seats.aero integration — Client library, cached search, trip details, error handling
- [ ] 5.2 SerpApi Google Flights integration — Client library, flight search, result parsing, 6h cache
- [ ] 5.3 **Miles value comparison per result** — Each flight card shows: cash price, miles price, and "Miles value: R$X/k — [RATING]" using user's cost data. [Differentiator]
- [ ] 5.4 Flight watchlist — CRUD, target price alerts
- [ ] 5.5 Cron job: check-flights — Vercel Cron every 6h
- [ ] 5.6 **Explore destinations** — Browse flights by region, date type (holidays/weekends/flexible), sorted by best value. [Inspired by Oktoplus Explore + Google Flights Explore]
- [ ] 5.7 **Saved flight filters** — Save common searches for quick reuse. [Inspired by Oktoplus]

### Phase 6: Admin & Multi-Client

- [ ] 6.0 Admin dashboard — Aggregated view: total clients, balances, expiring miles
- [ ] 6.1 Client management — Add/edit/view clients, impersonate client view
- [ ] 6.2 **Promo-client matching** — "This promo is relevant for 12 of your 30 clients." Batch recommendation UI. [Unique feature]
- [ ] 6.3 Recommendation system — Send targeted promo recommendations to specific clients
- [ ] 6.4 Audit logging — Track all admin actions, audit log page
- [ ] 6.5 **Client reporting** — Per-client reports: total miles managed, avg cost/milheiro, savings vs market, expirations. [Unique feature]

### Phase 7: Onboarding & Polish

- [ ] 7.0 **Onboarding wizard** — Step-by-step: suggest common Brazilian programs (show Smiles/Livelo/Latam Pass/Azul as quick-add buttons), add subscriptions, set alerts. Progressive disclosure — casual users see simple setup, power users go deep. [Addresses the "cold start" problem both competitors handle poorly]
- [ ] 7.1 **Freemium gating** — Free tier (5 programs, basic calculator, cash flights) vs Premium (unlimited, Miles Value Advisor, miles flights, explore, Telegram, benefits). [Follows Oktoplus model]
- [ ] 7.2 PWA setup — Service worker, offline dashboard, installable on mobile
- [ ] 7.3 SEO and landing page — Public pages: calculator tool, miles calendar, active promos feed (drives organic traffic)
- [ ] 7.4 Performance optimization — RSC streaming, skeleton loaders, image optimization
- [ ] 7.5 Analytics — Posthog or similar: track onboarding completion, feature usage, promo engagement

## Dependencies Graph

```
Phase 1 (Foundation)
  └── Phase 2 (Dashboard + competitive features)
        ├── Phase 3 (Promotions + Miles Value Advisor)
        │     └── Phase 4 (Alerts)
        └── Phase 5 (Flights + Explore)
  └── Phase 6 (Admin) ── requires all above
  └── Phase 7 (Polish) ── final layer
```

## Key Competitive Tasks (marked with priority)

These are the features that directly address gaps in AwardWallet and Oktoplus:

| Task                      | What it addresses                                | Priority |
| ------------------------- | ------------------------------------------------ | -------- |
| 2.1 Quick-update UX       | Makes manual entry competitive with auto-sync    | P0       |
| 2.7 Potential balance     | Stolen from Oktoplus, improved                   | P1       |
| 2.9 Balance digest        | Stolen from AwardWallet, drives retention        | P1       |
| 2.10 Benefit tracking     | Stolen from AwardWallet Plus                     | P2       |
| 3.8 Miles Value Advisor   | Better than Oktoplus "Dica" — uses personal data | P0       |
| 3.10 Personalized promos  | Neither competitor does this                     | P0       |
| 5.6 Explore destinations  | Stolen from Oktoplus, improved                   | P1       |
| 6.2 Promo-client matching | Unique to us                                     | P1       |
| 7.0 Onboarding wizard     | Critical for conversion                          | P0       |

## Notes

- Each task: `execute-task.md` → `task-reviewer` agent
- All tasks require unit tests (Vitest) with 80% coverage
- Zod validation on all inputs
- Pino logging on all services
- Tasks marked P0 should be prioritized within their phase
