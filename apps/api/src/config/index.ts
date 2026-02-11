import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from multiple locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Session
  SESSION_SECRET: z.string().min(32),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3001'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // SSO - SAML
  SAML_CALLBACK_URL: z.string().optional(),
  SAML_ENTRY_POINT: z.string().optional(),
  SAML_ISSUER: z.string().optional(),
  SAML_CERT: z.string().optional(),

  // SSO - OIDC
  OIDC_ISSUER: z.string().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  OIDC_REDIRECT_URI: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // SMTP Email
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_SECURE: z.string().optional().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default('PMS Platform <aerofyta@gmail.com>'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;

export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';
