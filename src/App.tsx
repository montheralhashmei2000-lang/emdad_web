import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { AppNames } from './core/app_names';
import { ErrorLogger } from './core/error_log';
import { AuthService, AuthServiceProvider } from './core/security/auth_service';
import { DeviceActivation } from './core/security/device_activation';
import { IdleLock } from './core/security/idle_lock';
import { AppTheme } from './core/theme/app_theme';
import {
  AppDatabaseContext,
  AppDatabaseProvider,
  ImdTheme,
  ImdThemeContext,
  ImdThemeDataProvider,
  ImdThemeProvider,
  ThemeMode,
  useAppDatabase,
  useImdColors,
  useImdTheme,
} from './core/theme/imd_theme';
import { ImdDensity } from './core/ui/imd_density';
import { ImdFonts } from './core/ui/imd_fonts';
import { ImdIcon } from './core/ui/imd_icon';
import { ImdKeyScroll } from './core/ui/imd_key_scroll';
import {
  ImdScreenActions,
  ImdScreenActionsProvider,
  ImdShortcuts,
} from './core/ui/imd_screen_actions';
import { ImdSectionTheme } from './core/ui/imd_section_theme';
import { ImdStyle } from './core/ui/imd_style';
import { ImdWindow } from './core/ui/imd_window';
import {
  ImdButton,
  ImdField,
  ImdPanel,
  showImdToast,
} from './core/ui/imd_widgets';
import { BackupScheduler } from './data/backup/backup_scheduler';
import { AppDatabase } from './data/db/app_database';
import { AuditRepo } from './data/repos/audit_repo';
import { CampLedgerRepo, SettlementResult } from './data/repos/camp_ledger_repo';
import { SettingsRepo } from './data/repos/settings_repo';
import { AutoSyncProvider, AutoSyncService } from './data/sync/auto_sync';
import { DomainDiagnostics } from './domain/diagnostics';
import { IdleLockHost } from './features/auth/idle_lock_host';
import { LoginScreen } from './features/auth/login_screen';
import { HomeShell } from './features/home/home_shell';

export {
  AppDatabaseContext,
  AppDatabaseProvider,
  ImdTheme,
  ImdThemeContext,
  ImdThemeDataProvider,
  ImdThemeProvider,
  ThemeMode,
  useAppDatabase,
  useImdTheme,
};

export const IdleLockContext = createContext<IdleLock | null>(null);

export function IdleLockProvider({
  lock,
  children,
}: {
  readonly lock: IdleLock;
  readonly children?: ReactNode;
}) {
  return createElement(IdleLockContext.Provider, { value: lock }, children);
}

export function useIdleLock(): IdleLock | null {
  return useContext(IdleLockContext);
}

export const BackupSchedulerContext = createContext<BackupScheduler | null>(null);

export function BackupSchedulerProvider({
  scheduler,
  children,
}: {
  readonly scheduler: BackupScheduler;
  readonly children?: ReactNode;
}) {
  return createElement(
    BackupSchedulerContext.Provider,
    { value: scheduler },
    children,
  );
}

export function useBackupScheduler(): BackupScheduler | null {
  return useContext(BackupSchedulerContext);
}

/// وجهة البوابة — مستخرَجة لتُختبر بلا واجهة.
export enum GateTarget {
  activation = 'activation',
  login = 'login',
}

/// القرار: هل على الجهاز حساب واحد على الأقل؟ إن كان فشاشة الدخول، وإلا فالبوابة.
///
/// [fresh] تعني **لا حساب على الجهاز إطلاقًا** (`AuthService.hasAnyUser`)، لا
/// «لا حساب محلي».
export function gateFor({ fresh }: { readonly fresh: boolean }): GateTarget {
  return fresh ? GateTarget.activation : GateTarget.login;
}

/// يربط [ErrorLogger] بسجل التدقيق (للحرجة) وبإشعار المستخدم (SnackBar).
export function wireErrorLogger(db: AppDatabase): void {
  ErrorLogger.sink = async (e) => {
    const summaryMsg =
      e.message.length > 160 ? `${e.message.substring(0, 160)}…` : e.message;
    await new AuditRepo(db).log({
      action: 'error.critical',
      entityType: 'نظام',
      summary: `${e.source}: ${summaryMsg}`,
      details: { source: e.source, type: e.type },
    });
  };
  ErrorLogger.userNotifier = (message) => {
    showImdToast(`⚠ ${message}`, { error: false });
  };
}

export interface BootResult {
  readonly db: AppDatabase;
  readonly auth: AuthService;
  readonly signedIn: boolean;
  readonly themeMode: ThemeMode;
  readonly fontFamily: string;
}

