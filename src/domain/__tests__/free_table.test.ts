import { describe, expect, it } from 'vitest';
import { FreeCol, FreeTable } from '../free_table';

/// الجدول الحر في البرقية، ورقم فاتورة العقد.
describe('free_table_test', () => {
  it('الجدول الحر: ترميز وفك وصيغة قديمة', () => {
    const t = new FreeTable({
      title: 'المرسَل إليهم',
      cols: [
        new FreeCol('الاسم', 6),
        new FreeCol('الرتبة', 3),
        new FreeCol('ملاحظة', 4),
      ],
      rows: [
        ['أحمد', 'رائد', ''],
        ['', '', ''],
      ],
    });
    const back = FreeTable.decode(t.encode());
    expect(back.title).toBe('المرسَل إليهم');
    expect(back.cols.map((c) => c.title)).toEqual([
      'الاسم',
      'الرتبة',
      'ملاحظة',
    ]);
    expect(back.cols[0].weight).toBe(6);
    expect(back.filledRows).toEqual([['أحمد', 'رائد', '']]);

    // الصيغة القديمة (قائمة name/unit/note) تُقرأ دون ضياع.
    const legacy = FreeTable.decode(
      JSON.stringify([{ name: 'س', unit: 'شعبة', note: '' }]),
    );
    expect(legacy.cols.length).toBe(3);
    expect(legacy.filledRows[0].slice(0, 2)).toEqual(['س', 'شعبة']);
    expect(FreeTable.decode('ليس json').isEmpty).toBe(true);
  });

  // MISSING: lib/data/db/app_database.dart
  // MISSING: lib/data/repos/cable_repo.dart
  // MISSING: lib/core/print/cable_print.dart
  it.skip('البرقية تُطبع بجدول حر وبدونه', () => {
    // مؤجلة لحين تحويل قاعدة البيانات ومستودع البرقيات وطباعة البرقية (المراحل 4 و14 و18).
  });

  // MISSING: lib/data/db/app_database.dart
  // MISSING: lib/data/repos/linkage_repo.dart
  it.skip('رقم فاتورة العقد: من الرأس وإلا من أول صنف', () => {
    // مؤجلة لحين تحويل قاعدة البيانات ومستودع الارتباط والعقود (المراحل 4 و12).
  });
});
