import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// ==================== Constants ====================

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;

// ==================== Types ====================

interface TelegramSendMessageParams {
  readonly chatId: string | number;
  readonly text: string;
  readonly parseMode?: 'HTML' | 'Markdown';
}

interface TelegramApiResponse {
  readonly ok: boolean;
  readonly description?: string;
}

// ==================== HTTP client ====================

async function callTelegramApi(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResponse> {
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn({ method }, 'Telegram bot token not configured, skipping API call');
    return { ok: false, description: 'Bot token not configured' };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as TelegramApiResponse;

      if (data.ok) {
        return data;
      }

      logger.warn(
        { method, attempt, description: data.description },
        'Telegram API returned not-ok response',
      );

      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    } catch (error) {
      logger.error({ err: error, method, attempt }, 'Telegram API call failed');

      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  return { ok: false, description: 'All retry attempts failed' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== Public API ====================

/**
 * Send a plain text message to a Telegram chat.
 * Returns true when the message was delivered successfully.
 */
export async function sendMessage(
  chatId: string | number,
  text: string,
): Promise<boolean> {
  const params: TelegramSendMessageParams = {
    chatId,
    text,
    parseMode: 'HTML',
  };

  const result = await callTelegramApi('sendMessage', {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: params.parseMode,
  });

  if (result.ok) {
    logger.info({ chatId }, 'Telegram message sent');
  } else {
    logger.error({ chatId, description: result.description }, 'Failed to send Telegram message');
  }

  return result.ok;
}

/**
 * Send a formatted alert notification to a Telegram chat.
 * Returns true when the message was delivered successfully.
 */
export async function sendAlertNotification(
  chatId: string | number,
  title: string,
  body: string,
): Promise<boolean> {
  const text = `🔔 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;
  return sendMessage(chatId, text);
}

/**
 * Escape HTML special characters for safe use in Telegram HTML parse mode.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
