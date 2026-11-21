import { describe, expect, it } from 'vitest';
import { AccessControl, PermAction } from '../access_control';

describe('users_roles_test', () => {
  describe('تجميع صلاحيات الأدوار', () => {
    it('مستخدم بدورَي مدخل بيانات وأمين مخزن يجمع صلاحيات الاثنين', () => {
      const perms = AccessControl.merge([
        AccessControl.roles['data_entry'].permissions,
        AccessControl.roles['storekeeper'].permissions,
      ]);
      expect(perms['receive']?.['create']).toBe(true); // من مدخل البيانات
      expect(perms['receive']?.['approve']).toBe(true); // من أمين المخزن
      expect(perms['balances']?.['view']).toBe(true);
    });

    it('المطّلع لا يملك أي صلاحية إدخال أو تعديل', () => {
      const viewer = AccessControl.roles['viewer'].permissions;
      for (const page of Object.keys(viewer)) {
        expect(viewer[page]?.['create'] ?? false).toBe(false);
        expect(viewer[page]?.['edit'] ?? false).toBe(false);
        expect(viewer[page]?.['delete'] ?? false).toBe(false);
      }
    });

    it('إدارة المستخدمين ليست ضمن أي دور جاهز — لمدير النظام وحده', () => {
      for (const role of Object.values(AccessControl.roles)) {
        expect(role.permissions['usersAccess']?.['edit'] ?? false).toBe(false);
      }
      expect(
        AccessControl.can({
          isAdmin: false,
          permissions: AccessControl.roles['office_manager'].permissions,
          page: 'usersAccess',
          action: PermAction.edit,
        }),
      ).toBe(false);
      expect(
        AccessControl.can({
          isAdmin: true,
          permissions: {},
          page: 'usersAccess',
          action: PermAction.edit,
        }),
      ).toBe(true);
    });

    it('نطاق المستودعات يمنع أمين مخزن من مستودع آخر', () => {
      expect(
        AccessControl.canUseWarehouse({
          isAdmin: false,
          scope: ['مخزن المعسكر'],
          warehouse: 'المخزن الرئيسي',
        }),
      ).toBe(false);
      expect(
        AccessControl.canUseWarehouse({
          isAdmin: false,
          scope: ['مخزن المعسكر'],
          warehouse: 'مخزن المعسكر',
        }),
      ).toBe(true);
    });
  });
});
