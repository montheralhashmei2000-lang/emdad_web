import { DeviceActivation } from '../../core/security/device_activation';
import type { AppDatabase } from '../db/app_database';
import { Variable } from '../db/sqlite_driver';

/// ترقيم السندات: «و-K7QX23-000001» = البادئة ثم رمز الجهاز ثم تسلسل الجهاز.
export class DocNumbering {
  constructor(readonly db: AppDatabase) {}

  private static readonly _table = 'doc_counters';
  private static readonly _width = 6;

  private _code: string | null = null;
  private _ready = false;

  /// طول رمز الجهاز في المراجع.
  static readonly codeLength = 6;

  /// رمز جهازٍ بمعرّفه — يقارن به الاقتران رمزي الجهازين.
  static codeOf(deviceId: string): string {
    return (
      deviceId.length > DocNumbering.codeLength
        ? deviceId.substring(0, DocNumbering.codeLength)
        : deviceId
    ).toUpperCase();
  }

  /// رمز هذا الجهاز في المراجع.
  async deviceCode(): Promise<string> {
    if (this._code != null) return this._code;
    this._code = DocNumbering.codeOf(await new DeviceActivation(this.db).deviceId());
    return this._code;
  }

  private async _head(prefix: string, code: number): Promise<string> {
    const full = await this.deviceCode();
    return `${prefix}${full.length > code ? full.substring(0, code) : full}-`;
  }

  /// الرقم التالي لجدول وبادئة، دون حجزه.
  async peek(
    table: string,
    prefix: string,
    {
      seed,
      code = DocNumbering.codeLength,
      width = DocNumbering._width,
    }: {
      readonly seed?: () => Promise<number>;
      readonly code?: number;
      readonly width?: number;
    } = {},
  ): Promise<string> {
    const head = await this._head(prefix, code);
    const n = await this._counter(table, prefix, seed);
    return `${head}${String(n + 1).padStart(width, '0')}`;
  }

  /// تثبيت مرجع حُفظ به سند: يتقدّم العدّاد إليه إن كان بصيغة هذا الجهاز.
  async claim(
    table: string,
    prefix: string,
    ref: string,
    {
      seed,
      code = DocNumbering.codeLength,
    }: {
      readonly seed?: () => Promise<number>;
      readonly code?: number;
    } = {},
  ): Promise<void> {
    const head = await this._head(prefix, code);
    if (!ref.startsWith(head)) return;
    const rawTail = ref.substring(head.length);
    if (!/^\d+$/.test(rawTail)) return;
    const n = Number.parseInt(rawTail, 10);
    if (!Number.isFinite(n)) return;
    const current = await this._counter(table, prefix, seed);
    if (n > current) {
      await this._store(table, prefix, n);
    }
  }

  private async _counter(
    table: string,
    prefix: string,
    seedOf?: () => Promise<number>,
  ): Promise<number> {
    await this._ensureTable();
    const key = DocNumbering._key(table, prefix);
    const row = await this.db
      .customSelect(`SELECT value FROM ${DocNumbering._table} WHERE key = ?`, {
        variables: [Variable.withString(key)],
      })
      .getSingleOrNull();
    if (row != null) {
      return row.read<number>('value');
    }
    const seed = seedOf != null ? await seedOf() : await this._maxExisting(table);
    await this._store(table, prefix, seed);
    return seed;
  }

  private async _maxExisting(table: string): Promise<number> {
    const rows = await this.db.customSelect(`SELECT DISTINCT ref_no AS r FROM ${table}`).get();
    let max = 0;
    const trailing = /(\d+)$/;
    for (const row of rows) {
      const m = trailing.exec(`${row.data['r'] ?? ''}`);
      const n = m == null ? 0 : Number.parseInt(m[1], 10) || 0;
      if (n > max) max = n;
    }
    return max;
  }

  private _store(table: string, prefix: string, value: number): Promise<void> {
    return this.db.customStatement(
      `INSERT INTO ${DocNumbering._table} (key, value) VALUES (?, ?) ` +
        'ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      [DocNumbering._key(table, prefix), value],
    );
  }

  private static _key(table: string, prefix: string): string {
    return `${table}|${prefix}`;
  }

  private async _ensureTable(): Promise<void> {
    if (this._ready) return;
    await this.db.customStatement(
      `CREATE TABLE IF NOT EXISTS ${DocNumbering._table} (key TEXT NOT NULL PRIMARY KEY, value INTEGER NOT NULL)`,
    );
    this._ready = true;
  }
}
