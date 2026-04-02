import { NextRequest, NextResponse } from 'next/server';
import { env, IS_DEVELOPMENT } from '@/lib/env';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/lib/integrations/telegram';
import {
  findUserByChatId,
  getTopPromotionsForBot,
  getUserAlertConfigs,
} from '@/lib/services/telegram-notification.service';
import { calculateCostPerMilheiro } from '@/lib/services/cost-calculator.service';
import { escapeHtml } from '@/lib/integrations/telegram';

// ==================== Types ====================

interface TelegramUser {
  readonly id: number;
  readonly first_name: string;
  readonly username?: string;
}

interface TelegramChat {
  readonly id: number;
  readonly type: string;
}

interface TelegramMessage {
  readonly message_id: number;
  readonly from?: TelegramUser;
  readonly chat: TelegramChat;
  readonly text?: string;
}

interface TelegramUpdate {
  readonly update_id: number;
  readonly message?: TelegramMessage;
}

// ==================== Security ====================

/**
 * Validate the incoming webhook request.
 * In production: checks X-Telegram-Bot-Api-Secret-Token header against CRON_SECRET.
 * In development: allows all requests when no secret is configured.
 */
function isValidWebhookRequest(request: NextRequest): boolean {
  if (!env.CRON_SECRET) {
    return IS_DEVELOPMENT;
  }

  const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
  return secretHeader === env.CRON_SECRET;
}

// ==================== Command handlers ====================

async function handleStart(chatId: number, firstName: string): Promise<void> {
  const text = [
    `👋 <b>Welcome to MilesControl, ${escapeHtml(firstName)}!</b>`,
    '',
    'I can help you track promotions and manage your miles alerts.',
    '',
    '<b>Your chat ID:</b> <code>' + chatId + '</code>',
    '',
    'To receive alerts via Telegram:',
    '1. Copy your chat ID above',
    '2. Go to <b>MilesControl → Alerts → Edit alert</b>',
    '3. Paste your chat ID and select <b>Telegram</b> as a channel',
    '',
    '<b>Available commands:</b>',
    '/alerts — List your active alert rules',
    '/promos — Show current best promotions',
    '/calc &lt;price&gt; &lt;bonus&gt; — Calculate cost per milheiro',
    '  Example: /calc 28 90 (R$28/k with 90% transfer bonus)',
  ].join('\n');

  await sendMessage(chatId, text);
}

async function handleAlerts(chatId: number): Promise<void> {
  const user = await findUserByChatId(chatId.toString());

  if (!user) {
    await sendMessage(
      chatId,
      '⭐ Telegram commands are available on MilesControl Premium.\n\nUpgrade in the app to unlock Telegram alerts, /promos, and /calc.',
    );
    return;
  }

  const alertConfigs = await getUserAlertConfigs(user.id);

  if (alertConfigs.length === 0) {
    await sendMessage(chatId, '📭 You have no active alert rules.\n\nCreate alerts at MilesControl → Alerts.');
    return;
  }

  const lines = ['📋 <b>Your active alert rules:</b>', ''];

  for (const config of alertConfigs) {
    const programs = config.programNames.length > 0 ? config.programNames.join(', ') : 'All programs';
    const types = config.promoTypes.length > 0 ? config.promoTypes.join(', ') : 'All types';
    lines.push(`• <b>${escapeHtml(config.name)}</b>`);
    lines.push(`  Programs: ${escapeHtml(programs)}`);
    lines.push(`  Types: ${escapeHtml(types)}`);
    if (config.minBonusPercent != null) {
      lines.push(`  Min bonus: ${config.minBonusPercent}%`);
    }
    if (config.maxCostPerMilheiro != null) {
      lines.push(`  Max cost: R$${Number(config.maxCostPerMilheiro).toFixed(2)}/k`);
    }
    lines.push('');
  }

  await sendMessage(chatId, lines.join('\n'));
}

