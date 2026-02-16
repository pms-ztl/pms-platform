/**
 * Async Handler — eliminates repetitive try/catch boilerplate in Express controllers.
 *
 * Wraps an async route handler so that any rejected promise is automatically
 * forwarded to Express's `next()` error handler, ensuring consistent error
 * responses through the centralized error middleware.
 *
 * @example
 * ```ts
 * // Before:
 * router.get('/users', async (req, res, next) => {
 *   try {
 *     const users = await userService.list();
 *     res.json({ success: true, data: users });
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * // After:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.list();
 *   res.json({ success: true, data: users });
 * }));
 * ```
 */

import type { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/**
 * Wraps an async Express route handler to automatically catch errors
 * and forward them to Express's error-handling middleware.
 *
 * @param fn - The async handler function to wrap
 * @returns A standard Express middleware that catches promise rejections
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
