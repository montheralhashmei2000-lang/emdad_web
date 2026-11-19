/// مدى تواريخ مغلق الطرفين، بصيغة `yyyy-MM-dd`.
///
/// مستقلٌّ عن أي وحدة عمل: تستعمله خطط الوجبات والتقارير معًا. وكان في
/// `meal_plan.dart` فاستُخرج هنا لئلا تستورد التقاريرُ الخططَ لتحصل على مدى.
///
/// والتواريخ نصوص لا `DateTime`: هكذا تُخزَّن في القاعدة، والمقارنة النصية على
/// `yyyy-MM-dd` ترتيبها ترتيب الزمن — فلا تحويل ولا منطقة زمنية تُزيح يومًا.

const _dartTryParseRe =
  /^([+-]?\d{4,6})-?(\d{2})-?(\d{2})(?:[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?([Zz]|[+-]\d{2}:?\d{2})?$/;

function _tryParseDateTime(s: string): Date | null {
  const trimmed = s.trim();
  const m = _dartTryParseRe.exec(trimmed);
  if (m === null) return null;
  if (m[8]) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const y = Number.parseInt(m[1], 10);
  const mo = Number.parseInt(m[2], 10);
  const d = Number.parseInt(m[3], 10);
  const hh = m[4] ? Number.parseInt(m[4], 10) : 0;
  const mm = m[5] ? Number.parseInt(m[5], 10) : 0;
  const ss = m[6] ? Number.parseInt(m[6], 10) : 0;
  const date = new Date(y, mo - 1, d, hh, mm, ss);
  if (y >= 0 && y < 100) {
    date.setFullYear(y, mo - 1, d);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

function _calendarDayStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (d.getFullYear() >= 0 && d.getFullYear() < 100) {
    out.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return out;
}

export class DateSpan {
  readonly start: string;
  readonly end: string;

  constructor(start: string, end: string) {
    this.start = start;
    this.end = end;
  }

  static ymd(d: Date): string {
    const y = d.getFullYear().toString().padStart(4, '0');
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  static dayOf(d: Date): DateSpan {
    const s = DateSpan.ymd(d);
    return new DateSpan(s, s);
  }

  /// عدد الأيام شاملًا الطرفين. مدى غير صالح ⇒ صفر.
  get days(): number {
    const a = _tryParseDateTime(this.start);
    const b = _tryParseDateTime(this.end);
    if (a === null || b === null || b.getTime() < a.getTime()) return 0;
    const cur = _calendarDayStart(a);
    const endDay = _calendarDayStart(b);
    let count = 0;
    while (cur.getTime() <= endDay.getTime()) {
      count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  get isValid(): boolean {
    return this.days > 0;
  }

  get dates(): string[] {
    const a = _tryParseDateTime(this.start);
    const b = _tryParseDateTime(this.end);
    if (a === null || b === null || b.getTime() < a.getTime()) return [];
    const result: string[] = [];
    const cur = _calendarDayStart(a);
    const endTime = b.getTime();
    while (cur.getTime() <= endTime) {
      result.push(DateSpan.ymd(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }

  contains(date: string): boolean {
    return date >= this.start && date <= this.end;
  }

  /// هل يتقاطع المداان؟
  overlaps(other: DateSpan): boolean {
    return this.start <= other.end && other.start <= this.end;
  }

  toString(): string {
    return `${this.start} → ${this.end}`;
  }

  equals(other: unknown): boolean {
    return other instanceof DateSpan && other.start === this.start && other.end === this.end;
  }
}

/// نوع الفترة في شاشات التقارير.
export class PeriodKind {
  static readonly daily = 'DAILY';
  static readonly weekly = 'WEEKLY';
  static readonly monthly = 'MONTHLY';
  static readonly custom = 'CUSTOM';

  static readonly all: readonly string[] = [
    PeriodKind.daily,
    PeriodKind.weekly,
    PeriodKind.monthly,
    PeriodKind.custom,
  ];

  static readonly labels: Readonly<Record<string, string>> = {
    [PeriodKind.daily]: 'يومي',
    [PeriodKind.weekly]: 'أسبوعي',
    [PeriodKind.monthly]: 'شهري',
    [PeriodKind.custom]: 'فترة مخصصة',
  };

  static label(v: string): string {
    return PeriodKind.labels[v] ?? v;
  }

  /// يحلّ الفترة حول تاريخ مرجعي.
  ///
  /// الأسبوع يبدأ **السبت** لا الاثنين: أسبوع العمل هنا سبت–جمعة، وبدؤه
  /// بالاثنين يقسم الأسبوع الميداني نصفين على تقريرين.
  static resolve(
    kind: string,
    anchor: string,
    options: { customStart?: string; customEnd?: string } = {},
  ): DateSpan {
    const { customStart = '', customEnd = '' } = options;
    const at = _tryParseDateTime(anchor);
    if (at === null) return new DateSpan(anchor, anchor);
    switch (kind) {
      case PeriodKind.daily:
        return DateSpan.dayOf(at);
      case PeriodKind.weekly: {
        // DateTime.saturday = 6؛ الإزاحة إلى السبت السابق أو اليوم نفسه.
        const weekdayDart = at.getDay() === 0 ? 7 : at.getDay();
        const back = (weekdayDart - 6 + 7) % 7;
        const start = _calendarDayStart(at);
        start.setDate(start.getDate() - back);
        const end = _calendarDayStart(start);
        end.setDate(end.getDate() + 6);
        return new DateSpan(DateSpan.ymd(start), DateSpan.ymd(end));
      }
      case PeriodKind.monthly: {
        const first = new Date(at.getFullYear(), at.getMonth(), 1);
        const last = new Date(at.getFullYear(), at.getMonth() + 1, 0);
        if (at.getFullYear() >= 0 && at.getFullYear() < 100) {
          first.setFullYear(at.getFullYear(), at.getMonth(), 1);
          last.setFullYear(at.getFullYear(), at.getMonth() + 1, 0);
        }
        return new DateSpan(DateSpan.ymd(first), DateSpan.ymd(last));
      }
      default:
        return new DateSpan(
          customStart.length === 0 ? anchor : customStart,
          customEnd.length === 0 ? anchor : customEnd,
        );
    }
  }
}
