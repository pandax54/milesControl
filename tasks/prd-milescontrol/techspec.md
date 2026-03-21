# Technical Specification

# MilesControl — Miles & Points Management Platform

## Executive Summary

MilesControl is a Next.js 16+ App Router application backed by PostgreSQL (via Prisma ORM) that enables users to manage miles and points across Brazilian loyalty programs. The architecture follows a modular monolith pattern within the Next.js framework: React Server Components for data-heavy pages, Server Actions for mutations, Route Handlers for API endpoints and cron jobs, and a service layer for business logic. External integrations include Seats.aero for award flight data, SerpApi for Google Flights cash prices, Cheerio-based scrapers for promotion discovery, and Telegram Bot API for notifications. Authentication uses NextAuth.js with role-based access (USER, ADMIN).

## System Architecture

### Component Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │  App Router  │  │   Server    │  │   Route Handlers     │ │
│  │   (Pages)    │  │  Actions    │  │   (API + Cron)       │ │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬───────────┘ │
│         │                 │                     │             │
│  ┌──────▼─────────────────▼─────────────────────▼───────────┐│
│  │                  SERVICE LAYER                            ││
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐ ││
│  │  │ Program  │ │  Promo    │ │  Flight  │ │   Alert    │ ││
│  │  │ Service  │ │  Service  │ │  Service │ │  Service   │ ││
│  │  └──────────┘ └───────────┘ └──────────┘ └────────────┘ ││
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐ ││
│  │  │Calculator│ │  Scraper  │ │  Admin   │ │   User     │ ││
│  │  │ Service  │ │  Service  │ │  Service │ │  Service   │ ││
│  │  └──────────┘ └───────────┘ └──────────┘ └────────────┘ ││
│  └──────────────────────┬───────────────────────────────────┘│
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────────┐│
│  │                  PRISMA ORM                               ││
│  └──────────────────────┬───────────────────────────────────┘│
└──────────────────────────┼───────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │       PostgreSQL        │
              │  (Supabase / Neon)      │
              └─────────────────────────┘

External Integrations:
  ├── Seats.aero API (award flights)
  ├── SerpApi Google Flights (cash prices)
  ├── Cheerio scrapers (promo blogs)
  ├── Telegram Bot API (notifications)
  └── Resend (email notifications)
```

### Key Relationships

- **Pages** use React Server Components to fetch data directly via Prisma
- **Server Actions** handle mutations (create/update programs, log transfers, etc.)
- **Route Handlers** serve as API for external webhook and cron job endpoints
- **Service Layer** encapsulates business logic, shared between Server Actions and Route Handlers
- **Scraper Service** runs via Vercel Cron, stores results in DB, triggers Alert Service

## Implementation Design

### Key Interfaces

```typescript
// === Calculator Service ===
interface CostCalculation {
  totalCost: number
  totalMiles: number
  costPerMilheiro: number
  rating: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'AVOID'
}

interface CalculatorInput {
  purchasePricePerPoint: number
  quantity: number
  transferBonusPercent: number
  clubMonthlyCost?: number
  clubExclusiveBonusPercent?: number
}

function calculateCostPerMilheiro(input: CalculatorInput): CostCalculation

// === Promo Service ===
interface ScrapedPromotion {
  sourceUrl: string
  sourceName: string
  title: string
  type: 'TRANSFER_BONUS' | 'POINT_PURCHASE' | 'CLUB_SIGNUP' | 'MIXED'
  sourceProgram?: string
  destinationProgram?: string
  bonusPercent?: number
  purchaseDiscount?: number
  deadline?: Date
  minimumTransfer?: number
  maxBonusCap?: number
  rawContent: string
  detectedAt: Date
}

interface PromoEvaluation {
  promotion: ScrapedPromotion
  effectiveCostPerMilheiro: number
  rating: CostCalculation['rating']
  matchedAlerts: UserAlert[]
}

// === Flight Service ===
interface FlightSearchParams {
  origin: string // IATA code
  destination: string // IATA code
  departureDate: string // YYYY-MM-DD
  returnDate?: string
  passengers: number
  cabinClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
}

