// MISSING: lib/domain/print_layout.dart (المرحلة 18)
// بديل صوري مؤقت (Minimal Typed Stub) دون اختراع إعدادات تخطيط الطباعة.

export class PrintLayout {
  static readonly defaults = new PrintLayout();

  constructor(readonly raw: Record<string, unknown> = {}) {}

  static fromMap(m: Record<string, unknown>): PrintLayout {
    return new PrintLayout({ ...m });
  }

  toMap(): Record<string, unknown> {
    return { ...this.raw };
  }
}
