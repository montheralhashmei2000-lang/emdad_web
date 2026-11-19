/// تفقيط المبالغ: «ألفان ومئتان ريال يمني فقط لا غير».
///
/// المعدود (ريال) مذكّر فتُستعمل الأعداد بصيغة المذكر. تدعم حتى المليارات،
/// والكسر يُكتب بوحدته الصغرى (هللة / فلس) إن وُجد.

const _units = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', //
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
  'سبعة عشر', 'ثمانية عشر', 'تسعة عشر',
];
const _tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const _hundreds = [
  '', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة',
];

/// عددٌ من 1 إلى 999 بالحروف.
function _below1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h > 0) parts.push(_hundreds[h]);
  if (r > 0) {
    if (r < 20) {
      parts.push(_units[r]);
    } else {
      const u = r % 10;
      parts.push(u === 0 ? _tens[Math.floor(r / 10)] : `${_units[u]} و${_tens[Math.floor(r / 10)]}`);
    }
  }
  return parts.join(' و');
}

/// (المفرد، المثنى، الجمع للـ3-10، التمييز لـ11 فما فوق)
const _scales: ReadonlyArray<readonly [string, string, string, string]> = [
  ['ألف', 'ألفان', 'آلاف', 'ألف'],
  ['مليون', 'مليونان', 'ملايين', 'مليون'],
  ['مليار', 'ملياران', 'مليارات', 'مليار'],
];

/// عددٌ صحيحٌ غير سالب بالحروف. الصفر ⇒ «صفر».
export function arabicNumberWords(n: number): string {
  if (n === 0) return 'صفر';
  const groups: number[] = [];
  let rest = Math.floor(n);
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    if (i === 0) {
      parts.push(_below1000(g));
      continue;
    }
    const idx = Math.min(Math.max(i - 1, 0), _scales.length - 1);
    const s = _scales[idx];
    if (g === 1) {
      parts.push(s[0]);
    } else if (g === 2) {
      parts.push(s[1]);
    } else if (g <= 10) {
      parts.push(`${_below1000(g)} ${s[2]}`);
    } else {
      parts.push(`${_below1000(g)} ${s[3]}`);
    }
  }
  return parts.join(' و');
}

/// مبلغٌ مالي بالحروف: `amountInWords(2200, { major: 'ريال يمني' })` ⇒
/// «ألفان ومئتان ريال يمني فقط لا غير».
export function amountInWords(
  amount: number,
  options: { major: string; minor?: string },
): string {
  const { major, minor = 'هللة' } = options;
  const v = Math.abs(amount);
  // التقريب إلى أقرب جزء من مئة قبل الفصل، فلا يظهر «تسعة وتسعون هللة وتسعمئة…».
  const total = Math.round(v * 100);
  const whole = Math.floor(total / 100);
  const frac = total % 100;
  let out = `${arabicNumberWords(whole)} ${major}`;
  if (frac > 0) out += ` و${arabicNumberWords(frac)} ${minor}`;
  out += ' فقط لا غير';
  return out;
}
