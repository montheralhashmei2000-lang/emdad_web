import { ErrorLogger } from '../error_log';

/// يقرأ نطاق المستودعات المخزَّن لمستخدم (`users.warehouse_scope`).
///
/// القيم الصحيحة: `ALL` (كل المستودعات ⇒ `null`) أو JSON بقائمة أسماء.
///
/// **فشلٌ مغلق:** أي قيمة أخرى — نصٌّ تالف، JSON ليس قائمة، فراغ — تُعدّ تالفة،
/// فتُرجع قائمةً **فارغة** (لا مستودعات) وتُسجَّل خطأً حرجًا. كان التلف يُرجع
/// `null` أي «كل المستودعات»، فيرى المستخدم المقيَّد كل شيء بسبب تلف قيمته.
/// يصلح المدير النطاق من «المستخدمون والصلاحيات».
export function parseWarehouseScope(
  raw: string,
  { source }: { readonly source: string },
): string[] | null {
  if (raw.trim().toUpperCase() === 'ALL') return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (Array.isArray(v)) {
      return v.map((e) => String(e));
    }
    throw new SyntaxError(`نطاق المستودعات ليس قائمة: «${raw}»`);
  } catch (err) {
    ErrorLogger.critical(source, err, {
      stack: err instanceof Error ? err.stack : undefined,
    });
    return [];
  }
}
