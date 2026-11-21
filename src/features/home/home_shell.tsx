import {
  createContext,
  createElement,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuthService, type AuthService } from '../../core/security/auth_service';
import { SharedPreferences } from '../../core/security/shared_prefs';
import { AppTheme, type ImdThemeData } from '../../core/theme/app_theme';
import {
  ImdThemeDataProvider,
  useAppDatabase,
  useImdTheme,
} from '../../core/theme/imd_theme';
import { ImdDensity } from '../../core/ui/imd_density';
import { ImdFonts } from '../../core/ui/imd_fonts';
import { arDigits } from '../../core/ui/imd_format';
import { ImdDirtyFlag, ImdPageDirty } from '../../core/ui/imd_page_dirty';
import { ImdOpenPage, ImdPageHost } from '../../core/ui/imd_page_tabs';
import {
  ImdScreenActions,
  useImdScreenActions,
} from '../../core/ui/imd_screen_actions';
import { ImdSectionTheme } from '../../core/ui/imd_section_theme';
import { ImdRecordSink, ImdStatusBar } from '../../core/ui/imd_status_bar';
import { ImdStyle } from '../../core/ui/imd_style';
import { ImdSizes } from '../../core/ui/imd_tokens';
import { ImdWindow } from '../../core/ui/imd_window';
import { imdConfirm, showImdToast } from '../../core/ui/imd_widgets';
import { TableUpdateQuery } from '../../data/db/sqlite_driver';
import { ReportId } from '../../data/repos/reports_repo';
import { useAutoSync } from '../../data/sync/auto_sync';
import {
  AccessControl,
  PermAction,
  SysPerm,
  UserRole,
  type PermissionMap,
} from '../../domain/access_control';
import { AppSpace } from '../../domain/app_space';
import { kMenuDoors, menuDoorAllows } from '../../domain/menu_doors';
import { SectionBlock } from '../../domain/section_block';
import {
  AssetsScreen,
  BalancesScreen,
  CablesScreen,
  DashboardScreen,
  DestructionScreen,
  ElectronicArchiveScreen,
  FuelAllocationsScreen,
  FuelConsumptionScreen,
  FuelDailyReportScreen,
  FuelDashboardScreen,
  FuelDataScreen,
  FuelLedgerScreen,
  FuelMovesScreen,
  FuelOfficialReportScreen,
  FuelPlanVsIssuedScreen,
  FuelReportsHubScreen,
  FuelSettingsScreen,
  FuelStocksReportScreen,
  FuelStocktakeScreen,
  FuelUnitsScreen,
  FuelVehiclesScreen,
  FuelWarehousesScreen,
  IssueScreen,
  KitchenLogScreen,
  LinkArmamentScreen,
  LinkFinancesScreen,
  MealDispatchScreen,
  MealPlanScreen,
  OpeningScreen,
  PendingScreen,
  PersonnelStrengthScreen,
  RationOrderScreen,
  RatiosScreen,
  ReceiveScreen,
  ReportsCenterScreen,
  ReturnsScreen,
  SettingsScreen,
  showSearchModal,
  StockAlertsScreen,
  StocktakeScreen,
  StrengthScreen,
  TransferScreen,
} from './pending_screens_stubs';
import { ItemsScreen } from '../catalog/items_screen';
import { KitchensScreen } from '../catalog/kitchens_screen';
import { SuppliersScreen } from '../catalog/suppliers_screen';
import { UnitsScreen } from '../catalog/units_screen';
import { WarehousesScreen } from '../catalog/warehouses_screen';
import { HomeShellBottomNav } from './shell/home_shell_bottom_nav';
import {
  homeShellMenu,
  kPageAliases,
  kSettingsSections,
  menuPageOf,
} from './shell/home_shell_menu';
import {
  HomeShellNoAccess,
  HomeShellSoon,
} from './shell/home_shell_placeholders';
import {
  HomeShellSidebar,
  HomeShellSideSplitter,
} from './shell/home_shell_sidebar';
import {
  HomeShellDesktopBar,
  HomeShellTopbar,
} from './shell/home_shell_topbar';
import { SpaceChooserScreen } from './space_chooser_screen';
import {
  CampAccountsScreen,
  SupplyAuditScreen,
  SupplyDailyScreen,
  SupplyDataScreen,
  SupplyMovesScreen,
  SupplyOrdersScreen,
  SupplyReportsScreen,
} from './supply_groups';

export { kPageAliases, kSettingsSections };

/// التنقل بين الشاشات من داخل أي شاشة.
export class ImdNav {
  private readonly _go: (page: string) => void;
  private readonly _current: () => string;

  constructor(go: (page: string) => void, current: () => string) {
    this._go = go;
    this._current = current;
  }

  go(page: string): void {
    this._go(page);
  }

  get current(): string {
    return this._current();
  }
}

export const ImdNavContext = createContext<ImdNav | null>(null);

export function ImdNavProvider({
  nav,
  children,
}: {
  readonly nav: ImdNav;
  readonly children?: ReactNode;
}) {
  return createElement(ImdNavContext.Provider, { value: nav }, children);
}

export function useImdNav(): ImdNav | null {
  return useContext(ImdNavContext);
}

/// عتبات القشرة الثلاث.
///
/// **الشاشة الواحدة تعمل على شاشتين مختلفتين تمامًا**: حاسبُ الشعبة وجهازُ
/// أمين المستودع في يده. والفرق ليس في الحجم وحده — على الحاسب فأرةٌ ووقت،
/// وفي اليد إبهامٌ وعجلة.
const SHELL_BP = {
  /// فوقها شريطٌ جانبيّ كامل بأقسامه وأسمائه.
  wide: 1150,
  /// بينها و[wide] شريطٌ ضيّق بالأيقونات وحدها: ٢٩٠ بكسل تأكل ثلث لوحيّ
  /// عرضه ألف، وسبعون منها تكفي للتنقّل.
  rail: 900,
} as const;

