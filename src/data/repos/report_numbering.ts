import type { AppDatabase } from '../db/app_database';
import { Variable } from '../db/sqlite_driver';
import { DocNumbering } from './doc_numbering';

/// ترقيم التقارير الرسمية (تقرير الحركة اليومية بأشكاله الثلاثة):
/// رمز الجهاز ثم تسلسله (`E4VUQ8-000012`)، يُطبع في سطر الذيل بجوار رقم الصفحة.
export class ReportNumbering {
  constructor(readonly db: AppDatabase) {}

  private static readonly _table = 'report_numbers';
  private static readonly _counter = 'daily_reports';

  /// مفتاح التقرير: الشكل والمخزن (أو `*` لجميع المخازن) واليوم.
  static keyOf({
    shape,
    warehouse,
    day,
  }: {
    readonly shape: string;
    readonly warehouse: string;
    readonly day: string;
  }): string {
    const trimmed = warehouse.trim();
    return `${shape}|${trimmed.length === 0 ? '*' : trimmed}|${day}`;
  }

  /// رقم التقرير [key] — يُحجز عند أول طلب ويُعاد كما هو بعده.
  numberFor(key: string): Promise<string> {
    return this.db.transaction(async () => {
      await this.db.customStatement(
        `CREATE TABLE IF NOT EXISTS ${ReportNumbering._table} (key TEXT NOT NULL PRIMARY KEY, number TEXT NOT NULL)`,
      );
      const row = await this.db
        .customSelect(
          `SELECT number FROM ${ReportNumbering._table} WHERE key = ?`,
          { variables: [Variable.withString(key)] },
        )
        .getSingleOrNull();
      if (row != null) return row.read<string>('number');

      const numbering = new DocNumbering(this.db);
      const seed = async () => 0;
      const next = await numbering.peek(ReportNumbering._counter, '', { seed });
      await numbering.claim(ReportNumbering._counter, '', next, { seed });
      await this.db.customStatement(
        `INSERT INTO ${ReportNumbering._table} (key, number) VALUES (?, ?)`,
        [key, next],
      );
      return next;
    });
  }
}