interface FlightSearchResult {
  cashFlights: CashFlight[]
  awardFlights: AwardFlight[]
}

interface CashFlight {
  airline: string
  price: number // BRL
  duration: number // minutes
  stops: number
  departureTime: string
  arrivalTime: string
  source: 'GOOGLE_FLIGHTS'
}

interface AwardFlight {
  airline: string
  milesRequired: number
  taxes: number // BRL
  program: string // e.g. 'smiles', 'azul'
  cabinClass: string
  seatsAvailable: number
  source: 'SEATS_AERO'
}

// === Accrual Schedule ===
interface AccrualPhase {
  startMonth: number // 1-based: month 1 = first month of subscription
  endMonth: number | null // null = ongoing
  milesPerMonth: number
  bonusMiles?: number // one-time bonus at start of phase
}

interface ClubSubscriptionSchedule {
  phases: AccrualPhase[]
}

// === Miles Value Advisor (NEW — competitive differentiator vs Oktoplus "Dica") ===
interface RedemptionAdvisorInput {
  cashPriceBRL: number
  milesRequired: number
  taxesBRL: number // taxes/fees when using miles
  program: string // e.g. 'smiles'
  userAvgCostPerMilheiro?: number // from user's transfer history
}

interface RedemptionAdvisorResult {
  milesValuePerK: number // R$ per 1,000 miles in this redemption
  equivalentCashCost: number // what user "paid" for those miles based on their history
  cashSavings: number // cashPrice - equivalentCashCost - taxes
  rating: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'AVOID'
  recommendation: string // "Use miles — you'd save R$990" or "Pay cash — your miles are worth more"
}
// Key differentiator: uses user's ACTUAL cost history, not generic averages.
// If user accumulated at R$12/k, 15k miles "cost" them R$180.
// If flight costs R$1,200 cash, redemption value is R$80/k → EXCELLENT.

// === Potential Balance Calculator (NEW — inspired by Oktoplus) ===
interface PotentialBalance {
  targetProgram: string
  sources: Array<{
    program: string
    currentBalance: number
    transferRatio: number // usually 1:1 for Brazilian programs
    potentialMiles: number
  }>
  totalPotentialMiles: number
  totalWithBestBonus?: number // if a transfer bonus is active
}

