import winston from 'winston';

import { config, isProduction } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: isProduction ? logFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(isProduction
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

export const requestLogger = (
  req: { method: string; url: string; ip?: string },
  responseTime: number,
  statusCode: number
): void => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
  });
};

export const auditLogger = (
  action: string,
  userId: string | null,
  tenantId: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): void => {
  logger.info('Audit Event', {
    action,
    userId,
    tenantId,
    entityType,
    entityId,
    metadata,
    timestamp: new Date().toISOString(),
  });
};
