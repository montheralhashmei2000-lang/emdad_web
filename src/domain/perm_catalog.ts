/// كتالوج الصلاحيات — **المصدر الوحيد** لمعرّفات الصلاحيات وأسمائها وإجراءاتها.
///
/// تقرؤه شاشة المستخدمين (لرسم مصفوفة الصلاحيات)، و`Perm.labels` (لرسائل
/// الرفض)، واختبار الاكتمال (يتأكد أن كل مفتاحٍ يُفحص في الكود له مدخلٌ هنا،
/// فلا تعود صلاحيةٌ «مستخدمة ولا تُمنح»).
///
/// **القسم** (`section`) يُشتقّ من الشاشات لا من مفتاحٍ مستقل: من يملك شاشاتٍ
/// في قسمٍ يراه، وهو ما تقرؤه `AppSpace.availableFor`. وقيم القسم هي نفسها
/// `AppSpace.supply` و`AppSpace.fuel` مضافًا إليها `PermSection.admin`.
import { PermAction } from './perm_action';

/// أقسام الكتالوج.
export class PermSection {
  private constructor() {}

  static readonly supply = 'supply';
  static readonly fuel = 'fuel';

  /// الإدارة: الإعدادات والمستخدمون (ليست «مساحة عمل» في القائمة).
  static readonly admin = 'admin';

  static readonly all: readonly string[] = [PermSection.supply, PermSection.fuel, PermSection.admin];

  static readonly labels: Readonly<Record<string, string>> = {
    [PermSection.supply]: 'الإمداد والتموين',
    [PermSection.fuel]: 'المحروقات',
    [PermSection.admin]: 'الإدارة',
  };
}

/// مدخلٌ في الكتالوج: صفحةٌ بإجراءاتها المتاحة.
export class PermEntry {
  constructor(
    readonly key: string,
    readonly label: string,
    readonly section: string,
    /// مجموعة العرض داخل القسم (عنوانٌ في مصفوفة الصلاحيات).
    readonly group: string,
    readonly actions: readonly string[],
  ) {}
}

// مجموعات إجراءاتٍ متكررة.
const _v: readonly string[] = [PermAction.view];
const _crud: readonly string[] = [
  PermAction.view,
  PermAction.create,
  PermAction.edit,
  PermAction.delete,
];
const _doc: readonly string[] = [..._crud, PermAction.approve, PermAction.print];

export class PermCatalog {
  private constructor() {}

