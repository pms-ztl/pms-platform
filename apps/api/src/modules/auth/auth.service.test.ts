import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AuthService } from './auth.service';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../../lib/redis', () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    tenantId: 'tenant-123',
    mfaEnabled: false,
  };

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);
      (jwt.sign as Mock).mockReturnValue('mock-access-token');
      (prisma.refreshToken.create as Mock).mockResolvedValue({
        id: 'refresh-token-id',
        token: 'mock-refresh-token',
      });

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for suspended user', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue({
        ...mockUser,
        status: 'SUSPENDED',
      });

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Account is suspended');
    });

    it('should require MFA when enabled', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      });
      (bcrypt.compare as Mock).mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).not.toHaveProperty('accessToken');
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const mockRefreshToken = {
        id: 'refresh-token-id',
        token: 'valid-refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      };

      (prisma.refreshToken.findFirst as Mock).mockResolvedValue(mockRefreshToken);
      (jwt.sign as Mock).mockReturnValue('new-access-token');

      const result = await authService.refreshAccessToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
    });

    it('should throw error for invalid refresh token', async () => {
      (prisma.refreshToken.findFirst as Mock).mockResolvedValue(null);

      await expect(
        authService.refreshAccessToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for expired refresh token', async () => {
      const mockRefreshToken = {
        id: 'refresh-token-id',
        token: 'expired-refresh-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 86400000), // Expired
        user: mockUser,
      };

      (prisma.refreshToken.findFirst as Mock).mockResolvedValue(mockRefreshToken);

      await expect(
        authService.refreshAccessToken('expired-refresh-token')
      ).rejects.toThrow('Refresh token expired');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      (prisma.refreshToken.deleteMany as Mock).mockResolvedValue({ count: 1 });
      (redis.del as Mock).mockResolvedValue(1);

      await authService.logout(mockUser.id, 'refresh-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });

  describe('verifyMfa', () => {
    it('should successfully verify valid MFA code', async () => {
      const mockMfaSecret = 'JBSWY3DPEHPK3PXP';
      (prisma.user.findUnique as Mock).mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: mockMfaSecret,
      });
      (jwt.sign as Mock).mockReturnValue('mock-access-token');
      (prisma.refreshToken.create as Mock).mockResolvedValue({
        token: 'mock-refresh-token',
      });

      // Mock TOTP verification (would need actual implementation)
      vi.spyOn(authService as any, 'verifyTotpCode').mockReturnValue(true);

      const result = await authService.verifyMfa(mockUser.id, '123456');

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw error for invalid MFA code', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'secret',
      });

      vi.spyOn(authService as any, 'verifyTotpCode').mockReturnValue(false);

      await expect(authService.verifyMfa(mockUser.id, '000000')).rejects.toThrow(
        'Invalid MFA code'
      );
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(true);
      (bcrypt.hash as Mock).mockResolvedValue('new-hashed-password');
      (prisma.user.update as Mock).mockResolvedValue({
        ...mockUser,
        password: 'new-hashed-password',
      });

      await authService.changePassword(
        mockUser.id,
        'currentPassword',
        'newPassword123'
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'new-hashed-password' },
      });
    });

    it('should throw error for incorrect current password', async () => {
      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword(mockUser.id, 'wrongPassword', 'newPassword123')
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
