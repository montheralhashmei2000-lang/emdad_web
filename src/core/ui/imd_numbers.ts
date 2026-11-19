/// بديل `ValueNotifier<T>` من Flutter بالواجهة نفسها (`.value`، `addListener`، `removeListener`).
export class ValueNotifier<T> {
  private _value: T;
  private readonly _listeners = new Set<() => void>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (this._value === newValue) return;
    this._value = newValue;
    this.notifyListeners();
  }

  addListener(listener: () => void): void {
    this._listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }

  notifyListeners(): void {
    for (const listener of [...this._listeners]) {
      listener();
    }
  }
}

/// صورةُ الأرقام: هنديةٌ (٠١٢٣) أو لاتينية (0123).
export class ImdDigits {
  static readonly arabic = new ImdDigits('arabic', 'عربية (٠١٢٣٤٥٦٧٨٩)');
  static readonly latin = new ImdDigits('latin', 'لاتينية (0123456789)');

  static readonly values: readonly ImdDigits[] = [ImdDigits.arabic, ImdDigits.latin];

  readonly id: string;
  readonly label: string;

  private constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  static of(v: unknown): ImdDigits {
    return ImdDigits.values.find((d) => d.id === v) ?? ImdDigits.arabic;
  }
}

/// تفضيلات تنسيق الأرقام — تُحفظ في القاعدة فتُزامَن: صورةُ الرقم في المطبوعات
/// معيارٌ للجهة كلها لا تفضيلُ جهاز، فلا يصدر سندان بصيغتين.
export class ImdNumberPrefs {
  /// أرقام الشاشات.
  readonly uiDigits: ImdDigits;

  /// أرقام المطبوعات — لاتينيةٌ افتراضًا لتطابق ملفات Excel/Word المعتمدة.
  readonly printDigits: ImdDigits;

  /// فاصل الآلاف: `,` أو `٬` أو مسافةٌ رفيعة أو لا شيء.
  readonly thousands: string;

  /// الفاصل العشري: `.` أو `٫`.
  readonly decimal: string;

  /// أقصى خاناتٍ عشرية للكميات — تُحذف أصفارُها الزائدة (٢٫٥٠٠ ⇒ ٢٫٥).
  readonly qtyDecimals: number;

  /// خانات المبالغ — **ثابتةٌ لا تُقصّ**: ٣٠٠٠٠٫٠٠ لا ٣٠٠٠٠.
  readonly moneyDecimals: number;

  constructor({
    uiDigits = ImdDigits.arabic,
    printDigits = ImdDigits.latin,
    thousands = ',',
    decimal = '.',
    qtyDecimals = 3,
    moneyDecimals = 2,
  }: {
    uiDigits?: ImdDigits;
    printDigits?: ImdDigits;
    thousands?: string;
    decimal?: string;
    qtyDecimals?: number;
    moneyDecimals?: number;
  } = {}) {
    this.uiDigits = uiDigits;
    this.printDigits = printDigits;
    this.thousands = thousands;
    this.decimal = decimal;
    this.qtyDecimals = qtyDecimals;
    this.moneyDecimals = moneyDecimals;
  }

  /// خياراتُ الفواصل المعروضة في الإعدادات.
  static readonly thousandsOptions: ReadonlyArray<readonly [string, string]> = [
    [',', 'فاصلة  ١٢٣,٤٥٦'],
    ['٬', 'فاصلة عربية  ١٢٣٬٤٥٦'],
    [' ', 'مسافة  ١٢٣ ٤٥٦'],
    ['', 'بلا فاصل  ١٢٣٤٥٦'],
  ];

  static readonly decimalOptions: ReadonlyArray<readonly [string, string]> = [
    ['.', 'نقطة  ١٢٫٥ ⇠ 12.5'],
    ['٫', 'فاصلة عربية  ١٢٫٥'],
  ];

  copyWith({
    uiDigits,
    printDigits,
    thousands,
    decimal,
    qtyDecimals,
    moneyDecimals,
  }: {
    uiDigits?: ImdDigits;
    printDigits?: ImdDigits;
    thousands?: string;
    decimal?: string;
    qtyDecimals?: number;
    moneyDecimals?: number;
  } = {}): ImdNumberPrefs {
    return new ImdNumberPrefs({
      uiDigits: uiDigits ?? this.uiDigits,
      printDigits: printDigits ?? this.printDigits,
      thousands: thousands ?? this.thousands,
      decimal: decimal ?? this.decimal,
      qtyDecimals: qtyDecimals ?? this.qtyDecimals,
      moneyDecimals: moneyDecimals ?? this.moneyDecimals,
    });
  }

  toMap(): Record<string, unknown> {
    return {
      uiDigits: this.uiDigits.id,
      printDigits: this.printDigits.id,
      thousands: this.thousands,
      decimal: this.decimal,
      qtyDecimals: this.qtyDecimals,
      moneyDecimals: this.moneyDecimals,
    };
  }

