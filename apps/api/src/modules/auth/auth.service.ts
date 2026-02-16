import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '@pms/database';

import { config } from '../../config';
import { emailService } from '../../services/email';
import type {
  AuthenticatedUser,
  JWTPayload,
  LoginCredentials,
  RefreshTokenPayload,
  TokenPair,
} from '../../types';
import { AuthenticationError, NotFoundError, ValidationError } from '../../utils/errors';
import { auditLogger, logger } from '../../utils/logger';
import {
  cacheDelete,
  cacheGet,
  cacheSet,
  deleteSession,
  getSession,
  setSession,
} from '../../utils/redis';

const SALT_ROUNDS = 12;
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
const MFA_TEMP_PREFIX = 'mfa:temp:';
const PASSWORD_RESET_PREFIX = 'password:reset:';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<TokenPair | { mfaRequired: true; tempToken: string }> {
    const { email, password, tenantSlug, mfaCode } = credentials;

    // Find user with tenant
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
        deletedAt: null,
        ...(tenantSlug !== undefined ? { tenant: { slug: tenantSlug } } : {}),
      },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user === null) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.passwordHash === null) {
      throw new AuthenticationError('Please use SSO to login');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      auditLogger('LOGIN_FAILED', user.id, user.tenantId, 'user', user.id, {
        reason: 'invalid_password',
      });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check MFA
    if (user.mfaEnabled) {
      if (mfaCode === undefined || mfaCode === null) {
        // Generate temporary token for MFA flow
        const tempToken = uuidv4();
        await cacheSet(`${MFA_TEMP_PREFIX}${tempToken}`, user.id, 300); // 5 minutes
        return { mfaRequired: true, tempToken };
      }

      if (user.mfaSecret === null) {
        throw new AuthenticationError('MFA not configured properly');
      }

      const isValidMfa = authenticator.verify({
        token: mfaCode,
        secret: user.mfaSecret,
      });

      if (!isValidMfa) {
        auditLogger('LOGIN_FAILED', user.id, user.tenantId, 'user', user.id, {
          reason: 'invalid_mfa',
        });
        throw new AuthenticationError('Invalid MFA code');
      }
    }

    // Generate tokens
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = this.extractPermissions(user.userRoles);

    const tokens = await this.generateTokens(user, roles, permissions);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    auditLogger('LOGIN_SUCCESS', user.id, user.tenantId, 'user', user.id);

    // Send login alert email (non-blocking)
    emailService.sendLoginAlert(
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
    ).catch((err) => {
      logger.warn('Login alert email failed', { email: user.email, error: (err as Error).message });
    });

    return tokens;
  }

  async verifyMfa(tempToken: string, mfaCode: string): Promise<TokenPair> {
    const userId = await cacheGet<string>(`${MFA_TEMP_PREFIX}${tempToken}`);

    if (userId === null) {
      throw new AuthenticationError('MFA session expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user === null || user.mfaSecret === null) {
      throw new AuthenticationError('Invalid MFA session');
    }

    const isValid = authenticator.verify({
      token: mfaCode,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new AuthenticationError('Invalid MFA code');
    }

    await cacheDelete(`${MFA_TEMP_PREFIX}${tempToken}`);

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = this.extractPermissions(user.userRoles);

    const tokens = await this.generateTokens(user, roles, permissions);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    auditLogger('LOGIN_SUCCESS', user.id, user.tenantId, 'user', user.id, {
      mfaVerified: true,
    });

    return tokens;
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Check if token is blacklisted
    const isBlacklisted = await cacheGet<boolean>(`${TOKEN_BLACKLIST_PREFIX}${refreshToken}`);

    if (isBlacklisted === true) {
      throw new AuthenticationError('Token has been revoked');
    }

    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, config.JWT_SECRET) as RefreshTokenPayload;
    } catch {
      throw new AuthenticationError('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tid,
        isActive: true,
        deletedAt: null,
      },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user === null) {
      throw new AuthenticationError('User not found');
    }

    // Blacklist the old refresh token
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await cacheSet(`${TOKEN_BLACKLIST_PREFIX}${refreshToken}`, true, ttl);
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = this.extractPermissions(user.userRoles);

    return this.generateTokens(user, roles, permissions);
  }

  async logout(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    // Blacklist access token
    try {
      const accessPayload = jwt.decode(accessToken) as JWTPayload | null;
      if (accessPayload !== null) {
        const accessTtl = accessPayload.exp - Math.floor(Date.now() / 1000);
        if (accessTtl > 0) {
          await cacheSet(`${TOKEN_BLACKLIST_PREFIX}${accessToken}`, true, accessTtl);
        }
      }
    } catch (error) {
      logger.warn('Failed to blacklist access token', { error });
    }

    // Blacklist refresh token
    if (refreshToken !== undefined) {
      try {
        const refreshPayload = jwt.decode(refreshToken) as RefreshTokenPayload | null;
        if (refreshPayload !== null) {
          const refreshTtl = refreshPayload.exp - Math.floor(Date.now() / 1000);
          if (refreshTtl > 0) {
            await cacheSet(`${TOKEN_BLACKLIST_PREFIX}${refreshToken}`, true, refreshTtl);
          }
        }
      } catch (error) {
        logger.warn('Failed to blacklist refresh token', { error });
      }
    }

    // Delete user sessions
    try {
      await deleteSession(userId);
    } catch (error) {
      logger.warn('Failed to delete session during logout', { error, userId });
    }

    auditLogger('LOGOUT', userId, '', 'user', userId);
  }

  async setupMfa(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, `PMS-${user.tenant.name}`, secret);

    // Store temporarily - will be saved on verification
    await cacheSet(`mfa:setup:${userId}`, secret, 600); // 10 minutes

    return { secret, otpauthUrl };
  }

  async verifyMfaSetup(userId: string, code: string): Promise<void> {
    const secret = await cacheGet<string>(`mfa:setup:${userId}`);

    if (secret === null) {
      throw new ValidationError('MFA setup session expired');
    }

    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new ValidationError('Invalid MFA code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });

    await cacheDelete(`mfa:setup:${userId}`);

    auditLogger('MFA_ENABLED', userId, '', 'user', userId);
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    if (user.passwordHash === null) {
      throw new ValidationError('Cannot disable MFA for SSO users');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AuthenticationError('Invalid password');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    auditLogger('MFA_DISABLED', userId, '', 'user', userId);
  }

  async initiatePasswordReset(email: string, tenantSlug?: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
        deletedAt: null,
        ...(tenantSlug !== undefined ? { tenant: { slug: tenantSlug } } : {}),
      },
    });

    if (user === null) {
      // Don't reveal if user exists
      return;
    }

    if (user.passwordHash === null) {
      // SSO user - don't send reset email
      return;
    }

    const resetToken = uuidv4();
    await cacheSet(`${PASSWORD_RESET_PREFIX}${resetToken}`, user.id, 3600); // 1 hour

    // Send password reset email
    emailService.sendPasswordResetCode(
      { firstName: user.firstName, email: user.email },
      resetToken
    ).catch((err) => {
      logger.error('Failed to send password reset email', { userId: user.id, error: err });
    });
    logger.info('Password reset token generated', { userId: user.id });

    auditLogger('PASSWORD_RESET_INITIATED', user.id, user.tenantId, 'user', user.id);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await cacheGet<string>(`${PASSWORD_RESET_PREFIX}${token}`);

    if (userId === null) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    await cacheDelete(`${PASSWORD_RESET_PREFIX}${token}`);

    auditLogger('PASSWORD_RESET_COMPLETED', userId, '', 'user', userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user === null) {
      throw new NotFoundError('User', userId);
    }

    if (user.passwordHash === null) {
      throw new ValidationError('Cannot change password for SSO users');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    auditLogger('PASSWORD_CHANGED', userId, user.tenantId, 'user', userId);
  }

  /**
   * Set initial password using a password-set token (from Excel onboarding).
   * This activates the account and marks email as verified.
   */
  async setInitialPassword(token: string, newPassword: string): Promise<void> {
    const passwordSetToken = await prisma.passwordSetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!passwordSetToken) {
      throw new ValidationError('Invalid or expired password set token');
    }

    if (passwordSetToken.usedAt) {
      throw new ValidationError('This password set link has already been used');
    }

    if (passwordSetToken.expiresAt < new Date()) {
      throw new ValidationError('This password set link has expired. Contact your manager.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordSetToken.userId },
        data: {
          passwordHash: hashedPassword,
          emailVerified: true,
          isActive: true,
        },
      }),
      prisma.passwordSetToken.update({
        where: { id: passwordSetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    auditLogger('PASSWORD_SET_INITIAL', passwordSetToken.userId, passwordSetToken.user.tenantId, 'user', passwordSetToken.userId);
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    console.log('[VALIDATE TOKEN] Starting validation...');
    console.log('[VALIDATE TOKEN] Token preview:', token.substring(0, 50) + '...');

    // Check if blacklisted
    const isBlacklisted = await cacheGet<boolean>(`${TOKEN_BLACKLIST_PREFIX}${token}`);

    if (isBlacklisted === true) {
      console.error('[VALIDATE TOKEN] Token is blacklisted');
      throw new AuthenticationError('Token has been revoked');
    }

    let payload: JWTPayload;
    try {
      console.log('[VALIDATE TOKEN] Verifying JWT signature with secret...');
      payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
      console.log('[VALIDATE TOKEN] JWT verified! Payload sub:', payload.sub, 'tid:', payload.tid);
    } catch (error) {
      console.error('[VALIDATE TOKEN] JWT verification FAILED:', error instanceof Error ? error.message : error);
      throw new AuthenticationError('Invalid token');
    }

    // Check session in cache first
    const cachedUser = await getSession<AuthenticatedUser>(payload.sub);

    if (cachedUser !== null) {
      return cachedUser;
    }

    // Fetch user from database with relations needed for frontend
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tid,
        isActive: true,
        deletedAt: null,
      },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (user === null) {
      throw new AuthenticationError('User not found');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: payload.roles,
      permissions: payload.permissions,
      // Profile fields
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      jobTitle: user.jobTitle ?? undefined,
      isActive: user.isActive,
      // Organizational structure fields for ABAC
      departmentId: user.departmentId ?? undefined,
      businessUnitId: user.businessUnitId ?? undefined,
      costCenterId: user.costCenterId ?? undefined,
      managerId: user.managerId ?? undefined,
      level: user.level,
      contractType: user.contractType ?? undefined,
      // Security fields
      mfaEnabled: user.mfaEnabled,
      // Relations
      department: user.department ?? undefined,
      manager: user.manager ?? undefined,
    };

    // Cache for subsequent requests
    await setSession(payload.sub, authenticatedUser as unknown as Record<string, unknown>, 300); // 5 minutes

    return authenticatedUser;
  }

  private async generateTokens(
    user: { id: string; tenantId: string; email: string },
    roles: string[],
    permissions: string[]
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);

    const accessPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      tid: user.tenantId,
      email: user.email,
      roles,
      permissions,
    };

    const accessToken = jwt.sign(accessPayload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);

    const refreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      tid: user.tenantId,
      type: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, config.JWT_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);

    // Session will be lazily cached by validateToken() on first authenticated request
    // with the full AuthenticatedUser object (including avatarUrl, department, etc.)

    // Calculate expiration time
    const decoded = jwt.decode(accessToken) as JWTPayload;
    const expiresIn = decoded.exp - now;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private extractPermissions(
    userRoles: Array<{ role: { permissions: unknown } }>
  ): string[] {
    const permissions = new Set<string>();

    for (const ur of userRoles) {
      const rolePermissions = ur.role.permissions as string[];
      if (Array.isArray(rolePermissions)) {
        rolePermissions.forEach((p) => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}

export const authService = new AuthService();
