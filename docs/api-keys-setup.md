# API Keys & Tokens Setup Guide

Step-by-step instructions for obtaining every external API key and token used by MilesControl.

---

## Table of Contents

1. [Google OAuth (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)](#1-google-oauth)
2. [Seats.aero (SEATS_AERO_API_KEY)](#2-seatsaero)
3. [SerpApi (SERPAPI_API_KEY)](#3-serpapi)
4. [Telegram Bot (TELEGRAM_BOT_TOKEN)](#4-telegram-bot)
5. [Resend (RESEND_API_KEY)](#5-resend)

---

## 1. Google OAuth

**Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

These credentials let users sign in with their Google account via NextAuth.js.

### Steps

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
   - Click the project dropdown at the top → **New Project** → give it a name → **Create**.
3. Enable the Google Identity API:
   - Navigate to **APIs & Services → Library**.
   - Search for **"Google Identity"** (or **"Google+ API"**) and click **Enable**.
4. Configure the OAuth consent screen:
   - Go to **APIs & Services → OAuth consent screen**.
   - Choose **External** (unless you have a Google Workspace org).
   - Fill in the required fields: App name, User support email, Developer contact email.
   - Under **Scopes**, add `email` and `profile`.
   - Add your own email under **Test users** (required while the app is in "Testing" status).
   - Click **Save and Continue** through each section.
5. Create OAuth credentials:
   - Go to **APIs & Services → Credentials**.
   - Click **+ Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000` (add your production URL later).
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google` (add your production URL later).
   - Click **Create**.
6. Copy the **Client ID** and **Client Secret** displayed in the modal.

### Add to `.env`

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"
```

> **Tip:** The app stays in "Testing" mode until you submit for verification. Only test users you added can sign in during this phase.

---

## 2. Seats.aero

**Variable:** `SEATS_AERO_API_KEY`

Used to search award flight availability across airline programs.

### Steps

1. Go to [seats.aero](https://seats.aero/).
2. Click **Sign Up** and create an account (email + password).
3. Choose a plan:
   - **Free**: limited searches per day.
   - **Pro**: higher limits, more routes, real-time alerts.
4. After signing in, go to your **Account** / **API** page.
   - Navigate to **Settings → API** (or check the dashboard for an "API Key" section).
5. Click **Generate API Key** (or copy the existing key shown).
6. Copy the key.

### Add to `.env`

```env
SEATS_AERO_API_KEY="your-seats-aero-api-key"
```

> **Note:** Check [seats.aero/api](https://seats.aero/) for current rate limits and pricing tiers.

---

## 3. SerpApi

**Variable:** `SERPAPI_API_KEY`

Used to scrape Google Flights results for price comparisons.

### Steps

1. Go to [serpapi.com](https://serpapi.com/).
2. Click **Register** (top-right) and create an account.
   - You can sign up with email or Google.
3. After signing in, go to your [Dashboard](https://serpapi.com/dashboard).
4. Your **API Key** is displayed on the dashboard page, or under **Your Account → API Key**.
5. Copy the API key.

### Free tier details

- **100 searches/month** on the free plan.
- No credit card required for the free tier.

### Verify it works

```bash
curl "https://serpapi.com/account.json?api_key=YOUR_API_KEY"
```

You should see a JSON response with your plan details and remaining searches.

### Add to `.env`

```env
SERPAPI_API_KEY="your-serpapi-api-key"
```

---

## 4. Telegram Bot

**Variable:** `TELEGRAM_BOT_TOKEN`

Used to send price alerts and promotion notifications to users via Telegram.

### Steps

1. Open [Telegram](https://telegram.org/) on your phone or desktop.
2. Search for **@BotFather** (the official bot for creating bots) and start a chat.
3. Send the command:
   ```
   /newbot
   ```
4. BotFather will ask for a **display name** — type something like `MilesControl Alerts`.
5. BotFather will ask for a **username** — must end in `bot`, e.g., `milescontrol_alerts_bot`.
6. BotFather will reply with your bot's **token**, which looks like:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
7. Copy the token.

### Verify it works

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

You should see a JSON response with your bot's info (`id`, `first_name`, `username`).

### Optional: Get your Chat ID (for testing)

1. Start a chat with your new bot in Telegram (search for `@milescontrol_alerts_bot` and click **Start**).
2. Send any message to the bot.
3. Run:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates"
   ```
4. Look for `"chat":{"id": 123456789}` in the response — that's your chat ID for testing.

### Add to `.env`

```env
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
```

> **Security:** Never share your bot token publicly. If compromised, use `/revoke` with @BotFather to regenerate it.

---

## 5. Resend

**Variable:** `RESEND_API_KEY`

Used for sending transactional emails (alerts, notifications, welcome emails).

### Steps

1. Go to [resend.com](https://resend.com/).
2. Click **Get Started** and create an account (GitHub, Google, or email).
3. After signing in, you'll land on the dashboard.
4. Go to **API Keys** in the left sidebar.
5. Click **+ Create API Key**.
   - **Name**: e.g., `MilesControl Dev`
   - **Permission**: choose `Sending access` (recommended for app usage) or `Full access`.
   - **Domain**: select your verified domain, or leave as default for the Resend test domain.
6. Click **Add** — the API key is shown **only once**. Copy it immediately.

### Free tier details

- **100 emails/day** on the free plan.
- **1 custom domain**.
- No credit card required.

### Optional: Verify a custom domain

1. Go to **Domains** in the left sidebar.
2. Click **+ Add Domain** and enter your domain (e.g., `milescontrol.com`).
3. Resend will show DNS records (MX, TXT) to add at your domain registrar.
4. After adding the records, click **Verify** — it may take a few minutes to propagate.

### Add to `.env`

```env
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> **Note:** The key starts with `re_`. If you lose it, delete the old key and create a new one.

---

## Quick Reference

| Variable               | Where to get it                    | Free tier?               |
| ---------------------- | ---------------------------------- | ------------------------ |
| `GOOGLE_CLIENT_ID`     | Google Cloud Console → Credentials | Yes (unlimited)          |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials | Yes (unlimited)          |
| `SEATS_AERO_API_KEY`   | seats.aero → Account → API         | Yes (limited searches)   |
| `SERPAPI_API_KEY`      | serpapi.com → Dashboard            | Yes (100 searches/month) |
| `TELEGRAM_BOT_TOKEN`   | Telegram → @BotFather → /newbot    | Yes (unlimited)          |
| `RESEND_API_KEY`       | resend.com → API Keys → Create     | Yes (100 emails/day)     |
