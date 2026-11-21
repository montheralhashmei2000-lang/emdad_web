// MISSING: lib/data/sync/sync_marks.dart (مرحلة المزامنة)
// بديل صوري مؤقت (Minimal Typed Stub) دون اختراع أي جداول أو مشغّلات مزامنة.

import type { DriftDatabase } from '../db/sqlite_driver';

export class SyncMarks {
  constructor(readonly db: DriftDatabase) {}

  static async install(_db: DriftDatabase): Promise<void> {
    // MISSING: تثبيت جداول ومشغّلات المزامنة في مرحلة المزامنة
  }

  async pruneTombstones(): Promise<number> {
    return 0;
  }
}
