import { describe, expect, it } from 'vitest';
import { ImdFonts, ImdPrintFonts } from '../imd_fonts';

/// خط الواجهة صار خيارًا في الإعدادات. القيمة القادمة من قاعدة بيانات قديمة أو
/// من ملف مزامنة من إصدار آخر قد تكون مجهولة — ويجب ألّا تكسر الواجهة.
describe('fonts_test', () => {
  it('الخطوط المطروحة كلها بأسماء وأوصاف', () => {
    expect(ImdFonts.all.length).toBe(4);
    for (const f of ImdFonts.all) {
      expect(f.family.length > 0).toBe(true);
      expect(f.label.length > 0).toBe(true);
      expect(f.note.length > 0).toBe(true);
    }
  });

  it('الافتراضي ضمن المطروح', () => {
    expect(ImdFonts.all.map((f) => f.family)).toContain(ImdFonts.defaultFamily);
  });

  it('قيمة مجهولة تسقط إلى الافتراضي بلا خطأ', () => {
    expect(ImdFonts.normalize('خط غير موجود')).toBe(ImdFonts.defaultFamily);
    expect(ImdFonts.normalize('')).toBe(ImdFonts.defaultFamily);
    expect(ImdFonts.normalize(null)).toBe(ImdFonts.defaultFamily);
  });

  it('القيمة المعروفة تبقى كما هي', () => {
    for (const f of ImdFonts.all) {
      expect(ImdFonts.normalize(f.family)).toBe(f.family);
    }
  });

  it('Amiri ليس خيار واجهة — يبقى للطباعة وحدها', () => {
    expect(ImdFonts.all.map((f) => f.family)).not.toContain('Amiri');
    expect(ImdFonts.normalize('Amiri')).toBe(ImdFonts.defaultFamily);
  });

  describe('خطوط الطباعة', () => {
    it('كل خط طباعة له ملفان بوزنين مختلفين', () => {
      for (const f of ImdPrintFonts.all) {
        expect(f.regular.endsWith('.ttf')).toBe(true);
        expect(f.bold.endsWith('.ttf')).toBe(true);
        expect(f.regular).not.toBe(f.bold);
      }
    });

    it('المجهول يسقط إلى الافتراضي فلا تفشل الطباعة', () => {
      expect(ImdPrintFonts.normalize('Traditional Arabic')).toBe(ImdPrintFonts.defaultFamily);
      expect(ImdPrintFonts.normalize(null)).toBe(ImdPrintFonts.defaultFamily);
      expect(ImdPrintFonts.of('خط مجهول').family).toBe(ImdPrintFonts.defaultFamily);
    });

    it('Amiri خيار طباعة رغم استبعاده من الواجهة', () => {
      expect(ImdPrintFonts.all.map((f) => f.family)).toContain('Amiri');
      expect(ImdFonts.all.map((f) => f.family)).not.toContain('Amiri');
    });

    it('الخطوط الملكية غير مطروحة (ترخيص)', () => {
      const families = ImdPrintFonts.all.map((f) => f.family);
      for (const owned of ['Traditional Arabic', 'Simplified Arabic', 'Arial']) {
        expect(families).not.toContain(owned);
      }
    });
  });
});
