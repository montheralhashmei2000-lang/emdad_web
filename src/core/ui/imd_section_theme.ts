import { ImdDensity } from './imd_density';
import { ValueNotifier } from './imd_numbers';

/// هل يأخذ قسم المحروقات لوحةَ ألوانٍ مستقلّة عن الإمداد؟
///
/// كان القسم يُطبّق لوحةً برتقاليةً خاصّةً به ([ImdColors.fuelLight] /
/// [ImdColors.fuelDark]) بلا خيار، فيبدو التطبيق الواحد تطبيقَين: ألوانُ
/// الأزرار والروابط والشارات تتبدّل كلّها بتبديل القسم، ومن يعمل في القسمين
/// معًا يرى هويّتَين لا هويّة.
///
/// فالافتراض الآن **موحَّد**: المحروقات بأخضر الإمداد نفسه على وندوز وأندرويد،
/// ومن أراد تمييز القسم باللون أعاده من الإعدادات. واللوحة البرتقالية باقيةٌ
/// كما هي، لا تُحذف — التبديل خيارٌ لا هدم.
///
/// القيمة ساكنة كـ[ImdDensity] و[ImdStyle]: السمة تُبنى في `_themeFor` من
/// قراءةٍ ساكنة، وبعد التبديل تُعاد إدارة الشجرة كلها فتلتقطها.
export class ImdSectionTheme {
  private constructor() {}

  private static readonly _key = 'imdad.theme.fuelIdentity';

  /// يُستمع إليه لإظهار حالة المفتاح في الإعدادات.
  static readonly notifier = new ValueNotifier<boolean>(false);

  /// `true` ⇒ المحروقات بلوحته البرتقالية؛ `false` (الافتراض) ⇒ لوحة الإمداد.
  static get distinctFuel(): boolean {
    return ImdSectionTheme.notifier.value;
  }

  static async load(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(ImdSectionTheme._key);
      const v = raw === 'true';
      if (v !== ImdSectionTheme.notifier.value) {
        ImdSectionTheme.notifier.value = v;
        ImdDensity.rebuildAll();
      }
    } catch {
      // التفضيل كماليّ: تعذّر قراءته يُبقي اللوحة الموحَّدة.
    }
  }

  static async set(on: boolean): Promise<void> {
    if (ImdSectionTheme.notifier.value === on) return;
    ImdSectionTheme.notifier.value = on;
    ImdDensity.rebuildAll();
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(ImdSectionTheme._key, String(on));
    } catch {
      // يسري في الجلسة الحالية على أي حال.
    }
  }

  static toggle(): Promise<void> {
    return ImdSectionTheme.set(!ImdSectionTheme.distinctFuel);
  }
}
