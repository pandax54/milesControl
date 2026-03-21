# MilesControl — Project Bootstrap Guide

## Prerequisites

Before you start, make sure you have:

- **PostgreSQL** — either local or a cloud provider:
  - **Local Docker**: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=secret postgres:16`

## Step 1: Create the Next.js Project

```bash
# Create the project
pnpm create next-app@latest milescontrol \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd milescontrol
```

## Step 2: Install Dependencies

```bash
# Core dependencies
pnpm add next-auth@beta @auth/prisma-adapter
pnpm add zod
pnpm add bcryptjs
pnpm add pino pino-pretty
pnpm add cheerio
pnpm add resend
pnpm add recharts
pnpm add lucide-react
pnpm add date-fns

# shadcn/ui setup
pnpm dlx shadcn@latest init

# Add essential shadcn components
pnpm dlx shadcn@latest add button card input label select badge
pnpm dlx shadcn@latest add dialog dropdown-menu sheet tabs toast
pnpm dlx shadcn@latest add form separator skeleton avatar
pnpm dlx shadcn@latest add table calendar popover command

# Dev dependencies
pnpm add -D prisma tsx @types/pg @types/bcryptjs
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
pnpm add -D @vitejs/plugin-react jsdom
```

## Step 3: Initialize Prisma

```bash
# Initialize Prisma with PostgreSQL
pnpm prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and `.env`. Update your `.env`:

```env
# .env
DATABASE_URL="postgresql://user:password@host:5432/milescontrol?sslmode=require"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional — set up later)
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""

# External APIs (set up when reaching Phase 4-5)
# SEATS_AERO_API_KEY=""
# SERPAPI_API_KEY=""
# TELEGRAM_BOT_TOKEN=""
# RESEND_API_KEY=""
```

Generate a secret:

```bash
openssl rand -base64 32
```

## Step 4: Create the Project Structure

```bash
# Create the folder structure
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/register
mkdir -p src/app/\(dashboard\)
mkdir -p src/app/\(dashboard\)/programs
mkdir -p src/app/\(dashboard\)/subscriptions
mkdir -p src/app/\(dashboard\)/credit-cards
mkdir -p src/app/\(dashboard\)/transfers
mkdir -p src/app/\(dashboard\)/calculator
mkdir -p src/app/\(promotions\)
mkdir -p src/app/\(promotions\)/calendar
mkdir -p src/app/\(flights\)/search
mkdir -p src/app/\(flights\)/watchlist
mkdir -p src/app/\(alerts\)
mkdir -p src/app/\(alerts\)/notifications
mkdir -p src/app/\(admin\)
mkdir -p src/app/\(admin\)/clients
mkdir -p src/app/\(admin\)/audit
mkdir -p src/app/api/cron/scrape-promos
mkdir -p src/app/api/cron/check-flights
mkdir -p src/app/api/cron/update-promo-status
mkdir -p src/app/api/promotions
mkdir -p src/app/api/calculator
mkdir -p src/app/api/flights/search
mkdir -p src/app/api/flights/watchlist
mkdir -p src/app/api/webhook/telegram
mkdir -p src/app/api/admin
mkdir -p src/actions
mkdir -p src/lib/services
mkdir -p src/lib/scrapers
mkdir -p src/lib/scrapers/__fixtures__
mkdir -p src/lib/integrations
mkdir -p src/lib/validators
mkdir -p src/lib/utils
mkdir -p src/components/ui
mkdir -p src/components/dashboard
mkdir -p src/components/promotions
mkdir -p src/components/flights
mkdir -p src/components/calculator
mkdir -p src/components/admin
```

## Step 5: Copy the Prisma Schema

Copy the full schema from the tech spec into `prisma/schema.prisma`. The complete schema is in `tasks/prd-milescontrol/techspec.md` under "Data Models".

Then run:

```bash
# Push the schema to your database (for development)
pnpm prisma db push

# Generate the Prisma client
pnpm prisma generate
```

## Step 6: Create the Prisma Client Singleton

```bash
cat > src/lib/prisma.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
EOF
```

## Step 7: Set Up Vitest

```bash
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOF

cat > vitest.setup.ts << 'EOF'
import '@testing-library/jest-dom/vitest';
EOF
```

Add test scripts to `package.json`:

```bash
pnpm pkg set scripts.test="vitest"
pnpm pkg set scripts.test:coverage="vitest run --coverage"
pnpm pkg set scripts.test:ui="vitest --ui"
```

## Step 10: Start Building with Claude Code

Now you're ready to use your ai-setup workflow:

```bash
# Start Claude Code
claude

# Inside Claude Code, execute your first task:
# @execute-task.md
# Implement task: milescontrol/1.1 — Database schema
# (Copy the full Prisma schema from the techspec, run migrations, verify)

# Then seed the database:
# @execute-task.md
# Implement task: milescontrol/1.2 — Seed data
# (Use seed-data.md as reference for programs, club tiers, calendar events)

# Then authentication:
# @execute-task.md
# Implement task: milescontrol/1.3 — Authentication with NextAuth.js

# Then the app shell:
# @execute-task.md
# Implement task: milescontrol/1.4 — App shell layout

# After each task, review:
# @task-reviewer
# Review task 1.1
```

## Quick Reference: Claude Code Commands

```
# Planning phase (already done)
/commands/create-prd.md          → PRD already at tasks/prd-milescontrol/prd.md
/commands/create-techspec.md     → Tech spec already at tasks/prd-milescontrol/techspec.md
/commands/create-tasks.md        → Tasks already at tasks/prd-milescontrol/tasks.md

# Implementation phase
/commands/execute-task.md        → Implement a specific task
/commands/execute-bugfix.md      → Fix bugs found during QA
/commands/execute-review.md      → Code review
/commands/execute-qa.md          → QA validation

# MilesControl-specific
/commands/create-scraper.md      → Build a new promotion scraper
/commands/create-calculator.md   → Build a calculator module

# Agents
@task-reviewer                   → Review completed task
@miles-analyst                   → Analyze a promotion or miles strategy

# Skills (auto-loaded by commands)
skills/miles-domain.md           → Programs, formulas, calendar, APIs
skills/web-scraping.md           → Scraper patterns
skills/notifications.md          → Telegram, email, push
skills/nextjs.md                 → Next.js patterns
skills/typescript.md             → TypeScript best practices
skills/reactjs.md                → React patterns
```

## External Services Setup (when needed)

### Phase 1: Database

- **Neon**: Sign up at neon.tech → Create project → Copy connection string to `.env`

### Phase 4: Notifications

- **Telegram Bot**: Message @BotFather on Telegram → `/newbot` → Copy token to `.env`
- **Resend**: Sign up at resend.com → Get API key → Add to `.env`

### Phase 5: Flight Search

- **Seats.aero**: Sign up for Pro ($9.99/mo) at seats.aero → Account settings → Generate API key
- **SerpApi**: Sign up at serpapi.com (free: 250 queries/mo) → Get API key

## Recommended Dev Flow

1. **One task at a time** — don't try to build everything at once
2. **Phase 1 first** — get the foundation solid before features
3. **Test as you go** — every task includes tests. Run `pnpm test` after each task
4. **Commit per task** — one commit per completed task for clean history
5. **Review before moving on** — use `@task-reviewer` after each task
6. **Deploy early** — push to Vercel after Phase 1 is complete. Get feedback.

## Deployment (Vercel)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (production URL)
# Add other keys as you reach their phases
```

For Vercel Cron (Phase 3+), add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-promos",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/check-flights",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/update-promo-status",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

You're ready to go. Run `claude` in your project directory and start with task 1.0!