// === Benefit Tracking (NEW — inspired by AwardWallet Plus) ===
interface TrackedBenefit {
  type:
    | 'FREE_NIGHT'
    | 'COMPANION_PASS'
    | 'UPGRADE_CREDIT'
    | 'LOUNGE_ACCESS'
    | 'TRAVEL_CREDIT'
    | 'OTHER'
  programOrCard: string
  description: string
  quantity: number
  expirationDate?: Date
  isUsed: boolean
}
// Example: Clube Smiles promo "20k bonus + 2k/month for 12 months"
// phases: [
//   { startMonth: 1, endMonth: 1, milesPerMonth: 2000, bonusMiles: 20000 },
//   { startMonth: 2, endMonth: 12, milesPerMonth: 2000 }
// ]
// Example: "First 6 months 2k, then 1k/month"
// phases: [
//   { startMonth: 1, endMonth: 6, milesPerMonth: 2000 },
//   { startMonth: 7, endMonth: null, milesPerMonth: 1000 }
// ]
```

### Data Models

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==================== AUTH & USERS ====================

enum UserRole {
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  image         String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Admin manages clients
  managedBy     User?     @relation("AdminClients", fields: [managedById], references: [id])
  managedById   String?
  clients       User[]    @relation("AdminClients")

  // User data
  programEnrollments  ProgramEnrollment[]
  clubSubscriptions   ClubSubscription[]
  creditCards         CreditCard[]
  transferLogs        TransferLog[]
  alertConfigs        AlertConfig[]
  notifications       Notification[]
  flightWatchlists    FlightWatchlist[]
  auditLogs           AuditLog[]
  trackedBenefits     TrackedBenefit[]
  familyMembers       FamilyMember[]
  pointsSales         PointsSale[]
  savedFlightFilters  SavedFlightFilter[]

  @@index([managedById])
  @@index([email])
}

// ==================== PROGRAMS & BALANCES ====================

enum ProgramType {
  AIRLINE       // Smiles, Latam Pass, Azul Fidelidade
  BANKING       // Livelo, Esfera, iupp, Átomos
}

model Program {
  id            String      @id @default(cuid())
  name          String      @unique    // "Smiles", "Latam Pass", "Livelo", etc.
  type          ProgramType
  currency      String      // "miles" or "points"
  logoUrl       String?
  website       String?
  transferPartners Json?    // [{ programId, defaultRatio, ... }]

  enrollments   ProgramEnrollment[]
  familyEnrollments FamilyProgramEnrollment[]
  clubs         ClubTier[]
  promotions    Promotion[]  @relation("DestinationPromos")
  sourcePromos  Promotion[]  @relation("SourcePromos")

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model ProgramEnrollment {
  id            String    @id @default(cuid())
  userId        String
  programId     String
  memberNumber  String?
  currentBalance Int      @default(0)
  tier          String?   // "Gold", "Diamond", etc.
  balanceUpdatedAt DateTime @default(now())
  expirationDate DateTime? // earliest miles expiration

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  program       Program   @relation(fields: [programId], references: [id])

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([userId, programId])
  @@index([userId])
}

// ==================== CLUB SUBSCRIPTIONS ====================

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
  PAUSED
}

model ClubTier {
  id               String    @id @default(cuid())
  programId        String
  name             String    // "Clube Smiles 2.000", "Clube Livelo 500"
  monthlyPrice     Float
  baseMonthlyMiles Int       // default monthly accrual
  minimumStayMonths Int      @default(0)
  benefits         Json?     // extra benefits description

  program          Program   @relation(fields: [programId], references: [id])
  subscriptions    ClubSubscription[]

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@unique([programId, name])
}

model ClubSubscription {
  id               String             @id @default(cuid())
  userId           String
  clubTierId       String
  status           SubscriptionStatus @default(ACTIVE)
  startDate        DateTime
  endDate          DateTime?          // null = ongoing
  monthlyCost      Float              // actual cost (may differ from tier default if promo)
  accrualSchedule  Json               // AccrualPhase[] - see interface above
  totalMilesAccrued Int               @default(0)
  nextBillingDate  DateTime?

  user             User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  clubTier         ClubTier           @relation(fields: [clubTierId], references: [id])

  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  @@index([userId])
  @@index([status])
}

// ==================== CREDIT CARDS ====================

model CreditCard {
  id               String    @id @default(cuid())
  userId           String
  bankName         String    // "Itaú", "Bradesco", "Santander"
  cardName         String    // "Azul Infinite", "Smiles Platinum"
  pointsProgram    String    // "Livelo", "Esfera", "iupp"
  pointsPerReal    Float     // e.g., 2.0 = 2 points per R$1
  pointsPerDollar  Float?    // international spending rate
  annualFee        Float     @default(0)
  isWaivedFee      Boolean   @default(false)
  benefits         Json?     // ["Sala VIP", "Seguro viagem", ...]

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([userId])
}

// ==================== TRANSFERS ====================

model TransferLog {
  id                  String    @id @default(cuid())
  userId              String
  sourceProgramName   String    // "Livelo"
  destProgramName     String    // "Smiles"
  pointsTransferred   Int
  bonusPercent        Float     @default(0)
  milesReceived       Int
  totalCost           Float?    // what they paid for the points
  costPerMilheiro     Float?    // calculated
  promotionId         String?   // linked promotion if applicable
  notes               String?
  transferDate        DateTime  @default(now())

  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  promotion           Promotion? @relation(fields: [promotionId], references: [id])

  createdAt           DateTime  @default(now())

  @@index([userId])
  @@index([transferDate])
}

// ==================== PROMOTIONS ====================

enum PromoType {
  TRANSFER_BONUS
  POINT_PURCHASE
  CLUB_SIGNUP
  MIXED
}

enum PromoStatus {
  ACTIVE
  EXPIRED
  UPCOMING
}

model Promotion {
  id                 String      @id @default(cuid())
  title              String
  type               PromoType
  status             PromoStatus @default(ACTIVE)
  sourceProgramId    String?
  destProgramId      String?
  bonusPercent       Float?
  purchaseDiscount   Float?      // percentage discount on point purchase
  purchasePricePerK  Float?      // R$ per 1000 points
  minimumTransfer    Int?
  maxBonusCap        Int?        // max bonus miles per CPF
  deadline           DateTime?
  sourceUrl          String
  sourceSiteName     String      // "Passageiro de Primeira", "Melhores Cartões"
  rawContent         String?     // original scraped text
  costPerMilheiro    Float?      // calculated effective cost
  rating             String?     // "EXCELLENT", "GOOD", "ACCEPTABLE", "AVOID"
  isVerified         Boolean     @default(false) // admin-verified
  requiresClub       Boolean     @default(false)
  clubExtraBonus     Float?      // additional % for club members

  sourceProgram      Program?    @relation("SourcePromos", fields: [sourceProgramId], references: [id])
  destProgram        Program?    @relation("DestinationPromos", fields: [destProgramId], references: [id])
  transferLogs       TransferLog[]

  detectedAt         DateTime    @default(now())
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  @@index([status, deadline])
  @@index([type])
  @@index([detectedAt])
}

// ==================== ALERTS ====================

enum AlertChannel {
  IN_APP
  EMAIL
  TELEGRAM
  WEB_PUSH
}

model AlertConfig {
  id                 String        @id @default(cuid())
  userId             String
  name               String        // "Smiles transfer > 80%"
  isActive           Boolean       @default(true)
  channels           AlertChannel[]
  telegramChatId     String?

  // Filter criteria
  programNames       String[]      // ["Smiles", "Latam Pass"] or empty = all
  promoTypes         PromoType[]   // or empty = all
  minBonusPercent    Float?        // only alert if bonus >= this
  maxCostPerMilheiro Float?        // only alert if cost <= this

  user               User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  @@index([userId])
}

model Notification {
  id            String    @id @default(cuid())
  userId        String
  title         String
  body          String
  channel       AlertChannel
  isRead        Boolean   @default(false)
  promotionId   String?
  sentAt        DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([sentAt])
}

// ==================== FLIGHT WATCHLIST ====================

model FlightWatchlist {
  id               String    @id @default(cuid())
  userId           String
  origin           String    // IATA code
  destination      String    // IATA code
  earliestDate     DateTime?
  latestDate       DateTime?
  cabinClass       String    @default("ECONOMY")
  passengers       Int       @default(1)
  targetMilesPrice Int?      // alert if below this
  targetCashPrice  Float?    // alert if below this (BRL)
  preferredProgram String?   // "smiles", "azul", etc.
  isActive         Boolean   @default(true)
  lastCheckedAt    DateTime?

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([userId, isActive])
}

// ==================== MILES CALENDAR ====================

model MilesCalendarEvent {
  id            String    @id @default(cuid())
  title         String    // "Black Friday", "Clube Livelo Anniversary"
  description   String?
  startDate     DateTime
  endDate       DateTime?
  programs      String[]  // related programs
  expectedType  PromoType?
  historicalNote String?  // "In 2025, Smiles offered up to 100% bonus"
  isRecurring   Boolean   @default(false)
  recurrenceRule String?  // "YEARLY" etc.

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([startDate])
}

// ==================== ADMIN AUDIT ====================

model AuditLog {
  id            String    @id @default(cuid())
  userId        String    // admin who performed action
  targetUserId  String?   // client affected
  action        String    // "UPDATE_BALANCE", "SEND_RECOMMENDATION", etc.
  details       Json?
  createdAt     DateTime  @default(now())

  user          User      @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([targetUserId])
  @@index([createdAt])
}

// ==================== SCRAPER STATE ====================

model ScraperRun {
  id            String    @id @default(cuid())
  sourceName    String
  sourceUrl     String
  status        String    // "SUCCESS", "FAILED", "PARTIAL"
  itemsFound    Int       @default(0)
  newPromos     Int       @default(0)
  errorMessage  String?
  durationMs    Int?
  startedAt     DateTime  @default(now())
  completedAt   DateTime?

  @@index([sourceName, startedAt])
}

// ==================== BENEFIT TRACKING (NEW — inspired by AwardWallet Plus) ====================

enum BenefitType {
  FREE_NIGHT
  COMPANION_PASS
  UPGRADE_CREDIT
  LOUNGE_ACCESS
  TRAVEL_CREDIT
  OTHER
}

model TrackedBenefit {
  id               String      @id @default(cuid())
  userId           String
  type             BenefitType
  programOrCard    String      // "Clube Smiles" or "Itaú The One"
  description      String      // "Free night at Marriott"
  quantity         Int         @default(1)
  remainingQty     Int         @default(1)
  expirationDate   DateTime?
  isUsed           Boolean     @default(false)
  usedAt           DateTime?
  notes            String?

  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@index([userId, isUsed])
  @@index([expirationDate])
}

// ==================== FAMILY MEMBERS (NEW — inspired by both competitors) ====================

model FamilyMember {
  id               String    @id @default(cuid())
  userId           String    // the account owner
  name             String
  relationship     String?   // "spouse", "child", "parent"

  programEnrollments FamilyProgramEnrollment[]

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([userId])
}

model FamilyProgramEnrollment {
  id               String    @id @default(cuid())
  familyMemberId   String
  programId        String
  memberNumber     String?
  currentBalance   Int       @default(0)
  tier             String?
  expirationDate   DateTime?
  balanceUpdatedAt DateTime  @default(now())

  familyMember     FamilyMember @relation(fields: [familyMemberId], references: [id], onDelete: Cascade)
  program          Program      @relation(fields: [programId], references: [id])

  @@unique([familyMemberId, programId])
  @@index([familyMemberId])
}

// ==================== POINTS MARKETPLACE (v2 UI — schema planned now) ====================

enum SaleStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model PointsSale {
  id               String      @id @default(cuid())
  userId           String
  programName      String
  milesAmount      Int
  agencyName       String?
  pricePerK        Float?      // R$ per 1000 miles received
  totalReceived    Float?      // total R$ received
  status           SaleStatus  @default(PENDING)
  notes            String?

  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@index([userId])
}

// ==================== SAVED SEARCH FILTERS (NEW — inspired by Oktoplus) ====================

model SavedFlightFilter {
  id               String    @id @default(cuid())
  userId           String
  name             String    // "Europe business Sep"
  origin           String?   // IATA or null for "any"
  destination      String?   // IATA or null
  region           String?   // "europe", "south_america", etc.
  cabinClass       String?
  dateType         String?   // "weekends", "holidays", "flexible"
  dateRangeStart   DateTime?
  dateRangeEnd     DateTime?
  maxMilesPrice    Int?
  maxCashPrice     Float?

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt        DateTime  @default(now())

  @@index([userId])
}
```

