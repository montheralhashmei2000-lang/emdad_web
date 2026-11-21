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
import { AuthService, AuthServiceProvider } from '../../../core/security/auth_service';
import { SharedPreferences } from '../../../core/security/shared_prefs';
import {
  AppDatabaseProvider,
  ImdTheme,
  ImdThemeProvider,
  ThemeMode,
} from '../../../core/theme/imd_theme';
import { ImdScreenActions, ImdScreenActionsProvider } from '../../../core/ui/imd_screen_actions';
import { ImdSectionTheme } from '../../../core/ui/imd_section_theme';
import { ImdStyle } from '../../../core/ui/imd_style';
import { ImdColors } from '../../../core/ui/imd_tokens';
import { AppDatabase } from '../../../data/db/app_database';
import { NativeDatabase } from '../../../data/db/sqlite_driver';
import { AutoSyncProvider, AutoSyncService } from '../../../data/sync/auto_sync';
import { AppSpace } from '../../../domain/app_space';
import { HomeShell, type ImdNav } from '../home_shell';

/// التبديل بين قسم الإمداد وقسم المحروقات.
///
/// القسمان يشتركان في القشرة نفسها (تبويبات + شريط جانبي + شريط حالة) لكن لكلٍّ
/// هويّته البصرية وتبويباته. والشرط أن التبديل **لا يهدم** القسم الذي غادره:
/// يعود بتبويباته المفتوحة وبحالة صفحاته نفسها لا نسخةً جديدة منها.
describe('section_switch_test', () => {
  let db: AppDatabase;
  let auth: AuthService;
  let autoSync: AutoSyncService;
  let imdTheme: ImdTheme;
  let screenActions: ImdScreenActions;

  beforeEach(async () => {
    SharedPreferences.setMockInitialValues({});
    await ImdSectionTheme.set(false);
    await ImdStyle.set(false);
    db = AppDatabase.forTesting(NativeDatabase.memory());
    autoSync = new AutoSyncService(db);
    imdTheme = new ImdTheme(ThemeMode.light);
    screenActions = new ImdScreenActions();
    auth = new AuthService(db);
    await auth.createAdmin({ username: 'admin', password: 'Test@12345' });
    await auth.login('admin', 'Test@12345');
    // المدير يملك القسمين؛ حفظُ اختياره يدخلنا القشرة مباشرةً على الإمداد.
    SharedPreferences.setMockInitialValues({
      [`imdad.space.${auth.currentUser!.id}`]: AppSpace.supply,
    });
  });

  afterEach(async () => {
    cleanup();
    await ImdSectionTheme.set(false);
    autoSync.dispose();
    imdTheme.dispose();
    await db.close();
  });

  async function enterShell(navRef?: { current: ImdNav | null }) {
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
      const shell = result.container.querySelector('[data-imd-home-shell="true"]');
      const chooser = result.container.querySelector('[data-imd-space-chooser="true"]');
      expect(shell || chooser).not.toBeNull();
    });

    const enter = result.queryAllByText('ادخل');
    if (enter.length > 0) {
      fireEvent.click(enter[0]);
      await waitFor(() => {
        expect(
          result.container.querySelector('[data-imd-home-shell="true"]'),
        ).not.toBeNull();
      });
    }

    return result;
  }

  async function switchSection(container: HTMLElement) {
    const prev = container
      .querySelector('[data-imd-home-shell="true"]')
      ?.getAttribute('data-imd-space');
    fireEvent.click(screen.getByLabelText('تبديل القسم'));
    await waitFor(() => {
      const next = container
        .querySelector('[data-imd-home-shell="true"]')
        ?.getAttribute('data-imd-space');
      expect(next).not.toBe(prev);
    });
  }

  function shellMeta(container: HTMLElement) {
    const el = container.querySelector('[data-imd-home-shell="true"]');
    return {
      space: el?.getAttribute('data-imd-space') ?? '',
      accent: el?.getAttribute('data-imd-shell-accent') ?? '',
      side: el?.getAttribute('data-imd-shell-side') ?? '',
      isDark: el?.getAttribute('data-imd-shell-dark') === 'true',
    };
  }

  it('الافتراض: القسمان بهويّةٍ واحدة — أخضر الإمداد', async () => {
    // تطبيقٌ واحدٌ بهويّةٍ واحدة: تبديلُ القسم لا يقلب ألوان الأزرار والشارات
    // والروابط كلّها، فلا يبدو القسمان تطبيقَين.
    await ImdSectionTheme.set(false);
    const { container } = await enterShell();
    expect(shellMeta(container).accent).toBe(ImdColors.light.accent.hex);

    await switchSection(container);
    expect(shellMeta(container).accent).toBe(ImdColors.light.accent.hex);
    expect(shellMeta(container).side).toBe(ImdColors.light.side.hex);
  });

  it('لوحة المحروقات هي «الرئيسية»: لا تبويبة ولا عنوان كودي', async () => {
    // `fuelDashboard` كانت تُفتح صفحةً مستقلة لا بند لها في القائمة، فيسقط
    // عنوانها إلى معرّفها وتظهر تبويبةٌ باسم «fuelDashboard».
    const navRef: { current: ImdNav | null } = { current: null };
    const { container } = await enterShell(navRef);
    await switchSection(container);

    act(() => {
      navRef.current!.go('fuelDashboard');
    });

    await waitFor(() => {
      expect(navRef.current!.current).toBe('dash');
    });
    expect(
      container.querySelector(
        '[data-imd-page-host="host:fuel:dash"][data-imd-active="true"] [data-missing-screen="FuelDashboardScreen"]',
      ),
    ).not.toBeNull();
    expect(screen.queryByText('fuelDashboard')).toBeNull();

    const tabs = Array.from(
      container.querySelectorAll('[data-imd-topbar] [role="tablist"] [role="tab"]'),
    ).map((el) => el.textContent ?? '');
    expect(tabs.some((t) => t.includes('fuelDashboard'))).toBe(false);
    expect(tabs.some((t) => t.includes('الرئيسية'))).toBe(false);
    expect(tabs).toHaveLength(0);
  });

  it('بتمييز القسم من الإعدادات: المحروقات بلوحته البرتقالية', async () => {
    await ImdSectionTheme.set(true);
    const { container } = await enterShell();
    expect(shellMeta(container).accent).toBe(ImdColors.light.accent.hex);

    await switchSection(container);
    expect(shellMeta(container).accent).toBe(ImdColors.fuelLight.accent.hex);
    expect(shellMeta(container).accent).not.toBe(ImdColors.light.accent.hex);
    expect(shellMeta(container).side).toBe(ImdColors.fuelLight.side.hex);

    await switchSection(container);
    expect(shellMeta(container).accent).toBe(ImdColors.light.accent.hex);
  });

  // MISSING: lib/data/repos/fuel_repo.dart
  it.skip('التبديل لا يهدم تبويبات القسم الذي غادرناه ولا حالة صفحاته', () => {
    // يعتمد على تهيئة FuelRepo(db).settings() (المرحلة 13).
  });

  it('شريط التبويبات وشريط الحالة يتبعان القسم الظاهر', async () => {
    const { container } = await enterShell();
    fireEvent.click(screen.getAllByText('الأصناف')[0]);
    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-imd-topbar] [role="tablist"] [role="tab"]'),
      ).toHaveLength(1);
    });

    const tabTitles = () =>
      Array.from(
        container.querySelectorAll('[data-imd-topbar] [role="tablist"] [role="tab"]'),
      ).map((el) => (el.textContent ?? '').trim());

    expect(tabTitles()).toEqual(['الأصناف']);

    await switchSection(container);
    expect(tabTitles()).toEqual([]);
    expect(container.querySelectorAll('footer')).toHaveLength(1);

    await switchSection(container);
    expect(tabTitles()).toEqual(['الأصناف']);
  });

  it('اختيار القسم يُحفظ، والتبديل المباشر لا يمرّ بشاشة الاختيار', async () => {
    const { container } = await enterShell();
    await switchSection(container);
    expect(screen.queryByText('ادخل')).toBeNull();
    const prefs = await SharedPreferences.getInstance();
    expect(prefs.getString(`imdad.space.${auth.currentUser!.id}`)).toBe(
      AppSpace.fuel,
    );
  });

  it('الوضع الداكن مع تمييز القسم يطبّق لوحة المحروقات الداكنة', async () => {
    await ImdSectionTheme.set(true);
    imdTheme = new ImdTheme(ThemeMode.dark);
    const { container } = await enterShell();
    await switchSection(container);
    expect(shellMeta(container).accent).toBe(ImdColors.fuelDark.accent.hex);
    expect(shellMeta(container).isDark).toBe(true);
  });

  it('الوضع الداكن الموحَّد: المحروقات بداكن الإمداد', async () => {
    await ImdSectionTheme.set(false);
    imdTheme = new ImdTheme(ThemeMode.dark);
    const { container } = await enterShell();
    await switchSection(container);
    expect(shellMeta(container).accent).toBe(ImdColors.dark.accent.hex);
    expect(shellMeta(container).isDark).toBe(true);
  });
});
