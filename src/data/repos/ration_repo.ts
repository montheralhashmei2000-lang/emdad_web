// MISSING: lib/data/repos/ration_repo.dart (المرحلة 13)
// بديل صوري أدنى لمستودع الطلبيات وجهات الاعتمادات دون اختراع منطق.

import type { AppDatabase, RationOrder, SupplyAuthority } from '../db/app_database';

export interface RationOpResult {
  readonly ok: boolean;
  readonly error: string;
}

export class RationRepo {
  readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  // MISSING: lib/data/repos/ration_repo.dart
  async authorities(): Promise<SupplyAuthority[]> {
    return [];
  }

  // MISSING: lib/data/repos/ration_repo.dart
  async orders(): Promise<RationOrder[]> {
    return [];
  }

  // MISSING: lib/data/repos/ration_repo.dart
  async saveAuthority(_options: {
    readonly id?: string | null;
    readonly name: string;
    readonly title?: string;
    readonly notes?: string;
    readonly active?: boolean;
    readonly actor?: string;
  }): Promise<RationOpResult> {
    return { ok: false, error: '// MISSING: lib/data/repos/ration_repo.dart' };
  }

  // MISSING: lib/data/repos/ration_repo.dart
  async deleteAuthority(
    _id: string,
    _options?: { readonly actor?: string },
  ): Promise<RationOpResult> {
    return { ok: false, error: '// MISSING: lib/data/repos/ration_repo.dart' };
  }
}
