// MISSING: lib/data/repos/camp_ledger_repo.dart (المرحلة 17)
// بديل صوري أدنى لحساب المعسكر وتصفية الشهر لحين تحويل المرحلة 17.

import type { AppDatabase, Warehouse } from '../db/app_database';

export class SettlementResult {
  readonly ok: boolean;
  readonly error: string;

  constructor({ ok, error }: { readonly ok: boolean; readonly error: string }) {
    this.ok = ok;
    this.error = error;
  }
}

export class CampLedgerRepo {
  readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  // MISSING: lib/data/repos/camp_ledger_repo.dart
  async autoSettleIfDue(): Promise<SettlementResult> {
    return new SettlementResult({ ok: false, error: '' });
  }

  // MISSING: lib/data/repos/camp_ledger_repo.dart
  async mainWarehouse(): Promise<Warehouse | null> {
    return null;
  }

  // MISSING: lib/data/repos/camp_ledger_repo.dart
  async setMainWarehouse(
    _warehouseId: string,
    _options?: { readonly actor?: string },
  ): Promise<void> {}
}
