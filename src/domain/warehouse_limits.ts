/// حدود مخزون الصنف في مستودع — التحويل بين الوحدات وحساب الحالة.
///
/// **المشكلة التي يحلّها هذا الملف كلّه: وحدتان لرقم واحد.**
/// الرصيد محفوظ بوحدة الأساس (حبة، كجم)، والمستخدم يفكّر بوحدة التعامل
/// (كرتون، شوال). فلو خُزّن الحد كما كُتب لقُورن كرتونٌ بحبة وظهر مخزونٌ
/// كافٍ وهو نافد، أو العكس. ولو خُزّن بالأساس وحده لعاد إلى من كتبه رقمًا
/// لا يعرفه.
///
/// فالحلّ: يُخزَّن الحدّ **بالأساس** ويُحفظ معه **معامل وحدة الإدخال**،
/// فتُقارن الأرقام بلغةٍ واحدة وتُعرض بلغة صاحبها.

/// حالة الصنف أمام حدوده.
export enum LimitStatus {
  /// لا حدّ مضبوط — لا حكم.
  none = 'none',

  /// تحت الحد الأدنى.
  low = 'low',

  /// فوق الحد الأعلى — مالٌ مجمَّد ومساحةٌ مشغولة.
  over = 'over',

  /// ضمن الحدين.
  ok = 'ok',
}

export function limitStatusLabel(status: LimitStatus): string {
  switch (status) {
    case LimitStatus.none:
      return 'بلا حدود';
    case LimitStatus.low:
      return 'تحت الأدنى';
    case LimitStatus.over:
      return 'فوق الأعلى';
    case LimitStatus.ok:
      return 'ضمن الحدود';
  }
}

/// نغمة الشارة في الجداول: err | pend | ok | off.
export function limitStatusTone(status: LimitStatus): string {
  switch (status) {
    case LimitStatus.none:
      return 'off';
    case LimitStatus.low:
      return 'err';
    case LimitStatus.over:
      return 'pend';
    case LimitStatus.ok:
      return 'ok';
  }
}

/// مستويات صنفٍ في مستودع بأيام الكفاية — كلها بوحدة الأساس.
export class DaysOfSupply {
  static readonly defaultSupplyDays = 7;
  static readonly defaultCriticalDays = 3;

  static readonly none = new DaysOfSupply({
    dailyNeed: 0,
    dynamicMin: 0,
    reorderLevel: 0,
    criticalLevel: 0,
  });

  /// حاجة القوة كلها في يوم.
  readonly dailyNeed: number;
  readonly dynamicMin: number;
  readonly reorderLevel: number;
  readonly criticalLevel: number;

  constructor({
    dailyNeed,
    dynamicMin,
    reorderLevel,
    criticalLevel,
  }: {
    readonly dailyNeed: number;
    readonly dynamicMin: number;
    readonly reorderLevel: number;
    readonly criticalLevel: number;
  }) {
    this.dailyNeed = dailyNeed;
    this.dynamicMin = dynamicMin;
    this.reorderLevel = reorderLevel;
    this.criticalLevel = criticalLevel;
  }

  /// كم يومًا يكفي [balance] بالحاجة اليومية — `null` بلا حاجة معروفة.
  daysOfCover(balance: number): number | null {
    return this.dailyNeed <= 0
      ? null
      : WarehouseLimits.round(balance <= 0 ? 0 : balance / this.dailyNeed);
  }
}

export interface LimitCheckRow {
  readonly itemId: string;
  readonly min: number;
  readonly max: number;
}

export class WarehouseLimits {
  private constructor() {}

  /// معاملٌ صالح: غير الموجب يُعامَل ١ فلا تُقسم كميةٌ على صفر.
  static safeFactor(factor: number): number {
    return factor > 0 ? factor : 1.0;
  }

  /// من وحدة الإدخال إلى وحدة الأساس.
  static toBase(qty: number, factor: number): number {
    return WarehouseLimits.round(qty * WarehouseLimits.safeFactor(factor));
  }

  /// من وحدة الأساس إلى وحدة العرض.
  static fromBase(base: number, factor: number): number {
    return WarehouseLimits.round(base / WarehouseLimits.safeFactor(factor));
  }

  /// ثلاث منازل تكفي أي وحدة تعامل، وتمنع ذيل الكسور العشرية من الظهور.
  static round(v: number): number {
    const r = Math.round(v * 1000) / 1000;
    return r === 0 ? 0 : r;
  }

  /// حالة الرصيد أمام حدّيه — الثلاثة **بوحدة الأساس**.
  ///
  /// الحد صفرٌ يعني «غير مضبوط» لا «صفر قطعة»: مستودعٌ بلا حدّ أدنى لا يُنبَّه
  /// عليه كلما فرغ صنفٌ لا يعني أحدًا.
  static statusOf({
    balance,
    minStock,
    maxStock,
  }: {
    readonly balance: number;
    readonly minStock: number;
    readonly maxStock: number;
  }): LimitStatus {
    const hasMin = minStock > 0;
    const hasMax = maxStock > 0;
    if (!hasMin && !hasMax) return LimitStatus.none;
    if (hasMin && balance < minStock) return LimitStatus.low;
    if (hasMax && balance > maxStock) return LimitStatus.over;
    return LimitStatus.ok;
  }

  /// كم ينقص لبلوغ الحد الأدنى — صفرٌ إن لم ينقص شيء.
  static shortfall({
    balance,
    minStock,
  }: {
    readonly balance: number;
    readonly minStock: number;
  }): number {
    if (minStock <= 0 || balance >= minStock) return 0;
    return WarehouseLimits.round(minStock - balance);
  }