const SIDE_MIN = 220;
const SIDE_MAX = 420;
const SIDE_KEY = 'imdad.sideWidth';
const COLLAPSED_KEY = 'imdad.sideCollapsed';
const MAX_OPEN = 8;

/// صفحات بلا صلاحية خاصة بها تتبع صلاحية صفحة أخرى، فلا يلزم تعديل الأدوار.
const PERM_PAGE: Readonly<Record<string, string>> = {
  lanSync: SysPerm.sync,
  stockAlerts: 'balances',
  // بنود الحركة الأربعة شاشةٌ واحدة بتبويبات، فصلاحيتها واحدة.
  fuelIssue: 'fuelMoves',
  fuelSupply: 'fuelMoves',
  fuelTransfer: 'fuelMoves',
  fuelOpening: 'fuelMoves',
  // والتقارير الستة تحت صلاحية التقارير، عدا الاستهلاك فله صلاحيته.
  fuelDaily: 'fuelReports',
  fuelOfficial: 'fuelReports',
  fuelStocks: 'fuelReports',
  fuelLedger: 'fuelReports',
  fuelPlanVsIssued: 'fuelReports',
  // بنود إدارة الجرد الخمسة شاشةٌ واحدة بتبويبات داخلية، فصلاحيتها واحدة.
  stocktakeCreate: 'stocktake',
  stocktakeCount: 'stocktake',
  stocktakeAnalysis: 'stocktake',
  stocktakeSettle: 'stocktake',
  stocktakeHistory: 'stocktake',
  // أربعة من تقارير «مركز التقارير» فُكِّكت إلى بنودٍ مباشرة؛ صلاحيتها صلاحية
  // المركز نفسه — الفلترة بين التقارير تنظيمٌ للقائمة لا توسيعٌ للأذونات.
  reportMoves: 'reports',
  reportUnitAccount: 'reports',
  reportStock: 'reports',
  reportConsumption: 'reports',
  reportStrength: 'reports',
  reportKitchen: 'reports',
  reportSupplier: 'reports',
  reportReturns: 'reports',
  reportDaily: 'reports',
  reportMealDispatch: 'reports',
  // صرف الوجبات سند صرفٍ للمطبخ: صلاحيته صلاحية الصرف نفسها (والتنفيذ «اعتماد»).
  mealDispatch: 'issue',
  // شاشتا المالية والتسليح صلاحيتهما صلاحية «الارتباطات» نفسها.
  linkFinances: 'linkages',
  linkArmament: 'linkages',
};

/// حالة تبويبات قسمٍ واحد.
class SpaceState {
  page = 'dash';
  readonly open: string[] = ['dash'];
  readonly gen: Record<string, number> = {};
  readonly sinks = new Map<string, ImdRecordSink>();
  /// خانة إجراءات (Ctrl+S…) لكل صفحة مفتوحة — انظر [ImdScreenActions.delegate].
  readonly actions = new Map<string, ImdScreenActions>();
  readonly stale = new Set<string>();
  /// علامة «عدّل المستخدم شيئًا» لكل صفحةٍ مفتوحة ([ImdPageDirty]).
  readonly dirty = new Map<string, ImdDirtyFlag>();
  openSec: string | null;

  constructor(space: string) {
    this.openSec = space === AppSpace.fuel ? 'fuelMoves' : 'basic';
  }
}

/// صفحات تُفتح باسمٍ آخر. «لوحة المحروقات» هي «الرئيسية» في قسم المحروقات
/// (`_pageBody('dash', fuel)`)، فلا تُفتح تبويبةً مستقلة باسمها الكودي.
function canonicalPage(page: string): string {
  return page === 'fuelDashboard' ? 'dash' : (kPageAliases[page] ?? page);
}

function titleOfPage(page: string): string {
  if (canonicalPage(page) === 'dash') return 'الرئيسية';
  const id = menuPageOf(page);
  for (const sec of homeShellMenu) {
    for (const it of sec.items) {
      if (it.id === id) return it.name;
    }
  }
  return page;
}

function iconOfPage(page: string): string | undefined {
  if (canonicalPage(page) === 'dash') return 'home';
  const id = menuPageOf(page);
  for (const sec of homeShellMenu) {
    for (const it of sec.items) {
      if (it.id === id) return it.icon;
    }
  }
  return undefined;
}

/// العودة إلى صفحةٍ مخفيّة تغيّرت بياناتها: تُعاد بناءً صامتًا **إن لم يعدّل
/// المستخدم فيها شيئًا**. المعدَّلة تبقى كما تُركت (سندٌ نصف مملوء، تبويبات
/// سنداتٍ معلّقة) ونقطتها على التبويب تقول إن بياناتها قد تكون قديمة.
function reenterPage(st: SpaceState, page: string): void {
  if (!st.stale.has(page)) return;
  if (st.dirty.get(page)?.dirty ?? false) return;
  st.gen[page] = (st.gen[page] ?? 0) + 1;
  st.stale.delete(page);
}

function formatHHmm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return arDigits(`${hh}:${mm}`);
}

export interface HomeShellProps {
  readonly onSignOut: () => Promise<void>;
  /// عرض افتراضي صريح للاختبارات (عند عدم التمرير يُقاس من الحاوية/النافذة).
  readonly viewportWidth?: number;
  /// حشوة شريط الحالة على الجوال (للاختبارات وللأجهزة ذات الحواف الآمنة).
  readonly topInset?: number;
  readonly bottomInset?: number;
  /// مرجع اختياري لاختبارات التنقل عبر ImdNav.
  readonly navRef?: { current: ImdNav | null };
}

