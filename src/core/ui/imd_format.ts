/// تنسيق الأرقام والتواريخ في النظام.
///
/// **الصورة تُقرأ من [ImdNumbers] لا تُثبَّت هنا**: صورةُ الرقم (هندية/لاتينية)
/// وفاصلا الآلاف والعشريّ وخاناتُ الكميات والمبالغ كلُّها إعداداتٌ في «الأرقام
/// والعملات»، تُزامَن مع بقية الإعدادات فلا يصدر سندان بصيغتين.
///
/// الافتراض كما كان: أرقامٌ هندية، فاصلةٌ للآلاف «,» ونقطةٌ للعشريّ «.» لا
/// علامتا `ar-EG` المرتفعتان «٬ ٫» — الأخيرتان تُطبعان شرطةً معلّقة فوق السطر
/// يظنها القارئ غبارًا على الورقة، وفي بعض الخطوط لا تظهران أصلًا. وهما
/// متاحتان لمن أرادهما من الإعدادات.

import { parseIsoDay } from '../../domain/iso_date';
import { ImdNumbers } from './imd_numbers';

/// يحوّل أرقام نصٍّ إلى صورة **أرقام الشاشات** المختارة.
///
/// اسمُها من يوم كانت الصورة هنديةً دائمًا؛ وهي الآن تتبع الإعداد، فإن اختير
/// اللاتيني أعادت النصّ كما هو. تُستعمل للتواريخ والمراجع المُركَّبة نصيًّا.
export function arDigits(s: string): string {
  return ImdNumbers.toDigits(s, ImdNumbers.current.uiDigits);
}

/// رقمٌ للعرض: مجموعٌ بفاصل الآلاف، بلا أصفارٍ عشرية زائدة، بصورة الشاشات.
export function nf(n: number | null | undefined): string {
  return ImdNumbers.format(n);
}

/// مبلغٌ للعرض: كـ[nf] لكن بخاناتٍ عشرية **ثابتة** لا تُقصّ — المبلغ يُدقَّق
/// بخاناته، و«١٢٠» ليست «١٢٠٫٠٠» في كشفٍ مالي.
export function nfMoney(n: number | null | undefined): string {
  return ImdNumbers.format(n, { money: true });
}

/// تاريخٌ للعرض بالصيغة الموحَّدة للنظام: `2026-10-01` (سنة-شهر-يوم، بلا «م»).
export function arDate(d: Date): string {
  return fmtDate(d);
}

/// الصيغة الموحَّدة للتاريخ في كل النظام: `سنة-شهر-يوم` — `2026-10-22` بلا «م».
///
/// قرار المالك 2026-10-22: كانت `يوم-شهر-سنة` (`22-10-2026`، قرار 2026-10-14)،
/// والمطلوب السنة أولًا في النظام كله شاشةً وطباعة.
export function fmtDate(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/// تاريخٌ مخزَّن (`YYYY-MM-DD`، وربما بوقتٍ بعده) للعرض بصيغة النظام
/// `2026-10-22` وبأرقام الشاشات. ما لا يُفهم يُعاد كما هو، والفارغ يبقى فارغًا،
/// والمستحيل (`2026-02-30`) لا يُدوَّر إلى يومٍ آخر ([parseIsoDay]).
export function arDay(iso: string): string {
  const d = parseIsoDay(iso);
  return d === null ? arDigits(iso) : arDateText(fmtDate(d));
}

/// تاريخٌ بأرقام الشاشات **معزولٌ باتجاه يسار-يمين** متى كانت الأرقام هندية.
///
/// الأرقام الهندية مع «-» بينها لا تتماسك اتجاهًا واحدًا في سطرٍ عربي (قاعدة
/// الاتجاه الثنائي تضمّ الفاصل إلى الأرقام اللاتينية وحدها)، فيُرى
/// `٢٠٢٦-١٠-٢٢` مقلوبًا `٢٢-١٠-٢٠٢٦`. العزل (LRI…PDI) يُبقيه كما كُتب.
export function arDateText(latinDate: string): string {
  const s = arDigits(latinDate);
  return s === latinDate ? s : `\u2066${s}\u2069`;
}

/// صيغة التاريخ المخزَّنة في قاعدة البيانات (YYYY-MM-DD) — تُرتَّب نصيًّا.
export function isoDay(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}
