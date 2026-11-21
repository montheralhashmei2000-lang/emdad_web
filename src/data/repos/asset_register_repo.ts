// MISSING: lib/data/repos/asset_register_repo.dart (المرحلة 8)
// بديل صوري أدنى لسجل الأصول الثابتة دون اختراع منطق.

import type { AppDatabase } from '../db/app_database';
import { AssetType } from '../../domain/assets';

export class AssetRegisterRepo {
  readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  // MISSING: lib/data/repos/asset_register_repo.dart
  async allTypes(): Promise<string[]> {
    return [...AssetType.all];
  }
}