### API Endpoints

#### Cron / Background Jobs

- `GET /api/cron/scrape-promos` — Triggered by Vercel Cron every 30 min. Runs all scrapers, stores promotions, triggers alerts.
- `GET /api/cron/check-flights` — Triggered every 6 hours. Checks watchlist routes against Seats.aero and Google Flights.
- `GET /api/cron/update-promo-status` — Triggered hourly. Marks expired promotions.

#### Public API (authenticated)

- `GET /api/promotions` — List active promotions with filters
- `GET /api/promotions/:id` — Promotion detail
- `POST /api/calculator` — Calculate cost-per-milheiro
- `POST /api/calculator/redemption` — Miles Value Advisor (NEW)
- `GET /api/programs/potential-balance` — Potential balance calculator (NEW)
- `GET /api/flights/search` — Search flights (cash + award)
- `GET /api/flights/explore` — Explore destinations mode (NEW)
- `GET /api/flights/watchlist` — User's watchlist
- `POST /api/flights/watchlist` — Add to watchlist
- `GET /api/flights/saved-filters` — Saved flight filters (NEW)
- `POST /api/flights/saved-filters` — Save a filter (NEW)
- `GET /api/benefits` — List tracked benefits (NEW)
- `POST /api/benefits` — Add benefit (NEW)
- `GET /api/family` — List family members (NEW)
- `POST /api/family` — Add family member (NEW)

