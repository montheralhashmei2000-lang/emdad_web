/// مساحات العمل: الإمداد والتموين، والمحروقات.
///
/// **لماذا مساحتان لا قائمةٌ واحدة؟** القسمان يُشغّلهما شخصان مختلفان: أمين
/// المحروقات لا شأن له بخطط الوجبات ونسب الاستهلاك، وأمين المستودع لا يفتح
/// تفريدة الوقود. وقائمةٌ واحدة تضع أمام كلٍّ منهما ضعفَ ما يحتاج.
///
/// **ولماذا مبدِّل لا بوابة؟** من يملك مساحةً واحدة يدخلها مباشرة بلا شاشة
/// اختيار يضغط فيها على خياره الوحيد كل يوم. والاختيار لا يُسأل عنه إلا من
/// يملك المساحتين، ثم يُحفظ فلا يُسأل مرة أخرى.

export class AppSpace {
  static readonly supply = 'supply';
  static readonly fuel = 'fuel';

  /// بندٌ يظهر في المساحتين — الأدلة والإعدادات والتدقيق.
  static readonly both = 'both';

  static readonly all: readonly string[] = [AppSpace.supply, AppSpace.fuel];

  static readonly labels: Readonly<Record<string, string>> = {
    [AppSpace.supply]: 'الإمداد والتموين',
    [AppSpace.fuel]: 'المحروقات',
  };

  static readonly descriptions: Readonly<Record<string, string>> = {
    [AppSpace.supply]: 'الأصناف والمستودعات والصرف والاستلام والتغذية اليومية والتقارير',
    [AppSpace.fuel]: 'تفريدة الوقود وصرفه وتوريده وتحويله وجرده وسجل المركبات',
  };

  static readonly icons: Readonly<Record<string, string>> = {
    [AppSpace.supply]: 'package',
    [AppSpace.fuel]: 'zap',
  };

  static label(v: string): string {
    return AppSpace.labels[v] ?? v;
  }

  /// هل يظهر بندٌ مساحتُه [itemSpace] داخل المساحة [current]؟
  static shows(itemSpace: string, current: string): boolean {
    return itemSpace === AppSpace.both || itemSpace === current;
  }

  /// صفحات كل مساحة — ما يُسأل عنه لمعرفة ما يملكه المستخدم.
  ///
  /// المشتركة ليست دليلًا على امتلاك مساحة: من يملك الإعدادات وحدها لا يُقال
  /// إنه صاحب قسم محروقات، وإلا رأى مساحةً فارغة إلا من إعداداتٍ عامة.
  static readonly pages: Readonly<Record<string, readonly string[]>> = {
    [AppSpace.fuel]: [
      'fuelDashboard',
      'fuelAllocations',
      'fuelMoves',
      'fuelStocktake',
      'fuelData',
      'fuelWarehouses',
      'fuelUnits',
      'fuelVehicles',
      'fuelReports',
      'fuelConsumption',
    ],
    [AppSpace.supply]: [
      'items',
      'stores',
      'units',
      'suppliers',
      'kitchens',
      'assets',
      'receive',
      'issue',
      'transfer',
      'returns',
      'opening',
      'destruction',
      'rationOrders',
      'pendingOrders',
      'feeding',
      'mealPlans',
      'kitchenLog',
      'ratios',
      'balances',
      'stocktake',
      'reports',
      'personnel',
      'linkages',
    ],
  };

  /// المساحات التي يملك المستخدم شيئًا فيها فعلًا.
  ///
  /// [can] تُجيب: هل له صلاحية عرض هذه الصفحة؟
  static availableFor(can: (page: string) => boolean): string[] {
    return AppSpace.all.filter((space) => AppSpace.pages[space]!.some(can));
  }

  /// المساحة التي يُفتح عليها التطبيق.
  ///
  /// يعود `null` حين يملك المستخدم مساحتين ولم يختر بعد — وحدها الحالة التي
  /// تستدعي سؤاله. وإن كان المحفوظ لم يعد متاحًا (تغيّرت صلاحياته) لم يُحبس
  /// في مساحةٍ لا يرى فيها شيئًا.
  static resolve({
    available,
    saved,
  }: {
    available: readonly string[];
    saved?: string | null;
  }): string | null {
    if (available.length === 0) return null;
    if (available.length === 1) return available[0];
    if (saved != null && available.includes(saved)) return saved;
    return null;
  }
}