  static readonly entries: readonly PermEntry[] = [
    // ───────── الإمداد والتموين ─────────
    new PermEntry('dashboard', 'الرئيسية', PermSection.supply, 'الرئيسية', _v),

    new PermEntry('items', 'الأصناف', PermSection.supply, 'البيانات الأساسية', [
      ..._crud,
      PermAction.print,
      PermAction.export,
      PermAction.import,
    ]),
    new PermEntry('suppliers', 'الموردون', PermSection.supply, 'البيانات الأساسية', [
      ..._crud,
      PermAction.export,
    ]),
    new PermEntry('units', 'الوحدات المستفيدة', PermSection.supply, 'البيانات الأساسية', [
      ..._crud,
      PermAction.print,
      PermAction.export,
    ]),
    new PermEntry('stores', 'المستودعات', PermSection.supply, 'البيانات الأساسية', [
      ..._crud,
      PermAction.export,
    ]),
    new PermEntry('kitchens', 'المطابخ والأفران', PermSection.supply, 'البيانات الأساسية', _crud),
    new PermEntry('assets', 'الأصول الثابتة', PermSection.supply, 'البيانات الأساسية', _crud),
    new PermEntry('supplyAuthorities', 'جهات الاعتمادات', PermSection.supply, 'البيانات الأساسية', _crud),

    new PermEntry('receive', 'الاستلام', PermSection.supply, 'العمليات المخزنية', _doc),
    new PermEntry('issue', 'الصرف', PermSection.supply, 'العمليات المخزنية', _doc),
    new PermEntry('transfer', 'التحويل المخزني', PermSection.supply, 'العمليات المخزنية', _doc),
    new PermEntry('returns', 'المرتجعات', PermSection.supply, 'العمليات المخزنية', _doc),
    new PermEntry('opening', 'الأرصدة الافتتاحية', PermSection.supply, 'العمليات المخزنية', [
      PermAction.view,
      PermAction.create,
      PermAction.edit,
      PermAction.approve,
      PermAction.print,
    ]),
    new PermEntry('rationOrders', 'طلبيات الإعاشة', PermSection.supply, 'العمليات المخزنية', _doc),
    // اعتماد المحضر يُخرج الكميات من الرصيد، والحذف هنا إلغاؤه (يعيدها).
    new PermEntry('destruction', 'الإتلاف (محاضر الإتلاف)', PermSection.supply, 'العمليات المخزنية', _doc),
    new PermEntry('pendingOrders', 'أوامر التوريد المعلقة', PermSection.supply, 'العمليات المخزنية', [
      PermAction.view,
      PermAction.approve,
      PermAction.delete,
      PermAction.print,
    ]),
    new PermEntry('documents', 'سجل المستندات (السندات المحفوظة)', PermSection.supply, 'العمليات المخزنية', [
      PermAction.view,
      PermAction.print,
      PermAction.edit,
      PermAction.delete,
    ]),

    new PermEntry('feeding', 'التفريدة اليومية (التغذية / القوة)', PermSection.supply, 'التشغيل اليومي', [
      ..._crud,
      PermAction.print,
      PermAction.export,
    ]),
    new PermEntry('mealPlans', 'خطط الوجبات', PermSection.supply, 'التشغيل اليومي', [
      ..._crud,
      PermAction.approve,
      PermAction.print,
      PermAction.export,
    ]),
    new PermEntry('kitchenLog', 'سجل التشغيل والطهي', PermSection.supply, 'التشغيل اليومي', [
      ..._crud,
      PermAction.print,
      PermAction.export,
    ]),
    new PermEntry('ratios', 'نسب الاستحقاق', PermSection.supply, 'التشغيل اليومي', [
      PermAction.view,
      PermAction.edit,
      PermAction.print,
      PermAction.export,
    ]),

    new PermEntry('balances', 'الأرصدة الحالية', PermSection.supply, 'الأرصدة والتقارير', [
      PermAction.view,
      PermAction.export,
      PermAction.print,
    ]),
    new PermEntry('reports', 'مركز التقارير', PermSection.supply, 'الأرصدة والتقارير', [
      PermAction.view,
      PermAction.export,
      PermAction.print,
    ]),
    new PermEntry('actualEntitlement', 'حساب الاستحقاق الفعلي', PermSection.supply, 'الأرصدة والتقارير', [
      PermAction.view,
      PermAction.print,
      PermAction.export,
    ]),
    new PermEntry('campLedger', 'سجل حساب المعسكر', PermSection.supply, 'الأرصدة والتقارير', [
      PermAction.view,
      PermAction.create,
      PermAction.edit,
      PermAction.print,
      PermAction.export,
    ]),
    new PermEntry('campSettlement', 'تصفية الشهر', PermSection.supply, 'الأرصدة والتقارير', [
      PermAction.view,
      PermAction.approve,
    ]),
    new PermEntry('campDashboard', 'لوحة المعسكرات', PermSection.supply, 'الأرصدة والتقارير', _v),

    new PermEntry('stocktake', 'الجرد', PermSection.supply, 'الجرد', [..._doc, PermAction.export]),

    new PermEntry('cables', 'البرقيات', PermSection.supply, 'البرقيات والأرشيف', [
      ..._crud,
      PermAction.print,
    ]),
    // تصريح الاطلاع بدرجة السرية (M-18): السرية لا يرثها المدير — منحٌ صريح.
    new PermEntry('cables.view.normal', 'البرقيات العادية — اطلاع', PermSection.supply, 'البرقيات والأرشيف', _v),
    new PermEntry('cables.view.secret', 'البرقيات السرية — اطلاع', PermSection.supply, 'البرقيات والأرشيف', _v),
    new PermEntry('cables.view.topsecret', 'البرقيات السرية للغاية — اطلاع', PermSection.supply, 'البرقيات والأرشيف', _v),
    // بلاها يرى المستخدم برقيات فرع جهازه وحده (`CableRepo.ownBranchOnly`، v30).
    new PermEntry('cables.view.allBranches', 'البرقيات — كل الفروع', PermSection.supply, 'البرقيات والأرشيف', _v),
    new PermEntry('archive', 'الأرشيف الإلكتروني', PermSection.supply, 'البرقيات والأرشيف', [
      ..._crud,
      PermAction.print,
    ]),

    new PermEntry('personnel', 'القوة البشرية للإمداد والتموين', PermSection.supply, 'الارتباطات', [
      ..._crud,
      PermAction.print,
      PermAction.export,
    ]),
    // «approve»: اعتماد الإخلاء المالي وحذف المُعتمد منه. «import»: استيراد مسيرات العهد.
    new PermEntry('linkages', 'الارتباطات (المالية والتسليح)', PermSection.supply, 'الارتباطات', [
      ..._doc,
      PermAction.export,
      PermAction.import,
    ]),

    new PermEntry('auditTrail', 'سجل التدقيق', PermSection.supply, 'الرقابة', [
      PermAction.view,
      PermAction.export,
      PermAction.print,
    ]),
    new PermEntry('activityIntel', 'ذكاء النشاط', PermSection.supply, 'الرقابة', [
      PermAction.view,
      PermAction.export,
    ]),
    new PermEntry('executiveCmd', 'القيادة التنفيذية', PermSection.supply, 'الرقابة', [
      PermAction.view,
      PermAction.export,
      PermAction.print,
    ]),
    new PermEntry('sensitiveOps', 'المراجعة الحساسة', PermSection.supply, 'الرقابة', [
      PermAction.view,
      PermAction.approve,
    ]),
    new PermEntry('healthOps', 'صحة النظام والعمليات', PermSection.supply, 'الرقابة', _v),

    // ───────── المحروقات ─────────
    new PermEntry('fuelDashboard', 'لوحة المحروقات', PermSection.fuel, 'الرئيسية', _v),
    new PermEntry('fuelMoves', 'حركة المحروقات (صرف/توريد/تحويل/افتتاحي)', PermSection.fuel, 'الحركة', [
      ..._crud,
      PermAction.print,
    ]),
    new PermEntry('fuelAllocations', 'تفريدة المحروقات', PermSection.fuel, 'الحركة', [
      ..._crud,
      PermAction.print,
    ]),
    new PermEntry('fuelWarehouses', 'مستودعات المحروقات', PermSection.fuel, 'البيانات الأساسية', _crud),
    new PermEntry('fuelUnits', 'وحدات المحروقات', PermSection.fuel, 'البيانات الأساسية', _crud),
    new PermEntry('fuelVehicles', 'سجل المركبات', PermSection.fuel, 'البيانات الأساسية', _v),
    new PermEntry('fuelReports', 'تقارير المحروقات (الرسمي والأرصدة والكشف)', PermSection.fuel, 'التقارير', [
      PermAction.view,
      PermAction.print,
    ]),
    new PermEntry('fuelConsumption', 'تقرير استهلاك المحروقات', PermSection.fuel, 'التقارير', [
      PermAction.view,
      PermAction.print,
    ]),
    // «إضافة» فتح أمر جرد، و«تعديل» تسجيل العدّ — تفحصهما الشاشة، فكانا
    // لا يُمنحان لأحدٍ غير المدير (بلاغ 2026-10-26).
    new PermEntry('fuelStocktake', 'جرد المحروقات', PermSection.fuel, 'الجرد', [
      PermAction.view,
      PermAction.create,
      PermAction.edit,
      PermAction.approve,
      PermAction.print,
    ]),
    new PermEntry('fuelSettings', 'إعدادات المحروقات', PermSection.fuel, 'الإعدادات', [
      PermAction.view,
      PermAction.edit,
    ]),

    // ───────── الإدارة ─────────
    new PermEntry('settings', 'الإعدادات والهوية', PermSection.admin, 'الإدارة', [
      PermAction.view,
      PermAction.edit,
    ]),
    new PermEntry('usersAccess', 'المستخدمون والصلاحيات', PermSection.admin, 'الإدارة', [
      PermAction.view,
      PermAction.edit,
      PermAction.approve,
    ]),
    // «اعتماد» = توقيع السندات المحفوظة باسم القائد في الوضع اليدوي. لا يرثها
    // المدير ضمنًا (انظر `ESignPolicy.canSign`).
    new PermEntry('esign', 'التوقيع الإلكتروني للسندات (القائد)', PermSection.admin, 'الإدارة', [
      PermAction.view,
      PermAction.approve,
    ]),
  ];

