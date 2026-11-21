/// قيد تغذية المعسكرات: لا تُغذّى إلا من المخزن الرئيسي.
///
/// **لماذا القيد أصلًا:** حين يُحوَّل إلى معسكر من أي مخزن، يصير رصيد المعسكر
/// مجموع تحويلات متفرّقة لا مصدر واحد، فيستحيل مطابقة ما خرج من العهدة بما
/// دخل المعسكر. وبمصدرٍ واحد يصير سجل المعسكر مرآةً لصادر المخزن الرئيسي.
///
/// والقيد يُفحص في طبقة الحفظ لا في القائمة المنسدلة وحدها: إخفاء الخيار من
/// الشاشة تجميل، ومنعُه عند الحفظ هو الحماية.

/// مستودع كما يحتاجه الفحص — بلا ارتباط بجدول.
export class WarehouseRef {
  readonly id: string;
  readonly name: string;
  readonly isMain: boolean;

  constructor({
    id,
    name,
    isMain = false,
  }: {
    readonly id: string;
    readonly name: string;
    readonly isMain?: boolean;
  }) {
    this.id = id;
    this.name = name;
    this.isMain = isMain;
  }
}

export class MainWarehouse {
  private constructor() {}

  static find(warehouses: Iterable<WarehouseRef>): WarehouseRef | null {
    for (const w of warehouses) {
      if (w.isMain) return w;
    }
    return null;
  }

  /// يفحص تحويلًا إلى معسكر. يعيد رسالة المنع، أو `null` إن كان مسموحًا.
  ///
  /// [toCamp] هل وجهة التحويل معسكر؟ التحويل بين مخزنين عاديين لا يخضع لهذا
  /// القيد — المنع عن مسارات مشروعة يدفع المستخدمين إلى الالتفاف عليه.
  static validate({
    fromWarehouse,
    destWarehouse,
    toCamp,
    warehouses,
    fromCamp = false,
  }: {
    readonly fromWarehouse: string;
    readonly destWarehouse: string;
    readonly toCamp: boolean;
    readonly warehouses: Iterable<WarehouseRef>;
    readonly fromCamp?: boolean;
  }): string | null {
    const main = MainWarehouse.find(warehouses);

    // مخزن معسكر لا يُصدِّر بالتحويل: ما زاد عنه يعود **مرتجعًا** لا تحويلًا.
    // والفرق ليس شكليًا: المرتجع يخصم من المُسلَّم في سجل المعسكر فيصحّح
    // رصيد استحقاقه، والتحويل لا يمسّه — فيبدو المعسكر مستلمًا ما ردّه.
    if (fromCamp) {
      return (
        'مخزن المعسكر لا يُحوَّل منه — سجّل ما زاد عنه **مرتجعًا** ' +
        'فيُخصم من حسابه'
      );
    }
    if (!toCamp) return null;

    if (main === null) {
      // لا يُمنع التحويل لغياب إعداد لم يضبطه أحد: الميدان لا يتوقف لأن
      // المدير لم يفتح شاشة الإعدادات. يُنبَّه ويُسمح.
      return null;
    }
    if (fromWarehouse.trim().length === 0) return 'اختر المستودع المُرسِل';
    if (fromWarehouse.trim() !== main.name.trim()) {
      return (
        `تغذية المعسكرات من المخزن الرئيسي «${main.name}» وحده — ` +
        'حوِّل إليه أولًا ثم منه إلى المعسكر'
      );
    }
    if (destWarehouse.trim() === main.name.trim()) {
      return 'وجهة التحويل هي المخزن الرئيسي نفسه';
    }
    return null;
  }

  /// المستودعات التي يجوز الإرسال منها إلى هذه الوجهة.
  static allowedSources({
    toCamp,
    warehouses,
  }: {
    readonly toCamp: boolean;
    readonly warehouses: readonly WarehouseRef[];
  }): WarehouseRef[] {
    if (!toCamp) return [...warehouses];
    const main = MainWarehouse.find(warehouses);
    return main === null ? [...warehouses] : [main];
  }
}
