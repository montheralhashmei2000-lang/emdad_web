/// تحليلٌ صارم لتواريخ `YYYY-MM-DD` (الصيغة المخزَّنة في القاعدة).
///
/// `DateTime.tryParse` متسامح: يُدوِّر «2026-02-30» إلى 2026-03-02 و«2026-13-45»
/// إلى تاريخٍ في السنة التالية بدل رفضهما. فالتاريخ الذي يصل من المزامنة أو
/// الاستيراد بقيمةٍ غير صالحة كان يُطبع على السند **تاريخًا آخر صحيح الشكل**
/// — خطأٌ محاسبي لا يراه أحد. هنا يُقارَن الناتج بالمدخل: ما لم يعد كما كُتب
/// فليس تاريخًا.

const _isoDay = /^(\d{4})-(\d{2})-(\d{2})/;

/// اليوم في أول [s] (`2026-05-15`، أو ختمٌ يبدأ به مثل `2026-05-15T10:00` و
/// `2026-05-15 10:00:00`)، أو `null` إن لم يكن تاريخًا حقيقيًّا.
export function parseIsoDay(s: string): Date | null {
  const m = _isoDay.exec(s.trim());
  if (m === null) return null;
  const y = Number.parseInt(m[1], 10);
  const mo = Number.parseInt(m[2], 10);
  const d = Number.parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1) return null;
  const date = new Date(y, mo - 1, d);
  if (y >= 0 && y < 100) {
    date.setFullYear(y, mo - 1, d);
  }
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
    ? date
    : null;
}

/// هل [s] تاريخ `YYYY-MM-DD` حقيقي **بالضبط** (لا ختمٌ ولا لاحقة)؟
export function isIsoDay(s: string): boolean {
  return s.length === 10 && parseIsoDay(s) !== null;
}