  /// كم يزيد عن الحد الأعلى.
  static surplus({
    balance,
    maxStock,
  }: {
    readonly balance: number;
    readonly maxStock: number;
  }): number {
    if (maxStock <= 0 || balance <= maxStock) return 0;
    return WarehouseLimits.round(balance - maxStock);
  }

  /// نسبة الامتلاء إلى الحد الأعلى (0..1 فأكثر)، أو `null` بلا حد أعلى.
  ///
  /// منها يُرسم الشريط: رقمٌ وحده لا يُري الفرق بين «قارب الامتلاء» و«تجاوز».
  static fillRatio({
    balance,
    maxStock,
  }: {
    readonly balance: number;
    readonly maxStock: number;
  }): number | null {
    if (maxStock <= 0) return null;
    return balance <= 0 ? 0 : WarehouseLimits.round(balance / maxStock);
  }

  /// تحقّق من سطر حدود قبل حفظه — الأرقام **بوحدة الإدخال**.
  ///
  /// يعيد رسالة الخطأ، أو `null` إن صحّ السطر.
  static validate({
    itemId,
    min,
    max,
  }: {
    readonly itemId: string;
    readonly min: number;
    readonly max: number;
  }): string | null {
    if (itemId.trim().length === 0) return 'اختر الصنف';
    if (min < 0 || max < 0) return 'الحدود لا تكون سالبة';
    if (min === 0 && max === 0) {
      return 'اضبط حدًّا واحدًا على الأقل — أو احذف السطر';
    }
    // الأعلى دون الأدنى يجعل الصنف «تحت الأدنى وفوق الأعلى» معًا، فلا يُفهم
    // منه قرار.
    if (min > 0 && max > 0 && max < min) {
      return 'الحد الأعلى أقل من الأدنى';
    }
    return null;
  }

  // ───────────────────────── الحدود الديناميكية بأيام الكفاية

  /// الحد الأدنى الديناميكي = (حاجة الفرد اليومية × القوة الحالية) × أيام الكفاية.
  ///
  /// [dailyPerPerson] بوحدة الأساس، من الخطة الشهرية أو من المقرر. الحدّ يتبع
  /// القوة: لواءٌ تضاعفت قوته يتضاعف حدّه، وحدٌّ ثابتٌ كُتب لقوةٍ سابقة يُنبّه
  /// متأخرًا.
  static dynamicMin({
    dailyPerPerson,
    strength,
    supplyDays = DaysOfSupply.defaultSupplyDays,
  }: {
    readonly dailyPerPerson: number;
    readonly strength: number;
    readonly supplyDays?: number;
  }): number {
    if (dailyPerPerson <= 0 || strength <= 0 || supplyDays <= 0) return 0;
    return WarehouseLimits.round(dailyPerPerson * strength * supplyDays);
  }

  /// حدّ الخطر الحرج = (حاجة الفرد اليومية × القوة الحالية) × أيام الخطر (٣).
  static criticalLevel({
    dailyPerPerson,
    strength,
    criticalDays = DaysOfSupply.defaultCriticalDays,
  }: {
    readonly dailyPerPerson: number;
    readonly strength: number;
    readonly criticalDays?: number;
  }): number {
    return WarehouseLimits.dynamicMin({
      dailyPerPerson,
      strength,
      supplyDays: criticalDays,
    });
  }

  /// حدودٌ نافذة: حدّ إعادة الطلب هو الأكبر من المضبوط والديناميكي — الحدّ
  /// المكتوب يبقى أرضيةً لا يُنزل تحتها، والديناميكي يرفعها حين تكبر القوة.
  static supplyLevels({
    dailyPerPerson,
    strength,
    staticMin = 0,
    supplyDays = DaysOfSupply.defaultSupplyDays,
    criticalDays = DaysOfSupply.defaultCriticalDays,
  }: {
    readonly dailyPerPerson: number;
    readonly strength: number;
    readonly staticMin?: number;
    readonly supplyDays?: number;
    readonly criticalDays?: number;
  }): DaysOfSupply {
    const dyn = WarehouseLimits.dynamicMin({
      dailyPerPerson,
      strength,
      supplyDays,
    });
    return new DaysOfSupply({
      dailyNeed: WarehouseLimits.round(dailyPerPerson * strength),
      dynamicMin: dyn,
      reorderLevel: dyn > staticMin ? dyn : staticMin,
      criticalLevel: WarehouseLimits.criticalLevel({
        dailyPerPerson,
        strength,
        criticalDays,
      }),
    });
  }

  /// تحقّق من دفعة سطور: التكرار يُفسد الحفظ الجماعي صامتًا.
  ///
  /// آخر سطرٍ لصنفٍ مكرر يدهس ما قبله، فيظن المستخدم أنه ضبط حدّين وقد ضبط
  /// واحدًا — ولا يعلم أيّهما بقي.
  static validateBatch(rows: readonly LimitCheckRow[]): string | null {
    if (rows.length === 0) return 'أضف سطرًا واحدًا على الأقل';
    for (const r of rows) {
      const error = WarehouseLimits.validate({
        itemId: r.itemId,
        min: r.min,
        max: r.max,
      });
      if (error !== null) return error;
    }
    const ids = new Set<string>();
    for (const r of rows) {
      const key = r.itemId.trim();
      if (ids.has(key)) {
        return 'صنف مكرر في الدفعة — ادمج سطريه في سطر واحد';
      }
      ids.add(key);
    }
    return null;
  }
}