  /// يقرأ ما حُفظ، ويتجاهل أي قيمةٍ خارج المدى — صفٌّ تالفٌ لا يكسر كل رقمٍ
  /// في النظام، بل يعود بالافتراضات.
  static fromMap(m: Record<string, unknown>): ImdNumberPrefs {
    const clampInt = (v: unknown, fallback: number): number => {
      let n: number | null = null;
      if (typeof v === 'number' && Number.isFinite(v)) {
        n = Math.trunc(v);
      } else {
        const raw = `${v ?? ''}`.trim();
        if (/^-?\d+$/.test(raw)) {
          n = Number.parseInt(raw, 10);
        }
      }
      if (n === null || n < 0 || n > 3) return fallback;
      return n;
    };

    const pick = (
      v: unknown,
      options: ReadonlyArray<readonly [string, string]>,
      fallback: string,
    ): string => {
      const s = typeof v === 'string' ? v : null;
      if (s === null) return fallback;
      return options.some((o) => o[0] === s) ? s : fallback;
    };

    const d = new ImdNumberPrefs();
    return new ImdNumberPrefs({
      uiDigits: ImdDigits.of(m['uiDigits']),
      printDigits: m['printDigits'] == null ? d.printDigits : ImdDigits.of(m['printDigits']),
      thousands: pick(m['thousands'], ImdNumberPrefs.thousandsOptions, d.thousands),
      decimal: pick(m['decimal'], ImdNumberPrefs.decimalOptions, d.decimal),
      qtyDecimals: clampInt(m['qtyDecimals'], d.qtyDecimals),
      moneyDecimals: clampInt(m['moneyDecimals'], d.moneyDecimals),
    });
  }

  equals(other: unknown): boolean {
    return (
      other instanceof ImdNumberPrefs &&
      other.uiDigits === this.uiDigits &&
      other.printDigits === this.printDigits &&
      other.thousands === this.thousands &&
      other.decimal === this.decimal &&
      other.qtyDecimals === this.qtyDecimals &&
      other.moneyDecimals === this.moneyDecimals
    );
  }
}

/// مصدرُ تنسيق الأرقام الوحيد في النظام — الشاشات والمطبوعات والتصدير.
///
/// صورةُ الرقم كانت مُثبَّتةً في الشِّفرة في موضعين لا يعرف أحدهما الآخر:
/// `nf()` تكتب هنديًّا بفاصلةٍ ونقطة، و`printNum()/printMoney()` تكتبان
/// لاتينيًّا بـ`intl`. فمن أراد تغيير خانات المبالغ أو فاصل الآلاف لم يجد
/// مكانًا يغيّره منه. وهذه الحالة ساكنةٌ كـ`ImdDensity`: `nf()` دالّةٌ
/// عامّةٌ تُستدعى من ثمانمئة موضع، فلا سبيل إلى تمرير `context` إليها.
export class ImdNumbers {
  private constructor() {}

  /// مفتاح الصفّ في `app_settings` — يُزامَن مع بقية الإعدادات.
  static readonly key = 'numbers';

  static readonly notifier = new ValueNotifier<ImdNumberPrefs>(new ImdNumberPrefs());

  static get current(): ImdNumberPrefs {
    return ImdNumbers.notifier.value;
  }

  /// يُستبدل التفضيل ويُعلَن للمستمعين. الحفظ في القاعدة مسؤولية المُنادي
  /// (`core/ui` لا يعرف طبقة البيانات).
  static apply(p: ImdNumberPrefs): void {
    if (!ImdNumbers.notifier.value.equals(p)) {
      ImdNumbers.notifier.value = p;
    }
  }

  private static readonly _arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  /// يحوّل أرقام [s] إلى الصورة [d] — ويعيدها كما هي إن كانت لاتينية.
  static toDigits(s: string, d: ImdDigits): string {
    if (d === ImdDigits.latin) return s;
    let out = '';
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      if (code >= 0x30 && code <= 0x39 && ch.length === 1) {
        out += ImdNumbers._arabic[code - 0x30];
      } else {
        out += ch;
      }
    }
    return out;
  }

  /// صياغةُ رقمٍ بالفواصل والخانات المختارة.
  ///
  /// [money] يُثبّت الخانات العشرية ولا يقصّ أصفارها؛ وغيره يقصّها.
  /// [forPrint] يختار صورةَ أرقام المطبوعات بدل أرقام الشاشات.
  static format(
    n: number | null | undefined,
    options: { money?: boolean; forPrint?: boolean } = {},
  ): string {
    const { money = false, forPrint = false } = options;
    const p = ImdNumbers.current;
    const v = n == null || !Number.isFinite(n) ? 0 : n;
    const neg = v < 0;
    const abs = Math.abs(v);
    const places = money ? p.moneyDecimals : p.qtyDecimals;
    const fixed = abs.toFixed(places);
    const dot = fixed.indexOf('.');
    const intPart = dot < 0 ? fixed : fixed.slice(0, dot);
    let frac = dot < 0 ? '' : fixed.slice(dot + 1);
    // الكميات تُقصّ أصفارها الزائدة؛ والمبالغ تبقى بخاناتها كما تُدقَّق.
    if (!money) frac = frac.replace(/0+$/, '');

    let grouped = '';
    for (let i = 0; i < intPart.length; i++) {
      if (i > 0 && (intPart.length - i) % 3 === 0) grouped += p.thousands;
      grouped += intPart[i];
    }
    let out = grouped;
    if (frac.length > 0) out = `${out}${p.decimal}${frac}`;
    // علامةُ الاتجاه قبل السالب: وإلا قفزت الشرطة إلى آخر الرقم في سطرٍ عربي.
    if (neg && abs !== 0) out = `\u061C-${out}`;
    return ImdNumbers.toDigits(out, forPrint ? p.printDigits : p.uiDigits);
  }
}
