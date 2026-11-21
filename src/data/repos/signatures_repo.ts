// MISSING: lib/data/repos/signatures_repo.dart (مرحلة لاحقة)
// بديل صوري مؤقت (Minimal Typed Stub) دون اختراع جداول أو مشغّلات تواقيع.

import type { DriftDatabase } from '../db/sqlite_driver';

export class SignaturesRepo {
  constructor(readonly db: DriftDatabase) {}

  static async install(_db: DriftDatabase): Promise<void> {
    // MISSING: تثبيت بنية التواقيع في مرحلة لاحقة
  }
}
