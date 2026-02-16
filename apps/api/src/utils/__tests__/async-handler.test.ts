import { asyncHandler } from '../async-handler';
import type { Request, Response, NextFunction } from 'express';

/**
 * Create minimal Express mock objects for testing.
 */
function createMocks() {
  const req = {} as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('asyncHandler', () => {
  it('calls the wrapped async function with req, res, next', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    const { req, res, next } = createMocks();

    wrapped(req, res, next);

    // Allow the microtask queue to flush
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('catches rejected promises and passes the error to next', async () => {
    const error = new Error('Test async error');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);
    const { req, res, next } = createMocks();

    wrapped(req, res, next);

    // Allow the microtask queue to flush
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(error);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('catches synchronous errors thrown inside the handler and passes to next', async () => {
    const error = new Error('Sync error inside async handler');
    const handler = jest.fn().mockImplementation(async () => {
      throw error;
    });
    const wrapped = asyncHandler(handler);
    const { req, res, next } = createMocks();

    wrapped(req, res, next);

    // Allow the microtask queue to flush
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(error);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns a function (middleware signature)', () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    expect(typeof wrapped).toBe('function');
    expect(wrapped.length).toBe(3); // (req, res, next)
  });
});
