// MISSING: lib/data/backup/backup_scheduler.dart (المرحلة 22)
// بديل صوري أدنى لجدولة النسخ الاحتياطي المشفر لحين تحويل المرحلة 22.

import type { AppDatabase } from '../db/app_database';

export class BackupScheduler {
  readonly db: AppDatabase;
  private readonly _listeners = new Set<() => void>();
  private _disposed = false;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  addListener(listener: () => void): void {
    if (!this._disposed) {
      this._listeners.add(listener);
    }
  }

  removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }

  // MISSING: lib/data/backup/backup_scheduler.dart
  start(): void {
    // يبدأ عند تحويل ملف النسخ الاحتياطي في المرحلة 22
  }

  dispose(): void {
    this._disposed = true;
    this._listeners.clear();
  }
}
