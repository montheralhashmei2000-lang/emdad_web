// MISSING: lib/domain/daily_movement_form.dart (مرحلة لاحقة)
// بديل صوري مؤقت (Minimal Typed Stub) دون اختراع نماذج أو قواعد تقارير.

export class DailyFormVars {
  constructor(readonly raw: Record<string, unknown> = {}) {}

  static fromMap(m: Record<string, unknown>): DailyFormVars {
    return new DailyFormVars({ ...m });
  }

  toMap(): Record<string, unknown> {
    return { ...this.raw };
  }
}
