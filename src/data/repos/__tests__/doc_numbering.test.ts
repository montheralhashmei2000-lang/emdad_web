import { describe, it } from 'vitest';

/// ترقيم السندات برمز الجهاز وعدّاد مخزَّن.
describe('doc_numbering_test', () => {
  // MISSING: lib/data/repos/catalog_repo.dart
  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('المرجع يحمل رمز الجهاز ويبدأ من 1', () => {
    // يعتمد على CatalogRepo و MovementsRepo.nextRef (المرحلتان 7 و 9).
  });

  // MISSING: lib/data/repos/catalog_repo.dart
  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('عرض الرقم لا يستهلكه، والحفظ يثبّته', () => {
    // يعتمد على CatalogRepo و MovementsRepo (المرحلتان 7 و 9).
  });

  // MISSING: lib/data/repos/catalog_repo.dart
  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('التسلسل مستقل لكل نوع سند', () => {
    // يعتمد على CatalogRepo و MovementsRepo (المرحلتان 7 و 9).
  });

  // MISSING: lib/data/repos/catalog_repo.dart
  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('سندات جهاز آخر لا تحرّك عدّاد هذا الجهاز', () => {
    // يعتمد على CatalogRepo و MovementsRepo (المرحلتان 7 و 9).
  });

  // MISSING: lib/data/repos/catalog_repo.dart
  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('جهاز فيه سندات بالصيغة القديمة يُكمل من أعلى رقم فيها', () => {
    // يعتمد على CatalogRepo و MovementsRepo (المرحلتان 7 و 9).
  });

  // MISSING: lib/data/sync/sync_marks.dart
  // MISSING: lib/data/repos/movements_repo.dart
  it.skip('العدّاد خارج المزامنة: لا يُسجَّل له أثر في sync_marks', () => {
    // يعتمد على جدول sync_marks (المرحلة 16) و MovementsRepo (المرحلة 9).
  });

  // MISSING: lib/data/repos/stocktake_repo.dart
  it.skip('أوامر الجرد تحمل رمز الجهاز وتُكمل من الصيغة القديمة', () => {
    // يعتمد على StocktakeRepo (المرحلة 11).
  });
});