#### Webhook

- `POST /api/webhook/telegram` — Telegram bot webhook for commands

#### Admin API

- `GET /api/admin/clients` — List managed clients
- `GET /api/admin/clients/:id/dashboard` — Client dashboard data
- `POST /api/admin/clients/:id/recommendation` — Send promo recommendation
- `GET /api/admin/audit` — Audit log

### Server Actions

```typescript
// app/actions/programs.ts
'use server'
export async function enrollInProgram(
  data: EnrollProgramInput,
): Promise<ProgramEnrollment>
export async function updateBalance(
  enrollmentId: string,
  balance: number,
): Promise<void>

// app/actions/subscriptions.ts
;('use server')
export async function createSubscription(
  data: CreateSubscriptionInput,
): Promise<ClubSubscription>
export async function updateAccrualSchedule(
  subId: string,
  schedule: AccrualPhase[],
): Promise<void>

// app/actions/transfers.ts
;('use server')
export async function logTransfer(data: LogTransferInput): Promise<TransferLog>

// app/actions/alerts.ts
;('use server')
export async function createAlertConfig(
  data: CreateAlertInput,
): Promise<AlertConfig>
export async function markNotificationRead(id: string): Promise<void>

// app/actions/credit-cards.ts
;('use server')
export async function addCreditCard(
  data: AddCreditCardInput,
): Promise<CreditCard>

// app/actions/admin.ts
;('use server')
export async function addClient(data: AddClientInput): Promise<User>
export async function sendRecommendation(
  clientId: string,
  promoId: string,
  message: string,
): Promise<void>
```

