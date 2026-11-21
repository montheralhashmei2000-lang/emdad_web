// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService, AuthServiceProvider } from '../../../core/security/auth_service';
import { Perm } from '../../../core/security/perm';
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
import { ImdSizes } from '../../../core/ui/imd_tokens';
import { AppDatabase } from '../../../data/db/app_database';
import { NativeDatabase } from '../../../data/db/sqlite_driver';
import { SettingsRepo } from '../../../data/repos/settings_repo';
import { AutoSyncProvider, AutoSyncService } from '../../../data/sync/auto_sync';
import { AppSpace } from '../../../domain/app_space';
import { HomeShell, type ImdNav } from '../home_shell';

/// القشرة الرئيسية.
///
/// **لم تكن مختبَرة، فمرّ فيها عطلٌ أسقط الشريط كلّه**: بابٌ في القائمة يشير
/// إلى صلاحيةٍ تحمل اسمه، ففحصُ الصلاحية استدعى نفسه بلا نهاية وفاض المكدّس.
/// وفي نسخة الإصدار لا تظهر رسالة — مستطيلٌ رماديٌّ مكان الشريط وحسب.
///
/// وهذه الاختبارات تبني القشرة فعلًا: بناؤها وحده كان يكفي لكشفه.
describe('home_shell_test', () => {
  let db: AppDatabase;
  let auth: AuthService;
  // الشريط العلوي يقرأ حالة المزامنة، فلا تُبنى القشرة بلا هذه الخدمة.
  // تُنشأ ولا تُشغَّل: بلا `refresh()` لا مؤقّت ولا منفذ، وحالتها الابتدائية
  // (متوقفة، بلا آخر مزامنة) هي ما يعرضه الشريط.
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
    // المدير يملك القسمين، فتُعرض عليه شاشة الاختيار أولًا. وحفظُ تفضيله
    // يدخلنا القشرة مباشرةً — وهي موضع الاختبار.
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

  async function renderShell(
    width = 1600,
    navRef?: { current: ImdNav | null },
  ) {
    const result = render(
      <AppDatabaseProvider db={db}>
        <AuthServiceProvider value={auth}>
          <ImdScreenActionsProvider value={screenActions}>
            <AutoSyncProvider service={autoSync}>
              <ImdThemeProvider theme={imdTheme}>
                <HomeShell
                  viewportWidth={width}
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

  it('تُبنى بلا انهيار', async () => {
    const { container } = await renderShell(1600);
    expect(container.querySelector('[data-imd-home-shell="true"]')).not.toBeNull();
    // الشريط الواحد: لا اسم نظامٍ مكرَّر ولا شارة «IAM محمي» على سطح المكتب.
    expect(screen.queryByText('نظام الإمداد والتموين')).toBeNull();
    expect(screen.queryByText('IAM محمي')).toBeNull();
  });

  it('سطح المكتب: شريطٌ علويٌّ واحد يضم التبويبات والأدوات', async () => {
    const { container } = await renderShell(1600);

    // الرئيسية تُفتح من الشريط الجانبي: لا تبويبة لها في الشريط العلوي.
    const tablist = container.querySelector('[role="tablist"]') as HTMLElement;
    expect(tablist).not.toBeNull();
    expect(within(tablist).queryByText('الرئيسية')).toBeNull();

    // زرّ الطيّ والأدوات (القسم، السمة، الجرس) في الصفّ نفسه.
    const desktopBar = container.querySelector(
      'header[data-imd-topbar="desktop"]',
    ) as HTMLElement;
    expect(desktopBar).not.toBeNull();
    expect(parseFloat(desktopBar.style.height)).toBe(ImdSizes.desktopBarHeight);
    expect(within(desktopBar).getByTitle('طيّ القائمة')).not.toBeNull();
    expect(
      desktopBar.querySelector('[data-imd-notification-bell="true"]'),
    ).not.toBeNull();

    // ولا شريط تبويباتٍ مستقلّ تحت الشريط العلوي.
    const standaloneTabBars = Array.from(container.querySelectorAll('div')).filter(
      (el) => el.style.height === '38px' && el.querySelector('[role="tablist"]'),
    );
    expect(standaloneTabBars).toHaveLength(0);
  });

  it('زرّ الطيّ يحوّل القائمة الكاملة إلى أيقوناتٍ ويعيدها', async () => {
    await renderShell(1600);
    expect(screen.getAllByText('العمليات المخزنية').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTitle('طيّ القائمة'));
    await waitFor(() => {
      expect(screen.queryByText('العمليات المخزنية')).toBeNull();
      expect(screen.getByTitle('توسيع القائمة')).not.toBeNull();
    });

    fireEvent.click(screen.getByTitle('توسيع القائمة'));
    await waitFor(() => {
      expect(screen.getAllByText('العمليات المخزنية').length).toBeGreaterThan(0);
    });
  });

  it('الشريط يُبنى بأبوابه بعد اختيار القسم', async () => {
    await renderShell(1600);
    expect(screen.getAllByText('العمليات المخزنية').length).toBeGreaterThan(0);
    expect(screen.getAllByText('التقارير').length).toBeGreaterThan(0);
  });

  it('فحص الصلاحية لا يتكرر إلى ما لا نهاية', async () => {
    const { container } = await renderShell(1600);
    // المدير يملك كل شيء، فيمرّ الفحص على كل بندٍ في القائمة — وهو الطريق
    // الذي فاض عنده المكدّس.
    expect(container.querySelectorAll('[data-imd-home-shell="true"]')).toHaveLength(1);
  });

  describe('القشرة تتبع عرضها', () => {
    it('العريضة: شريطٌ كامل بأسماء أقسامه', async () => {
      const { container } = await renderShell(1600);
      expect(screen.getAllByText('العمليات المخزنية').length).toBeGreaterThan(0);
      expect(container.querySelector('[data-imd-bottom-nav="true"]')).toBeNull();
    });

    it('المتوسطة: قضيبٌ بالأيقونات بلا أسماء', async () => {
      // ٢٩٠ بكسل من قائمة تأكل ثلث لوحيّ عرضه ألف.
      const { container } = await renderShell(1000);
      expect(container.querySelector('[data-imd-sidebar="rail"]')).not.toBeNull();
      expect(screen.queryByText('العمليات المخزنية')).toBeNull();

      // الأقسام الرئيسية وحدها تظهر أيقوناتٍ (اسمها في Semantics والتلميح)، وأبوابها
      // الفرعية لا تُرسم حتى تُفتح قائمة القسم.
      expect(screen.getAllByLabelText('العمليات المخزنية').length).toBeGreaterThan(0);
      expect(screen.queryByLabelText('استلام')).toBeNull();

      // نقرة أيقونة القسم تفتح قائمةً بأبوابه، واختيار بابٍ يفتح شاشته.
      fireEvent.click(screen.getAllByTitle('العمليات المخزنية')[0]);
      await waitFor(() => {
        expect(screen.getAllByText('استلام').length).toBeGreaterThan(0);
      });
      const receiveItems = screen.getAllByText('استلام');
      fireEvent.click(receiveItems[receiveItems.length - 1]);
      await waitFor(() => {
        expect(
          container.querySelector('[data-imd-page-host="host:supply:receive"]'),
        ).not.toBeNull();
      });
    });

    it('اليدوية: شريطٌ سفليّ ودرج', async () => {
      const { container } = await renderShell(700);
      // الإبهام لا يبلغ أعلى الشاشة، فأشهر الأبواب أسفلها.
      expect(container.querySelector('[data-imd-bottom-nav="true"]')).not.toBeNull();
      expect(screen.getAllByText('المزيد').length).toBeGreaterThan(0);
      expect(screen.getAllByText('الرئيسية').length).toBeGreaterThan(0);
    });
  });

  it('الدرج على الجوال يفتح شاشة البند المختار ويُغلق بلا سؤال خروج', async () => {
    const { container } = await renderShell(700);

    fireEvent.click(screen.getAllByText('المزيد')[0]);
    let drawer!: HTMLElement;
    await waitFor(() => {
      const el = container.querySelector(
        '[data-imd-drawer="true"]',
      ) as HTMLElement | null;
      expect(el).not.toBeNull();
      drawer = el!;
    });

    fireEvent.click(within(drawer).getByText('الأصناف'));

    await waitFor(() => {
      expect(container.querySelector('[data-imd-drawer="true"]')).toBeNull();
      expect(screen.getAllByText('إدارة الأصناف').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('إغلاق النظام؟')).toBeNull();
  });

  it('زرّ الرجوع والدرج مفتوح يغلق الدرج ولا يغادر الشاشة', async () => {
    const { container } = await renderShell(700);

    fireEvent.click(screen.getAllByText('المزيد')[0]);
    await waitFor(() => {
      expect(container.querySelector('[data-imd-drawer="true"]')).not.toBeNull();
    });

    await act(async () => {
      window.dispatchEvent(new Event('imd:poproute'));
    });

    await waitFor(() => {
      expect(container.querySelector('[data-imd-drawer="true"]')).toBeNull();
    });
    expect(screen.queryByText('إغلاق النظام؟')).toBeNull();
  });

  describe('الإعدادات بندٌ واحد في القائمة', () => {
    it('لا بنود مستقلة للهوية والتفعيل والمزامنة والمستخدمين', async () => {
      await renderShell(1600);

      // القسم مفتوحٌ في الشريط ليظهر ما تحته.
      fireEvent.click(screen.getAllByText('الإعدادات')[0]);
      await waitFor(() => {
        expect(screen.getAllByText('الإعدادات العامة').length).toBeGreaterThan(0);
      });

      for (const gone of [
        'بيانات الجهة والشعار',
        'رأس وتذييل النماذج',
        'تفعيل الأجهزة',
        'التحقق من التوقيع',
        'مزامنة الأجهزة',
        'مركز الصلاحيات والوصول',
      ]) {
        expect(screen.queryByText(gone)).toBeNull();
      }
    });

    // MISSING: lib/features/settings/settings_screen.dart
    it.skip('المعرّفات القديمة تفتح الإعدادات على القسم نفسه', () => {
      // يعتمد على نص «معرّف هذا الجهاز» من شاشة SettingsScreen الفعلية (المرحلة 20).
    });
  });

  it('الشريط الجانبي لا يفيض أثناء طيّ الأقسام وفتحها', async () => {
    await renderShell(1600);

    const tapSection = async (name: string) => {
      fireEvent.click(screen.getAllByText(name)[0]);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
    };

    await tapSection('العمليات المخزنية');
    await tapSection('التقارير'); // تبديلٌ: أحدهما يُطوى والآخر يُفتح.
    await tapSection('العمليات المخزنية');
    await tapSection('العمليات المخزنية'); // طيٌّ بلا فتح.
    expect(screen.getAllByText('العمليات المخزنية').length).toBeGreaterThan(0);
  });

  it('تبديل القسم بالفأرة لا ينهار في نافذة عريضة', async () => {
    const { container } = await renderShell(1600);

    const clickSwitch = async () => {
      const btn = screen.getAllByLabelText('تبديل القسم')[0];
      fireEvent.mouseEnter(btn);
      fireEvent.mouseDown(btn);
      fireEvent.mouseUp(btn);
      fireEvent.click(btn);
    };

    // التبديل مباشرٌ إلى القسم الآخر (المحروقات) دون المرور بشاشة الاختيار.
    await clickSwitch();
    await waitFor(() => {
      const shell = container.querySelector('[data-imd-home-shell="true"]');
      expect(shell?.getAttribute('data-imd-space')).toBe(AppSpace.fuel);
    });
    expect(screen.queryByText('ادخل')).toBeNull();

    // والعودة إلى الإمداد بنقرةٍ ثانية بلا خطأ في تخطيط ولا في تتبّع الفأرة.
    await clickSwitch();
    await waitFor(() => {
      const shell = container.querySelector('[data-imd-home-shell="true"]');
      expect(shell?.getAttribute('data-imd-space')).toBe(AppSpace.supply);
    });
    expect(screen.queryByText('ادخل')).toBeNull();
  });

  it('كل صلاحية معرَّفة لها تسمية', () => {
    // تسميةٌ ناقصة تعني بندًا لا يظهر إلا للمدير بلا قصد.
    for (const key of Object.keys(Perm.labels)) {
      expect((Perm.labels[key] ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it('بطاقة المستخدم أسفل الشريط الجانبي: خروجٌ فقط، بلا صورة ولا اسم ولا دور', async () => {
    await renderShell(1600);

    // الخروج باقٍ في الشريط الجانبي. والاسم يبقى ظاهرًا مرةً واحدة فقط —
    // في كبسولة الشريط العلوي التي لم تُمَسّ — لا مكرَّرًا في بطاقةٍ أسفل
    // القائمة أيضًا. أمّا الجهاز والدور («كمبيوتر»/«مدير النظام») فكانا
    // حصرًا في تلك البطاقة المحذوفة، فيغيبان كليًّا.
    expect(screen.getAllByText('تسجيل خروج')).toHaveLength(1);
    expect(screen.getAllByText('admin')).toHaveLength(1);
    expect(screen.queryByText(/مدير النظام/)).toBeNull();
    expect(screen.queryByText(/كمبيوتر/)).toBeNull();
    expect(screen.queryByText(/جوال/)).toBeNull();
  });

  it('الشريط العلوي: اسم القسم ظاهرٌ، وزرّ تبديل السمة موجود', async () => {
    await renderShell(1600);

    expect(screen.getAllByText(AppSpace.label(AppSpace.supply))).toHaveLength(1);
    expect(screen.getAllByTitle('الوضع الداكن')).toHaveLength(1);
  });

  it('زرّ تبديل السمة يبدّل السطوع الفعلي ويحفظه', async () => {
    const { container } = await renderShell(1600);
    const shell = () => container.querySelector('[data-imd-home-shell="true"]');
    expect(shell()?.getAttribute('data-imd-shell-dark')).toBe('false');

    fireEvent.click(screen.getByTitle('الوضع الداكن'));

    await waitFor(async () => {
      expect(shell()?.getAttribute('data-imd-shell-dark')).toBe('true');
      expect(imdTheme.mode).toBe(ThemeMode.dark);
      expect((await new SettingsRepo(db).identity()).themePref).toBe('dark');
    });
  });

  describe('الصفحات المفتوحة وشريط الحالة', () => {
    it('سطح المكتب: شريط تبويبات وشريط حالة بالوقت والاتصال', async () => {
      const { container } = await renderShell(1600);
      expect(container.querySelectorAll('[role="tablist"]')).toHaveLength(1);
      const statusBar = container.querySelector('footer') as HTMLElement;
      expect(statusBar).not.toBeNull();
      expect(screen.getAllByText(/المزامنة متوقفة/).length).toBeGreaterThan(0);

      // «كلاسيكي» و«كثافة عالية» خرجا من شريط الحالة: مصدرهما الإعدادات ▸
      // «المظهر والعرض» وحدها.
      expect(within(statusBar).queryByText('كثافة عالية')).toBeNull();
      expect(within(statusBar).queryByText('كلاسيكي')).toBeNull();
    });

    it('فتح شاشةٍ يضيف تبويبة، والعودة تُبقي حالة الأولى', async () => {
      const { container } = await renderShell(1600);

      // القسم الأول مفتوح: «الأصناف».
      fireEvent.click(screen.getAllByText('الأصناف')[0]);
      await waitFor(() => {
        expect(container.querySelectorAll('[data-imd-page-host]')).toHaveLength(2);
      });

      fireEvent.click(screen.getAllByText('الرئيسية')[0]);
      await waitFor(() => {
        expect(container.querySelectorAll('[data-imd-page-host]')).toHaveLength(2);
      });
    });

    it('إغلاق تبويبة يُسقط صفحتها ولا تُغلق الأخيرة', async () => {
      const { container } = await renderShell(1600);

      fireEvent.click(screen.getAllByText('الأصناف')[0]);
      await waitFor(() => {
        expect(container.querySelectorAll('[data-imd-page-host]')).toHaveLength(2);
      });

      // زر × للتبويبة الظاهرة — مسمًّى باسم صفحته.
      fireEvent.click(screen.getByLabelText('إغلاق «الأصناف»'));
      await waitFor(() => {
        expect(container.querySelectorAll('[data-imd-page-host]')).toHaveLength(1);
      });
    });

    it('الجوال: لا شريط تبويبات ولا شريط حالة وصفحةٌ واحدة', async () => {
      const { container } = await renderShell(700);
      expect(container.querySelector('[role="tablist"]')).toBeNull();
      expect(container.querySelector('footer')).toBeNull();
      expect(container.querySelectorAll('[data-imd-page-host]')).toHaveLength(1);
    });
  });
});
