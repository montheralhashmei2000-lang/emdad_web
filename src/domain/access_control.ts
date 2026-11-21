/// الأدوار ونطاق المستودعات — نقل مطابق لـ access-control.js.
/// • قوالب أدوار جاهزة تُجمع لمستخدم واحد (مدخل بيانات، أمين مخزن، ركن إمداد، مدير مكتب، مطّلع).
/// • نطاق المستودعات: كل المستودعات أو قائمة محددة، ويُطبَّق على الإدخال والسجلات والتقارير والأرصدة.
/// • مدير النظام (role = admin) يملك كل الصلاحيات ولا يخضع للنطاق.
import { PermAction } from './perm_action';
import { PermCatalog } from './perm_catalog';
import { SectionBlock } from './section_block';

export { PermAction } from './perm_action';

/// أدوار الحساب (عمود `users.role`).
///
/// • `owner`: المالك — كل الصلاحيات ومعها `sys.*`، ولا يُعدَّل من أحد.
/// • `admin`: مدير النظام — كل صلاحيات الصفحات، **بلا** `sys.*`.
/// • `user`: مستخدم عادي — بحسب صلاحياته المخزَّنة.
///
/// القيمة القديمة `admin` تبقى كما هي، فلا ترحيل لها: المالك أضيف فوقها.
export class UserRole {
  private constructor() {}

  static readonly owner = 'owner';
  static readonly admin = 'admin';
  static readonly user = 'user';

  /// يملك كل صلاحيات الصفحات (مالك أو مدير).
  static isAdmin(role?: string | null): boolean {
    return role === UserRole.admin || role === UserRole.owner;
  }

  static isOwner(role?: string | null): boolean {
    return role === UserRole.owner;
  }

  static label(role?: string | null): string {
    switch (role) {
      case UserRole.owner:
        return 'المالك';
      case UserRole.admin:
        return 'مدير النظام';
      default:
        return 'مستخدم';
    }
  }
}

/// الصلاحيات الخاصة بالنظام (`sys.*`) — **للمالك وحده**.
///
/// ليست في كتالوج الصلاحيات ولا في القوالب ولا في مصفوفة الصلاحيات، ولا تُقرأ
/// من `users.permissions` إطلاقًا: فمفتاحٌ `sys.backup: true` يصل بمزامنةٍ أو
/// بملف استعادة أو بتعديلٍ يدوي للقاعدة **لا أثر له** (فشلٌ مغلق). الفحص دور
/// الحساب `UserRole.owner` لا غير.
export class SysPerm {
  private constructor() {}

  static readonly prefix = 'sys.';

  /// تعديل صلاحيات الآخرين وأدوارهم وحجب الأقسام.
  static readonly permissions = 'sys.permissions';

  /// منح دور مدير النظام، وحذف المستخدمين وتعطيلهم، وإعادة كلمة مرور مدير.
  static readonly users = 'sys.users';

  /// النسخ الاحتياطي الكامل (تصدير واستعادة وجدولة) والإعادة المحلية واستيراد
  /// حسابات المستخدمين بالجملة.
  static readonly backup = 'sys.backup';

  /// تفعيل الأجهزة: إصدار الرموز والإلغاء والمفتاح الخاص.
  static readonly devices = 'sys.devices';

  /// المزامنة: الاقتران والمفاتيح الدائمة واستقبال الحسابات.
  static readonly sync = 'sys.sync';

  /// الإعدادات الحساسة: قواعد المحرك ومفتاح التوقيع والأرشفة التلقائية.
  static readonly settingsSensitive = 'sys.settingsSensitive';

  static readonly labels: Readonly<Record<string, string>> = {
    [SysPerm.permissions]: 'تعديل الصلاحيات والأدوار وحجب الأقسام',
    [SysPerm.users]: 'منح دور المدير وحذف المستخدمين وتعطيلهم',
    [SysPerm.backup]: 'النسخ الاحتياطي الكامل واستيراد المستخدمين',
    [SysPerm.devices]: 'تفعيل الأجهزة',
    [SysPerm.sync]: 'المزامنة والاقتران',
    [SysPerm.settingsSensitive]: 'الإعدادات الحساسة (القواعد والتوقيع والأرشفة)',
  };