## Integration Points

### Seats.aero Pro API

- **Auth**: `Partner-Authorization` header with API key
- **Endpoints used**: `GET /partnerapi/search` (cached search), `GET /partnerapi/trips/:id` (flight details)
- **Rate limit**: Daily usage-based limit (included in Pro $9.99/month)
- **Programs supported**: Smiles, Azul Fidelidade, and international programs
- **Error handling**: Cache results, retry with exponential backoff, fallback to cached data

### SerpApi Google Flights

- **Auth**: API key in query parameter
- **Endpoint**: `GET https://serpapi.com/search?engine=google_flights`
- **Free tier**: 250 queries/month (sufficient for watchlist checks)
- **Params**: departure_id, arrival_id, outbound_date, return_date, currency=BRL, hl=pt
- **Error handling**: Retry once, cache results for 6 hours

### Cheerio Scrapers (Promotion Blogs)

- **Sources**: Passageiro de Primeira, Melhores Cartões, Pontos Pra Voar, Comparemania
- **Frequency**: Every 30 minutes via Vercel Cron
- **Rate limiting**: 1 request per source per run, 2-second delay between sources
- **Parsing**: Extract title, URL, date, body text. Pattern match for: bonus percentages, program names, deadlines, price per milheiro
- **Robots.txt**: Check and respect on first run, cache for 24h
- **Error handling**: Log failures, continue with other sources, alert admin if source fails 3x consecutively

### Telegram Bot

- **Setup**: Create bot via @BotFather, webhook to `/api/webhook/telegram`
- **Commands**: `/start` (register chat ID), `/alerts` (list active alerts), `/promos` (current best deals), `/calc <price> <bonus>` (quick calculation)
- **Error handling**: Retry failed sends 3x with 5-second delay

### Resend (Email)

- **Usage**: Alert digests, weekly summary, admin notifications
- **Free tier**: 100 emails/day

## Testing Approach

### Unit Tests

