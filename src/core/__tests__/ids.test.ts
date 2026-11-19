import { describe, expect, it } from 'vitest';
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

  // MISSING: lib/data/db/app_database.dart
  // MISSING: lib/data/repos/catalog_repo.dart
  it.skip('سجلّان يُحفظان في اللحظة نفسها يبقيان سجلّين', async () => {
    // يعتمد على AppDatabase و CatalogRepo (المراحل 4 و 7).
  });

  // MISSING: lib/data/db/app_database.dart
  // MISSING: lib/data/repos/catalog_repo.dart
  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('سند بعدة أصناف يحفظ كل سطوره', async () => {
    // يعتمد على AppDatabase و CatalogRepo و MovementsRepo (المراحل 4 و 7 و 9).
  });
});
