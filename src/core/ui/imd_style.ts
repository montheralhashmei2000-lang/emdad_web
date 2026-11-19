import { ValueNotifier } from './imd_numbers';

/// النمط «الكلاسيكي» الاختياري: مسطّحٌ بلا ظلال وزواياه 2 وخطه أصغر وحدوده
/// رمادية رفيعة — على طريقة أنظمة سطح المكتب التقليدية (DevExpress).
///
/// **اختياريٌّ وفوق السمة لا بديلٌ عنها**: الفاتح والداكن والمحروقات تبقى كما هي
/// وهذا النمط يعدّل الشكل (زوايا/ظلال/خط/خلفية) فوقها. والقيمة ساكنة كـ[ImdDensity]
/// لأن [ImdSizes] دوالُّ قراءةٍ ساكنة؛ وبعد التبديل تُعاد إدارة الشجرة كلها
/// فتلتقطها وتبقى حالة الشاشات.
///
/// كُسر الاستيراد الدائري مع `imd_density.ts`: لا يستورد `imd_style.ts` ملف
/// `imd_density.ts` مباشرة، بل يعلن التغيير عبر `notifier` ليشترك فيه `ImdDensity`.
export class ImdStyle {
  private constructor() {}

  private static readonly _key = 'imdad.style.classic';

  static readonly notifier = new ValueNotifier<boolean>(false);

  static get classic(): boolean {
    return ImdStyle.notifier.value;
  }

  static async load(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(ImdStyle._key);
      const v = raw === 'true';
      if (v !== ImdStyle.notifier.value) {
        ImdStyle.notifier.value = v;
      }
    } catch {
      // التفضيل كماليّ: تعذّر قراءته يُبقي النمط الحديث.
    }
  }

  static async set(on: boolean): Promise<void> {
    if (ImdStyle.notifier.value === on) return;
    ImdStyle.notifier.value = on;
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(ImdStyle._key, String(on));
    } catch {
      // يسري في الجلسة الحالية على أي حال.
    }
  }

  static toggle(): Promise<void> {
    return ImdStyle.set(!ImdStyle.classic);
  }
}
