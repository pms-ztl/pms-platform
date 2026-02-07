// @ts-nocheck
// TODO: Fix validation schema types
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { authService } from './auth.service';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().optional(),
  mfaCode: z.string().optional(),
});

const verifyMfaSchema = z.object({
  tempToken: z.string().uuid('Invalid temp token'),
  mfaCode: z.string().length(6, 'MFA code must be 6 digits'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const passwordResetInitSchema = z.object({
  email: z.string().email('Invalid email format'),
  tenantSlug: z.string().optional(),
});

const passwordResetSchema = z.object({
  token: z.string().uuid('Invalid reset token'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

const mfaSetupVerifySchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits'),
});

const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid login credentials', {
          errors: parseResult.error.format(),
        });
      }

      const result = await authService.login(parseResult.data);

      if ('mfaRequired' in result) {
        res.status(200).json({
          success: true,
          data: {
            mfaRequired: true,
            tempToken: result.tempToken,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = verifyMfaSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid MFA verification request', {
          errors: parseResult.error.format(),
        });
      }

      const tokens = await authService.verifyMfa(
        parseResult.data.tempToken,
        parseResult.data.mfaCode
      );

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = refreshTokenSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid refresh token request', {
          errors: parseResult.error.format(),
        });
      }

      const tokens = await authService.refreshToken(parseResult.data.refreshToken);

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];
      const refreshToken = req.body.refreshToken as string | undefined;

      if (accessToken === undefined) {
        res.status(200).json({ success: true });
        return;
      }

      await authService.logout(req.user.id, accessToken, refreshToken);

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async initiatePasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = passwordResetInitSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid password reset request', {
          errors: parseResult.error.format(),
        });
      }

      await authService.initiatePasswordReset(
        parseResult.data.email,
        parseResult.data.tenantSlug
      );

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = passwordResetSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid password reset', {
          errors: parseResult.error.format(),
        });
      }

      await authService.resetPassword(parseResult.data.token, parseResult.data.password);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = changePasswordSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid password change request', {
          errors: parseResult.error.format(),
        });
      }

      await authService.changePassword(
        req.user.id,
        parseResult.data.currentPassword,
        parseResult.data.newPassword
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async setupMfa(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.setupMfa(req.user.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyMfaSetup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = mfaSetupVerifySchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid MFA verification', {
          errors: parseResult.error.format(),
        });
      }

      await authService.verifyMfaSetup(req.user.id, parseResult.data.code);

      res.status(200).json({
        success: true,
        message: 'MFA has been enabled successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async disableMfa(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = mfaDisableSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError('Invalid MFA disable request', {
          errors: parseResult.error.format(),
        });
      }

      await authService.disableMfa(req.user.id, parseResult.data.password);

      res.status(200).json({
        success: true,
        message: 'MFA has been disabled.',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
