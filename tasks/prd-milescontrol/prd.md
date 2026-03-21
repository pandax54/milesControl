# Product Requirements Document (PRD) — v2
# MilesControl — Miles & Points Management Platform

## Overview

MilesControl is a web application for managing frequent flyer miles and loyalty points across Brazil's major programs (Smiles, Latam Pass, Azul Fidelidade, Livelo, Esfera). It serves two user types: individual miles enthusiasts who want to optimize their own accumulation, and miles managers/consultants who manage portfolios for multiple clients.

The platform solves three core problems: (1) tracking balances, club subscriptions, and credit card programs across fragmented ecosystems, (2) discovering and evaluating promotions for buying points and transfer bonuses in real-time, and (3) finding the best award flight pricing using miles for desired destinations.

### Competitive Positioning

MilesControl sits between two established products — AwardWallet (global tracker, 623 programs, $49.99/yr) and Oktoplus (Brazil-focused, 65+ programs, 1M+ downloads). Neither provides deep promotional intelligence or strategic decision-making tools for the Brazilian miles ecosystem.

**AwardWallet** excels at auto-syncing balances by logging into accounts, but offers zero promotion tracking, no flight search, no cost analysis, and no understanding of the Brazilian club/transfer ecosystem. Their auto-sync model is eroding as airlines add 2FA and block third-party access.

**Oktoplus** is Brazil-focused and offers flight search comparing miles vs. cash, plus a "sell your miles" marketplace. However, recent user reviews report severe reliability problems with program connections and search results. They offer no cost-per-milheiro calculator, no club subscription management, no transfer history, and limited admin tools.

**MilesControl's differentiator**: We are the only platform that combines portfolio tracking with promotional intelligence and strategic decision-making. We don't just tell you what you have — we tell you what you should do, when, and why the math works.

## Objectives

- Enable users to track all miles/points balances, club subscriptions, and credit card programs in a single dashboard
- Automatically discover and evaluate promotions from major Brazilian miles blogs and program sites
- Calculate effective cost-per-milheiro for any promotion scenario (purchase + transfer bonus)
- Alert users via Telegram/email/push when promotions match their configured thresholds
- Search for award flight availability and cash flight prices for desired routes
- Provide "should I use miles or cash?" recommendations with real math
- Support multi-client management for miles consultants (admin role)
- Track club subscription schedules including variable monthly accruals (e.g., first 6 months at 2k then 1k/month)

Key metrics:
- Time saved vs manual promotion monitoring (target: 5+ hours/week)
- Average cost-per-milheiro achieved by users over time
- Number of promotions caught within 1 hour of publication
- User retention (monthly active rate > 70%)
- Conversion to premium tier (target: 15% of active users)

## User Stories

### Individual User (Miles Enthusiast)
- As a user, I want to see all my miles balances across programs in one dashboard so I don't need to log into 5+ sites
- As a user, I want to register my club subscriptions (Clube Smiles plano 2.000, Clube Livelo plano 500, etc.) with their specific tier and pricing so the system can project future miles accrual
- As a user, I want to define variable accrual schedules (e.g., "first 6 months = 2,000 miles/month, then 1,000 miles/month") so my projections are accurate
- As a user, I want to register my credit cards and their associated points programs so I know where my spending generates points
- As a user, I want to receive alerts when a transfer bonus promotion exceeds my threshold (e.g., > 80% bonus to Smiles) so I never miss a good deal
- As a user, I want to search for flights to specific destinations and dates, seeing both cash and miles prices, so I can decide the best redemption strategy
- As a user, I want a cost-per-milheiro calculator where I input promo details and instantly see whether a deal is worth it
- As a user, I want to see a timeline of upcoming promotions based on the miles calendar (Black Friday, September anniversaries, etc.)
- As a user, I want quick-update buttons to adjust my balance in 2 taps, not a full form (inspired by frictionless UX)
- As a user, I want a "last updated X days ago" indicator per program so I know when my data is stale
- As a user, I want to see my "potential balance" — what I would have if I consolidated all banking points into a single airline program (inspired by Oktoplus)
- As a user, I want one-click links to jump directly to each program's website (inspired by AwardWallet)
- As a user, I want weekly balance-change emails showing which programs increased or decreased (inspired by AwardWallet)
- As a user, I want to track benefits beyond miles: free night certificates, companion passes, upgrade credits, lounge access counts (inspired by AwardWallet Plus)
- As a user, I want to explore destinations by browsing flights by region, holiday dates, and weekends — not just specific routes (inspired by Oktoplus Explore)
- As a user, I want a "miles value advisor" that tells me whether redeeming miles for a specific flight is worth it vs paying cash, based on my personal average cost-per-milheiro