  static get all(): string[] {
    return Object.keys(SysPerm.labels);
  }

  static isSys(page: string): boolean {
    return page.startsWith(SysPerm.prefix);
  }
}

/// صلاحيات على شكل: { 'receive': {'view': true, 'create': true}, ... }
export type PermissionMap = Record<string, Record<string, boolean>>;

export class RoleTemplate {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly permissions: PermissionMap;

  constructor({
    id,
    label,
    description,
    permissions,
  }: {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly permissions: PermissionMap;
  }) {
    this.id = id;
    this.label = label;
    this.description = description;
    this.permissions = permissions;
  }
}

function grant(pages: readonly string[], actions: readonly string[]): PermissionMap {
  const out: PermissionMap = {};
  for (const p of pages) {
    const acts: Record<string, boolean> = {};
    for (const a of actions) {
      acts[a] = true;
    }
    out[p] = acts;
  }
  return out;
}

function merge(maps: readonly PermissionMap[]): PermissionMap {
  const out: PermissionMap = {};
  for (const m of maps) {
    for (const [page, actions] of Object.entries(m)) {
      const target = (out[page] ??= {});
      for (const [action, allowed] of Object.entries(actions)) {
        if (allowed) target[action] = true;
      }
    }
  }
  return out;
}

const BASIC_PAGES: readonly string[] = [
  'dashboard',
  'items',
  'suppliers',
  'units',
  'stores',
  'kitchens',
  'assets',
  'supplyAuthorities',
];

const FUEL_PAGES: readonly string[] = [
  'fuelDashboard',
  'fuelAllocations',
  'fuelMoves',
  'fuelStocktake',
  'fuelWarehouses',
  'fuelUnits',
  'fuelSettings',
  'fuelVehicles',
  'fuelReports',
  'fuelConsumption',
];

const OPS_PAGES: readonly string[] = [
  'receive',
  'issue',
  'transfer',
  'returns',
  'rationOrders',
];

const SUPPLY_READ_PAGES: readonly string[] = [
  'balances',
  'reports',
  'actualEntitlement',
  'campLedger',
];

