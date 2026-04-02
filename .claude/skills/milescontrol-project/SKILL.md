---
name: milescontrol-project
description: MilesControl project overview, tech stack, folder structure, CLI commands, and key domain concepts. Use when onboarding, navigating the codebase, or needing project context.
---

# MilesControl Project

## Overview

MilesControl is a miles & points management platform for the Brazilian market (Smiles, Latam Pass, Azul, Livelo, Esfera). Built with Next.js 16+ App Router, PostgreSQL via Prisma, TypeScript strict mode.

## Tech Stack

- **Framework**: Next.js 16+ (App Router, React Server Components, Server Actions)
- **Database**: PostgreSQL + Prisma ORM + docker
- **Auth**: NextAuth.js (credentials + Google OAuth)
- **UI**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest + Testing Library
- **Validation**: Zod
- **Logging**: Pino
- **Notifications**: Telegram Bot API, Resend (email), Web Push
- **External APIs**: Seats.aero (award flights), SerpApi (Google Flights)

## Project Structure

```
  src/
    app/                → App Router pages and layouts
    actions/            → Server Actions (mutations)
    lib/
      services/         → Business logic layer
      scrapers/         → Web scrapers for promotions
      integrations/     → External API clients
      validators/       → Zod schemas
      utils/            → Pure utility functions
    components/         → React components (UI + feature-specific)
  prisma/
    schema.prisma       → Database schema
    seed.ts             → Seed data
tasks/
  prd-milescontrol/     → PRD, tech spec, tasks, competitive analysis
.claude/
  commands/             → Claude Code commands
  skills/               → Domain knowledge, patterns, and coding standards
  agents/               → Specialized agents
  templates/            → Document templates
```

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm test             # Run tests
pnpm test:coverage    # Run tests with coverage
pnpm prisma studio    # Open Prisma Studio
pnpm prisma db push   # Push schema to DB
pnpm prisma generate  # Generate Prisma client
pnpm prisma db seed   # Run seed data
```

## Key Domain Concepts

- **Milheiro**: 1,000 miles. Cost per milheiro = total_cost / (total_miles / 1000)
- **Transfer bonus**: e.g., 90% means 10k points → 19k miles
- **Programs**: Airline (Smiles, Latam Pass, Azul) vs Banking (Livelo, Esfera)
- **Clubs**: Monthly subscriptions with accrual schedules (may have phases)
- **Rating thresholds**: Excellent (<R$12), Good (R$12-16), Acceptable (R$16-20), Avoid (>R$20)