### Miles Manager (Admin/Consultant)
- As a manager, I want to manage multiple client profiles, each with their own programs, balances, and subscriptions
- As a manager, I want a consolidated view across all clients showing total balances, upcoming expirations, and active promotions
- As a manager, I want to send personalized promotion alerts to specific clients based on their programs and thresholds
- As a manager, I want audit logs of all balance updates and transfer recommendations I've made
- As a manager, I want a dashboard showing clients who would benefit from the currently active promotions

## Core Features

### F1: User Dashboard & Program Registry
What: Central dashboard showing all enrolled programs, current balances, club subscriptions with tier details, credit card linkages, and benefit tracking.
Why: Eliminates the need to check multiple websites. Provides single source of truth.
How: Users manually input and update balances. System tracks programs, tiers, subscription details, and additional benefits.

Functional Requirements:
- F1.1: User can register enrollment in airline programs (Smiles, Latam Pass, Azul Fidelidade) with current balance, tier/status, and expiration date
- F1.2: User can register banking/points programs (Livelo, Esfera, iupp, Átomos) with current balance
- F1.3: User can register club subscriptions with: plan name, tier (e.g., Clube Smiles 2.000), monthly cost, start date, minimum stay period, monthly miles accrual amount
- F1.4: User can define variable accrual schedules per subscription: phase-based rules like "months 1-6: 2,000/month, months 7+: 1,000/month" or "first month: 20,000 bonus, then 2,000/month"
- F1.5: System projects future miles balance based on subscriptions and accrual schedules, showing month-by-month forecast
- F1.6: User can register credit cards with: bank, card name, points program, points-per-real ratio, annual fee, and benefits
- F1.7: Dashboard shows consolidated view: total miles per program, total points in banking programs, active subscriptions with next billing date, projected balances at 3/6/12 months
- F1.8: User can log manual transfers between programs with: amount, bonus applied, effective cost, date
- F1.9: **Quick-update UX** — balance update via "+1000", "-5000", or "set to X" buttons in max 2 taps. No full form required. [Addresses manual entry friction]
- F1.10: **Staleness indicator** — each program shows "Updated 3 days ago" with color coding (green < 7d, yellow 7-30d, red > 30d). System sends reminders for stale balances.
- F1.11: **Potential balance calculator** — shows "If you transferred all Livelo + Esfera points to Smiles, you'd have X miles" with current 1:1 rates (before bonus). [Inspired by Oktoplus]
- F1.12: **One-click program links** — each enrolled program has a direct link to its website/app. [Inspired by AwardWallet]
- F1.13: **Balance change digest** — weekly email showing which programs had balance increases or decreases since last update, with amounts. [Inspired by AwardWallet]
- F1.14: **Benefit tracking** — beyond miles, track: free night certificates (with expiration), companion passes, upgrade credits, lounge access remaining, credit card travel credits. Each with expiration alerts. [Inspired by AwardWallet Plus]
- F1.15: **Family member profiles** — individual users (non-admin) can add family members and manage their program enrollments under one account. [Inspired by both competitors]