- **Calculator Service**: Test all cost calculations with edge cases (0% bonus, 100%+ bonus, with/without club cost, cap reached)
- **Accrual Projector**: Test phase-based schedule calculations (single phase, multi-phase, with bonus, ongoing vs. fixed end)
- **Promo Parser**: Test extraction patterns against sample HTML from each source
- **Rating Engine**: Test threshold classification
- **Framework**: Vitest, co-located test files

### Integration Tests

- **API endpoints**: Test full request→response cycle with test database
- **Server Actions**: Test with mocked Prisma client
- **Scraper pipeline**: Test with saved HTML fixtures
- **Alert matching**: Test promotion against various alert configs

### E2E Tests

- **Critical flows**: Onboarding, balance update, promotion discovery → alert delivery
- **Admin flows**: Client management, recommendation sending
- **Framework**: Playwright
- **Database**: Test containers or Prisma with SQLite for speed

## Development Sequencing

### Phase 1: Foundation (Weeks 1-2)

1. Project setup: Next.js 16, Prisma, PostgreSQL, NextAuth.js
2. Database schema and seed data (programs, club tiers, sample calendar events)
3. Authentication (email/password + Google OAuth) with role-based access
4. Basic layout: sidebar navigation, responsive shell, dark mode

### Phase 2: Core Dashboard (Weeks 3-4)

5. Program enrollment CRUD
6. Club subscription management with accrual schedule builder
7. Credit card registry
8. Dashboard view with balance summary, subscription timeline, projected balances
9. Transfer logging

### Phase 3: Promotions (Weeks 5-7)

10. Scraper infrastructure: base scraper class, rate limiting, robots.txt, error handling
11. Individual scrapers for each source (Passageiro de Primeira, Melhores Cartões, etc.)
12. Promotion storage and deduplication
13. Cost calculator (standalone and embedded in promo cards)
14. Promotion feed page with filters and sorting
15. Miles calendar

### Phase 4: Alerts (Week 8)

16. Alert configuration UI
17. Alert matching engine (promo → alert config matching)
18. Telegram bot setup and webhook
19. Email notifications via Resend
20. In-app notification system

### Phase 5: Flight Search (Weeks 9-10)

21. Flight search UI
22. Seats.aero integration
23. SerpApi Google Flights integration
24. Miles-value comparison calculator
25. Flight watchlist with monitoring

### Phase 6: Admin (Weeks 11-12)

26. Admin dashboard
27. Client management
28. Recommendation system
29. Audit logging
30. Admin reporting (aggregate stats)

### Technical Dependencies

- PostgreSQL instance (Supabase or Neon) — needed from Phase 1
- Seats.aero Pro subscription ($9.99/month) — needed for Phase 5
- SerpApi account (free tier) — needed for Phase 5
- Telegram Bot token — needed for Phase 4
- Resend account — needed for Phase 4
- Vercel deployment — needed from Phase 1 for cron jobs

## Monitoring and Observability

- **Scraper health**: Log every scraper run with status, duration, items found. Alert admin if a source fails 3+ consecutive runs.
- **API performance**: Track response times for flight search (target < 5s including external calls)
- **Cron reliability**: Log all cron executions. Vercel Cron logs available in dashboard.
- **Error tracking**: Sentry for runtime errors
- **Key metrics**: Promotions discovered per day, alerts sent, flight searches per day, active users

## Technical Considerations

### Key Decisions

1. **Manual balance entry vs. scraping airline accounts**: Manual entry chosen. Airline account scraping violates ToS, is fragile, and requires storing user credentials. Manual entry is simple and reliable.

2. **Seats.aero Pro API vs. building own scrapers**: Seats.aero chosen. Building award flight scrapers is extremely complex (anti-bot, dynamic pricing, account requirements). The $9.99/month Pro API provides cached search across 20+ programs.

3. **SerpApi vs. direct Google Flights scraping**: SerpApi chosen. Google Flights is JavaScript-heavy and actively blocks scrapers. SerpApi's free tier (250 queries/month) is sufficient for watchlist monitoring.

4. **Monolith vs. microservices**: Modular monolith in Next.js chosen. The team is small, the domain is focused, and Next.js App Router provides natural separation via route groups, server actions, and route handlers.

