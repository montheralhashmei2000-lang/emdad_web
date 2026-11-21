/// جدولٌ حرّ: أعمدته وأسماؤها وأعراضها وصفوفه يحدّدها المستخدم بنفسه.
///
/// يُستعمل في «المرسَل إليهم» بالبرقية. يُحفظ JSON واحدًا:
/// `{"v":2,"title":"","cols":[{"t":"الاسم","w":5}],"rows":[["أحمد"]]}`
/// ويقرأ أيضًا الصيغة القديمة (قائمة `{name,unit,note}`) فلا تضيع برقيةٌ محفوظة.

import { DomainDiagnostics } from './diagnostics';

/// عمودٌ: عنوانه وعرضه النسبي (يتناسب مع بقية الأعمدة).
export class FreeCol {
  readonly title: string;
  readonly weight: number;

  constructor(title: string, weight = 5) {
    this.title = title;
    this.weight = weight;
  }

  copyWith({
    title,
    weight,
  }: {
    readonly title?: string;
    readonly weight?: number;
  } = {}): FreeCol {
    return new FreeCol(title ?? this.title, weight ?? this.weight);
  }
}

export interface FreeTableInit {
  readonly title?: string;
  readonly cols: readonly FreeCol[];
  readonly rows: readonly (readonly string[])[];
}

export class FreeTable {
  readonly title: string;
  readonly cols: readonly FreeCol[];
  readonly rows: readonly (readonly string[])[];

  constructor({ title = '', cols, rows }: FreeTableInit) {
    this.title = title;
    this.cols = cols;
    this.rows = rows;
  }

  /// جدول البداية: ثلاثة أعمدة وصفٌّ فارغ.
  static starter(): FreeTable {
    return new FreeTable({
      cols: [new FreeCol('الاسم'), new FreeCol('الوحدة'), new FreeCol('ملاحظة')],
      rows: [['', '', '']],
    });
  }

  /// الجدول لا يُطبع إن لم يُكتب فيه شيء.
  get isEmpty(): boolean {
    return this.rows.every((r) => r.every((c) => c.trim().length === 0));
  }

  /// الصفوف غير الفارغة، كلٌّ منها بعدد الأعمدة بالضبط.
  get filledRows(): string[][] {
    const out: string[][] = [];
    for (const r of this.rows) {
      if (r.some((c) => c.trim().length > 0)) {
        out.push(this.cols.map((_, i) => (i < r.length ? r[i] : '')));
      }
    }
    return out;
  }

  encode(): string {
    return JSON.stringify({
      v: 2,
      title: this.title,
      cols: this.cols.map((c) => ({ t: c.title, w: c.weight })),
      rows: this.filledRows,
    });
  }

  static decode(json: string): FreeTable {
    try {
      const raw: unknown = JSON.parse(json);
      if (Array.isArray(raw)) return FreeTable._legacy(raw);
      if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const rawCols = Array.isArray(obj.cols) ? obj.cols : [];
        const cols: FreeCol[] = [];
        for (const c of rawCols) {
          if (c && typeof c === 'object' && !Array.isArray(c)) {
            const cMap = c as Record<string, unknown>;
            const rawWeight =
              typeof cMap.w === 'number' && Number.isFinite(cMap.w)
                ? cMap.w
                : 5;
            const weight = Math.min(100, Math.max(1, rawWeight));
            cols.push(new FreeCol(`${cMap.t ?? ''}`, weight));
          }
        }
        if (cols.length === 0) return FreeTable.starter();

        const rawRows = Array.isArray(obj.rows) ? obj.rows : [];
        const rows: string[][] = [];
        for (const r of rawRows) {
          if (Array.isArray(r)) {
            rows.push(
              cols.map((_, i) => (i < r.length ? `${r[i] ?? ''}` : '')),
            );
          }
        }
        return new FreeTable({
          title: `${obj.title ?? ''}`,
          cols,
          rows:
            rows.length === 0 ? [Array<string>(cols.length).fill('')] : rows,
        });
      }
    } catch (err) {
      const stack = err instanceof Error ? (err.stack ?? null) : null;
      DomainDiagnostics.report('freeTable.parse', err, stack);
    }
    return FreeTable.starter();
  }

  /// الصيغة القديمة: قائمة `{name, unit, note}`.
  private static _legacy(raw: readonly unknown[]): FreeTable {
    const rows: string[][] = [];
    for (const e of raw) {
      if (e && typeof e === 'object' && !Array.isArray(e)) {
        const m = e as Record<string, unknown>;
        rows.push([`${m.name ?? ''}`, `${m.unit ?? ''}`, `${m.note ?? ''}`]);
      }
    }
    const base = FreeTable.starter();
    return new FreeTable({
      cols: base.cols,
      rows: rows.length === 0 ? base.rows : rows,
    });
  }
}
