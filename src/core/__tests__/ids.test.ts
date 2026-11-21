import { describe, expect, it } from 'vitest';
import { AppDatabase } from '../../data/db/app_database';
import { NativeDatabase } from '../../data/db/sqlite_driver';
import { CatalogRepo } from '../../data/repos/catalog_repo';
import { Ids } from '../ids';

/// حراسة عيب حقيقي ظهر في الاختبار: المعرّف المبني على الوقت وحده يتكرر
/// حين يُكتب سجلّان في الملّي ثانية نفسها، فيطمس أحدهما الآخر.
describe('ids_test', () => {
  it('عشرة آلاف معرّف متتالٍ بلا تكرار', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      ids.add(Ids.next('x'));
    }
    expect(ids.size).toBe(10000);
  });

  it('سجلّان يُحفظان في اللحظة نفسها يبقيان سجلّين', async () => {
    const db = AppDatabase.forTesting(NativeDatabase.memory());
    try {
      const repo = new CatalogRepo(db);
      const id1 = await repo.saveItem({ code: 'A1', name: 'أرز' });
      const id2 = await repo.saveItem({ code: 'A2', name: 'سكر' });
      expect(id1).not.toBe(id2);
      const all = await repo.items();
      expect(all).toHaveLength(2);
    } finally {
      await db.close();
    }
  });

  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('سند بعدة أصناف يحفظ كل سطوره', async () => {
    // يعتمد على MovementsRepo (المرحلة 9).
  });
});
