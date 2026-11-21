import { afterEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../../core/security/auth_service';
import { Perm } from '../../../core/security/perm';
import { SharedPreferences } from '../../../core/security/shared_prefs';
import { AccessControl, PermAction } from '../../../domain/access_control';
import { AppDatabase } from '../../db/app_database';
import { NativeDatabase } from '../../db/sqlite_driver';
import { UsersRepo } from '../users_repo';

/// زرُّ الحذف يتبع صلاحية الحذف وحدها — لا «قابليةَ الكتابة».
///
/// [Perm.writable] يصدق بأيِّ إجراءٍ من الأربعة (إضافة/تعديل/حذف/اعتماد). وكانت
/// شاشات الكتالوج والتشغيل اليومي والمحروقات تُظهر زرَّ الحذف به، وبعضُ دوالِّ
/// الحذف بلا حارسٍ داخلي. وقالب «أمين مخزن» يمنح الأصناف والموردين والوحدات
/// والمطابخ والأصول **إضافةً وتعديلًا بلا حذف** صراحةً (انظر وصفَ القالب في
/// `AccessControl.roles`) — فكان أمينُ المخزن يرى الزرَّ ويحذف ما لا يملك حذفه.
describe('delete_permission_test', () => {
  let db: AppDatabase | null = null;
  let auth: AuthService;

  afterEach(async () => {
    if (db !== null) {
      await db.close();
      db = null;
    }
  });

  describe('قالب أمين المخزن: تعديلٌ بلا حذف', () => {
    it('القالب نفسه يمنح التعديل ويمنع الحذف في الكتالوج', () => {
      const perms = AccessControl.permissionsForRoles(['storekeeper']);
      for (const page of ['items', 'suppliers', 'units', 'kitchens', 'assets']) {
        expect(
          AccessControl.can({
            isAdmin: false,
            permissions: perms,
            page,
            action: PermAction.edit,
          }),
        ).toBe(true);
        expect(
          AccessControl.can({
            isAdmin: false,
            permissions: perms,
            page,
            action: PermAction.delete,
          }),
        ).toBe(false);
      }
    });

    // MISSING: lib/data/repos/catalog_repo.dart
    // MISSING: lib/features/catalog/items_screen.dart
    it.skip('الأصناف: لا زرَّ حذفٍ لمن لا يملك الحذف', () => {
      // يعتمد على CatalogRepo و ItemsScreen (المرحلة 7).
    });

    // MISSING: lib/data/repos/catalog_repo.dart
    // MISSING: lib/features/catalog/suppliers_screen.dart
    it.skip('الموردون: لا زرَّ حذف', () => {
      // يعتمد على CatalogRepo و SuppliersScreen (المرحلة 7).
    });

    // MISSING: lib/data/repos/catalog_repo.dart
    // MISSING: lib/features/catalog/kitchens_screen.dart
    it.skip('المطابخ: لا زرَّ حذف', () => {
      // يعتمد على CatalogRepo و KitchensScreen (المرحلة 7).
    });
  });

  describe('من يملك الحذف يراه', () => {
    // MISSING: lib/data/repos/catalog_repo.dart
    // MISSING: lib/features/catalog/items_screen.dart
    it.skip('الأصناف: المدير يرى زرَّ الحذف', () => {
      // يعتمد على CatalogRepo و ItemsScreen (المرحلة 7).
    });
  });

  describe('حارسٌ داخليٌّ لا يُكتفى بإخفاء الزر', () => {
    it('Perm.canDelete لا يتأثر بالإضافة أو التعديل أو الاعتماد', async () => {
      SharedPreferences.setMockInitialValues({});
      db = AppDatabase.forTesting(NativeDatabase.memory());
      auth = new AuthService(db);
      await new UsersRepo(db).createUser({
        username: 'partial',
        password: 'Test@12345',
        name: 'جزئي',
        permissions: {
          items: {
            [PermAction.view]: true,
            [PermAction.create]: true,
            [PermAction.edit]: true,
            [PermAction.approve]: true,
          },
        },
      });
      await auth.login('partial', 'Test@12345');
      const perm = new Perm(auth);
      expect(perm.writable('items')).toBe(true);
      expect(perm.canDelete('items')).toBe(false);
    }, 60_000);
  });
});
