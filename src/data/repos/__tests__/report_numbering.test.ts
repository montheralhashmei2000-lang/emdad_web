import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../../db/app_database';
import { NativeDatabase } from '../../db/sqlite_driver';
import { ReportNumbering } from '../report_numbering';

/// ترقيم تقارير الحركة اليومية الرسمية (2026-10-25): رمز الجهاز ثم التسلسل، ورقمٌ
/// ثابت للتقرير نفسه (الشكل والمخزن واليوم) عند إعادة طباعته.
describe('report_numbering_test', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  afterEach(async () => {
    await db.close();
  });

  it('رقمٌ ثابت للتقرير نفسه، وتالٍ لغيره، ويبدأ برمز الجهاز', async () => {
    const r = new ReportNumbering(db);
    const k1 = ReportNumbering.keyOf({
      shape: 'sectionedLedger',
      warehouse: 'الرئيسي',
      day: '2026-10-25',
    });
    const first = await r.numberFor(k1);
    expect(await r.numberFor(k1), 'إعادة الطباعة بالرقم نفسه').toBe(first);

    const other = await r.numberFor(
      ReportNumbering.keyOf({
        shape: 'sectionedLedger',
        warehouse: '',
        day: '2026-10-25',
      }),
    );
    expect(other).not.toBe(first);
    expect(/^[A-Z0-9]+-\d{6}$/.test(first), first).toBe(true);
    expect(Number.parseInt(other.split('-').pop()!, 10)).toBe(
      Number.parseInt(first.split('-').pop()!, 10) + 1,
    );
  });

  // MISSING: lib/core/print/document_pdf.dart
  it.skip('الرقم في سطر الذيل بجوار رقم الصفحة', () => {
    // يعتمد على DocumentPdf.footerLine (المرحلة 18).
  });
});
