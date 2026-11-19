/// منفذ تبليغ الأعطال من `domain/` — بلا استيرادٍ إلى أعلى (CLAUDE.md §8 البند 38).
///
/// قواعد domain خالصة لا تعرف `ErrorLogger` (في core). فتبلّغ هنا، و`main` يصل هذا
/// المنفذ بسجل الأخطاء عند الإقلاع. بلا وصلٍ (الاختبارات) يُهمل البلاغ.
export type DomainErrorSink = (source: string, error: unknown, stack?: string | null) => void;

export class DomainDiagnostics {
  private constructor() {}

  static sink: DomainErrorSink | null = null;

  static report(source: string, error: unknown, stack?: string | null): void {
    DomainDiagnostics.sink?.(source, error, stack);
  }
}
