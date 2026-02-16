import {
  SUPER_ADMIN_ROLES,
  ADMIN_ROLES,
  MANAGER_ROLES,
  isSuperAdmin,
  isAdmin,
  isManager,
  isEmployeeOnly,
} from '../roles';

describe('roles', () => {
  describe('role alias constants', () => {
    it('SUPER_ADMIN_ROLES contains "Super Admin" and "SUPER_ADMIN"', () => {
      expect(SUPER_ADMIN_ROLES).toContain('Super Admin');
      expect(SUPER_ADMIN_ROLES).toContain('SUPER_ADMIN');
    });

    it('ADMIN_ROLES includes all of SUPER_ADMIN_ROLES plus admin aliases', () => {
      for (const role of SUPER_ADMIN_ROLES) {
        expect(ADMIN_ROLES).toContain(role);
      }
      expect(ADMIN_ROLES).toContain('ADMIN');
      expect(ADMIN_ROLES).toContain('Tenant Admin');
      expect(ADMIN_ROLES).toContain('TENANT_ADMIN');
    });

    it('MANAGER_ROLES includes all of ADMIN_ROLES plus manager aliases', () => {
      for (const role of ADMIN_ROLES) {
        expect(MANAGER_ROLES).toContain(role);
      }
      expect(MANAGER_ROLES).toContain('MANAGER');
      expect(MANAGER_ROLES).toContain('Manager');
    });
  });

  describe('isSuperAdmin()', () => {
    it('returns true for SUPER_ADMIN role', () => {
      expect(isSuperAdmin(['SUPER_ADMIN'])).toBe(true);
    });

    it('returns true for "Super Admin" display name', () => {
      expect(isSuperAdmin(['Super Admin'])).toBe(true);
    });

    it('returns false for EMPLOYEE role', () => {
      expect(isSuperAdmin(['EMPLOYEE'])).toBe(false);
    });

    it('returns false for an empty role array', () => {
      expect(isSuperAdmin([])).toBe(false);
    });

    it('returns true when one of multiple roles is a super admin', () => {
      expect(isSuperAdmin(['EMPLOYEE', 'SUPER_ADMIN'])).toBe(true);
    });
  });

  describe('isAdmin()', () => {
    it('returns true for ADMIN role', () => {
      expect(isAdmin(['ADMIN'])).toBe(true);
    });

    it('returns true for SUPER_ADMIN (admins include super admins)', () => {
      expect(isAdmin(['SUPER_ADMIN'])).toBe(true);
    });

    it('returns true for TENANT_ADMIN role', () => {
      expect(isAdmin(['TENANT_ADMIN'])).toBe(true);
    });

    it('returns false for EMPLOYEE role', () => {
      expect(isAdmin(['EMPLOYEE'])).toBe(false);
    });

    it('returns false for an empty role array', () => {
      expect(isAdmin([])).toBe(false);
    });
  });

  describe('isManager()', () => {
    it('returns true for MANAGER role', () => {
      expect(isManager(['MANAGER'])).toBe(true);
    });

    it('returns true for "Manager" display name', () => {
      expect(isManager(['Manager'])).toBe(true);
    });

    it('returns true for ADMIN (managers include admins)', () => {
      expect(isManager(['ADMIN'])).toBe(true);
    });

    it('returns false for EMPLOYEE role', () => {
      expect(isManager(['EMPLOYEE'])).toBe(false);
    });

    it('returns false for an empty role array', () => {
      expect(isManager([])).toBe(false);
    });
  });

  describe('isEmployeeOnly()', () => {
    it('returns true for EMPLOYEE role only', () => {
      expect(isEmployeeOnly(['EMPLOYEE'])).toBe(true);
    });

    it('returns true for an empty role array (no elevated roles)', () => {
      expect(isEmployeeOnly([])).toBe(true);
    });

    it('returns false when user also has MANAGER role', () => {
      expect(isEmployeeOnly(['MANAGER', 'EMPLOYEE'])).toBe(false);
    });

    it('returns false when user has ADMIN role', () => {
      expect(isEmployeeOnly(['ADMIN'])).toBe(false);
    });

    it('returns false when user has SUPER_ADMIN role', () => {
      expect(isEmployeeOnly(['SUPER_ADMIN'])).toBe(false);
    });
  });
});