const POSITIONS: Readonly<Record<string, RoleTemplate>> = {
  supply_head: new RoleTemplate({
    id: 'supply_head',
    label: 'رئيس شعبة الإمداد والتموين',
    description:
      'اطلاعٌ كامل على الإمداد والمحروقات وطباعتها وتصديرها، واعتماد القرارات الكبرى: ' +
      'الطلبيات وأوامر التوريد والجرد والإتلاف والأرصدة الافتتاحية وتصفية الشهر وخطط الوجبات ' +
      'والإخلاء المالي والمراجعة الحساسة — بلا إدخال سندات ولا تعديلها ولا حذف',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(OPS_PAGES, [PermAction.view, PermAction.print]),
      grant(['rationOrders', 'pendingOrders', 'opening', 'destruction'], [
        PermAction.view,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['stocktake'], [PermAction.view, PermAction.approve, PermAction.print, PermAction.export]),
      grant(['feeding', 'kitchenLog', 'ratios'], [PermAction.view, PermAction.print, PermAction.export]),
      grant(['mealPlans'], [PermAction.view, PermAction.approve, PermAction.print, PermAction.export]),
      grant(SUPPLY_READ_PAGES, [PermAction.view, PermAction.print, PermAction.export]),
      grant(['campDashboard', 'healthOps'], [PermAction.view]),
      grant(['campSettlement'], [PermAction.view, PermAction.approve]),
      grant(['documents'], [PermAction.view, PermAction.print]),
      grant(['cables', 'archive'], [PermAction.view, PermAction.print]),
      grant(['cables.view.normal', 'cables.view.allBranches'], [PermAction.view]),
      grant(['personnel'], [PermAction.view, PermAction.print, PermAction.export]),
      grant(['linkages'], [PermAction.view, PermAction.approve, PermAction.print, PermAction.export]),
      grant(['auditTrail', 'executiveCmd'], [PermAction.view, PermAction.print, PermAction.export]),
      grant(['activityIntel'], [PermAction.view, PermAction.export]),
      grant(['sensitiveOps'], [PermAction.view, PermAction.approve]),
      grant(['healthOps'], [PermAction.view]),
      grant(FUEL_PAGES, [PermAction.view]),
      grant(['fuelReports', 'fuelConsumption', 'fuelAllocations'], [PermAction.view, PermAction.print]),
      grant(['fuelStocktake'], [PermAction.view, PermAction.approve, PermAction.print]),
    ]),
  }),
  supply_deputy: new RoleTemplate({
    id: 'supply_deputy',
    label: 'نائب رئيس الشعبة / ركن إمداد الفرقة',
    description:
      'تخطيط الإمداد على مستوى الفرقة: نسب الاستحقاق وخطط الوجبات واعتمادها، وطلبيات ' +
      'الإعاشة والتحويل إلى المعسكرات واعتمادها، وسجل المعسكرات وتصفيته، والتفريدة، والتقارير — ' +
      'ومشاهدة المحروقات وتقاريرها',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(['units', 'kitchens', 'supplyAuthorities'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
      ]),
      grant(OPS_PAGES, [PermAction.view, PermAction.print]),
      grant(['issue'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['transfer', 'rationOrders'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['pendingOrders'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['feeding', 'kitchenLog'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['ratios'], [PermAction.view, PermAction.edit, PermAction.print, PermAction.export]),
      grant(['mealPlans'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['campLedger'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['campSettlement'], [PermAction.view, PermAction.approve]),
      grant(['balances', 'reports', 'actualEntitlement'], [
        PermAction.view,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['campDashboard'], [PermAction.view]),
      grant(['stocktake'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['documents'], [PermAction.view, PermAction.print]),
      grant(['cables'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.print]),
      grant(['cables.view.normal', 'cables.view.allBranches'], [PermAction.view]),
      grant(['executiveCmd'], [PermAction.view, PermAction.print]),
      grant(FUEL_PAGES, [PermAction.view]),
      grant(['fuelReports', 'fuelConsumption', 'fuelAllocations'], [PermAction.view, PermAction.print]),
    ]),
  }),
  camp_supply_officer: new RoleTemplate({
    id: 'camp_supply_officer',
    label: 'ركن إمداد معسكر',
    description:
      'إمداد المعسكر في نطاق مخزنه: التفريدة اليومية وسجل الطهي وخطط وجبات المعسكر ' +
      '(بلا تنشيط)، ورفع طلبيات الإعاشة، والصرف من مخزن المعسكر لوحداته ومطابخه واعتماده، ' +
      'والمرتجعات، واعتماد جرده، وحساب استحقاقه — احصره بمخزن معسكره من «نطاق المستودعات»',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(['units', 'kitchens'], [PermAction.view, PermAction.create, PermAction.edit]),
      grant(['receive', 'transfer'], [PermAction.view, PermAction.print]),
      grant(['issue'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['returns', 'rationOrders'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
      ]),
      grant(['pendingOrders'], [PermAction.view, PermAction.print]),
      grant(['feeding', 'kitchenLog'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['mealPlans'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.print]),
      grant(['ratios'], [PermAction.view, PermAction.print]),
      grant(['balances', 'actualEntitlement', 'campLedger'], [
        PermAction.view,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['campDashboard', 'campSettlement'], [PermAction.view]),
      grant(['reports'], [PermAction.view, PermAction.print]),
      grant(['stocktake'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['documents'], [PermAction.view, PermAction.print]),
    ]),
  }),
  fuel_division_officer: new RoleTemplate({
    id: 'fuel_division_officer',
    label: 'مسؤول محروقات الفرقة',
    description:
      'قسم المحروقات كاملًا على مستوى الفرقة: التفريدة وتوزيعها على الوحدات، والصرف ' +
      'والتوريد والتحويل، والجرد واعتماده، والمستودعات والوحدات والإعدادات والتقارير — بلا الإمداد',
    permissions: merge([
      grant(FUEL_PAGES, [PermAction.view]),
      grant(['fuelMoves', 'fuelAllocations'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.delete,
        PermAction.print,
      ]),
      grant(['fuelWarehouses', 'fuelUnits'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.delete,
      ]),
      grant(['fuelReports', 'fuelConsumption'], [PermAction.view, PermAction.print]),
      grant(['fuelStocktake'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['fuelSettings'], [PermAction.view, PermAction.edit]),
    ]),
  }),
  fuel_camp_keeper: new RoleTemplate({
    id: 'fuel_camp_keeper',
    label: 'مسؤول / أمين محروقات معسكر',
    description:
      'خزّان المعسكر وحده: صرف المحروقات بالاستحقاق وتوريدها وتحويلها وطباعة سنداتها، ' +
      'وعدّ الجرد (اعتماده لمسؤول الفرقة)، وتقارير الخزّان — بلا تعديل التفريدة ولا الإعدادات. ' +
      'احصره بخزّانه من «نطاق المستودعات» (⛽)',
    permissions: merge([
      grant(FUEL_PAGES, [PermAction.view]),
      grant(['fuelMoves'], [PermAction.view, PermAction.create, PermAction.print]),
      grant(['fuelAllocations'], [PermAction.view, PermAction.print]),
      grant(['fuelStocktake'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.print]),
      grant(['fuelReports', 'fuelConsumption'], [PermAction.view, PermAction.print]),
    ]),
  }),
  main_storekeeper: new RoleTemplate({
    id: 'main_storekeeper',
    label: 'أمين مخازن الإمداد الرئيسي',
    description:
      'المخزن الرئيسي: الاستلام من الموردين والصرف والتحويل إلى المخازن الفرعية والمرتجعات ' +
      'واعتمادها وطباعتها، والأرصدة الافتتاحية، ومحاضر الإتلاف (بلا اعتماد)، والجرد، وتنفيذ أوامر ' +
      'التوريد، وإدارة الكتالوج بلا حذف — بلا المحروقات ولا اعتماد الطلبيات',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(['items'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
        PermAction.import,
      ]),
      grant(['suppliers'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.export]),
      grant(['units'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['kitchens', 'assets', 'supplyAuthorities'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
      ]),
      grant(['receive', 'issue', 'transfer', 'returns'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['rationOrders'], [PermAction.view, PermAction.print]),
      grant(['pendingOrders'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['opening'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.print]),
      grant(['destruction'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.print]),
      grant(['stocktake'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['balances', 'reports'], [PermAction.view, PermAction.print, PermAction.export]),
      grant(['campDashboard'], [PermAction.view]),
      grant(['documents'], [PermAction.view, PermAction.print, PermAction.edit]),
    ]),
  }),
  sub_storekeeper: new RoleTemplate({
    id: 'sub_storekeeper',
    label: 'أمين مخزن فرعي',
    description:
      'المخزن الفرعي في نطاقه: استلام التحويلات الواردة، والصرف للوحدات والمطابخ واعتماده، ' +
      'وإرجاع الفائض إلى الرئيسي، والمرتجعات، ورفع الطلبيات، وعدّ الجرد، وتحرير محضر الإتلاف — ' +
      'بلا الكتالوج ولا الأرصدة الافتتاحية. احصره بمخزنه من «نطاق المستودعات»',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(['receive'], [PermAction.view, PermAction.create, PermAction.print]),
      grant(['issue'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['transfer', 'returns', 'rationOrders'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
      ]),
      grant(['pendingOrders'], [PermAction.view, PermAction.print]),
      grant(['destruction'], [PermAction.view, PermAction.create, PermAction.print]),
      grant(['stocktake'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.print]),
      grant(['kitchenLog'], [PermAction.view, PermAction.create]),
      grant(['balances', 'reports'], [PermAction.view, PermAction.print]),
      grant(['documents'], [PermAction.view, PermAction.print]),
    ]),
  }),
  supply_office_manager: new RoleTemplate({
    id: 'supply_office_manager',
    label: 'مدير مكتب شعبة الإمداد / مكتب إمداد الفرقة',
    description:
      'المكتب: البرقيات العادية والأرشيف الإلكتروني إدخالًا وتعديلًا وطباعة، والقوة البشرية، ' +
      'والاطلاع على السندات والتقارير والارتباطات المالية والمحروقات وطباعتها وتصديرها — بلا سندات ' +
      'مخزنية ولا اعتماد',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(OPS_PAGES, [PermAction.view, PermAction.print]),
      grant(['pendingOrders', 'stocktake', 'destruction', 'opening'], [
        PermAction.view,
        PermAction.print,
      ]),
      grant(['feeding', 'mealPlans', 'kitchenLog', 'ratios'], [PermAction.view, PermAction.print]),
      grant(SUPPLY_READ_PAGES, [PermAction.view, PermAction.print, PermAction.export]),
      grant(['campDashboard'], [PermAction.view]),
      grant(['documents'], [PermAction.view, PermAction.print]),
      grant(['cables', 'archive'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
      ]),
      grant(['cables.view.normal', 'cables.view.allBranches'], [PermAction.view]),
      grant(['personnel'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['linkages'], [PermAction.view, PermAction.print, PermAction.export]),
      grant(['executiveCmd', 'auditTrail'], [PermAction.view, PermAction.print]),
      grant(['fuelDashboard'], [PermAction.view]),
      grant(['fuelAllocations', 'fuelReports', 'fuelConsumption'], [
        PermAction.view,
        PermAction.print,
      ]),
    ]),
  }),
  branch_office_manager: new RoleTemplate({
    id: 'branch_office_manager',
    label: 'مدير مكتب إمداد فرع',
    description:
      'مكتب الفرع في نطاقه: البرقيات العادية والأرشيف إدخالًا وطباعة، والقوة البشرية للفرع، ' +
      'والاطلاع على سندات الفرع وأرصدته وتفريدته وحساب استحقاقه وطباعتها — بلا سندات ولا اعتماد',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(OPS_PAGES, [PermAction.view, PermAction.print]),
      grant(['stocktake'], [PermAction.view, PermAction.print]),
      grant(['feeding', 'mealPlans'], [PermAction.view, PermAction.print]),
      grant(['balances', 'reports', 'actualEntitlement', 'campLedger'], [
        PermAction.view,
        PermAction.print,
      ]),
      grant(['documents'], [PermAction.view, PermAction.print]),
      grant(['cables', 'archive'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
      ]),
      grant(['cables.view.normal'], [PermAction.view]),
      grant(['personnel'], [PermAction.view, PermAction.create, PermAction.edit, PermAction.print]),
    ]),
  }),
};

const TEMPLATES: Readonly<Record<string, RoleTemplate>> = {
  data_entry: new RoleTemplate({
    id: 'data_entry',
    label: 'مدخل بيانات',
    description:
      'إضافة سندات وتفريدات وسجلات جديدة فقط في مستودعات نطاقه — دون تعديل ما سُجّل أو حذفه أو اعتماده',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(OPS_PAGES, [PermAction.view, PermAction.create]),
      grant(['feeding', 'kitchenLog', 'mealPlans'], [PermAction.view, PermAction.create]),
      grant(['balances', 'pendingOrders'], [PermAction.view]),
      grant(['documents'], [PermAction.view]),
      grant(['stocktake'], [PermAction.view, PermAction.create]),
    ]),
  }),
  storekeeper: new RoleTemplate({
    id: 'storekeeper',
    label: 'أمين مخزن',
    description:
      'الاستلام والصرف والتحويل والمرتجعات والجرد واعتمادها وطباعتها، وإدارة الكتالوج (الأصناف والموردون والوحدات…) والأرصدة والتقارير، في مستودعات نطاقه',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(['items'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
        PermAction.import,
      ]),
      grant(['suppliers'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.export,
      ]),
      grant(['kitchens', 'assets'], [PermAction.view, PermAction.create, PermAction.edit]),
      grant(['units'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(OPS_PAGES, [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['pendingOrders'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['rationOrders'], [PermAction.view, PermAction.print]),
      grant(['supplyAuthorities'], [PermAction.view, PermAction.create, PermAction.edit]),
      grant(['opening'], [PermAction.view, PermAction.create, PermAction.print]),
      grant(['destruction'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
      ]),
      grant(['balances'], [PermAction.view, PermAction.print, PermAction.export]),
      grant(['campDashboard'], [PermAction.view]),
      grant(['stocktake'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
      ]),
      grant(['reports'], [PermAction.view, PermAction.print, PermAction.export]),
      grant(['documents'], [PermAction.view, PermAction.print, PermAction.edit]),
    ]),
  }),
  supply_officer: new RoleTemplate({
    id: 'supply_officer',
    label: 'ركن إمداد',
    description: 'التخطيط والتغذية والاستحقاقات وأوامر الصرف ومتابعة الأرصدة والتقارير',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(['units', 'kitchens'], [PermAction.view, PermAction.create, PermAction.edit]),
      grant(OPS_PAGES, [PermAction.view, PermAction.print]),
      grant(['issue'], [PermAction.view, PermAction.create, PermAction.approve, PermAction.print]),
      grant(['pendingOrders'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['feeding', 'kitchenLog'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['ratios'], [PermAction.view, PermAction.edit, PermAction.print, PermAction.export]),
      grant(['mealPlans'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['campLedger', 'campDashboard'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['campSettlement'], [PermAction.view, PermAction.approve]),
      grant(['balances', 'reports', 'actualEntitlement'], [
        PermAction.view,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['stocktake'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['documents'], [PermAction.view, PermAction.print]),
    ]),
  }),
  fuel_keeper: new RoleTemplate({
    id: 'fuel_keeper',
    label: 'أمين المحروقات',
    description:
      'قسم المحروقات وحده: التفريدة والصرف والتوريد والتحويل والجرد والتقارير — بلا أي صلاحية على الإمداد',
    permissions: merge([
      grant(['fuelDashboard', 'fuelVehicles'], [PermAction.view]),
      grant(['fuelMoves', 'fuelAllocations'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.delete,
        PermAction.print,
      ]),
      grant(['fuelWarehouses', 'fuelUnits'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.delete,
      ]),
      grant(['fuelReports', 'fuelConsumption'], [PermAction.view, PermAction.print]),
      grant(['fuelStocktake'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.approve,
        PermAction.print,
      ]),
      grant(['fuelSettings'], [PermAction.view, PermAction.edit]),
    ]),
  }),
  finance: new RoleTemplate({
    id: 'finance',
    label: 'المالية',
    description:
      'الارتباطات: القوة البشرية والمالية (السندات والعهد والعقود والمسيرات والإخلاء) وطباعتها وتصديرها واستيرادها',
    permissions: merge([
      grant(['personnel'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.delete,
        PermAction.print,
        PermAction.export,
      ]),
      grant(['linkages'], [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.delete,
        PermAction.approve,
        PermAction.print,
        PermAction.export,
        PermAction.import,
      ]),
    ]),
  }),
  office_manager: new RoleTemplate({
    id: 'office_manager',
    label: 'مدير مكتب',
    description: 'اطلاع شامل وطباعة وتصدير واعتماد، دون إدخال أو تعديل أو حذف',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(OPS_PAGES, [PermAction.view, PermAction.print]),
      grant(['pendingOrders'], [PermAction.view, PermAction.approve, PermAction.print]),
      grant(['feeding', 'kitchenLog', 'ratios', 'mealPlans'], [
        PermAction.view,
        PermAction.print,
        PermAction.export,
      ]),
      grant(
        [
          'balances',
          'reports',
          'actualEntitlement',
          'campLedger',
          'campDashboard',
          'auditTrail',
          'executiveCmd',
        ],
        [PermAction.view, PermAction.print, PermAction.export],
      ),
      grant(['stocktake'], [PermAction.view, PermAction.approve, PermAction.print, PermAction.export]),
      grant(['sensitiveOps'], [PermAction.view]),
      grant(['documents'], [PermAction.view, PermAction.print]),
    ]),
  }),
  viewer: new RoleTemplate({
    id: 'viewer',
    label: 'مطّلع',
    description: 'مشاهدة البيانات والأرصدة والتقارير فقط',
    permissions: merge([
      grant(BASIC_PAGES, [PermAction.view]),
      grant(OPS_PAGES, [PermAction.view]),
      grant(['balances', 'reports', 'actualEntitlement', 'documents', 'stocktake', 'mealPlans'], [
        PermAction.view,
      ]),
    ]),
  }),
  ...POSITIONS,
};

function filterCatalogOnly(map: Readonly<Record<string, Readonly<Record<string, boolean>>>>): PermissionMap {
  const out: PermissionMap = {};
  for (const [key, acts] of Object.entries(map)) {
    const entry = PermCatalog.byKey[key];
    if (!entry) continue;
    const filtered: Record<string, boolean> = {};
    for (const [action, val] of Object.entries(acts)) {
      if (entry.actions.includes(action)) {
        filtered[action] = val;
      }
    }
    out[key] = filtered;
  }
  return out;
}

export class AccessControl {
  static readonly basicPages: readonly string[] = BASIC_PAGES;
  static readonly fuelPages: readonly string[] = FUEL_PAGES;
  static readonly opsPages: readonly string[] = OPS_PAGES;
  static readonly supplyReadPages: readonly string[] = SUPPLY_READ_PAGES;
  static readonly positions: Readonly<Record<string, RoleTemplate>> = POSITIONS;

  static grant(pages: readonly string[], actions: readonly string[]): PermissionMap {
    return grant(pages, actions);
  }

  static merge(maps: readonly PermissionMap[]): PermissionMap {
    return merge(maps);
  }

  static catalogOnly(
    map: Readonly<Record<string, Readonly<Record<string, boolean>>>>,
  ): PermissionMap {
    return filterCatalogOnly(map);
  }

  static readonly roles: Readonly<Record<string, RoleTemplate>> = Object.fromEntries(
    Object.values(TEMPLATES).map((r) => [
      r.id,
      new RoleTemplate({
        id: r.id,
        label: r.label,
        description: r.description,
        permissions: filterCatalogOnly(r.permissions),
      }),
    ]),
  );

  /// صلاحيات مجموعة أدوار مجتمعة.
  static permissionsForRoles(roleIds: readonly string[]): PermissionMap {
    const list: PermissionMap[] = [];
    for (const id of roleIds) {
      const tpl = AccessControl.roles[id];
      if (tpl) list.push(tpl.permissions);
    }
    return merge(list);
  }

  /// هل تسمح خريطة إجراءات صفحةٍ ([pageActions]) بـ[action]؟
  ///
  /// **توافقٌ مع ما قبل «import»:** الاستيراد كان يُحرس بـ«إضافة»، فمن لم
  /// يُذكر له مفتاح `import` صراحةً (لا `true` ولا `false`) يرث صلاحية
  /// «إضافة» كما كانت — فلا يفقد أحدٌ قدرةً كانت له. وإن حدّد المالك
  /// `import` صراحةً (تفعيلًا أو إلغاءً) فهو الحكم.
  static allows(pageActions: Readonly<Record<string, unknown>> | null | undefined, action: string): boolean {
    if (pageActions == null) return false;
    if (
      action === PermAction.import &&
      !Object.prototype.hasOwnProperty.call(pageActions, PermAction.import)
    ) {
      return pageActions[PermAction.create] === true;
    }
    return pageActions[action] === true;
  }

  /// فحص صلاحية صفحة/إجراء.
  static can({
    isAdmin,
    permissions,
    page,
    action = PermAction.view,
    isOwner = false,
    sectionBlocked = null,
  }: {
    readonly isAdmin: boolean;
    readonly permissions: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
    readonly page: string;
    readonly action?: string;
    readonly isOwner?: boolean;
    readonly sectionBlocked?: string | null;
  }): boolean {
    if (SysPerm.isSys(page)) return isOwner;
    if (
      SectionBlock.blocksPage({
        role: isOwner ? 'owner' : 'user',
        blockedJson: sectionBlocked,
        page,
      })
    ) {
      return false;
    }
    if (isAdmin) return true;
    return AccessControl.allows(permissions[page], action);
  }

  /// هل يملك المستخدم أي صلاحية إدارة على الصفحة (إضافة/تعديل/حذف/اعتماد)؟
  static canManage({
    isAdmin,
    permissions,
    page,
  }: {
    readonly isAdmin: boolean;
    readonly permissions: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
    readonly page: string;
  }): boolean {
    if (isAdmin) return true;
    const p = permissions[page];
    if (!p) return false;
    return [PermAction.create, PermAction.edit, PermAction.delete, PermAction.approve].some(
      (a) => p[a] === true,
    );
  }

  /// نطاق المستودعات: null ⇒ كل المستودعات.
  static canUseWarehouse({
    isAdmin,
    scope,
    warehouse,
  }: {
    readonly isAdmin: boolean;
    readonly scope: readonly string[] | null;
    readonly warehouse: string;
  }): boolean {
    if (isAdmin || scope == null) return true;
    if (warehouse.length === 0) return true;
    return scope.includes(warehouse);
  }

  /// نطاق مستودعات المحروقات — **اختياريٌّ بالتصريح**.
  static canUseFuelWarehouse({
    isAdmin,
    scope,
    fuelWarehouses,
    warehouse,
  }: {
    readonly isAdmin: boolean;
    readonly scope: readonly string[] | null;
    readonly fuelWarehouses: Iterable<string>;
    readonly warehouse: string;
  }): boolean {
    if (isAdmin || scope == null || warehouse.length === 0) return true;
    const names = new Set(fuelWarehouses);
    if (!scope.some((s) => names.has(s))) return true;
    return scope.includes(warehouse);
  }

  /// المعسكرات التي يعمل عليها مستخدمٌ بنطاق مستودعاته، أو `null` = كلها.
  static campScope({
    isAdmin,
    scope,
    warehouses,
  }: {
    readonly isAdmin: boolean;
    readonly scope: readonly string[] | null;
    readonly warehouses: Iterable<{
      readonly name: string;
      readonly feedsAllCamps: boolean;
      readonly campIds: readonly string[];
    }>;
  }): Set<string> | null {
    if (isAdmin || scope == null) return null;
    const camps = new Set<string>();
    for (const w of warehouses) {
      if (!scope.includes(w.name)) continue;
      if (w.feedsAllCamps) return null;
      for (const c of w.campIds) camps.add(c);
    }
    return camps.size === 0 ? null : camps;
  }

  static filterWarehouses({
    isAdmin,
    scope,
    all,
  }: {
    readonly isAdmin: boolean;
    readonly scope: readonly string[] | null;
    readonly all: readonly string[];
  }): string[] {
    if (isAdmin || scope == null) return [...all];
    return all.filter((w) => scope.includes(w));
  }
}
