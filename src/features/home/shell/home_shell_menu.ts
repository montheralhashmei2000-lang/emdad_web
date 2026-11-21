import { AppSpace } from '../../../domain/app_space';
import { kMenuDoors } from '../../../domain/menu_doors';

/// معرّفات الصفحات التي صارت أقسامًا داخل الإعدادات ← القسم الذي تُفتح عليه.
/// معرّفاتٌ لا بند لها في القائمة: تفتح **بند القائمة نفسه** لا نسخةً ثانية من
/// شاشته ولا شكلًا قديمًا منها — لكل شاشةٍ بابٌ واحد (قرار المالك 2026-10-25).
/// التنبيهات والبحث وروابط التخزين القديمة تمرّ بها.
export const kPageAliases: Readonly<Record<string, string>> = {
  // تبويبات «حساب المعسكر والاستحقاق».
  campLedger: 'campAccounts',
  campSettlement: 'campAccounts',
  actualEntitlement: 'campAccounts',
  // تبويبات «الرقابة والتدقيق».
  auditTrail: 'supplyAudit',
  activityIntel: 'supplyAudit',
  sensitiveOps: 'supplyAudit',
  executiveCmd: 'supplyAudit',
  healthOps: 'supplyAudit',
  // أقسام الإعدادات.
  branding: 'settings',
  formsDesigner: 'settings',
  deviceActivation: 'settings',
  verifySign: 'settings',
  lanSync: 'settings',
  usersAccess: 'settings',
  // «مركز التقارير» القديم بقائمته الجانبية، والجرد بتبويباته، والأبواب القديمة.
  reports: 'reportMoves',
  supplyReports: 'reportMoves',
  stocktake: 'stocktakeHistory',
  supplyMoves: 'receive',
  supplyOrders: 'rationOrders',
  supplyData: 'items',
  supplyDaily: 'feeding',
  dailyOperations: 'mealPlans',
  fuelMoves: 'fuelIssue',
  fuelData: 'fuelWarehouses',
};

export const kSettingsSections: Readonly<Record<string, string>> = {
  branding: 'company',
  formsDesigner: 'forms',
  deviceActivation: 'devices',
  verifySign: 'verify',
  lanSync: 'sync',
  usersAccess: 'users',
};

/// عنصر في القائمة الجانبية — نفس `MENU` في `index.html`.
export class MenuItem {
  readonly id: string;
  readonly icon: string;
  readonly name: string;

  /// مساحة البند: `supply` أو `fuel` أو `both` لما يخدم القسمين.
  ///
  /// الأدلة المشتركة (المستودعات والوحدات) والإعدادات والتدقيق تظهر في
  /// القسمين: الوقود يُخزَّن في نفس المستودعات ويُصرف لنفس الوحدات، ومنعُ
  /// أمين المحروقات من دليلٍ يحتاجه في كل سند أغلى من تكرار بندٍ في قائمة.
  readonly space: string;

  constructor(
    id: string,
    icon: string,
    name: string,
    { space = AppSpace.supply }: { readonly space?: string } = {},
  ) {
    this.id = id;
    this.icon = icon;
    this.name = name;
    this.space = space;
  }
}

export class MenuSection {
  readonly sec: string;
  readonly icon: string;
  readonly name: string;
  readonly items: readonly MenuItem[];

  constructor(
    sec: string,
    icon: string,
    name: string,
    items: readonly MenuItem[],
  ) {
    this.sec = sec;
    this.icon = icon;
    this.name = name;
    this.items = items;
  }
}

