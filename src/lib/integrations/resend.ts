import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }

  return resendClient;
}

interface SendEmailParams {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    logger.warn({ subject: params.subject }, 'Resend API key not configured, skipping email');
    return false;
  }

  const { error } = await client.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    logger.error({ err: error, subject: params.subject }, 'Failed to send email');
    return false;
  }

  logger.info({ subject: params.subject }, 'Email sent successfully');
  return true;
}
