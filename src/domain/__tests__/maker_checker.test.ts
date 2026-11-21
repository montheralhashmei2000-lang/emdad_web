import { describe, expect, it } from 'vitest';
import { MakerChecker } from '../maker_checker';

/// فصل المهام: المُنشئ لا يعتمد ما أنشأه (طلب المالك 2026-10-26).
describe('maker_checker_test', () => {
  describe('القاعدة', () => {
    it('المُنشئ نفسه يُرفض، وغيره يُقبل، والمدير مستثنى', () => {
      expect(
        MakerChecker.violation({
          createdBy: 'a@imdad.local',
          actor: 'A@imdad.local ',
          exempt: false,
          doc: 'س',
        }),
      ).not.toBeNull();
      expect(
        MakerChecker.violation({
          createdBy: 'a@imdad.local',
          actor: 'b@imdad.local',
          exempt: false,
          doc: 'س',
        }),
      ).toBeNull();
      expect(
        MakerChecker.violation({
          createdBy: 'a@imdad.local',
          actor: 'a@imdad.local',
          exempt: true,
          doc: 'س',
        }),
      ).toBeNull();
    });

    it('سجلٌّ بلا مُنشئٍ معروف لا يُحكم عليه', () => {
      expect(
        MakerChecker.violation({
          createdBy: '',
          actor: 'a@imdad.local',
          exempt: false,
          doc: 'س',
        }),
      ).toBeNull();
    });
  });

  describe('في المستودعات', () => {
    // MISSING: lib/data/repos/catalog_repo.dart
    // MISSING: lib/data/repos/movements_repo.dart
    // MISSING: lib/data/repos/destructions_repo.dart
    // MISSING: lib/domain/destruction.dart
    it.skip('محضر الإتلاف: لا يُحرَّر ويُعتمد بيدٍ واحدة، ويعتمده آخر', () => {
      // يعتمد على CatalogRepo وMovementsRepo وDestructionsRepo وDestructionStatus/DestructionBlocked (المراحل 7 و9 و10).
    });

    // MISSING: lib/data/repos/catalog_repo.dart
    // MISSING: lib/data/repos/movements_repo.dart
    // MISSING: lib/data/repos/destructions_repo.dart
    // MISSING: lib/domain/destruction.dart
    it.skip('محضر الإتلاف: المدير يحرّر ويعتمد بنفسه', () => {
      // يعتمد على CatalogRepo وMovementsRepo وDestructionsRepo (المراحل 7 و9 و10).
    });

    // MISSING: lib/data/repos/catalog_repo.dart
    // MISSING: lib/data/repos/movements_repo.dart
    // MISSING: lib/data/repos/stocktake_repo.dart
    it.skip('تسوية الجرد: من فتح الأمر لا يعتمدها', () => {
      // يعتمد على StocktakeRepo (المرحلة 11).
    });
  });
});
