import pino from 'pino';

function createLogger() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return pino({
    level: isDevelopment ? 'debug' : 'info',
    transport: isDevelopment
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
