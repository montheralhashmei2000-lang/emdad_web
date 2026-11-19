import { afterEach, describe, expect, it } from 'vitest';
import { arDigits, nf } from '../imd_format';
import { ImdDigits, ImdNumberPrefs, ImdNumbers } from '../imd_numbers';

/// تنسيق الأرقام إعدادٌ واحد تتبعه الشاشات والمطبوعات.
///
/// كانت الصورة مثبَّتةً في موضعين لا يعرف أحدهما الآخر: `nf()` هنديةً بفاصلةٍ
/// ونقطة، و`printNum()/printMoney()` لاتينيةً بـ`intl`. فمن أراد تغيير خانات
/// المبالغ أو فاصل الآلاف لم يجد مكانًا يغيّره منه.
describe('number_format_test', () => {
  afterEach(() => ImdNumbers.apply(new ImdNumberPrefs()));

  describe('الافتراضات لم تتغيّر', () => {
    it('الشاشات: هنديةٌ بفاصلةٍ ونقطة وبلا أصفار زائدة', () => {
      expect(nf(1234567)).toBe('١,٢٣٤,٥٦٧');
      expect(nf(12.5)).toBe('١٢.٥');
      expect(nf(2.5)).toBe('٢.٥');
      expect(nf(0)).toBe('٠');
      expect(nf(null)).toBe('٠');
    });

    // MISSING: lib/core/print/print_format.dart
    it.skip('المطبوعات: لاتينيةٌ كما في ملفات Excel المعتمدة', () => {
      // يعتمد على printNum و printMoney و printDate و lrm (المرحلة 18).
    });

    it('السالب تسبقه علامة اتجاه فلا تقفز شرطته', () => {
      expect(nf(-5).startsWith('؜-')).toBe(true);
      expect(nf(-5).endsWith('٥')).toBe(true);
    });
  });

  describe('صورة الأرقام تتبع الإعداد', () => {
    it('شاشاتٌ لاتينية', () => {
      ImdNumbers.apply(new ImdNumberPrefs({ uiDigits: ImdDigits.latin }));
      expect(nf(1234.5)).toBe('1,234.5');
      expect(arDigits('2026-10-09')).toBe('2026-10-09');
    });

    // MISSING: lib/core/print/print_format.dart
    it.skip('مطبوعاتٌ هندية', () => {
      // يعتمد على printNum و printDate من lib/core/print/print_format.dart (المرحلة 18).
    });

    it('التواريخ تتبع صورة الشاشات', () => {
      expect(arDigits('2026-10-09')).toBe('٢٠٢٦-١٠-٠٩');
    });
  });

  describe('الفواصل والخانات', () => {
    it('فاصل الآلاف والعشريّ', () => {
      ImdNumbers.apply(new ImdNumberPrefs({ thousands: ' ', decimal: '٫' }));
      expect(nf(1234.5)).toBe('١ ٢٣٤٫٥');
      ImdNumbers.apply(new ImdNumberPrefs({ thousands: '' }));
      expect(nf(1234567)).toBe('١٢٣٤٥٦٧');
    });

    // MISSING: lib/core/print/print_format.dart
    it.skip('خانات الكميات تُقصّ أصفارها، وخانات المبالغ ثابتة', () => {
      // يعتمد على printMoney من lib/core/print/print_format.dart (المرحلة 18).
    });

    it('بلا خاناتٍ عشرية للكميات', () => {
      ImdNumbers.apply(new ImdNumberPrefs({ qtyDecimals: 0 }));
      expect(nf(2.6)).toBe('٣');
    });
  });

  describe('القراءة من القاعدة', () => {
    // MISSING: lib/data/db/app_database.dart
    // MISSING: lib/data/repos/settings_repo.dart
    it.skip('يُحفظ ويُقرأ ويسري على الشاشات والمطبوعات معًا', async () => {
      // يعتمد على AppDatabase و SettingsRepo (المرحلة 4/20).
    });

    it('صفٌّ تالفٌ لا يكسر كل رقمٍ في النظام', () => {
      const bad = ImdNumberPrefs.fromMap({
        uiDigits: 'hieroglyph',
        thousands: '☠',
        decimal: '☠',
        qtyDecimals: 99,
        moneyDecimals: -3,
      });
      expect(bad.equals(new ImdNumberPrefs())).toBe(true);
    });

    it('الصفّ يدور كاملًا بلا فقد', () => {
      const p = new ImdNumberPrefs({
        uiDigits: ImdDigits.latin,
        printDigits: ImdDigits.arabic,
        thousands: ' ',
        decimal: '٫',
        qtyDecimals: 1,
        moneyDecimals: 3,
      });
      expect(ImdNumberPrefs.fromMap(p.toMap()).equals(p)).toBe(true);
    });
  });
});
