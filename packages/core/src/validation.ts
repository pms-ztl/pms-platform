import { z } from 'zod';

// Common validation schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format').toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  );

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.fromDate !== undefined && data.toDate !== undefined) {
      return data.fromDate <= data.toDate;
    }
    return true;
  },
  { message: 'fromDate must be before or equal to toDate' }
);

// Goal validation
export const goalTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(500, 'Title must be less than 500 characters');

export const goalDescriptionSchema = z
  .string()
  .max(5000, 'Description must be less than 5000 characters')
  .optional();

export const progressSchema = z
  .number()
  .min(0, 'Progress cannot be negative')
  .max(100, 'Progress cannot exceed 100');

// Review validation
export const ratingSchema = z
  .number()
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating cannot exceed 5');

export const reviewContentSchema = z
  .string()
  .min(10, 'Review content must be at least 10 characters')
  .max(10000, 'Review content must be less than 10000 characters');

// Feedback validation
export const feedbackContentSchema = z
  .string()
  .min(10, 'Feedback must be at least 10 characters')
  .max(5000, 'Feedback must be less than 5000 characters');

// User validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const jobTitleSchema = z
  .string()
  .max(200, 'Job title must be less than 200 characters')
  .optional();

// Helper function to validate and throw
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  return result.data;
}