export const homeShellMenu: readonly MenuSection[] = [
  // ═════════ الإمداد: ستّة أقسامٍ قابلة للطي — «الرئيسية» مستقلةٌ خارجها.
  //
  // **شجرةٌ لا أبواب.** كل بندٍ هنا يفتح شاشته الخامّة مباشرة، بلا تبويباتٍ
  // فوقها تُخفي أخواتها — القسم في الشريط هو التصنيف الوحيد، فلا حاجة
  // لتصنيفٍ ثانٍ داخل الشاشة نفسها.
  new MenuSection('basic', 'database', 'البيانات الأساسية', [
    new MenuItem('items', 'package', 'الأصناف'),
    new MenuItem('stores', 'warehouse', 'المستودعات'),
    new MenuItem('units', 'users', 'الوحدات المستفيدة'),
    new MenuItem('suppliers', 'truck', 'الموردون'),
    new MenuItem('kitchens', 'utensils', 'المطابخ والأفران'),
    new MenuItem('assets', 'package', 'الأصول الثابتة'),
  ]),
  new MenuSection('stock', 'package', 'العمليات المخزنية', [
    new MenuItem('receive', 'download', 'استلام'),
    new MenuItem('issue', 'upload', 'صرف'),
    new MenuItem('mealDispatch', 'utensils', 'صرف الوجبات'),
    new MenuItem('transfer', 'refresh', 'تحويل'),
    new MenuItem('returns', 'undo', 'مرتجعات'),
    new MenuItem('opening', 'clipboard', 'الأرصدة الافتتاحية'),
    new MenuItem('destruction', 'trash', 'الإتلاف'),
    new MenuItem('rationOrders', 'clipboard', 'طلبيات الإعاشة'),
    new MenuItem('pendingOrders', 'bell', 'أوامر التوريد المعلقة'),
  ]),
  new MenuSection('daily', 'chart', 'التشغيل اليومي', [
    new MenuItem('feeding', 'calendar', 'التفريدة اليومية'),
    new MenuItem('mealPlans', 'calendar', 'خطط الوجبات'),
    new MenuItem('kitchenLog', 'utensils', 'سجل التشغيل والطهي'),
    new MenuItem('ratios', 'scale', 'نسب الاستحقاق'),
  ]),
  // «رقابة» وحدها بقيت باباً بتبويباته الخمسة (سجل النشاط، ذكاء النشاط،
  // التغييرات الحساسة، مركز القيادة، صحة النظام) — خمس نظراتٍ على سجلٍّ
  // واحد لا خمس شاشاتٍ منفصلة، فتفكيكها يُكرِّر لا يُبسِّط.
  new MenuSection('archiveGroup', 'folder', 'البرقيات والأرشيف', [
    new MenuItem('cables', 'mail', 'البرقيات'),
    new MenuItem('archive', 'folder', 'الأرشيف الإلكتروني'),
  ]),
  new MenuSection('linkagesGroup', 'link', 'الارتباطات', [
    // ثلاث شاشات؛ تبويباتها الفرعية داخل الشاشة نفسها لا في هذا الشريط.
    new MenuItem('personnel', 'users', 'القوة البشرية'),
    new MenuItem('linkFinances', 'dollar', 'المالية'),
    new MenuItem('linkArmament', 'target', 'التسليح'),
  ]),
  new MenuSection('reports', 'trending', 'التقارير', [
    new MenuItem('balances', 'calculator', 'الأرصدة الحالية'),
    // تقارير «مركز التقارير» التسعة كلها بنودٌ مباشرة الآن (بلا قائمة تنقّل
    // جانبية) — فلا حاجة لبند «مركز التقارير» نفسه في الشريط؛ الشاشة
    // (`reports_center_screen.dart`) بقيت بلا حذف، فقط بلا رابطٍ إليها هنا.
    new MenuItem('reportMoves', 'repeat', 'حركة المخزون اليومية'),
    new MenuItem('reportUnitAccount', 'file', 'كشف حساب وحدة مستفيدة'),
    new MenuItem('reportStock', 'package', 'تقرير أرصدة المخزون'),
    new MenuItem('reportConsumption', 'chart', 'تحليل الاستهلاك'),
    new MenuItem('reportStrength', 'users', 'تقرير حصر القوة'),
    new MenuItem('reportKitchen', 'utensils', 'أداء المطابخ والأفران'),
    new MenuItem('reportSupplier', 'truck', 'ملخص توريدات الموردين'),
    new MenuItem('reportReturns', 'undo', 'تقرير المرتجعات'),
    new MenuItem('reportDaily', 'clipboard', 'تقرير العمل اليومي'),
    new MenuItem('reportMealDispatch', 'upload', 'تقرير صرف الوجبات'),
    // الاستحقاق الفعلي وسجل المعسكر وتصفية الشهر: بابٌ واحد بتبويبات (`campAccounts`).
    new MenuItem('campAccounts', 'calculator', 'حساب المعسكر والاستحقاق'),
    new MenuItem('stockAlerts', 'alert', 'تنبيهات المخزون'),
    new MenuItem('supplyAudit', 'scan', 'الرقابة والتدقيق'),
  ]),
  // خمسة بنودٍ لشاشةٍ واحدة (`StocktakeScreen`) بمعامل `standalone` يُخفي
  // تبويباتها الداخلية — لا خمس شاشاتٍ منفصلة فعلًا.
  new MenuSection('stocktake', 'clipboard', 'إدارة الجرد', [
    new MenuItem('stocktakeCreate', 'plus-square', 'إنشاء أمر جرد'),
    new MenuItem('stocktakeCount', 'clipboard', 'العدّ الفعلي'),
    new MenuItem('stocktakeAnalysis', 'scale', 'تحليل الفروقات'),
    new MenuItem('stocktakeSettle', 'check-circle', 'التسوية والاعتماد'),
    new MenuItem('stocktakeHistory', 'clock', 'سجل الجرد'),
  ]),
  // «مركز الصلاحيات» كان بندًا مستقلًّا خارج كل الأقسام يظهر لمدير النظام
  // فقط؛ انتقل هنا، وبقي مقصورًا على الإمداد (`space` الافتراضي) كما كان —
  // شأنُ النظام كله وبابه قسم الإمداد، لا يخلطه بالمحروقات.
  // بندٌ واحد: الهوية والنماذج والتفعيل والتوقيع والمزامنة والمستخدمون صارت
  // أقسامًا داخل شاشة الإعدادات نفسها (انظر [kSettingsSections])، وتبقى
  // معرّفاتها القديمة (`branding`، `deviceActivation`…) تفتح الإعدادات على قسمها.
  new MenuSection('settings', 'wrench', 'الإعدادات', [
    new MenuItem('settings', 'settings', 'الإعدادات العامة'),
  ]),

  // ═════════ المحروقات: نفس نمط الإمداد — خمسة أقسامٍ و«رئيسية» مستقلة.
  // «حركة المحروقات» أربعة بنودٍ لشاشةٍ واحدة (`FuelMovesScreen`) بمعامل
  // `standalone` يُخفي تبويباتها الداخلية، والتفريدة شاشةٌ مستقلة فعلًا.
  new MenuSection('fuelMoves', 'swap', 'حركة المحروقات', [
    new MenuItem('fuelIssue', 'upload', 'صرف', { space: AppSpace.fuel }),
    new MenuItem('fuelSupply', 'download', 'توريد', { space: AppSpace.fuel }),
    new MenuItem('fuelTransfer', 'refresh', 'تحويل', { space: AppSpace.fuel }),
    new MenuItem('fuelOpening', 'compass', 'رصيد افتتاحي', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelAllocations', 'clipboard', 'التفريدة', {
      space: AppSpace.fuel,
    }),
  ]),
  new MenuSection('fuelData', 'database', 'البيانات الأساسية', [
    new MenuItem('fuelWarehouses', 'warehouse', 'المستودعات', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelUnits', 'building', 'الوحدات المستفيدة', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelVehicles', 'truck', 'سجل المركبات', {
      space: AppSpace.fuel,
    }),
  ]),
  new MenuSection('fuelReports', 'chart', 'التقارير', [
    new MenuItem('fuelDaily', 'calendar', 'الحركة اليومية', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelOfficial', 'file', 'التقرير الرسمي', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelConsumption', 'trending', 'الاستهلاك', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelStocks', 'package', 'أرصدة المستودعات', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelLedger', 'list', 'كشف حركة المستودع', {
      space: AppSpace.fuel,
    }),
    new MenuItem('fuelPlanVsIssued', 'scale', 'الاستحقاق مقابل الصرف', {
      space: AppSpace.fuel,
    }),
  ]),
  // «جرد المحروقات» بلا تبويبات داخلية أصلًا (تدفّق قائمة ← تفاصيل لا
  // شريط تبويبات)، فبقيت بندًا واحدًا كما كانت.
  new MenuSection('fuelStocktake', 'clipboard', 'إدارة الجرد', [
    new MenuItem('fuelStocktake', 'clipboard', 'الجرد المخزني', {
      space: AppSpace.fuel,
    }),
  ]),
  new MenuSection('fuelSettings', 'wrench', 'الإعدادات', [
    new MenuItem('fuelSettings', 'settings', 'الإعدادات', {
      space: AppSpace.fuel,
    }),
  ]),
];

/// الصفحة التي يُضيئها بندُها في القائمة: الأقسام المضمَّنة تُضيء «الإعدادات»،
/// وتبويبات «حساب المعسكر والاستحقاق» (روابط التنبيهات القديمة) تُضيء بابها.
export function menuPageOf(page: string): string {
  if (Object.prototype.hasOwnProperty.call(kSettingsSections, page)) {
    return 'settings';
  }
  if (kMenuDoors['campAccounts']?.includes(page)) {
    return 'campAccounts';
  }
  return page;
}