5. **Prisma JSON fields for flexible data**: Used for `accrualSchedule`, `benefits`, `transferPartners`. These are user-configurable, schema-variant data. JSON fields with TypeScript type assertions provide flexibility without schema migrations for every variant.

### Known Risks

1. **Scraper fragility**: Blog sites may change HTML structure. Mitigation: scraper tests with fixtures, admin alerts on parse failures, fallback to manual promotion entry.
2. **Seats.aero API limits**: Daily call limits may be insufficient for large watchlists. Mitigation: prioritize watchlists by activity, cache aggressively, batch requests.
3. **SerpApi free tier limits**: 250 queries/month is tight. Mitigation: cache results 6-12 hours, only search active watchlists, consider upgrade to paid tier if needed.
4. **Promotion parsing accuracy**: Extracting structured data from blog posts is inherently noisy. Mitigation: confidence scoring, admin verification flag, allow manual override/correction.

### Standards Compliance

Based on the project rules:

- `code-standards.md` — All code in English, naming conventions, function size limits
- `node.md` — TypeScript strict, const over let, no any, async/await only
- `http.md` — REST conventions (adapted for Next.js Route Handlers), Zod validation
- `logging.md` — Pino for structured logging (adapted: use Next.js logger + Pino for cron jobs)
- `tests.md` — Vitest, co-located tests, AAA pattern, 80% coverage target

### Relevant and Dependent Files

```
/app
  /layout.tsx
  /(auth)
    /login/page.tsx
    /register/page.tsx
  /(dashboard)
    /layout.tsx
    /page.tsx                     → Main dashboard
    /programs/page.tsx            → Program management
    /subscriptions/page.tsx       → Club subscriptions
    /credit-cards/page.tsx        → Credit card registry
    /transfers/page.tsx           → Transfer history
    /calculator/page.tsx          → Cost calculator
  /(promotions)
    /layout.tsx
    /page.tsx                     → Promotion feed
    /[id]/page.tsx                → Promotion detail
    /calendar/page.tsx            → Miles calendar
  /(flights)
    /layout.tsx
    /search/page.tsx              → Flight search
    /watchlist/page.tsx           → Flight watchlist
  /(alerts)
    /page.tsx                     → Alert configuration
    /notifications/page.tsx       → Notification center
  /(admin)
    /layout.tsx
    /page.tsx                     → Admin dashboard
    /clients/page.tsx             → Client list
    /clients/[id]/page.tsx        → Client detail
    /audit/page.tsx               → Audit log
  /api
    /cron
      /scrape-promos/route.ts
      /check-flights/route.ts
      /update-promo-status/route.ts
    /promotions/route.ts
    /calculator/route.ts
    /flights/search/route.ts
    /flights/watchlist/route.ts
    /webhook/telegram/route.ts
    /admin/clients/route.ts
    /admin/audit/route.ts
/actions
  /programs.ts
  /subscriptions.ts
  /transfers.ts
  /alerts.ts
  /credit-cards.ts
  /admin.ts
/lib
  /services
    /calculator.service.ts
    /promo.service.ts
    /flight.service.ts
    /alert.service.ts
    /admin.service.ts
    /accrual.service.ts
  /scrapers
    /base-scraper.ts
    /passageiro-de-primeira.ts
    /melhores-cartoes.ts
    /pontos-pra-voar.ts
    /comparemania.ts
  /integrations
    /seats-aero.ts
    /serp-api.ts
    /telegram.ts
    /resend.ts
  /validators
    /program.schema.ts
    /subscription.schema.ts
    /transfer.schema.ts
    /alert.schema.ts
    /flight.schema.ts
  /utils
    /cost-calculator.ts
    /accrual-projector.ts
    /promo-parser.ts
    /date-helpers.ts
/prisma
  /schema.prisma
  /seed.ts
  /migrations/
/components
  /ui/                             → shadcn/ui components
  /dashboard/
  /promotions/
  /flights/
  /calculator/
  /admin/
```