async function handlePromos(chatId: number): Promise<void> {
  const user = await findUserByChatId(chatId.toString());

  if (!user) {
    await sendMessage(
      chatId,
      '⭐ Telegram commands are available on MilesControl Premium.\n\nUpgrade in the app to unlock Telegram alerts, /promos, and /calc.',
    );
    return;
  }

  const promotions = await getTopPromotionsForBot();

  if (promotions.length === 0) {
    await sendMessage(chatId, '📭 No active promotions found right now. Check back later!');
    return;
  }

  const lines = ['🔥 <b>Top active promotions:</b>', ''];

  for (const promo of promotions) {
    lines.push(`• <b>${escapeHtml(promo.title)}</b>`);

    if (promo.bonusPercent != null) {
      const sourceName = promo.sourceProgram?.name ?? '—';
      const destName = promo.destProgram?.name ?? '—';
      lines.push(`  ${escapeHtml(sourceName)} → ${escapeHtml(destName)}: +${promo.bonusPercent}% bonus`);
    }

    if (promo.costPerMilheiro != null) {
      lines.push(`  Cost: R$${Number(promo.costPerMilheiro).toFixed(2)}/k`);
    }

    if (promo.deadline != null) {
      lines.push(`  Deadline: ${promo.deadline.toLocaleDateString('pt-BR')}`);
    }

    lines.push('');
  }

  await sendMessage(chatId, lines.join('\n'));
}

async function handleCalc(chatId: number, args: readonly string[]): Promise<void> {
  const user = await findUserByChatId(chatId.toString());

  if (!user) {
    await sendMessage(
      chatId,
      '⭐ Telegram commands are available on MilesControl Premium.\n\nUpgrade in the app to unlock Telegram alerts, /promos, and /calc.',
    );
    return;
  }

  if (args.length < 2) {
    await sendMessage(
      chatId,
      '❌ Usage: /calc &lt;price_per_k&gt; &lt;bonus_percent&gt;\n\nExample: /calc 28 90\n(R$28 per 1,000 points with 90% transfer bonus)',
    );
    return;
  }

  const pricePerK = parseFloat(args[0]);
  const bonusPercent = parseFloat(args[1]);

  if (isNaN(pricePerK) || isNaN(bonusPercent) || pricePerK <= 0 || bonusPercent < 0) {
    await sendMessage(chatId, '❌ Invalid values. Both price and bonus must be positive numbers.');
    return;
  }

  const result = calculateCostPerMilheiro({
    purchasePricePerPoint: pricePerK / 1000,
    quantity: 1000,
    transferBonusPercent: bonusPercent,
  });

  const ratingEmoji: Record<string, string> = {
    EXCELLENT: '🟢',
    GOOD: '🟡',
    ACCEPTABLE: '🟠',
    AVOID: '🔴',
  };

  const emoji = ratingEmoji[result.rating] ?? '⚪';

  const text = [
    `🧮 <b>Cost Calculator Result</b>`,
    '',
    `Price: R$${pricePerK.toFixed(2)}/k`,
    `Transfer bonus: ${bonusPercent}%`,
    '',
    `Total miles: ${result.totalMiles.toLocaleString('pt-BR')}`,
    `Total cost: R$${result.totalCost.toFixed(2)}`,
    `<b>Cost per milheiro: R$${result.costPerMilheiro.toFixed(2)}/k</b>`,
    `Rating: ${emoji} ${result.rating}`,
  ].join('\n');

  await sendMessage(chatId, text);
}

// ==================== Update router ====================

async function processUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;

  if (!message?.text) {
    return;
  }

  const chatId = message.chat.id;
  const text = message.text.trim();
  const firstName = message.from?.first_name ?? 'there';

  // Extract command and arguments (strip bot username suffix like /start@BotName)
  const parts = text.split(/\s+/);
  const rawCommand = parts[0].toLowerCase();
  const command = rawCommand.includes('@') ? rawCommand.split('@')[0] : rawCommand;
  const args = parts.slice(1);

  logger.info({ chatId, command }, 'Telegram command received');

  switch (command) {
    case '/start':
      await handleStart(chatId, firstName);
      break;
    case '/alerts':
      await handleAlerts(chatId);
      break;
    case '/promos':
      await handlePromos(chatId);
      break;
    case '/calc':
      await handleCalc(chatId, args);
      break;
    default:
      await sendMessage(
        chatId,
        '❓ Unknown command.\n\nAvailable commands:\n/start — Register your chat ID\n/alerts — List your alerts\n/promos — Top promotions\n/calc &lt;price&gt; &lt;bonus&gt; — Calculate cost',
      );
  }
}

// ==================== Route Handler ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isValidWebhookRequest(request)) {
    logger.warn({}, 'Telegram webhook — unauthorized request');
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 },
    );
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } },
      { status: 400 },
    );
  }

  try {
    await processUpdate(update);
  } catch (error) {
    logger.error({ err: error, updateId: update.update_id }, 'Failed to process Telegram update');
  }

  // Always return 200 to Telegram — non-200 causes retries
  return NextResponse.json({ ok: true });
}