### F2: Promotion Tracker & Alerts
What: Automated scraping of major miles blogs and program pages to discover promotions, calculate their value, and alert users.
Why: Good promotions are time-sensitive (often 24-72 hours). Missing a 100% bonus transfer can mean paying 2x for the same miles.
How: Scheduled scrapers pull content from known sources, pattern matching extracts promotion details, cost calculator evaluates deals, notification system alerts users.

Functional Requirements:
- F2.1: System scrapes content from configured sources at regular intervals (every 30-60 minutes): Passageiro de Primeira, Melhores Cartões, Pontos Pra Voar, Comparemania, and direct program pages
- F2.2: System extracts promotion metadata: type (transfer bonus, point purchase, club signup), source program, destination program, bonus percentage, deadline, minimum transfer amount, cap
- F2.3: System calculates effective cost-per-milheiro for each promotion considering: current point purchase prices, transfer bonus, club membership costs
- F2.4: System rates promotions: Excellent (< R$12), Good (R$12-16), Acceptable (R$16-20), Avoid (> R$20)
- F2.5: Users configure personal alert thresholds: per program, per promotion type, maximum cost-per-milheiro
- F2.6: Alerts delivered via: in-app notifications, email digest, Telegram bot, web push
- F2.7: Promotion feed shows: active promotions sorted by value, with source link, deadline countdown, and one-click cost calculator
- F2.8: Historical promotion archive for pattern analysis (when do the best promos typically appear?)
- F2.9: Miles calendar showing expected promotional periods (Consumer Week March, Livelo anniversary September, Black Friday November, etc.)
- F2.10: **Personalized promo matching** — system highlights promotions that are relevant to the user's enrolled programs. "This Livelo→Smiles 90% bonus is relevant because you have 15,000 Livelo points and are enrolled in Smiles."

### F3: Cost Calculator & Miles Value Advisor
What: Interactive calculator that evaluates any miles acquisition scenario AND redemption decision.
Why: The math is non-trivial when combining point purchases, transfer bonuses, club membership costs, and different rates.
How: Two modes: (1) acquisition calculator for buying/transferring points, (2) redemption advisor for deciding miles vs. cash for flights.

