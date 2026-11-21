import { Ids } from '../../core/ids';
import {
  LimitStatus,
  WarehouseLimits,
  type LimitCheckRow,
} from '../../domain/warehouse_limits';
import {
  AppDatabase,
  WarehouseStockLimitsCompanion,
  type Item,
  type WarehouseStockLimit,
} from '../db/app_database';
import { Value } from '../db/sqlite_driver';
import { AuditRepo } from './audit_repo';
import { CatalogRepo } from './catalog_repo';
// MISSING: lib/data/repos/movements_repo.dart (المرحلة 9)
import { MovementsRepo } from './movements_repo';

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/// سطر حدود كما تُدخله الشاشة — **بوحدة الإدخال** لا بوحدة الأساس.
export class LimitInput {
  readonly itemId: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly factor: number;

  /// بوحدة [unitName].
  readonly min: number;
  readonly max: number;
  readonly notes: string;

  constructor({
    itemId,
    itemName,
    unitName,
    factor,
    min,
    max,
    notes = '',
  }: {
    readonly itemId: string;
    readonly itemName: string;
    readonly unitName: string;
    readonly factor: number;
    readonly min: number;
    readonly max: number;
    readonly notes?: string;
  }) {
    this.itemId = itemId;
    this.itemName = itemName;
    this.unitName = unitName;
    this.factor = factor;
    this.min = min;
    this.max = max;
    this.notes = notes;
  }

  get check(): LimitCheckRow {
    return { itemId: this.itemId, min: this.min, max: this.max };
  }
}

/// صفٌّ في لوحة المستودع: الحدّ والرصيد والحكم بينهما.
export class WarehouseLimitRow {
  readonly limit: WarehouseStockLimit;
  readonly item: Item | null;

  /// الرصيد بوحدة الأساس.
  readonly balanceBase: number;

  constructor({
    limit,
    item,
    balanceBase,
  }: {
    readonly limit: WarehouseStockLimit;
    readonly item: Item | null;
    readonly balanceBase: number;
  }) {
    this.limit = limit;
    this.item = item;
    this.balanceBase = balanceBase;
  }

  get factor(): number {
    return WarehouseLimits.safeFactor(this.limit.factor);
  }

  get unitName(): string {
    return this.limit.unitName.length > 0
      ? this.limit.unitName
      : (this.item?.baseUnit ?? '');
  }

  get balance(): number {
    return WarehouseLimits.fromBase(this.balanceBase, this.factor);
  }

  get min(): number {
    return WarehouseLimits.fromBase(this.limit.minStock, this.factor);
  }

  get max(): number {
    return WarehouseLimits.fromBase(this.limit.maxStock, this.factor);
  }

  get status(): LimitStatus {
    return WarehouseLimits.statusOf({
      balance: this.balanceBase,
      minStock: this.limit.minStock,
      maxStock: this.limit.maxStock,
    });
  }

  /// النقص بوحدة العرض — ما يجب تحويله ليبلغ الحد الأدنى.
  get shortfall(): number {
    return WarehouseLimits.fromBase(
      WarehouseLimits.shortfall({
        balance: this.balanceBase,
        minStock: this.limit.minStock,
      }),
      this.factor,
    );
  }

  get surplus(): number {
    return WarehouseLimits.fromBase(
      WarehouseLimits.surplus({
        balance: this.balanceBase,
        maxStock: this.limit.maxStock,
      }),
      this.factor,
    );
  }

  get fillRatio(): number | null {
    return WarehouseLimits.fillRatio({
      balance: this.balanceBase,
      maxStock: this.limit.maxStock,
    });
  }
}

export class LimitResult {
  readonly ok: boolean;
  readonly error: string;
  readonly saved: number;

  constructor({
    ok,
    error = '',
    saved = 0,
  }: {
    readonly ok: boolean;
    readonly error?: string;
    readonly saved?: number;
  }) {
    this.ok = ok;
    this.error = error;
    this.saved = saved;
  }
}

/// حدود مخزون المستودعات: ضبطها، وقراءة لوحة المستودع منها.
///
/// **الحدود تُخزَّن بوحدة الأساس وتُعرض بوحدة صاحبها.** الرصيد في النظام كلّه
/// بوحدة الأساس، فالمقارنة به لا تصحّ إلا بها؛ والمستخدم يضبط حدّه بالكرتون
/// أو الشوال، فإعادته إليه بالحبة تجعله يعيد الحساب في رأسه كل مرة.
export class WarehouseLimitsRepo {
  readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  async limits({
    warehouseId = '',
  }: { readonly warehouseId?: string } = {}): Promise<WarehouseStockLimit[]> {
    const q = this.db.select(this.db.warehouseStockLimits);
    if (warehouseId.length > 0) {
      q.where((t) => t.warehouseId.equals(warehouseId));
    }
    const rows = await q.get();
    rows.sort((a, b) => compareStrings(a.itemName, b.itemName));
    return rows;
  }