/// الهيكل الرئيسي بعد الدخول:
/// شريط علوي، قائمة جانبية داكنة بأقسام قابلة للطي (قسم واحد مفتوح)، ومنطقة المحتوى.
export function HomeShell({
  onSignOut,
  viewportWidth,
  topInset = 0,
  bottomInset = 0,
  navRef,
}: HomeShellProps) {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const imdTheme = useImdTheme();
  const sync = useAutoSync();
  const rootActions = useImdScreenActions();

  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const mountedRef = useRef(true);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [measuredWidth, setMeasuredWidth] = useState<number>(() =>
    viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200),
  );

  useEffect(() => {
    if (viewportWidth !== undefined) {
      setMeasuredWidth(viewportWidth);
      return;
    }
    const updateFromWindow = () => {
      if (typeof window !== 'undefined') setMeasuredWidth(window.innerWidth);
    };
    const el = hostRef.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width;
        if (w && w > 0) setMeasuredWidth(w);
      });
      ro.observe(el);
      window.addEventListener('resize', updateFromWindow);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', updateFromWindow);
      };
    }
    window.addEventListener('resize', updateFromWindow);
    return () => window.removeEventListener('resize', updateFromWindow);
  }, [viewportWidth]);

  const width = viewportWidth ?? measuredWidth;

  /// حالة كل قسم (الإمداد/المحروقات) على حدة: تبويباته المفتوحة وصفحته الظاهرة
  /// وأرقام تحديثه وتنبيهات تقادمه. **القسمان يحيَيان معًا**: التبديل بينهما
  /// يُخفي أحدهما ولا يهدمه، فيعود كل قسمٍ بتبويباته وما في صفحاته من إدخال.
  const spacesRef = useRef<Map<string, SpaceState>>(new Map());
  const openHintRef = useRef<Map<string, string>>(new Map());

  const stateOf = useCallback((sp: string): SpaceState => {
    let st = spacesRef.current.get(sp);
    if (!st) {
      st = new SpaceState(sp);
      spacesRef.current.set(sp, st);
    }
    return st;
  }, []);

  /// مساحة العمل الحالية — `null` تعني أن المستخدم يملك الاثنتين ولم يختر.
  const [spaceState, setSpaceState] = useState<string | null>(null);
  const [spaceReady, setSpaceReady] = useState(false);
  const spaceRef = useRef<string | null>(null);
  spaceRef.current = spaceState;

  const [sideWidth, setSideWidth] = useState<number>(ImdSizes.sideWidth);
  const sideWidthRef = useRef<number>(ImdSizes.sideWidth);
  sideWidthRef.current = sideWidth;

  /// طيّ القائمة الجانبية يدويًّا: `null` = تلقائي، و`true`/`false` = اختيار المستخدم.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);

  /// حالة درج الجوال.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerOpenRef = useRef(false);
  drawerOpenRef.current = drawerOpen;

  const handheldRef = useRef(false);

  const spaceBlocked = useCallback(
    (a: AuthService | null, sp: string): boolean => {
      const u = a?.currentUser;
      if (!u) return false;
      return SectionBlock.blocksSection({
        role: u.role,
        blockedJson: u.sectionBlocked,
        section: sp,
      });
    },
    [],
  );

  const hasPerm = useCallback(
    (
      a: AuthService | null,
      page: string,
      action: string = PermAction.view,
    ): boolean => {
      if (!a) return false;
      // الحجب أولًا وعلى **هوية الصفحة الأصلية**: التطبيع التالي قد يحوّلها إلى
      // صلاحيةٍ لا تُنبئ بقسمها (`lanSync` ← `sys.sync`).
      const blockedUser = a.currentUser;
      if (
        blockedUser !== null &&
        SectionBlock.blocksPage({
          role: blockedUser.role,
          blockedJson: blockedUser.sectionBlocked,
          page,
        })
      ) {
        return false;
      }
      const normalized = PERM_PAGE[page] ?? page;
      // بابٌ بتبويبات يُفتح لمن ملك إحداها، والتبويبات تُخفي ما لا يملك —
      // فالجمع تنظيمٌ للقائمة لا توسيعٌ للأذونات.
      if (Object.prototype.hasOwnProperty.call(kMenuDoors, normalized)) {
        return menuDoorAllows(normalized, (p) => hasPerm(a, p, action));
      }
      const user = a.currentUser;
      if (user === null) return false;
      const rawPerms = a.permissionsOf(user);
      const perms: PermissionMap = {};
      for (const [k, v] of Object.entries(rawPerms)) {
        const inner: Record<string, boolean> = {};
        if (v && typeof v === 'object') {
          for (const [ak, av] of Object.entries(v as Record<string, unknown>)) {
            inner[ak] = av === true;
          }
        }
        perms[k] = inner;
      }
      return AccessControl.can({
        isAdmin: UserRole.isAdmin(user.role),
        isOwner: UserRole.isOwner(user.role),
        permissions: perms,
        page: normalized,
        action,
      });
    },
    [],
  );

  const homeAllowed = useCallback(
    (a: AuthService | null, sp: string): boolean =>
      !spaceBlocked(a, sp) &&
      (sp !== AppSpace.fuel || hasPerm(a, 'fuelDashboard')),
    [hasPerm, spaceBlocked],
  );

  const spaceKey = useCallback(
    (a: AuthService | null): string =>
      `imdad.space.${a?.currentUser?.id ?? ''}`,
    [],
  );

  const getCurrentSpaceState = useCallback(
    (): SpaceState => stateOf(spaceRef.current ?? AppSpace.supply),
    [stateOf],
  );

  const dropPage = useCallback(
    (st: SpaceState, page: string) => {
      const slot = st.actions.get(page);
      st.actions.delete(page);
      if (slot && rootActions && rootActions.delegate === slot) {
        rootActions.delegate = null;
      }
      const idx = st.open.indexOf(page);
      if (idx !== -1) st.open.splice(idx, 1);
      openHintRef.current.delete(page);
      st.stale.delete(page);
      st.dirty.delete(page);
      delete st.gen[page];
      const sink = st.sinks.get(page);
      st.sinks.delete(page);
      if (sink) {
        queueMicrotask(() => sink.dispose());
      }
    },
    [rootActions],
  );

  const go = useCallback(
    (rawPage: string) => {
      const asked = rawPage;
      const page = canonicalPage(rawPage);
      const st = getCurrentSpaceState();
      if (asked !== page && !st.open.includes(page)) {
        openHintRef.current.set(page, asked);
      }
      if (!st.open.includes(page)) {
        st.open.push(page);
        // الجوال صفحةٌ واحدة كما كان: لا شريط تبويبات يتيح العودة لما أُخفي.
        const cap = handheldRef.current ? 1 : MAX_OPEN;
        while (st.open.length > cap) {
          const victim = st.open.find((p) => p !== page);
          if (!victim) break;
          dropPage(st, victim);
        }
      }
      st.page = page;
      reenterPage(st, page);
      // يُغلق الدرج نفسه لا «أعلى مسار».
      setDrawerOpen(false);
      bump();
    },
    [bump, dropPage, getCurrentSpaceState],
  );

  const nav = useMemo(
    () => new ImdNav(go, () => getCurrentSpaceState().page),
    [go, getCurrentSpaceState],
  );
  if (navRef) {
    navRef.current = nav;
  }

  const closePage = useCallback(
    (page: string) => {
      const st = getCurrentSpaceState();
      if (st.open.length <= 1) return;
      const i = st.open.indexOf(page);
      dropPage(st, page);
      if (page === st.page) {
        const nextIdx = Math.max(0, Math.min(i, st.open.length - 1));
        st.page = st.open[nextIdx];
      }
      bump();
    },
    [bump, dropPage, getCurrentSpaceState],
  );

  const closeOthers = useCallback(
    (keep: string) => {
      const st = getCurrentSpaceState();
      for (const p of [...st.open]) {
        if (p !== keep) dropPage(st, p);
      }
      st.page = keep;
      bump();
    },
    [bump, dropPage, getCurrentSpaceState],
  );

  const pickSpace = useCallback(
    async (nextSpace: string) => {
      const key = spaceKey(auth);
      const st = stateOf(nextSpace);
      reenterPage(st, st.page);
      spaceRef.current = nextSpace;
      setSpaceState(nextSpace);
      bump();
      try {
        const prefs = await SharedPreferences.getInstance();
        await prefs.setString(key, nextSpace);
      } catch {
        // التفضيل كماليّ
      }
    },
    [auth, bump, spaceKey, stateOf],
  );

  const switchSpace = useCallback(async () => {
    const available = AppSpace.availableFor((p) => hasPerm(auth, p));
    if (available.length < 2) return;
    const current = spaceRef.current ?? available[0];
    const next = available[(available.indexOf(current) + 1) % available.length];
    await pickSpace(next);
  }, [auth, hasPerm, pickSpace]);

  const setCollapsed = useCallback(async (v: boolean) => {
    setUserCollapsed(v);
    try {
      const prefs = await SharedPreferences.getInstance();
      await prefs.setString(COLLAPSED_KEY, String(v));
    } catch {
      // تفضيل شكلٍ فقط: فشل حفظه لا يمنع الطيّ في هذه الجلسة.
    }
  }, []);

  const saveSideWidth = useCallback(async () => {
    try {
      const prefs = await SharedPreferences.getInstance();
      await prefs.setString(SIDE_KEY, String(sideWidthRef.current));
    } catch {
      // تفضيل شكلٍ فقط
    }
  }, []);

  const checkSession = useCallback(async () => {
    if (!auth) return;
    if (!(await auth.sessionExpired())) return;
    if (!mountedRef.current) return;
    showImdToast('انتهت مدة الجلسة — سجّل الدخول من جديد');
    await onSignOut();
  }, [auth, onSignOut]);

  const handlePopRoute = useCallback(async () => {
    if (drawerOpenRef.current) {
      setDrawerOpen(false);
      return;
    }
    const st = getCurrentSpaceState();
    if (st.page !== 'dash') {
      go('dash');
      return;
    }
    if (await imdConfirm('إغلاق النظام؟', { ok: 'خروج' })) {
      await ImdWindow.exit();
    }
  }, [getCurrentSpaceState, go]);

  // استماع لاختصار العودة/إغلاق الدرج (Escape أو حدث imd:poproute للاختبارات).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopEvent = () => {
      void handlePopRoute();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpenRef.current) {
        e.preventDefault();
        setDrawerOpen(false);
      }
    };
    window.addEventListener('imd:poproute', onPopEvent);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('imd:poproute', onPopEvent);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handlePopRoute]);

  // تهيئة القشرة: استعادة المساحة، العرض الجانبي، مؤقّت الجلسة، مراقبة القاعدة والمستخدم والسمة.
  useEffect(() => {
    mountedRef.current = true;
    void ImdDensity.load();

    void (async () => {
      const prefs = await SharedPreferences.getInstance();
      const rawW = prefs.getString(SIDE_KEY);
      const rawCollapsed = prefs.getString(COLLAPSED_KEY);
      if (!mountedRef.current) return;
      if (rawW !== null) {
        const w = Number(rawW);
        if (Number.isFinite(w)) {
          setSideWidth(Math.min(SIDE_MAX, Math.max(SIDE_MIN, w)));
        }
      }
      if (rawCollapsed === 'true' || rawCollapsed === 'false') {
        setUserCollapsed(rawCollapsed === 'true');
      }
    })();

    void (async () => {
      const available = AppSpace.availableFor((p) => hasPerm(auth, p));
      const prefs = await SharedPreferences.getInstance();
      const saved = prefs.getString(spaceKey(auth));
      if (!mountedRef.current) return;
      const resolved = AppSpace.resolve({ available, saved });
      spaceRef.current = resolved;
      setSpaceState(resolved);
      setSpaceReady(true);
    })();

    const sessionTimer = setInterval(() => {
      void checkSession();
    }, 5 * 60 * 1000);

    const onVisibility = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        void checkSession();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    const onUserChanged = () => {
      if (mountedRef.current) bump();
    };
    const userVersion = auth?.userVersion ?? null;
    userVersion?.addListener(onUserChanged);

    const onSectionThemeChanged = () => {
      if (mountedRef.current) bump();
    };
    ImdSectionTheme.notifier.addListener(onSectionThemeChanged);
    ImdStyle.notifier.addListener(onSectionThemeChanged);
    ImdDensity.addRebuildListener(onSectionThemeChanged);

    if (rootActions) {
      rootActions.onSearch = () => showSearchModal({ onOpenPage: go });
    }

    const dbSub = db
      ? db
          .tableUpdates(TableUpdateQuery.onAllTables(db.allTables))
          .listen(() => {
            if (!mountedRef.current) return;
            const current = spaceRef.current ?? AppSpace.supply;
            let changed = false;
            for (const [spKey, st] of spacesRef.current.entries()) {
              for (const p of st.open) {
                // الظاهر هو مصدر الكتابة؛ وكل ما عداه (حتى صفحات القسم الآخر) مشتبهٌ به.
                if (spKey === current && p === st.page) continue;
                if (!st.stale.has(p)) {
                  st.stale.add(p);
                  changed = true;
                }
              }
            }
            if (changed) bump();
          })
      : null;

    return () => {
      mountedRef.current = false;
      clearInterval(sessionTimer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      userVersion?.removeListener(onUserChanged);
      ImdSectionTheme.notifier.removeListener(onSectionThemeChanged);
      ImdStyle.notifier.removeListener(onSectionThemeChanged);
      ImdDensity.removeRebuildListener(onSectionThemeChanged);
      if (rootActions) {
        rootActions.onSearch = null;
      }
      dbSub?.cancel();
      for (const st of spacesRef.current.values()) {
        for (const s of st.sinks.values()) {
          s.dispose();
        }
      }
    };
  }, [auth, bump, checkSession, db, go, hasPerm, rootActions, spaceKey]);

  const baseTheme: ImdThemeData = useMemo(() => {
    if (imdTheme) return imdTheme.resolvedTheme();
    return ImdStyle.classic ? AppTheme.classic() : AppTheme.light();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imdTheme, imdTheme?.mode, imdTheme?.font, ImdStyle.classic]);

  const themeFor = useCallback(
    (sp: string): ImdThemeData => {
      if (sp !== AppSpace.fuel || !ImdSectionTheme.distinctFuel) {
        return baseTheme;
      }
      const dark = baseTheme.brightness === 'dark';
      const font = baseTheme.fontFamily || ImdFonts.defaultFamily;
      return AppTheme.fuelSection({ dark, font });
    },
    [baseTheme],
  );

  const available = AppSpace.availableFor((p) => hasPerm(auth, p));

  // قسمٌ حُجب عن المستخدم أثناء جلسته لا يبقى مفتوحًا: يُنقل إلى أول قسمٍ متاح.
  useEffect(() => {
    if (
      spaceReady &&
      spaceState !== null &&
      available.length > 0 &&
      !available.includes(spaceState)
    ) {
      const fallback = available[0];
      const st = stateOf(fallback);
      reenterPage(st, st.page);
      spaceRef.current = fallback;
      setSpaceState(fallback);
      bump();
    }
  }, [available, bump, spaceReady, spaceState, stateOf]);

  const space = spaceState ?? AppSpace.supply;
  const themed = themeFor(space);
  const sc = themed.tokens;

  // مزامنة سمة الوثيقة عند تغيّر القسم أو السمة.
  useEffect(() => {
    AppTheme.applyToDocument(themed);
    if (typeof document !== 'undefined') {
      if (space === AppSpace.fuel && ImdSectionTheme.distinctFuel) {
        document.documentElement.dataset.section = 'fuel';
      } else {
        delete document.documentElement.dataset.section;
      }
    }
  }, [themed, space]);

  const wide = width > SHELL_BP.wide;
  const handheld = width <= SHELL_BP.rail;
  const rail = !handheld && (userCollapsed ?? !wide);
  handheldRef.current = handheld;

  const userName =
    auth?.currentUser?.name && auth.currentUser.name.length > 0
      ? auth.currentUser.name
      : (auth?.currentUser?.username ?? '');

  // قبل أن تُقرأ المساحة المحفوظة لا تُرسم قائمةٌ قد تتبدّل بعد لحظة.
  if (!spaceReady) {
    return (
      <div
        ref={hostRef}
        dir="rtl"
        className="flex h-screen w-full items-center justify-center"
        style={{ backgroundColor: baseTheme.tokens.bg.css }}
      >
        <div
          role="progressbar"
          aria-label="جارٍ التحميل"
          className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
          style={{
            borderColor: baseTheme.tokens.accent.css,
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  if (spaceState === null && available.length > 1) {
    return (
      <div ref={hostRef} dir="rtl" className="h-screen w-full">
        <SpaceChooserScreen
          spaces={available}
          userName={userName}
          onPick={(sp) => {
            void pickSpace(sp);
          }}
          colors={baseTheme.tokens}
        />
      </div>
    );
  }

  // الحالة تُنشأ للقسم الظاهر قبل البناء حتى يظهر في `spacesRef`.
  const activeSt = stateOf(space);

  const slotOf = (
    st: SpaceState,
    p: string,
    visible: boolean,
  ): ImdScreenActions => {
    let slot = st.actions.get(p);
    if (!slot) {
      slot = new ImdScreenActions();
      st.actions.set(p, slot);
    }
    if (visible && rootActions) {
      rootActions.delegate = slot;
    }
    return slot;
  };

  const sinkOf = (st: SpaceState, p: string): ImdRecordSink => {
    let sink = st.sinks.get(p);
    if (!sink) {
      sink = new ImdRecordSink();
      st.sinks.set(p, sink);
    }
    return sink;
  };

  const dirtyOf = (st: SpaceState, p: string): ImdDirtyFlag => {
    let flag = st.dirty.get(p);
    if (!flag) {
      flag = new ImdDirtyFlag();
      st.dirty.set(p, flag);
    }
    return flag;
  };

  const pageBody = (page: string, sp: string): ReactNode => {
    switch (page) {
      case 'dash':
        // «الرئيسية» تتبع القسم: لوحة الإمداد في مكانها، ولوحة المحروقات في
        // مكانها — ولا يرى صاحب قسمٍ لوحةَ القسم الآخر.
        return sp === AppSpace.fuel ? (
          <FuelDashboardScreen />
        ) : (
          <DashboardScreen />
        );
      case 'items':
        return <ItemsScreen />;
      case 'suppliers':
        return <SuppliersScreen />;
      case 'kitchens':
        return <KitchensScreen />;
      case 'units':
        return <UnitsScreen />;
      // التقارير الثلاثة شاشةٌ واحدة بتبويبات؛ ومعرّفاتها القديمة (روابط التنبيهات)
      // تفتحها على تبويبتها.
      case 'campAccounts': {
        const tab = openHintRef.current.get(page);
        return tab === undefined ? (
          <CampAccountsScreen />
        ) : (
          <CampAccountsScreen initialTab={tab} />
        );
      }
      case 'campLedger':
      case 'campSettlement':
      case 'actualEntitlement':
        return <CampAccountsScreen initialTab={page} />;
      case 'mealPlans':
        return <MealPlanScreen />;
      case 'dailyOperations':
        return <SupplyDailyScreen initialTab="dailyOperations" />;
      case 'assets':
        return <AssetsScreen />;
      case 'fuelDashboard':
        return <FuelDashboardScreen />;
      // حركة المحروقات: كل بندٍ يفتح نفس الشاشة، لكن مقفلةً على تبويبته —
      // `standalone: true` يُخفي شريط التبويبات.
      case 'fuelIssue':
        return <FuelMovesScreen initialTab="issue" standalone={true} />;
      case 'fuelSupply':
        return <FuelMovesScreen initialTab="supply" standalone={true} />;
      case 'fuelTransfer':
        return <FuelMovesScreen initialTab="transfer" standalone={true} />;
      case 'fuelOpening':
        return <FuelMovesScreen initialTab="opening" standalone={true} />;
      case 'fuelAllocations':
        return <FuelAllocationsScreen />;
      case 'fuelMoves':
        return <FuelMovesScreen />;
      case 'fuelStocktake':
        return <FuelStocktakeScreen />;
      case 'fuelData':
        return <FuelDataScreen />;
      case 'fuelWarehouses':
        return <FuelWarehousesScreen />;
      case 'fuelUnits':
        return <FuelUnitsScreen />;
      case 'fuelVehicles':
        return <FuelVehiclesScreen />;
      case 'fuelConsumption':
        return <FuelConsumptionScreen />;
      case 'fuelDaily':
        return <FuelDailyReportScreen />;
      case 'fuelOfficial':
        return <FuelOfficialReportScreen />;
      case 'fuelStocks':
        return <FuelStocksReportScreen />;
      case 'fuelLedger':
        return <FuelLedgerScreen />;
      case 'fuelPlanVsIssued':
        return <FuelPlanVsIssuedScreen />;
      case 'fuelReports':
        return <FuelReportsHubScreen />;
      case 'fuelSettings':
        return <FuelSettingsScreen />;
      // أبواب الإمداد — والمعرّفات القديمة تفتحها على تبويبتها.
      case 'supplyMoves':
        return <SupplyMovesScreen />;
      case 'supplyOrders':
        return <SupplyOrdersScreen />;
      case 'supplyData':
        return <SupplyDataScreen />;
      case 'supplyDaily':
        return <SupplyDailyScreen />;
      case 'supplyReports':
        return <SupplyReportsScreen />;
      case 'supplyAudit': {
        const tab = openHintRef.current.get(page);
        return tab === undefined ? (
          <SupplyAuditScreen />
        ) : (
          <SupplyAuditScreen initialTab={tab} />
        );
      }
      case 'rationOrders':
        return <RationOrderScreen />;
      case 'stores':
        return <WarehousesScreen />;
      case 'pendingOrders':
        return <PendingScreen />;
      case 'receive':
        return <ReceiveScreen />;
      case 'issue':
        return <IssueScreen />;
      case 'transfer':
        return <TransferScreen />;
      case 'returns':
        return <ReturnsScreen />;
      case 'opening':
        return <OpeningScreen />;
      case 'destruction':
        return <DestructionScreen />;
      case 'feeding':
        return <StrengthScreen />;
      case 'kitchenLog':
        return <KitchenLogScreen />;
      case 'ratios':
        return <RatiosScreen />;
      case 'balances':
        return <BalancesScreen />;
      case 'stockAlerts':
        return <StockAlertsScreen />;
      // إدارة الجرد: نفس معالجة حركة المحروقات — `standalone: true` يُخفي
      // شريط تبويبات الشاشة الداخلي عند الفتح من بندٍ مباشر.
      case 'stocktakeCreate':
        return <StocktakeScreen initialTab="create" standalone={true} />;
      case 'stocktakeCount':
        return <StocktakeScreen initialTab="count" standalone={true} />;
      case 'stocktakeAnalysis':
        return <StocktakeScreen initialTab="analysis" standalone={true} />;
      case 'stocktakeSettle':
        return <StocktakeScreen initialTab="approve" standalone={true} />;
      case 'stocktakeHistory':
        return <StocktakeScreen initialTab="history" standalone={true} />;
      case 'stocktake':
        return <StocktakeScreen />;
      case 'reports':
        return <ReportsCenterScreen />;
      case 'reportMoves':
        return (
          <ReportsCenterScreen initialReport={ReportId.moves} standalone={true} />
        );
      case 'reportUnitAccount':
        return (
          <ReportsCenterScreen
            initialReport={ReportId.unitAccount}
            standalone={true}
          />
        );
      case 'reportStock':
        return (
          <ReportsCenterScreen initialReport={ReportId.stock} standalone={true} />
        );
      case 'reportConsumption':
        return (
          <ReportsCenterScreen
            initialReport={ReportId.consumption}
            standalone={true}
          />
        );
      case 'reportStrength':
        return (
          <ReportsCenterScreen
            initialReport={ReportId.strength}
            standalone={true}
          />
        );
      case 'reportKitchen':
        return (
          <ReportsCenterScreen
            initialReport={ReportId.kitchen}
            standalone={true}
          />
        );
      case 'reportSupplier':
        return (
          <ReportsCenterScreen
            initialReport={ReportId.supplier}
            standalone={true}
          />
        );
      case 'reportReturns':
        return (
          <ReportsCenterScreen
            initialReport={ReportId.returns}
            standalone={true}
          />
        );
      case 'reportDaily':
        return (
          <ReportsCenterScreen initialReport={ReportId.daily} standalone={true} />
        );
      case 'reportMealDispatch':
        return (
          <ReportsCenterScreen
            initialReport={ReportId.mealDispatch}
            standalone={true}
          />
        );
      case 'mealDispatch':
        return <MealDispatchScreen />;
      case 'auditTrail':
        return <SupplyAuditScreen initialTab="auditTrail" />;
      case 'activityIntel':
        return <SupplyAuditScreen initialTab="activityIntel" />;
      case 'executiveCmd':
        return <SupplyAuditScreen initialTab="executiveCmd" />;
      case 'sensitiveOps':
        return <SupplyAuditScreen initialTab="sensitiveOps" />;
      case 'healthOps':
        return <SupplyAuditScreen initialTab="healthOps" />;
      case 'cables':
        return <CablesScreen />;
      case 'archive':
        return <ElectronicArchiveScreen />;
      case 'personnel':
        return <PersonnelStrengthScreen />;
      // «linkages» معرّفٌ قديم (مركز الارتباطات) يفتح المالية.
      case 'linkages':
      case 'linkFinances':
        return <LinkFinancesScreen />;
      case 'linkArmament':
        return <LinkArmamentScreen />;
      case 'settings': {
        const hintKey = openHintRef.current.get(page);
        const hint = hintKey ? kSettingsSections[hintKey] : undefined;
        return hint === undefined ? (
          <SettingsScreen />
        ) : (
          <SettingsScreen initialSection={hint} />
        );
      }
      // أقسامٌ داخل الإعدادات: الروابط القديمة تفتح الإعدادات على القسم نفسه.
      case 'formsDesigner':
      case 'deviceActivation':
      case 'verifySign':
      case 'branding':
      case 'usersAccess':
      case 'lanSync':
        return <SettingsScreen initialSection={kSettingsSections[page]} />;
    }
    return <HomeShellSoon />;
  };

  const syncIsRunning = sync?.isRunning ?? false;
  const syncEnabled = sync?.enabled ?? false;
  const syncFailed = !syncIsRunning && (sync?.failed ?? false);
  const syncLastAt = sync?.lastAt ?? null;

  const connectionLabel = syncIsRunning
    ? 'جارٍ التزامن'
    : !syncEnabled
      ? 'العمل محلي — المزامنة متوقفة'
      : syncFailed
        ? 'تعذّرت آخر مزامنة'
        : syncLastAt === null
          ? 'متصل — بانتظار أول مزامنة'
          : `متصل — آخر مزامنة ${formatHHmm(syncLastAt)}`;

  const connectionOk: boolean | null = syncIsRunning
    ? true
    : !syncEnabled
      ? null
      : !syncFailed;

  const openPages: ImdOpenPage[] = activeSt.open.map(
    (p) =>
      new ImdOpenPage({
        id: p,
        title: titleOfPage(p),
        icon: iconOfPage(p),
        stale: activeSt.stale.has(p),
      }),
  );

  const toggleSection = (sec: string) => {
    activeSt.openSec = activeSt.openSec === sec ? null : sec;
    bump();
  };

  const drawerW = ImdSizes.drawerWidth(width);

  return (
    <ImdThemeDataProvider data={themed}>
      <ImdNavProvider nav={nav}>
        <div
          ref={hostRef}
          dir="rtl"
          data-imd-home-shell="true"
          data-imd-space={space}
          data-imd-shell-accent={sc.accent.hex}
          data-imd-shell-side={sc.side.hex}
          data-imd-shell-dark={String(sc.isDark)}
          className="relative flex h-screen w-full flex-col overflow-hidden"
          style={{
            backgroundColor: sc.bg.css,
            color: sc.text.css,
            fontFamily: themed.fontFamily,
          }}
        >
          {handheld ? (
            <HomeShellTopbar
              userName={userName}
              showBurger={true}
              onBurger={() => setDrawerOpen(true)}
              onOpenPage={go}
              space={spaceState ?? ''}
              canSwitch={available.length > 1}
              onSwitchSpace={() => {
                void switchSpace();
              }}
              topInset={topInset}
              width={width}
              colors={sc}
            />
          ) : (
            <HomeShellDesktopBar
              userName={userName}
              collapsed={rail}
              onToggleSide={() => {
                void setCollapsed(!rail);
              }}
              pages={openPages}
              activeId={activeSt.page}
              onSelect={go}
              onClose={closePage}
              onCloseOthers={closeOthers}
              onOpenPage={go}
              space={spaceState ?? ''}
              canSwitch={available.length > 1}
              onSwitchSpace={() => {
                void switchSpace();
              }}
              width={width}
              colors={sc}
            />
          )}

          <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
            {!handheld && (
              <HomeShellSidebar
                page={menuPageOf(activeSt.page)}
                space={space}
                rail={rail}
                openSec={activeSt.openSec}
                hasPerm={(p) => hasPerm(auth, p)}
                userName={userName}
                onGo={go}
                onToggle={toggleSection}
                onLogout={onSignOut}
                width={sideWidth}
                colors={sc}
              />
            )}
            {!handheld && !rail && (
              <HomeShellSideSplitter
                onDrag={(dx) => {
                  // القائمة على الطرف البدئي: السحب نحو المحتوى يوسّعها (في RTL الطرف البدئي هو اليمين).
                  const rtl =
                    typeof document === 'undefined' ||
                    (document.documentElement.dir || 'rtl').toLowerCase() ===
                      'rtl';
                  const next = Math.min(
                    SIDE_MAX,
                    Math.max(SIDE_MIN, sideWidthRef.current + (rtl ? -dx : dx)),
                  );
                  sideWidthRef.current = next;
                  setSideWidth(next);
                }}
                onEnd={() => {
                  void saveSideWidth();
                }}
                colors={sc}
              />
            )}

            <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {Array.from(spacesRef.current.entries()).map(([sp, st]) => {
                const isActive = sp === space;
                const pages = handheld
                  ? isActive
                    ? [st.page]
                    : []
                  : [...st.open];
                const sectionTheme = themeFor(sp);

                return (
                  <div
                    key={`space:${sp}`}
                    data-imd-space-stack={sp}
                    aria-hidden={!isActive}
                    className="min-h-0 flex-1 flex-col overflow-hidden"
                    style={{
                      display: isActive ? 'flex' : 'none',
                    }}
                  >
                    <ImdThemeDataProvider data={sectionTheme}>
                      {pages.map((p) => {
                        const pageActive = isActive && p === st.page;
                        const allowed =
                          (p === 'dash' && homeAllowed(auth, sp)) ||
                          (p !== 'dash' && hasPerm(auth, p));
                        return (
                          <div
                            key={`host:${sp}:${p}`}
                            data-imd-page-host={`host:${sp}:${p}`}
                            data-imd-active={String(pageActive)}
                            className="min-h-0 flex-1 flex-col overflow-hidden"
                            style={{
                              display: pageActive ? 'flex' : 'none',
                            }}
                          >
                            <ImdPageHost
                              active={pageActive}
                              sink={sinkOf(st, p)}
                              actions={slotOf(st, p, pageActive)}
                            >
                              <Fragment key={`${sp}:${p}#${st.gen[p] ?? 0}`}>
                                <ImdPageDirty flag={dirtyOf(st, p)}>
                                  {allowed ? (
                                    pageBody(p, sp)
                                  ) : (
                                    <HomeShellNoAccess />
                                  )}
                                </ImdPageDirty>
                              </Fragment>
                            </ImdPageHost>
                          </div>
                        );
                      })}
                    </ImdThemeDataProvider>
                  </div>
                );
              })}
            </main>
          </div>

          {!handheld && (
            <ImdStatusBar
              records={sinkOf(activeSt, activeSt.page)}
              connection={connectionLabel}
              connectionOk={connectionOk}
              colors={sc}
            />
          )}

          {handheld && (
            <HomeShellBottomNav
              space={space}
              page={menuPageOf(activeSt.page)}
              hasPerm={(p) => hasPerm(auth, p)}
              onGo={go}
              onMore={() => setDrawerOpen(true)}
              colors={sc}
            />
          )}

          {/* درج الجوال يحمل القائمة كاملةً في اليد */}
          {handheld && drawerOpen && (
            <div
              data-imd-drawer-backdrop="true"
              className="fixed inset-0 z-40 flex justify-end"
              style={{ backgroundColor: sc.scrim.css }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setDrawerOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="القائمة"
                data-imd-drawer="true"
                className="flex h-full flex-col overflow-hidden"
                style={{
                  width: drawerW,
                  maxWidth: '100%',
                  backgroundColor: sc.side.css,
                }}
              >
                <HomeShellSidebar
                  width={null}
                  topInset={topInset}
                  bottomInset={bottomInset}
                  page={menuPageOf(activeSt.page)}
                  space={space}
                  openSec={activeSt.openSec}
                  hasPerm={(p) => hasPerm(auth, p)}
                  userName={userName}
                  onGo={go}
                  onToggle={toggleSection}
                  onLogout={onSignOut}
                  colors={sc}
                />
              </div>
            </div>
          )}
        </div>
      </ImdNavProvider>
    </ImdThemeDataProvider>
  );
}
