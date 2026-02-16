/**
 * @module asyncHandler
 * @description Express middleware wrapper that catches async errors.
 * Eliminates try/catch boilerplate in route handlers.
 *
 * Without this wrapper, every async Express route handler needs an explicit
 * `try { ... } catch (error) { next(error); }` block — a pattern that was
 * repeated across 326+ controller methods in the PMS codebase. This utility
 * wraps an async handler so that any rejected promise is automatically
 * forwarded to Express's `next()` error handler, ensuring consistent error
 * responses through the centralized error middleware.
 *
 * @example
 * ```ts
 * import { asyncHandler } from '@/utils/async-handler';
 *
 * // Before (verbose, error-prone):
 * router.get('/users', async (req, res, next) => {
 *   try {
 *     const users = await userService.list();
 *     res.json({ success: true, data: users });
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * // After (clean, automatic error forwarding):
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.list();
 *   res.json({ success: true, data: users });
 * }));
 * ```
 *
 * @example
 * ```ts
 * // Works with the next parameter when needed for middleware chaining:
 * router.use(asyncHandler(async (req, res, next) => {
 *   req.tenantId = await resolveTenant(req);
 *   next();
 * }));
 * ```
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Type definition for an async Express request handler.
 *
 * Represents an async function that receives the standard Express
 * `(req, res, next)` triple and returns a Promise. The Promise
 * resolution is ignored; rejections are caught and forwarded to `next`.
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/**
 * Wraps an async Express route handler to automatically catch errors
 * and forward them to Express's error-handling middleware.
 *
 * This is the core utility that eliminates the need for try/catch blocks
 * in every controller method. It works by wrapping the handler's return
 * value in `Promise.resolve()` and attaching a `.catch(next)` to it.
 *
 * @param fn - The async handler function to wrap. Must accept `(req, res, next)`
 *             and return a Promise (i.e., be an `async function`).
 * @returns A standard (synchronous) Express middleware function that internally
 *          invokes `fn` and catches any promise rejections via `next(error)`.
 *
 * @example
 * ```ts
 * router.get('/goals/:id', asyncHandler(async (req, res) => {
 *   const goal = await goalService.findById(req.params.id);
 *   if (!goal) {
 *     throw new NotFoundError('Goal not found');
 *   }
 *   res.json({ success: true, data: goal });
 * }));
 * // If goalService.findById rejects, the error is automatically
 * // forwarded to the centralized error middleware.
 * ```
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
