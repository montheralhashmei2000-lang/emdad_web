// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthService,
  AuthServiceProvider,
} from '../../../core/security/auth_service';
import { Perm } from '../../../core/security/perm';
import { SharedPreferences } from '../../../core/security/shared_prefs';
import {
  AppDatabaseProvider,
  ImdTheme,
  ImdThemeProvider,
  ThemeMode,
} from '../../../core/theme/imd_theme';
import {
  ImdScreenActions,
  ImdScreenActionsProvider,
} from '../../../core/ui/imd_screen_actions';
import { AccessControl, PermAction } from '../../../domain/access_control';
import { ItemsScreen } from '../../../features/catalog/items_screen';
import { KitchensScreen } from '../../../features/catalog/kitchens_screen';
import { SuppliersScreen } from '../../../features/catalog/suppliers_screen';
import { AppDatabase } from '../../db/app_database';
import { NativeDatabase } from '../../db/sqlite_driver';
import { CatalogRepo } from '../catalog_repo';
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
  let imdTheme: ImdTheme | null = null;

  afterEach(async () => {
    cleanup();
    if (imdTheme !== null) {
      imdTheme.dispose();
      imdTheme = null;
    }
    if (db !== null) {
      await db.close();
      db = null;
    }
  });

  function renderWithProviders(child: ReactNode) {
    imdTheme = new ImdTheme(ThemeMode.light);
    const actions = new ImdScreenActions();
    return render(
      <AppDatabaseProvider db={db!}>
        <AuthServiceProvider value={auth}>
          <ImdScreenActionsProvider value={actions}>
            <ImdThemeProvider theme={imdTheme}>{child}</ImdThemeProvider>
          </ImdScreenActionsProvider>
        </AuthServiceProvider>
      </AppDatabaseProvider>,
    );
  }

  async function loginStorekeeper() {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
    auth = new AuthService(db);
    await new UsersRepo(db).createUser({
      username: 'storekeeper',
      password: 'Test@12345',
      name: 'أمين مخزن',
      permissions: AccessControl.permissionsForRoles(['storekeeper']),
    });
    await auth.login('storekeeper', 'Test@12345');
  }

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

    it('الأصناف: لا زرَّ حذفٍ لمن لا يملك الحذف', async () => {
      await loginStorekeeper();
      await new CatalogRepo(db!).saveItem({ code: 'IT-1', name: 'أرز بسمتي' });

      renderWithProviders(<ItemsScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('أرز بسمتي').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByTitle('تعديل').length).toBeGreaterThan(0);
      expect(screen.queryByTitle('حذف')).toBeNull();
    }, 60_000);

    it('الموردون: لا زرَّ حذف', async () => {
      await loginStorekeeper();
      await new CatalogRepo(db!).saveSupplier({ name: 'مورد الخير' });

      renderWithProviders(<SuppliersScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('مورد الخير').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByTitle('تعديل').length).toBeGreaterThan(0);
      expect(screen.queryByTitle('حذف')).toBeNull();
    }, 60_000);

    it('المطابخ: لا زرَّ حذف', async () => {
      await loginStorekeeper();
      await new CatalogRepo(db!).saveFacility({ name: 'مطبخ المقر' });

      renderWithProviders(<KitchensScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('مطبخ المقر').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByTitle('تعديل').length).toBeGreaterThan(0);
      expect(screen.queryByTitle('حذف')).toBeNull();
    }, 60_000);
  });

  describe('من يملك الحذف يراه', () => {
    it('الأصناف: المدير يرى زرَّ الحذف', async () => {
      SharedPreferences.setMockInitialValues({});
      db = AppDatabase.forTesting(NativeDatabase.memory());
      auth = new AuthService(db);
      await auth.createAdmin({ username: 'admin', password: 'Test@12345' });
      await auth.login('admin', 'Test@12345');
      await new CatalogRepo(db).saveItem({ code: 'IT-2', name: 'سكر أبيض' });

      renderWithProviders(<ItemsScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('سكر أبيض').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByTitle('حذف').length).toBeGreaterThan(0);
    }, 60_000);
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
