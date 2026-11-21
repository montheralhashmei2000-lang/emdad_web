// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService, AuthServiceProvider } from '../../core/security/auth_service';
import { SharedPreferences } from '../../core/security/shared_prefs';
import {
  AppDatabaseProvider,
  ImdTheme,
  ImdThemeProvider,
  ThemeMode,
} from '../../core/theme/imd_theme';
import { ImdScreenActions, ImdScreenActionsProvider } from '../../core/ui/imd_screen_actions';
import { AppDatabase, UsersCompanion } from '../../data/db/app_database';
import { NativeDatabase, Value } from '../../data/db/sqlite_driver';
import type { AuditLog, User } from '../../data/db/tables/core_tables';
import { ArgumentError, UsersRepo } from '../../data/repos/users_repo';
import { AutoSyncProvider, AutoSyncService } from '../../data/sync/auto_sync';
import { HomeShell, type ImdNav } from '../../features/home/home_shell';
import { AccessControl, UserRole } from '../access_control';
import { AppSpace } from '../app_space';
import { SectionBlock } from '../section_block';

/// حجب الأقسام (v25): النموذج، التطبيق fail-closed، المستودع والتوقيع، والقشرة.
describe('section_block_test', () => {
  describe('SectionBlock — النموذج', () => {
    it('انتماء الصفحات: المحروقات والإمداد والأقسام الإدارية والمحايدة', () => {
      expect(SectionBlock.sectionOf('fuelMoves')).toBe(SectionBlock.fuel);
      expect(SectionBlock.sectionOf('fuelDashboard')).toBe(SectionBlock.fuel);
      expect(SectionBlock.sectionOf('items')).toBe(SectionBlock.supply);
      expect(SectionBlock.sectionOf('reportMoves')).toBe(SectionBlock.supply);
      expect(SectionBlock.sectionOf('usersAccess')).toBe(SectionBlock.adminUsers);
      expect(SectionBlock.sectionOf('lanSync')).toBe(SectionBlock.adminSync);
      expect(SectionBlock.sectionOf('deviceActivation')).toBe(SectionBlock.adminDevices);
      expect(SectionBlock.sectionOf('branding')).toBe(SectionBlock.adminSettings);
      expect(SectionBlock.sectionOf('supplyAudit')).toBe(SectionBlock.adminAudit);
      expect(SectionBlock.sectionOf('auditTrail')).toBe(SectionBlock.adminAudit);
      expect(SectionBlock.sectionOf('dash')).toBeNull();
      expect(SectionBlock.sectionOf('settings')).toBeNull();
    });

    it('أقسام الإعدادات الداخلية تتبع الحجب كما حدّدتَ', () => {
      expect(SectionBlock.settingsSections['company']).toBe(SectionBlock.adminSettings);
      expect(SectionBlock.settingsSections['forms']).toBe(SectionBlock.adminSettings);
      expect(SectionBlock.settingsSections['verify']).toBe(SectionBlock.adminSettings);
      expect(SectionBlock.settingsSections['backup']).toBe(SectionBlock.adminSettings);
      expect(SectionBlock.settingsSections['users']).toBe(SectionBlock.adminUsers);
      expect(SectionBlock.settingsSections['sync']).toBe(SectionBlock.adminSync);
      expect(SectionBlock.settingsSections['devices']).toBe(SectionBlock.adminDevices);
      expect(
        Object.prototype.hasOwnProperty.call(SectionBlock.settingsSections, 'general'),
      ).toBe(false);
    });

    it('القراءة: فارغ = لا حجب، والتالف يحجب الكل (فشل مغلق)، والمجهول يُهمل', () => {
      expect(SectionBlock.parse('').size).toBe(0);
      expect(SectionBlock.parse('[]').size).toBe(0);
      expect(SectionBlock.parse(null).size).toBe(0);
      expect(SectionBlock.parse('["fuel","bogus"]')).toEqual(
        new Set([SectionBlock.fuel]),
      );
      expect(SectionBlock.parse('{not json')).toEqual(new Set(SectionBlock.all));
      expect(SectionBlock.parse('{"a":1}')).toEqual(new Set(SectionBlock.all));
    });

    it('الترميز حتميّ ومرتّب بلا تكرار (التوقيع يُحسب على نصّه)', () => {
      expect(SectionBlock.encode(['fuel', 'supply', 'fuel'])).toBe(
        '["supply","fuel"]',
      );
      expect(SectionBlock.encode(new Set(['fuel', 'supply']))).toBe(
        SectionBlock.encode(['supply', 'fuel']),
      );
      expect(SectionBlock.encode(['nope'])).toBe('[]');
    });

    it('المالك لا يُحجب عنه شيء حتى لو خُزِّن له حجب', () => {
      for (const page of ['fuelMoves', 'items', 'usersAccess']) {
        expect(
          SectionBlock.blocksPage({
            role: 'owner',
            blockedJson: '["supply","fuel","admin.users"]',
            page,
          }),
        ).toBe(false);
      }
      expect(
        SectionBlock.blocksSection({
          role: 'owner',
          blockedJson: '["fuel"]',
          section: 'fuel',
        }),
      ).toBe(false);
      expect(
        SectionBlock.blocksPage({
          role: 'admin',
          blockedJson: '["fuel"]',
          page: 'fuelMoves',
        }),
      ).toBe(true);
    });

    it('AccessControl.can: المدير المحجوب عن قسمٍ لا يدخله، وغير المحجوب يدخل', () => {
      const can = (
        page: string,
        { owner = false, blocked = null }: { owner?: boolean; blocked?: string | null } = {},
      ) =>
        AccessControl.can({
          isAdmin: true,
          isOwner: owner,
          permissions: {},
          page,
          sectionBlocked: blocked,
        });
      expect(can('fuelMoves')).toBe(true);
      expect(can('fuelMoves', { blocked: '["fuel"]' })).toBe(false);
      expect(can('items', { blocked: '["fuel"]' })).toBe(true);
      expect(can('fuelMoves', { owner: true, blocked: '["fuel"]' })).toBe(true);
    });
  });

  describe('المستودع والتوقيع', () => {
    let db: AppDatabase;
    let repo: UsersRepo;

    beforeEach(async () => {
      SharedPreferences.setMockInitialValues({});
      db = AppDatabase.forTesting(NativeDatabase.memory());
      repo = new UsersRepo(db);
      await db.into(db.users).insert(
        UsersCompanion.insert({
          id: 'o1',
          username: 'boss',
          role: Value.of('owner'),
        }),
      );
      await db.into(db.users).insert(
        UsersCompanion.insert({
          id: 'a1',
          username: 'adm',
          role: Value.of('admin'),
        }),
      );
      await db.into(db.users).insert(
        UsersCompanion.insert({
          id: 'u1',
          username: 'ali',
        }),
      );
    });

    afterEach(async () => {
      await db.close();
    });

    const user = (id: string): Promise<User> =>
      db
        .select(db.users)
        .where((t) => t.id.equals(id))
        .getSingle();

    const audits = (action: string): Promise<AuditLog[]> =>
      db
        .select(db.auditLogs)
        .where((t) => t.action.equals(action))
        .get();

    it('المالك وحده يحجب: المدير والمستخدم يُرفضان', async () => {
      for (const role of [UserRole.admin, UserRole.user]) {
        await expect(
          repo.setSectionBlocked({
            id: 'u1',
            blocked: new Set([SectionBlock.fuel]),
            actorRole: role,
          }),
        ).rejects.toThrow(ArgumentError);
      }
      expect((await user('u1')).sectionBlocked).toBe('[]');
    });

    it('لا يُحجب عن المالك شيء', async () => {
      await expect(
        repo.setSectionBlocked({
          id: 'o1',
          blocked: new Set([SectionBlock.fuel]),
          actorRole: UserRole.owner,
        }),
      ).rejects.toThrow(ArgumentError);
      expect((await user('o1')).sectionBlocked).toBe('[]');
    });

    // MISSING: lib/core/security/esign.dart
    // MISSING: lib/core/security/device_activation.dart
    it.skip('إضافة الحجب بلا توقيع وتُدقَّق بخطورة عالية', () => {
      // يعتمد على ESign وDeviceActivation (مرحلة لاحقة).
    });

    it('بلا تغيير ⇒ لا كتابة ولا تدقيق', async () => {
      const r = await repo.setSectionBlocked({
        id: 'u1',
        blocked: new Set(),
        actorRole: UserRole.owner,
      });
      expect(r.changed).toBe(false);
      expect(await audits('user.section_blocked.changed')).toEqual([]);
    });

    // MISSING: lib/core/security/esign.dart
    // MISSING: lib/core/security/device_activation.dart
    // MISSING: lib/core/security/owner_signature.dart
    it.skip('فكّ الحجب مع مفتاح المالك: يُوقَّع ويُتحقَّق منه بالمفتاح العام ويُدقَّق sys.sign.used', () => {
      // يعتمد على ESign وDeviceActivation وOwnerSignature (مرحلة لاحقة).
    });

    // MISSING: lib/core/security/esign.dart
    // MISSING: lib/core/security/device_activation.dart
    // MISSING: lib/core/security/owner_signature.dart
    it.skip('فكّ الحجب بلا مفتاح: يُنفَّذ محليًّا بلا توقيع ويُنبَّه بأنه لن ينتشر', () => {
      // يعتمد على ESign وDeviceActivation وOwnerSignature (مرحلة لاحقة).
    });

    // MISSING: lib/core/security/esign.dart
    // MISSING: lib/core/security/device_activation.dart
    // MISSING: lib/core/security/owner_signature.dart
    it.skip('إضافة حجبٍ بعد فكٍّ موقَّع تُسقط توقيع الأقسام القديم وتُبقي توقيع الدور', () => {
      // يعتمد على ESign وDeviceActivation وOwnerSignature (مرحلة لاحقة).
    });
  });

  describe('القشرة', () => {
    let db: AppDatabase;
    let auth: AuthService;
    let autoSync: AutoSyncService;
    let imdTheme: ImdTheme;
    let screenActions: ImdScreenActions;

    beforeEach(async () => {
      SharedPreferences.setMockInitialValues({});
      db = AppDatabase.forTesting(NativeDatabase.memory());
      autoSync = new AutoSyncService(db);
      imdTheme = new ImdTheme(ThemeMode.light);
      screenActions = new ImdScreenActions();
      auth = new AuthService(db);
    });

    afterEach(async () => {
      cleanup();
      autoSync.dispose();
      imdTheme.dispose();
      await db.close();
    });

    async function bootShell({
      role = 'admin',
      blockedJson,
      savedSpace,
    }: {
      readonly role?: string;
      readonly blockedJson: string;
      readonly savedSpace: string;
    }) {
      await auth.createAdmin({ username: 'admin', password: 'Test@12345' });
      const created = await db
        .select(db.users)
        .where((t) => t.username.equals('admin'))
        .getSingle();
      await db
        .update(db.users)
        .where((t) => t.id.equals(created.id))
        .write(
          UsersCompanion({
            role: Value.of(role),
            sectionBlocked: Value.of(blockedJson),
          }),
        );
      await auth.login('admin', 'Test@12345');
      SharedPreferences.setMockInitialValues({
        [`imdad.space.${auth.currentUser!.id}`]: savedSpace,
      });

      const navRef: { current: ImdNav | null } = { current: null };
      const result = render(
        <AppDatabaseProvider db={db}>
          <AuthServiceProvider value={auth}>
            <ImdScreenActionsProvider value={screenActions}>
              <AutoSyncProvider service={autoSync}>
                <ImdThemeProvider theme={imdTheme}>
                  <HomeShell
                    viewportWidth={1600}
                    navRef={navRef}
                    onSignOut={async () => {}}
                  />
                </ImdThemeProvider>
              </AutoSyncProvider>
            </ImdScreenActionsProvider>
          </AuthServiceProvider>
        </AppDatabaseProvider>,
      );

      await waitFor(() => {
        expect(
          result.container.querySelector('[data-imd-home-shell="true"]'),
        ).not.toBeNull();
      });

      return { ...result, navRef };
    }

    it('حجب fuel: المدير لا يرى القسم ولو كان محفوظًا، وصفحاته مرفوضة بالتنقّل المباشر', async () => {
      const { container, navRef } = await bootShell({
        role: 'admin',
        blockedJson: '["fuel"]',
        savedSpace: AppSpace.fuel,
      });

      const shell = container.querySelector('[data-imd-home-shell="true"]');
      expect(shell?.getAttribute('data-imd-space')).toBe(AppSpace.supply);
      expect(screen.queryByText('ادخل')).toBeNull();
      expect(screen.queryByLabelText('تبديل القسم')).toBeNull();

      act(() => {
        navRef.current!.go('fuelMoves');
      });

      await waitFor(() => {
        expect(screen.getAllByText('صلاحية غير متاحة').length).toBeGreaterThan(0);
      });
    });

    it('حجب supply: يبقى المحروقات وحده والإمداد مرفوض', async () => {
      const { container, navRef } = await bootShell({
        role: 'admin',
        blockedJson: '["supply"]',
        savedSpace: AppSpace.supply,
      });

      const shell = container.querySelector('[data-imd-home-shell="true"]');
      expect(shell?.getAttribute('data-imd-space')).toBe(AppSpace.fuel);
      expect(screen.queryByLabelText('تبديل القسم')).toBeNull();

      act(() => {
        navRef.current!.go('items');
      });

      await waitFor(() => {
        expect(screen.getAllByText('صلاحية غير متاحة').length).toBeGreaterThan(0);
      });
    });

    // MISSING: lib/features/settings/settings_screen.dart
    it.skip('حجب admin.users: قسم «المستخدمون» يختفي من داخل الإعدادات وبقية الأقسام تبقى', () => {
      // يعتمد على SettingsScreen الفعلية (المرحلة 20).
    });

    it('لا حجب للمالك: يرى كل الأقسام ولو خُزِّن له حجب', async () => {
      const { container, navRef } = await bootShell({
        role: 'owner',
        blockedJson: '["supply","fuel","admin.users"]',
        savedSpace: AppSpace.supply,
      });

      const shell = () => container.querySelector('[data-imd-home-shell="true"]');
      expect(shell()?.getAttribute('data-imd-space')).toBe(AppSpace.supply);
      expect(screen.getByLabelText('تبديل القسم')).not.toBeNull();

      fireEvent.click(screen.getByLabelText('تبديل القسم'));
      await waitFor(() => {
        expect(shell()?.getAttribute('data-imd-space')).toBe(AppSpace.fuel);
      });

      act(() => {
        navRef.current!.go('fuelMoves');
      });
      await waitFor(() => {
        expect(navRef.current!.current).toBe('fuelIssue');
      });
      expect(screen.queryByText('صلاحية غير متاحة')).toBeNull();

      act(() => {
        navRef.current!.go('items');
      });
      await waitFor(() => {
        expect(navRef.current!.current).toBe('items');
      });
      expect(screen.queryByText('صلاحية غير متاحة')).toBeNull();
    });
  });
});