/// الإقلاع كاملًا (مقابل `boot()` في `lib/main.dart`).
///
/// ملاحظات المنصة (`// NOT-PORTED: ملف خاص بالجهاز الأصلي`):
/// - فحص `OwnerKey.isConfigured`، و`_keyPreflight` (`DbCipher`)، و`KeyRecoveryApp`،
///   و`KeyHardening`، و`_cleanupPlainBackups`، و`windowManager` خاصة بالجهاز الأصلي ولا
///   مقابل لها في المتصفح.
export async function boot(): Promise<BootResult> {
  const db = new AppDatabase();
  wireErrorLogger(db);
  ErrorLogger.installGlobalHandlers();
  DomainDiagnostics.sink = (source, error, stack) => {
    ErrorLogger.log(source, error, stack);
  };
  // «فرعٌ» هنا بمعنى: لا يُحدَّد عليه المالك محليًّا (M-15).
  const auth = new AuthService(db, {
    isBranchDevice: async () => !(await new DeviceActivation(db).mayAssignOwner()),
  });
  const restored = await auth.restoreSession();
  const identity = await new SettingsRepo(db).identity();

  if (typeof document !== 'undefined') {
    document.title = AppNames.title;
  }

  return {
    db,
    auth,
    signedIn: restored !== null,
    themeMode: ImdTheme.parse(identity.themePref),
    fontFamily: identity.fontFamily,
  };
}

export interface ImdadAppProps {
  readonly db: AppDatabase;
  readonly auth: AuthService;
  readonly signedIn: boolean;
  readonly themeMode?: ThemeMode;
  readonly fontFamily?: string;
}

const LOCK_CHECK_EVERY_MS = 10 * 60 * 1000;

