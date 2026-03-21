import pino from 'pino';
import { IS_DEVELOPMENT } from '@/lib/env';

function createLogger() {

  return pino({
    level: IS_DEVELOPMENT ? 'debug' : 'info',
    transport: IS_DEVELOPMENT
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    redact: {
      paths: ['password', 'passwordHash', 'token', 'secret', 'creditCard', 'email'],
      censor: '[REDACTED]',
    },
  });
}

export const logger = createLogger();

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
