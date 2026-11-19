import { describe, expect, it } from 'vitest';
import { isIsoDay, parseIsoDay } from '../iso_date';

/// `DateTime.tryParse('2026-02-30')` يعيد 2026-03-02 بدل null، فكان تاريخٌ
/// مستحيلٌ وصل بالمزامنة أو الاستيراد يُطبع على السند **يومًا آخر صحيح الشكل**.
describe('iso_date_strict_test', () => {
  describe('parseIsoDay', () => {
    it('يقبل الحقيقي والختم الذي يبدأ به', () => {
      expect(parseIsoDay('2026-05-15')).toEqual(new Date(2026, 4, 15));
      expect(parseIsoDay('2026-05-15T10:30:00')).toEqual(new Date(2026, 4, 15));
      expect(parseIsoDay('2026-05-15 10:30:00')).toEqual(new Date(2026, 4, 15));
      expect(parseIsoDay('2024-02-29')).toEqual(new Date(2024, 1, 29));
    });

    it('يرفض المستحيل ولا يُدوِّره', () => {
      for (const bad of [
        '2026-02-30',
        '2025-02-29',
        '2026-13-01',
        '2026-00-10',
        '2026-04-31',
        '2026-05-00',
        '',
        'x',
        '15-05-2026',
      ]) {
        expect(parseIsoDay(bad), bad).toBeNull();
      }
    });

    it('isIsoDay دقيق الطول', () => {
      expect(isIsoDay('2026-05-15')).toBe(true);
      expect(isIsoDay('2026-05-15T10:00')).toBe(false);
      expect(isIsoDay('2026-02-30')).toBe(false);
    });
  });

  // MISSING: lib/core/print/print_format.dart
  it.skip('الطباعة والعرض يعيدان المستحيل كما هو', () => {
    // يعتمد على printDate و lrm من lib/core/print/print_format.dart (المرحلة 18).
  });

  // MISSING: lib/core/ui/imd_form.dart
  it.skip('منتقي التاريخ يُفتح على يومٍ داخل مداه', () => {
    // يعتمد على ImdDateField.initialFor من lib/core/ui/imd_form.dart (المرحلة 2).
  });
});