export function ImdadApp({
  db,
  auth,
  signedIn: initialSignedIn,
  themeMode = ThemeMode.system,
  fontFamily = ImdFonts.defaultFamily,
}: ImdadAppProps) {
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;

  const mountedRef = useRef(true);
  const [, setThemeTick] = useState(0);

  const theme = useMemo(
    () => new ImdTheme(themeMode, fontFamily),
    [themeMode, fontFamily],
  );
  /// القفل التلقائي بعد الخمول — يعمل ما دام المستخدم مسجَّلًا.
  const idle = useMemo(() => new IdleLock(db), [db]);
  /// النسخ الاحتياطي المشفّر المجدول — يعمل في الخلفية ما دام التطبيق مفتوحًا.
  const backup = useMemo(() => new BackupScheduler(db), [db]);
  /// المزامنة التلقائية (محوّل ويب `// NOT-PORTED` متوقف محلياً).
  const autoSync = useMemo(() => new AutoSyncService(db), [db]);
  /// سجلّ إجراءات الشاشة النشطة لاختصارات لوحة المفاتيح — انظر [ImdScreenActions].
  const screenActions = useMemo(() => new ImdScreenActions(), []);

  const signOut = useCallback(async () => {
    idle.deactivate();
    await auth.logout();
    if (mountedRef.current) setSignedIn(false);
    await ImdWindow.login();
  }, [auth, idle]);

  const checkLock = useCallback(async () => {
    if (!signedInRef.current) return;
    const reason = await new DeviceActivation(db).lockReason();
    if (reason === null || !mountedRef.current || !signedInRef.current) return;
    await new AuditRepo(db).log({
      action: 'device.locked',
      entityType: 'جهاز',
      summary: `أُقفل الجهاز أثناء الجلسة — ${reason}`,
      risk: AuditRepo.riskHigh,
    });
    await signOut();
  }, [db, signOut]);

  useEffect(() => {
    mountedRef.current = true;
    // تفضيلات الشكل (نمط كلاسيكي/كثافة) قبل أول إطار ما أمكن.
    void ImdStyle.load();
    void ImdDensity.load();
    void ImdSectionTheme.load();
    // تنسيق الأرقام من القاعدة.
    void new SettingsRepo(db).loadNumbers().catch(() => {});

    // الإعداد يُقرأ من القاعدة ثم تبدأ المراقبة إن كانت الجلسة مستعادة.
    void idle.load().then(() => {
      if (mountedRef.current && signedInRef.current) idle.activate();
    });

    // بعد أول إطار: الإقلاع لا ينتظر الشبكة، وفشلها لا يمنع ظهور الواجهة.
    let wasSyncing = false;
    const afterSync = () => {
      const running = autoSync.isRunning;
      if (wasSyncing && !running) void checkLock();
      wasSyncing = running;
    };

    void checkLock();
    const lockTimer = setInterval(() => {
      void checkLock();
    }, LOCK_CHECK_EVERY_MS);

    autoSync.addListener(afterSync);
    autoSync.refresh();
    backup.start();

    // تصفية الشهر المنقضي إن أُذن بها — تتحقق بنفسها من الإذن وانقضاء الشهر.
    void new CampLedgerRepo(db)
      .autoSettleIfDue()
      .catch(() => new SettlementResult({ ok: false, error: '' }));

    ImdWindow.onBeforeExit = async () => {
      await Promise.all([
        autoSync.shutdown().catch(() => {}),
        auth.logout().catch(() => {}),
      ]);
    };

    const onThemeChange = () => {
      if (mountedRef.current) setThemeTick((t) => t + 1);
    };
    theme.addListener(onThemeChange);
    ImdStyle.notifier.addListener(onThemeChange);
    ImdDensity.addRebuildListener(onThemeChange);

    return () => {
      mountedRef.current = false;
      clearInterval(lockTimer);
      autoSync.removeListener(afterSync);
      theme.removeListener(onThemeChange);
      ImdStyle.notifier.removeListener(onThemeChange);
      ImdDensity.removeRebuildListener(onThemeChange);
      autoSync.dispose();
      idle.dispose();
      backup.dispose();
      theme.dispose();
    };
  }, [auth, autoSync, backup, checkLock, db, idle, theme]);

  // اختصارات لوحة المفاتيح العالمية (سطح المكتب).
  useEffect(() => {
    if (!ImdShortcuts.supported || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (screenActions.onRefresh) {
          e.preventDefault();
          screenActions.onRefresh();
        }
        return;
      }
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        if (screenActions.onSave) {
          e.preventDefault();
          screenActions.onSave();
        }
      } else if (k === 'p') {
        if (screenActions.onPrint) {
          e.preventDefault();
          screenActions.onPrint();
        }
      } else if (k === 'n') {
        if (screenActions.onNewDoc) {
          e.preventDefault();
          screenActions.onNewDoc();
        }
      } else if (k === 'k') {
        if (screenActions.onSearch) {
          e.preventDefault();
          screenActions.onSearch();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenActions]);

  const activeThemeData = theme.resolvedTheme();

  useEffect(() => {
    AppTheme.applyToDocument(activeThemeData);
  }, [activeThemeData]);

  const content = signedIn ? (
    <HomeShell onSignOut={signOut} />
  ) : (
    <DeviceGate
      db={db}
      auth={auth}
      onSignedIn={() => {
        void (async () => {
          await ImdWindow.main();
          idle.activate();
          if (mountedRef.current) setSignedIn(true);
        })();
      }}
    />
  );

  const locked = signedIn ? (
    <IdleLockHost
      lock={idle}
      auth={auth}
      onSignOut={signOut}
      colors={activeThemeData.tokens}
    >
      {content}
    </IdleLockHost>
  ) : (
    content
  );

  const body = ImdShortcuts.supported ? (
    <ImdKeyScroll className="h-screen w-full">{locked}</ImdKeyScroll>
  ) : (
    locked
  );

  return (
    <AppDatabaseProvider db={db}>
      <AuthServiceProvider value={auth}>
        <ImdScreenActionsProvider value={screenActions}>
          <ImdThemeProvider theme={theme}>
            <ImdThemeDataProvider data={activeThemeData}>
              <AutoSyncProvider service={autoSync}>
                <IdleLockProvider lock={idle}>
                  <BackupSchedulerProvider scheduler={backup}>
                    <div
                      dir="rtl"
                      lang="ar"
                      className="h-screen w-full"
                      style={{
                        backgroundColor: activeThemeData.tokens.bg.css,
                        color: activeThemeData.tokens.text.css,
                        fontFamily: activeThemeData.fontFamily,
                      }}
                    >
                      {body}
                    </div>
                  </BackupSchedulerProvider>
                </IdleLockProvider>
              </AutoSyncProvider>
            </ImdThemeDataProvider>
          </ImdThemeProvider>
        </ImdScreenActionsProvider>
      </AuthServiceProvider>
    </AppDatabaseProvider>
  );
}

export interface DeviceGateProps {
  readonly db: AppDatabase;
  readonly auth: AuthService;
  readonly onSignedIn: () => void;
}

/// بوابة الجهاز قبل تسجيل الدخول.
export function DeviceGate({ db, auth, onSignedIn }: DeviceGateProps) {
  const c = useImdColors();
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [lock, setLock] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    const isFresh = !(await auth.hasAnyUser());
    const lockReason = isFresh ? null : await new DeviceActivation(db).lockReason();
    if (!mountedRef.current) return;
    setFresh(isFresh);
    setLock(lockReason);
    setLoading(false);
    if (lockReason !== null) {
      await ImdWindow.main();
      return;
    }
    if (gateFor({ fresh: isFresh }) === GateTarget.activation) {
      await ImdWindow.main();
    } else {
      await ImdWindow.login();
    }
  }, [auth, db]);

  useEffect(() => {
    mountedRef.current = true;
    void check();
    return () => {
      mountedRef.current = false;
    };
  }, [check]);

  if (loading) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center"
        style={{ backgroundColor: c.bg.css }}
      >
        <div
          role="progressbar"
          aria-label="جارٍ التحقق"
          className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
          style={{
            borderColor: c.accent.css,
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  if (lock !== null) {
    // NOT-PORTED: ملف خاص بالجهاز الأصلي (lib/features/auth/activation_lock_screen.dart)
    return (
      <div
        className="flex h-screen w-full items-center justify-center p-6"
        style={{ backgroundColor: c.bg.css }}
      >
        <div className="w-full max-w-md">
          <ImdPanel title="الجهاز مقفل" colors={c}>
            <p className="text-sm" style={{ color: c.text2.css }}>
              {lock}
            </p>
          </ImdPanel>
        </div>
      </div>
    );
  }

  if (gateFor({ fresh }) === GateTarget.activation) {
    // NOT-PORTED: بديل ويب عن DeviceActivationScreen (lib/features/settings/device_activation_screen.dart)
    return (
      <WebFirstAdminInitPanel
        auth={auth}
        onActivated={() => {
          void check();
        }}
      />
    );
  }

  return <LoginScreen db={db} auth={auth} onSignedIn={onSignedIn} colors={c} />;
}

// NOT-PORTED: بديل ويب عن DeviceActivationScreen — يستدعي AuthService.createAdmin فقط
// لتهيئة أول حساب مدير في قاعدة المتصفح الجديدة دون اختراع قواعد أو مفاتيح تفعيل.
function WebFirstAdminInitPanel({
  auth,
  onActivated,
}: {
  readonly auth: AuthService;
  readonly onActivated: () => void;
}) {
  const c = useImdColors();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await auth.createAdmin({
        username: username.trim(),
        password,
        name: name.trim() || undefined,
      });
      onActivated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      dir="rtl"
      data-imd-web-first-admin="true"
      className="flex min-h-screen w-full items-center justify-center p-6"
      style={{ backgroundColor: c.bg.css }}
    >
      <div className="w-full max-w-[440px]">
        <ImdPanel title="تهيئة جهاز الإدارة" colors={c}>
          <div className="mb-4 flex items-center gap-2 text-xs" style={{ color: c.muted.css }}>
            <ImdIcon name="shield" size={16} color={c.accent} />
            <span>{AppNames.ui} — إنشاء أول حساب مدير للنظام على المتصفح</span>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
            <ImdField
              label="الاسم الكامل"
              value={name}
              onChanged={setName}
              colors={c}
            />
            <ImdField
              label="اسم المستخدم"
              value={username}
              required={true}
              onChanged={setUsername}
              colors={c}
            />
            <ImdField
              label="كلمة المرور"
              value={password}
              required={true}
              obscure={true}
              onChanged={setPassword}
              colors={c}
            />
            {error.length > 0 && (
              <div
                role="alert"
                className="rounded-lg px-3 py-2 text-xs font-medium"
                style={{
                  backgroundColor: c.dangerSoft.css,
                  color: c.danger.css,
                }}
              >
                {error}
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <ImdButton
                label="إنشاء حساب المدير"
                icon="check"
                busy={busy}
                onPressed={() => {
                  const fakeEvent = { preventDefault() {} } as FormEvent;
                  void handleSubmit(fakeEvent);
                }}
                colors={c}
              />
            </div>
          </form>
        </ImdPanel>
      </div>
    </div>
  );
}

/// الجذر التشغيلي للتطبيق في المتصفح — يُقلع القاعدة والهوية والجلسة عبر [boot].
export default function App() {
  const [booted, setBooted] = useState<BootResult | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void boot()
      .then((res) => {
        if (active) setBooted(res);
      })
      .catch((err) => {
        if (active) {
          setBootError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (bootError !== null) {
    return (
      <div
        dir="rtl"
        lang="ar"
        className="flex h-screen w-full items-center justify-center p-6"
      >
        <div role="alert" className="max-w-md text-center text-sm font-semibold">
          {`تعذّر تشغيل النظام: ${bootError}`}
        </div>
      </div>
    );
  }

  if (booted === null) {
    return (
      <div
        dir="rtl"
        lang="ar"
        className="flex h-screen w-full items-center justify-center"
      >
        <div
          role="progressbar"
          aria-label="جارٍ تشغيل النظام"
          className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <ImdadApp
      db={booted.db}
      auth={booted.auth}
      signedIn={booted.signedIn}
      themeMode={booted.themeMode}
      fontFamily={booted.fontFamily}
    />
  );
}