Functional Requirements:
- F3.1: **Acquisition calculator** — Input: source program, purchase price per point, quantity, destination program, transfer bonus %, club membership cost (monthly), club-exclusive bonus %
- F3.2: Output: total cost, total miles received, cost-per-milheiro, rating, comparison with user's historical average
- F3.3: Preset scenarios for common combinations (e.g., "Livelo R$28/k → Smiles 90% bonus")
- F3.4: Side-by-side comparison of up to 3 scenarios
- F3.5: Embed into promotion cards for one-click evaluation
- F3.6: **Redemption advisor (Miles Value Advisor)** — When viewing a flight, automatically calculate: "This flight costs R$1,200 cash or 15,000 Smiles miles. Your average cost-per-milheiro is R$14. So using miles costs you the equivalent of R$210 (15k × R$14/k) vs R$1,200 cash. Miles value: R$80/k — EXCELLENT redemption." [Inspired by Oktoplus "Dica" but with deeper math using user's actual cost data]
- F3.7: Redemption advisor considers user's personal cost history, not generic averages. If the user has been accumulating at R$12/k, the advice is different from someone at R$18/k.

### F4: Flight Search & Award Tracking
What: Search for flights showing both cash prices and award availability, with explore-by-destination mode.
Why: Users need to compare "is it worth using miles for this flight or paying cash?" to make informed decisions.
How: Integrate with external APIs for flight data, allow users to save desired routes for monitoring.

Functional Requirements:
- F4.1: Search flights by origin, destination, date range, cabin class, number of passengers
- F4.2: Show cash prices from Google Flights (via SerpApi or similar)
- F4.3: Show award availability from Seats.aero Pro API (supports Smiles, Azul, and other programs)
- F4.4: Calculate "miles value" = cash_price / miles_required — to determine if redemption is worthwhile
- F4.5: Users can save "watchlist" routes: origin, destination, flexible dates, target miles price
- F4.6: System monitors watchlist routes and alerts when prices drop below target
- F4.7: Display results with: airline, route, duration, stops, cash price (BRL), miles price per program, value per mile
- F4.8: **Explore destinations mode** — browse flights by region (Brazil, South America, Europe, etc.), by date type (holidays, weekends, flexible), sorted by best value in miles or cash. [Inspired by Oktoplus Explore and Google Flights Explore]
- F4.9: **Save favorite filters** — users save common search patterns (e.g., "VIX → any Europe, business, weekends in September") for quick reuse. [Inspired by Oktoplus]
- F4.10: Integrate Miles Value Advisor (F3.6) into every flight result card

### F5: Multi-Client Management (Admin)
What: Admin interface for miles consultants to manage multiple client portfolios.
Why: Professional miles managers handle 10-50+ clients and need consolidated views and per-client management.
How: Role-based access control with admin dashboard overlaying client data.

Functional Requirements:
- F5.1: Admin can create and manage client profiles (each is a full user account)
- F5.2: Admin dashboard shows: aggregated balances across all clients, clients with expiring miles, clients who would benefit from active promotions
- F5.3: Admin can impersonate client view to see their dashboard
- F5.4: Admin can send targeted promotion recommendations to specific clients
- F5.5: Audit log of all admin actions: balance updates, recommendations sent, transfers logged
- F5.6: Admin can manage their own miles separate from client data
- F5.7: **Promo-client matching** — when a new promotion is detected, system shows admin which clients would benefit based on their enrolled programs and balances. "This 90% Livelo→Smiles bonus is relevant for 12 of your 30 clients."
- F5.8: **Client reporting** — generate per-client reports showing: total miles managed, average cost-per-milheiro achieved, savings vs. market rate, upcoming expirations

### F6: Points Marketplace (v2 — future, but plan data model now)
What: Integration with miles buying/selling agencies to allow users to sell excess miles or buy discounted miles.
Why: Oktoplus's strongest monetization feature. Users with expiring miles need an easy way to cash them out.
How: List partner agencies, facilitate connection (not direct payment processing), track sale/purchase history.

Functional Requirements (v2):
- F6.1: List verified partner agencies that buy miles (with current rates per program)
- F6.2: User initiates sale request → redirected to agency → track status
- F6.3: Track sale history: miles sold, program, agency, amount received, date
- F6.4: Show "market value" of user's total portfolio (total miles × current sell rates)

**v1 data model note**: Include `PointsSale` model in schema now so we don't need migrations later. Leave UI for v2.

## User Experience

### Personas
1. **Enthusiast (Marina)**: 28, tech-savvy, has 2 credit cards, enrolled in Smiles and Livelo. Wants to fly to Europe in business class using miles. Needs help knowing when to buy/transfer points.
2. **Manager (Ricardo)**: 35, runs a miles consultancy with 30 clients. Needs to track everyone's balances, push promos to the right clients, and demonstrate value through cost savings reports.
3. **Casual (Ana)**: 42, has miles across 3 programs but rarely checks. Lets points expire. Needs gentle nudges and simplicity. [New persona — represents the low-engagement user that Oktoplus captures well]

### Main User Flows
1. **Onboarding**: Sign up → Register programs (guided wizard suggesting common programs) → Add subscriptions with accrual schedules → Set alert preferences → Dashboard ready
2. **Daily check**: Open dashboard → See active promotions ranked by value → Check if any match my programs → Use calculator to evaluate → Transfer points
3. **Flight planning**: Enter desired route → Compare cash vs miles → Miles Value Advisor tells me if miles are worth it → Add to watchlist if not ready to book
4. **Explore mode**: Browse destinations → Filter by region/dates/budget → Find inspiration → Check miles availability
5. **Quick update**: Get "stale balance" reminder → Open app → Tap program → Quick-update in 2 taps → Done
6. **Admin flow**: Review all clients → See "12 clients match this promo" → Send recommendations → Log actions

### UI/UX Considerations
- Mobile-first design (most users check promos on phone)
- Dark mode support
- Portuguese as primary language, English as secondary
- Real-time promotion badges and countdown timers
- Color-coded cost ratings (green/yellow/orange/red)
- Quick-update balance flow: max 2 taps from dashboard to updated balance
- Progressive disclosure: casual users see simple dashboard, power users access advanced tools
- Onboarding wizard that suggests common Brazilian programs (don't make users search for "Smiles" — just show it)

## High-Level Technical Constraints

- **Stack**: Next.js 14+ (App Router), PostgreSQL (via Prisma ORM), TypeScript strict mode
- **Auth**: NextAuth.js with email/password + Google OAuth
- **External APIs**: Seats.aero Pro API ($9.99/month, daily call limits), SerpApi Google Flights (free tier: 250 queries/month)
- **Scraping**: Respectful scraping with rate limiting, robots.txt compliance, Cheerio for static content
- **Notifications**: Telegram Bot API (free), Resend for email, Web Push API
- **Hosting**: Vercel (Next.js), Supabase or Neon for PostgreSQL
- **Cron**: Vercel Cron for scheduled scraping jobs
- **No airline account scraping**: All balance data is user-entered (airline ToS compliance — addresses AwardWallet's growing problem of being blocked by programs)
- **Data privacy**: User financial data (card details) stored as metadata only — no full card numbers

## Out of Scope (v1)

- Automatic balance syncing from airline/bank accounts (ToS and security concerns — intentional trade-off)
- Direct booking or purchasing of miles through the platform
- Payment processing for manager-client billing
- Mobile native apps (PWA approach instead — web-first is our advantage over Oktoplus's mobile-only model)
- Integration with international programs beyond Brazilian market
- AI-powered recommendation engine (v2)
- White-label/multi-tenant SaaS (v2)
- Miles selling marketplace UI (v2 — but schema planned in v1)
- Travel itinerary management (AwardWallet's strength — evaluate for v2)

## Open Questions

- Q1: Should the system attempt to parse promotion details automatically from blog posts (NLP/regex), or should there be a semi-manual curation step? → **Recommendation: start with regex/pattern matching + admin verification flag. Add LLM-powered extraction in v2.**
- Q2: What's the ideal scraping frequency that balances freshness vs. respectful usage? → **Recommendation: 30min for promo pages, 6h for program pages**
- Q3: Should the flight search feature be available to free users or gated behind a premium tier? → **Recommendation: free for cash search, premium for miles search + explore mode (mirrors Oktoplus model)**
- Q4: For the admin/manager role — is this a separate app or the same app with role-based UI? → **Recommendation: same app, role-based UI**
- Q5: Should the miles calendar be community-editable or admin-curated? → **Recommendation: admin-curated with user suggestion system**
- Q6: Should we add OCR from balance screenshots as a future way to make manual entry faster? → **Evaluate for v2**
- Q7: Should we integrate with MaxMilhas, Hotmilhas, or similar agencies for the marketplace feature? → **Research for v2 scope**

## Monetization Strategy (Freemium)

### Free Tier
- Track up to 5 programs
- Manual balance updates
- View active promotions (no personalized matching)
- Basic cost calculator
- Cash flight search only
- 1 flight watchlist item

### Premium Tier (target: ~R$19.90/month or R$179.90/year)
- Unlimited programs
- Personalized promo matching and alerts
- All notification channels (Telegram, email, push)
- Miles flight search (Seats.aero)
- Explore destinations mode
- Unlimited watchlist items
- Miles Value Advisor
- Benefit tracking (certificates, credits)
- Family member profiles
- Balance change digest emails
- Priority support

### Admin Tier (target: ~R$49.90/month)
- Everything in Premium
- Client management (up to 50 clients)
- Promo-client matching
- Client reporting
- Audit logs
- Bulk recommendations
