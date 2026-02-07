import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';

import { config } from './config';
import {
  errorHandler,
  notFoundHandler,
  standardRateLimiter,
  authRateLimiter,
} from './middleware';
import { authRoutes } from './modules/auth';
import { goalsRoutes } from './modules/goals';
import { reviewsRoutes } from './modules/reviews';
import { feedbackRoutes } from './modules/feedback';
import { calibrationRoutes } from './modules/calibration';
import { usersRoutes } from './modules/users';
import { analyticsRoutes } from './modules/analytics';
import { notificationsRoutes } from './modules/notifications';
import { integrationsRoutes } from './modules/integrations';
// NOTE: evidence, compensation, promotion, reports, actionable-insights, ai-insights
// modules are excluded from build (incomplete TS). They can be re-enabled once fixed.
import { realtimePerformanceRoutes } from './modules/realtime-performance';
import { performanceMathRoutes } from './modules/performance-math';
import { calendarRoutes } from './modules/calendar';
import { prisma } from '@pms/database';
import { getRedisClient } from './utils/redis';
import { logger } from './utils/logger';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
              connectSrc: ["'self'", 'https:', 'wss:'],
              fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
            },
          }
        : {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
              connectSrc: ["'self'", 'ws:', 'wss:'],
            },
          },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  const corsOrigins = config.CORS_ORIGINS.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
      exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
      maxAge: 86400, // 24 hours
    })
  );

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static files for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Request logging
  app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    });

    next();
  });

  // Health check (no rate limiting)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    });
  });

  // Ready check (for Kubernetes) - verifies DB + Redis connectivity
  app.get('/ready', async (_req, res) => {
    const checks: { db: boolean; redis: boolean } = { db: false, redis: false };

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = true;
    } catch (error) {
      logger.error('Ready check: database unreachable', { error });
    }

    // Check Redis connectivity
    try {
      const redis = getRedisClient();
      await redis.ping();
      checks.redis = true;
    } catch (error) {
      logger.error('Ready check: Redis unreachable', { error });
    }

    const allHealthy = checks.db && checks.redis;
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  // API routes with rate limiting
  const apiRouter = express.Router();

  // Auth routes with stricter rate limiting
  apiRouter.use('/auth', authRateLimiter, authRoutes);

  // Other routes with standard rate limiting
  apiRouter.use('/goals', standardRateLimiter, goalsRoutes);
  apiRouter.use('/reviews', standardRateLimiter, reviewsRoutes);
  apiRouter.use('/feedback', standardRateLimiter, feedbackRoutes);
  apiRouter.use('/calibration', standardRateLimiter, calibrationRoutes);
  apiRouter.use('/users', standardRateLimiter, usersRoutes);
  apiRouter.use('/analytics', standardRateLimiter, analyticsRoutes);
  apiRouter.use('/notifications', standardRateLimiter, notificationsRoutes);
  apiRouter.use('/integrations', standardRateLimiter, integrationsRoutes);
  // NOTE: evidence, compensation, promotions, reports, actionable-insights, ai-insights
  // routes are disabled (incomplete modules with TS errors). Re-enable once fixed.
  apiRouter.use('/realtime-performance', standardRateLimiter, realtimePerformanceRoutes);
  apiRouter.use('/performance-math', standardRateLimiter, performanceMathRoutes);
  apiRouter.use('/calendar/events', standardRateLimiter, calendarRoutes);

  // Mount API routes
  app.use('/api/v1', apiRouter);

  // API documentation redirect
  app.get('/api', (_req, res) => {
    res.redirect('/api/v1/docs');
  });

  // In production, serve the frontend static files from the API server
  // This allows a single-service deployment (no separate nginx/static host needed)
  if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(process.cwd(), '..', '..', 'frontend-dist');
    const altFrontendPath = path.join(process.cwd(), 'frontend-dist');

    const staticPath = fs.existsSync(frontendPath) ? frontendPath : altFrontendPath;

    if (fs.existsSync(staticPath)) {
      // Serve static assets with correct MIME types
      app.use(express.static(staticPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          // Ensure correct Content-Type for common assets
          if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
          else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
          else if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
          else if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
          else if (filePath.endsWith('.woff2')) res.setHeader('Content-Type', 'font/woff2');
          else if (filePath.endsWith('.woff')) res.setHeader('Content-Type', 'font/woff');
        },
      }));

      // SPA fallback: serve index.html for non-API, non-asset routes
      app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/ready') {
          return next();
        }
        // Don't serve index.html for missing static assets — return 404 instead
        if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map|json)$/i.test(req.path)) {
          return next();
        }
        res.sendFile(path.join(staticPath, 'index.html'));
      });
    }
  }

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
