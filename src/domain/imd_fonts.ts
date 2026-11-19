/// خطوط الواجهة المتاحة للاختيار من «بيانات الجهة والمظهر».
///
/// **معايير الاختيار** (نظام محاسبي لا موقع دعائي):
/// • أوزان ثابتة متعددة — لتتمايز العناوين عن الحقول عن المجاميع.
/// • أرقام متساوية العرض — فتتراصف خانات الجداول عموديًا.
/// • بلا زخرفة — الخط المزخرف يُتعب عين المحاسب ويتداخل مع خانات الإدخال.
///
/// خط `Amiri` غير مطروح هنا عمدًا لهذا السبب، ويبقى مستعمَلًا في **الطباعة**
/// وحدها حيث يُطلب الطابع الرسمي الكلاسيكي.

/// خط واجهة واحد بوصفه المعروض للمستخدم.
export class ImdFont {
  /// اسم العائلة كما هو مسجَّل في `pubspec.yaml`.
  readonly family: string;

  /// الاسم المعروض في الإعدادات.
  readonly label: string;

  /// وصف مختصر يعين المستخدم على الاختيار.
  readonly note: string;

  constructor(family: string, label: string, note: string) {
    this.family = family;
    this.label = label;
    this.note = note;
  }
}

export class ImdFonts {
  private constructor() {}

  static readonly defaultFamily = 'IBMPlexSansArabic';

  static readonly all: readonly ImdFont[] = [
    new ImdFont(
      'IBMPlexSansArabic',
      'IBM Plex Sans Arabic',
      'هندسي رسمي — مريح في الجداول الطويلة والتقارير المالية',
    ),
    new ImdFont(
      'Tajawal',
      'تجوال (Tajawal)',
      'مصمَّم للواجهات — أوضحها في الأحجام الصغيرة',
    ),
    new ImdFont(
      'Cairo',
      'القاهرة (Cairo)',
      'هندسي حديث بزوايا صريحة — شائع في أنظمة ERP العربية',
    ),
    new ImdFont(
      'NotoSansArabic',
      'Noto Sans Arabic',
      'دعم شامل للشاشات والدقات — يطبع جيدًا مباشرة',
    ),
  ];

  /// يعيد اسم عائلة صالحًا: ما لم يكن معروفًا يسقط إلى الافتراضي، فلا تنكسر
  /// الواجهة بقيمة قديمة أو ملف بيانات من إصدار آخر.
  static normalize(family?: string | null): string {
    if (family == null || family.length === 0) return ImdFonts.defaultFamily;
    for (const f of ImdFonts.all) {
      if (f.family === family) return family;
    }
    return ImdFonts.defaultFamily;
  }

  static of(family: string): ImdFont {
    const normalized = ImdFonts.normalize(family);
    return ImdFonts.all.find((f) => f.family === normalized)!;
  }
}

/// خط طباعة واحد: عائلته وملفّاه (عادي وعريض) ووصفه.
export class ImdPrintFont {
  readonly family: string;
  readonly label: string;
  readonly note: string;

  /// مسارا الملفين داخل الأصول — الطباعة تحمّل الملف لا اسم العائلة.
  readonly regular: string;
  readonly bold: string;

  constructor(family: string, label: string, note: string, regular: string, bold: string) {
    this.family = family;
    this.label = label;
    this.note = note;
    this.regular = regular;
    this.bold = bold;
  }
}

/// خطوط **الطباعة** — منفصلة عن خطوط الواجهة لأن الورق غير الشاشة.
///
/// المطروح هنا ما نملك حقّ توزيعه فعلًا (رخصة OFL). خطوط مثل
/// Traditional Arabic و Simplified Arabic و Arial ملكية لمايكروسوفت وأدوبي،
/// وتضمينها في تطبيق يُوزَّع مخالفة ترخيص — فلا تُطرح مهما كانت مألوفة.
export class ImdPrintFonts {
  private constructor() {}

  static readonly defaultFamily = 'Amiri';

  static readonly all: readonly ImdPrintFont[] = [
    new ImdPrintFont(
      'Amiri',
      'أميري (Amiri)',
      'طابع رسمي كلاسيكي — الأقرب إلى السندات الحكومية المطبوعة',
      'assets/fonts/Amiri-Regular.ttf',
      'assets/fonts/Amiri-Bold.ttf',
    ),
    new ImdPrintFont(
      'IBMPlexSansArabic',
      'IBM Plex Sans Arabic',
      'واضح في الجداول الكثيفة — مناسب للتقارير والكشوف',
      'assets/fonts/IBMPlexSansArabic-Regular.ttf',
      'assets/fonts/IBMPlexSansArabic-Bold.ttf',
    ),
    new ImdPrintFont(
      'Tajawal',
      'تجوال (Tajawal)',
      'حروف بسيطة بلا حواف معقّدة — الأنسب للطابعة الحرارية',
      'assets/fonts/Tajawal-Regular.ttf',
      'assets/fonts/Tajawal-Bold.ttf',
    ),
    new ImdPrintFont(
      'Cairo',
      'القاهرة (Cairo)',
      'هندسي صريح — أرقام منتظمة في جداول الجرد',
      'assets/fonts/Cairo-Regular.ttf',
      'assets/fonts/Cairo-Bold.ttf',
    ),
    new ImdPrintFont(
      'NotoSansArabic',
      'Noto Sans Arabic',
      'يطبع جيدًا على مختلف الطابعات والدقات',
      'assets/fonts/NotoSansArabic-Regular.ttf',
      'assets/fonts/NotoSansArabic-Bold.ttf',
    ),
  ];

  /// يعيد خطًا صالحًا دائمًا: المجهول يسقط إلى الافتراضي فلا تفشل الطباعة.
  static of(family?: string | null): ImdPrintFont {
    for (const f of ImdPrintFonts.all) {
      if (f.family === family) return f;
    }
    return ImdPrintFonts.all[0];
  }

  static normalize(family?: string | null): string {
    return ImdPrintFonts.of(family).family;
  }
}
