import { ValueNotifier } from './imd_numbers';
import { ImdStyle } from './imd_style';

/// وضع «الكثافة العالية»: صفوفٌ ومسافاتٌ أضيق ليتّسع الجدول لبياناتٍ أكثر.
///
/// **القيمة ساكنة لا سياقية** كـ[ImdBp.touch]: مقاسات [ImdSizes] دوالُّ قراءةٍ
/// ساكنة تُستدعى من مئات المواضع، فتحويلها كلها إلى `context` يكسر توقيعاتها.
/// وبعد التبديل تُعاد إدارة الشجرة كلها بـ[rebuildAll] فتلتقط القيمة الجديدة
/// وتبقى حالة الشاشات كما هي.
///
/// **لا يمسّ أهداف اللمس**: على الجوال (أندرويد) تبقى الحقول والأزرار بمقاسها
/// المريح للإصبع، والتضييق يقع على حشوات الجداول والصفحات وحدها.
///
/// كُسر الاستيراد الدائري مع `imd_tokens.ts`: يقرأ `ImdDensity` حالة اللمس
/// مباشرةً عبر `@media (hover: none) and (pointer: coarse)` بدل استيراد `ImdBp`
/// من `imd_tokens.ts`، ليبقى الاعتماد أحادي الاتجاه (`imd_density` ← `imd_tokens`).
export class ImdDensity {
  private constructor() {}

  private static readonly _key = 'imdad.density.high';

  /// يُستمع إليه لإظهار حالة المفتاح (شريط الحالة).
  static readonly notifier = new ValueNotifier<boolean>(false);

  private static readonly _rebuildListeners = new Set<() => void>();
  private static _rebuildScheduled = false;

  static get isHigh(): boolean {
    return ImdDensity.notifier.value;
  }

  /// كشف اللمس (`@media (hover:none) and (pointer:coarse)` في المصدر).
  static isTouchDevice(): boolean {
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      }
    } catch {
      // بيئة غير متصفحية (اختبارات Node/Vitest)
    }
    return false;
  }

  /// الكثافة العالية فعّالةٌ فعلًا: على اللمس لا تُضيَّق الأهداف.
  static get compactTargets(): boolean {
    return ImdDensity.isHigh && !ImdDensity.isTouchDevice();
  }

  /// حشوة خلية جسم الجدول رأسيًّا.
  static get cellPadV(): number {
    return ImdDensity.isHigh ? 4 : 9;
  }

  /// حشوة خلية رأس الجدول رأسيًّا.
  static get headPadV(): number {
    return ImdDensity.isHigh ? 6 : 10;
  }

  /// حجم خطّ خلايا الجسم.
  static get cellFont(): number {
    return ImdStyle.classic ? 12 : ImdDensity.isHigh ? 12.5 : 13.5;
  }

  /// الفاصل بين بطاقات الصفوف على الجوال.
  static get cardGap(): number {
    return ImdDensity.isHigh ? 6 : 10;
  }

  /// عامل تصغير المسافات بين لوحات الصفحة (≤ 1).
  static get spaceFactor(): number {
    return ImdDensity.isHigh ? 0.6 : 1;
  }

  /// يقرأ التفضيل المحفوظ — يُنادى مرةً عند إقلاع القشرة.
  static async load(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(ImdDensity._key);
      const v = raw === 'true';
      if (v !== ImdDensity.notifier.value) {
        ImdDensity.notifier.value = v;
        ImdDensity.rebuildAll();
      }
    } catch {
      // التفضيل كماليّ: تعذّر قراءته يُبقي الوضع المريح.
    }
  }

  /// يبدّل الوضع ويحفظه ويُعيد رسم الواجهة.
  static async set(high: boolean): Promise<void> {
    if (ImdDensity.notifier.value === high) return;
    ImdDensity.notifier.value = high;
    ImdDensity.rebuildAll();
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(ImdDensity._key, String(high));
    } catch {
      // الحفظ كماليّ؛ الوضع يسري في الجلسة الحالية على أي حال.
    }
  }

  static toggle(): Promise<void> {
    return ImdDensity.set(!ImdDensity.isHigh);
  }

  /// اشتراك واجهة React في إشعارات إعادة البناء عند تغيّر النمط أو الكثافة.
  static addRebuildListener(listener: () => void): void {
    ImdDensity._rebuildListeners.add(listener);
  }

  static removeRebuildListener(listener: () => void): void {
    ImdDensity._rebuildListeners.delete(listener);
  }

  /// يُعلِّم كل عناصر الشجرة للإعادة دون هدمها (الحالة محفوظة).
  ///
  /// يُؤجَّل لما بعد الإطار الحالي لأنه قد يُنادى من داخل معالج نقر.
  static rebuildAll(): void {
    if (ImdDensity._rebuildScheduled) return;
    ImdDensity._rebuildScheduled = true;

    const flush = () => {
      ImdDensity._rebuildScheduled = false;
      for (const listener of [...ImdDensity._rebuildListeners]) {
        try {
          listener();
        } catch {
          // لا يُسقط مستمعٌ بقية المستمعين.
        }
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(flush);
    } else {
      queueMicrotask(flush);
    }
  }
}

// ربط تغيير النمط الكلاسيكي بإعادة البناء دون استيراد دائري من imd_style.ts.
ImdStyle.notifier.addListener(() => {
  ImdDensity.rebuildAll();
});
