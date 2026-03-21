# Notifications Skill

## When to Use
Load this skill when implementing alert delivery, notification channels, or messaging features.

## Telegram Bot

### Setup
1. Create bot via @BotFather on Telegram
2. Save token as `TELEGRAM_BOT_TOKEN` env var
3. Set webhook URL: `POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={APP_URL}/api/webhook/telegram`

### Sending Messages
```typescript
import pino from 'pino';

const logger = pino({ name: 'telegram' });
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

interface SendMessageParams {
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

async function sendTelegramMessage(params: SendMessageParams): Promise<boolean> {
  const { chatId, text, parseMode = 'Markdown' } = params;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      });

      if (response.ok) return true;

      const error = await response.json();
      logger.warn({ chatId, attempt, error }, 'Telegram send failed');
    } catch (error) {
      logger.error({ err: error, chatId, attempt }, 'Telegram request error');
    }

    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
    }
  }

  return false;
}
```

### Webhook Handler Pattern
```typescript
// app/api/webhook/telegram/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id.toString();
  const command = message.text.split(' ')[0];

  switch (command) {
    case '/start':
      // Register chatId with user account
      break;
    case '/promos':
      // Send current best promotions
      break;
    case '/calc':
      // Quick calculator: /calc 28 90 → calculates cost for R$28/k with 90% bonus
      break;
    case '/alerts':
      // List user's active alerts
      break;
  }

  return NextResponse.json({ ok: true });
}
```

### Rate Limits
- Max 30 messages per second globally
- Max 20 messages per minute to the same chat
- Messages over 4096 characters must be split

### Message Formatting (Markdown)
```typescript
function formatPromoAlert(promo: {
  title: string;
  bonusPercent: number;
  costPerMilheiro: number;
  rating: string;
  deadline: string;
  sourceUrl: string;
}): string {
  const emoji = {
    EXCELLENT: '🟢',
    GOOD: '🔵',
    ACCEPTABLE: '🟡',
    AVOID: '🔴',
  }[promo.rating] ?? '⚪';

  return [
    `${emoji} *${promo.title}*`,
    ``,
    `Bônus: *${promo.bonusPercent}%*`,
    `Custo/milheiro: *R$ ${promo.costPerMilheiro.toFixed(2)}*`,
    `Avaliação: ${promo.rating}`,
    `Prazo: ${promo.deadline}`,
    ``,
    `[Ver promoção](${promo.sourceUrl})`,
  ].join('\n');
}
```

## Resend (Email)

### Setup
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
```

### Sending
```typescript
async function sendAlertEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: 'MilesControl <alerts@milescontrol.app>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return !error;
  } catch (error) {
    logger.error({ err: error, to: params.to }, 'Email send failed');
    return false;
  }
}
```

### Free tier: 100 emails/day, 3,000/month

## Web Push

### Setup
- Use `web-push` library
- Generate VAPID keys: `npx web-push generate-vapid-keys`
- Store subscription endpoints in DB
- Register service worker in client

### Rules
- Always handle failed deliveries (remove stale subscriptions after 3 failures)
- Keep payloads under 4KB
- Include `urgency` header for battery-conscious delivery