  /// لوحة مستودع: كل صنف له حدّ، ورصيده الآن، والحكم بينهما.
  ///
  /// الرصيد يُقرأ من دفتر الحركات لا من حقلٍ مخزَّن — هو المصدر الوحيد الذي
  /// يوافق التقارير، فلا تختلف اللوحة عن تقرير الأرصدة أمام نفس المستخدم.
  async dashboard(warehouseName: string): Promise<WarehouseLimitRow[]> {
    const all = await this.limits();
    if (all.length === 0) return [];
    const byName = await this._warehouseIdsByName();
    const id = byName[warehouseName.trim()] ?? '';
    const mine =
      id.length === 0 ? [] : all.filter((l) => l.warehouseId === id);
    if (mine.length === 0) return [];

    // MISSING: lib/data/repos/movements_repo.dart (المرحلة 9)
    const balances = await new MovementsRepo(this.db).balances({
      warehouse: warehouseName.trim(),
    });
    const items = await new CatalogRepo(this.db).items();
    const byId = new Map<string, Item>(items.map((i) => [i.id, i]));

    const rows = mine.map(
      (l) =>
        new WarehouseLimitRow({
          limit: l,
          item: byId.get(l.itemId) ?? null,
          balanceBase: balances[l.itemId] ?? 0,
        }),
    );
    // الأحرج أولًا: ما هو تحت الأدنى يُقرأ قبل ما هو سليم.
    const order: Record<LimitStatus, number> = {
      [LimitStatus.low]: 0,
      [LimitStatus.over]: 1,
      [LimitStatus.ok]: 2,
      [LimitStatus.none]: 3,
    };
    rows.sort((a, b) => {
      const byStatus = order[a.status] - order[b.status];
      return byStatus !== 0
        ? byStatus
        : compareStrings(a.limit.itemName, b.limit.itemName);
    });
    return rows;
  }

  private async _warehouseIdsByName(): Promise<Record<string, string>> {
    const rows = await this.db.select(this.db.warehouses).get();
    const out: Record<string, string> = {};
    for (const w of rows) {
      out[w.name.trim()] = w.id;
    }
    return out;
  }

  /// حفظ دفعة حدود لمستودع واحد.
  ///
  /// الدفعة تُحفظ كلّها أو لا شيء: نصفُ دفعةٍ محفوظ يترك المستخدم لا يدري
  /// أيّ سطر وصل وأيّ سطر ضاع.
  async saveBatch({
    warehouseId,
    warehouseName,
    rows,
    actor = '',
  }: {
    readonly warehouseId: string;
    readonly warehouseName: string;
    readonly rows: readonly LimitInput[];
    readonly actor?: string;
  }): Promise<LimitResult> {
    if (warehouseId.trim().length === 0) {
      return new LimitResult({ ok: false, error: '✖ اختر المستودع' });
    }
    const error = WarehouseLimits.validateBatch(rows.map((r) => r.check));
    if (error !== null) {
      return new LimitResult({ ok: false, error: `✖ ${error}` });
    }

    const existing = await this.limits({ warehouseId });
    const byItem = new Map<string, WarehouseStockLimit>(
      existing.map((l) => [l.itemId, l]),
    );

    await this.db.transaction(async () => {
      for (const r of rows) {
        const factor = WarehouseLimits.safeFactor(r.factor);
        await this.db.into(this.db.warehouseStockLimits).insertOnConflictUpdate(
          WarehouseStockLimitsCompanion.insert({
            id:
              byItem.get(r.itemId)?.id ??
              Ids.natural('whl', [warehouseId, r.itemId]),
            warehouseId,
            warehouseName: Value.of(warehouseName),
            itemId: r.itemId,
            itemName: Value.of(r.itemName),
            unitName: Value.of(r.unitName),
            factor: Value.of(factor),
            minStock: Value.of(WarehouseLimits.toBase(r.min, factor)),
            maxStock: Value.of(WarehouseLimits.toBase(r.max, factor)),
            notes: Value.of(r.notes),
            updatedAt: Value.of(new Date()),
          }),
        );
      }
    });

    await new AuditRepo(this.db).log({
      action: 'warehouseLimit.saveBatch',
      entityType: 'حد مخزون',
      summary: `ضبط ${rows.length} حدًّا في «${warehouseName}»`,
      details: { warehouseId, rows: rows.length },
      actorEmail: actor,
    });
    return new LimitResult({ ok: true, saved: rows.length });
  }

  async delete(
    id: string,
    { actor = '' }: { readonly actor?: string } = {},
  ): Promise<LimitResult> {
    const row = await this.db
      .select(this.db.warehouseStockLimits)
      .where((t) => t.id.equals(id))
      .getSingleOrNull();
    if (row === null) {
      return new LimitResult({ ok: false, error: '✖ الحد غير موجود' });
    }
    await this.db
      .delete(this.db.warehouseStockLimits)
      .where((t) => t.id.equals(id))
      .go();
    await new AuditRepo(this.db).log({
      action: 'warehouseLimit.delete',
      entityType: 'حد مخزون',
      summary: `حذف حد «${row.itemName}» من «${row.warehouseName}»`,
      details: { limitId: id },
      actorEmail: actor,
    });
    return new LimitResult({ ok: true });
  }

  /// أصناف تحت الحد الأدنى في كل المستودعات — تُغذّي جرس التنبيهات.
  async lowEverywhere(): Promise<WarehouseLimitRow[]> {
    const warehouses = await this.db.select(this.db.warehouses).get();
    const out: WarehouseLimitRow[] = [];
    for (const w of warehouses) {
      const rows = await this.dashboard(w.name);
      for (const r of rows) {
        if (r.status === LimitStatus.low) out.push(r);
      }
    }
    return out;
  }
}