  static readonly byKey: Readonly<Record<string, PermEntry>> = Object.fromEntries(
    PermCatalog.entries.map((e) => [e.key, e]),
  );

  static readonly labels: Readonly<Record<string, string>> = Object.fromEntries(
    PermCatalog.entries.map((e) => [e.key, e.label]),
  );

  /// أسماء بنود القائمة التي لا صلاحية خاصة بها: تتبع صلاحية صفحةٍ أخرى أو
  /// باب (انظر `_permPage` في الصفحة الرئيسية و`kMenuDoors`). تبقى لها أسماءٌ
  /// تُقرأ في رسائل الرفض والاختبارات.
  static readonly aliasLabels: Readonly<Record<string, string>> = {
    fuelData: 'البيانات الأساسية للمحروقات',
    fuelIssue: 'صرف المحروقات',
    fuelSupply: 'توريد المحروقات',
    fuelTransfer: 'تحويل المحروقات',
    fuelOpening: 'الرصيد الافتتاحي للمحروقات',
  };

  /// مدخلات قسمٍ مجمَّعةً بحسب مجموعة العرض، بترتيب الظهور.
  static groupsOf(section: string): Record<string, PermEntry[]> {
    const out: Record<string, PermEntry[]> = {};
    for (const e of PermCatalog.entries) {
      if (e.section === section) {
        (out[e.group] ??= []).push(e);
      }
    }
    return out;
  }
}
