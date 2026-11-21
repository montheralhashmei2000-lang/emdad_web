// MISSING: lib/domain/voucher_copies.dart (المرحلة 18)
// بديل صوري مؤقت (Minimal Typed Stub) دون اختراع تفضيلات طباعة السندات.

export class VoucherPrintPrefs {
  static readonly settingsKey = 'voucherPrint';

  constructor(readonly raw: Record<string, unknown> = {}) {}

  static fromMap(m: Record<string, unknown>): VoucherPrintPrefs {
    return new VoucherPrintPrefs({ ...m });
  }

  toMap(): Record<string, unknown> {
    return { ...this.raw };
  }
}
