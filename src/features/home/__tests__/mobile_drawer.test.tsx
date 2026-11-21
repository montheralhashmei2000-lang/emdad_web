// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
import { ImdSizes } from '../../../core/ui/imd_tokens';
import { AppDatabase } from '../../../data/db/app_database';
import { NativeDatabase } from '../../../data/db/sqlite_driver';
import { AutoSyncProvider, AutoSyncService } from '../../../data/sync/auto_sync';
import { AppSpace } from '../../../domain/app_space';
import { HomeShell } from '../home_shell';

/// درج الجوال يلتزم بالشاشة.
///
/// كان عرضه ثابتًا على [ImdSizes.sideWidth] — وهو مقاس **سطح المكتب** (٢٩٠):
/// يبتلع ٨٠٪ من هاتفٍ عرضه ٣٦٠ و٩٠٪ من هاتفٍ عرضه ٣٢٠، فلا يبقى خلفه ما
/// يُذكّر بالصفحة المفتوحة. وكانت القائمة داخله تفرض العرض نفسه على نفسها،
/// فلو ضاق الدرج فاضت. ولا حشوة لشريط الحالة، فيبدأ أولُ بندٍ تحت ساعة النظام.
describe('mobile_drawer_test', () => {
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
    await auth.createAdmin({ username: 'admin', password: 'Test@12345' });
    await auth.login('admin', 'Test@12345');
    SharedPreferences.setMockInitialValues({
      [`imdad.space.${auth.currentUser!.id}`]: AppSpace.supply,
    });
  });

  afterEach(async () => {
    cleanup();
    autoSync.dispose();
    imdTheme.dispose();
    await db.close();
  });

  async function openDrawer(width: number, statusBar = 0) {
    const result = render(
      <AppDatabaseProvider db={db}>
        <AuthServiceProvider value={auth}>
          <ImdScreenActionsProvider value={screenActions}>
            <AutoSyncProvider service={autoSync}>
              <ImdThemeProvider theme={imdTheme}>
                <HomeShell
                  viewportWidth={width}
                  topInset={statusBar}
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

    fireEvent.click(screen.getAllByText('المزيد')[0]);

    let drawer!: HTMLElement;
    await waitFor(() => {
      const el = result.container.querySelector(
        '[data-imd-drawer="true"]',
      ) as HTMLElement | null;
      expect(el).not.toBeNull();
      drawer = el!;
    });

    const drawerWidth = parseFloat(drawer.style.width);
    return { drawer, drawerWidth, container: result.container };
  }

  describe('عرض الدرج يتبع عرض الشاشة', () => {
    it('هاتف ٣٦٠: الدرج لا يبتلع الشاشة ويبقى خلفه أثرٌ منها', async () => {
      const { drawerWidth } = await openDrawer(360);
      expect(drawerWidth).toBeLessThan(360 * 0.9);
      expect(drawerWidth).toBeCloseTo(360 * 0.76, 0);
    });

    it('هاتف صغير ٣٢٠: يضيق معه ولا يفيض', async () => {
      const { drawer, drawerWidth } = await openDrawer(320);
      expect(drawerWidth).toBeCloseTo(320 * 0.76, 0);
      const aside = drawer.querySelector('aside') as HTMLElement;
      expect(aside).not.toBeNull();
      // القائمة داخل الدرج تملؤه ولا تفرض عرض سطح المكتب (290px).
      expect(aside.style.width).toBe('100%');
    });

    it('لوحيّ ٨٠٠: يقف عند مقاس سطح المكتب ولا يتمدّد', async () => {
      const { drawerWidth } = await openDrawer(800);
      expect(drawerWidth).toBe(ImdSizes.sideWidth);
    });
  });

  it('حشوةٌ لشريط الحالة: أوّل بندٍ لا يقع تحت ساعة النظام', async () => {
    const { drawer } = await openDrawer(360, 36);
    const home = within(drawer).getByText('الرئيسية');
    expect(home).not.toBeNull();
    const aside = drawer.querySelector('aside') as HTMLElement;
    expect(aside).not.toBeNull();
    expect(parseFloat(aside.style.paddingTop)).toBeGreaterThanOrEqual(36);
  });
});
