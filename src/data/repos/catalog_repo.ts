import { ErrorLogger } from '../../core/error_log';
import { Ids } from '../../core/ids';
import { parseWarehouseScope } from '../../core/security/warehouse_scope';
import { isoDay } from '../../core/ui/imd_format';
import { AccessControl } from '../../domain/access_control';
import { ItemBarcode } from '../../domain/item_barcode';
import {
  AppDatabase,
  BeneficiaryUnitsCompanion,
  CategoriesCompanion,
  FacilitiesCompanion,
  ItemsCompanion,
  OpeningBalancesCompanion,
  SuppliersCompanion,
  WarehousesCompanion,
  type BeneficiaryUnit,
  type Category,
  type Facility,
  type Item,
  type OpeningBalance,
  type Supplier,
  type Warehouse,
} from '../db/app_database';
import { Value, Variable } from '../db/sqlite_driver';
// MISSING: lib/data/repos/movements_repo.dart (المرحلة 9)
import { MovementsRepo } from './movements_repo';
import { RepoGuard } from './repo_guard';
import { StateError } from './users_repo';

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function tryParseInt(s: string): number | null {
  const trimmed = s.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(n) ? n : null;
}

/// منعٌ مقصود لتعديلٍ على مستودع. رسالته عربية تُعرض للمستخدم كما هي.
export class WarehouseBlocked extends Error {
  readonly message: string;

  constructor(message: string) {
    super(message);
    this.name = 'WarehouseBlocked';
    this.message = message;
  }

  override toString(): string {
    return this.message;
  }
}

/// وحدة قياس الصنف (تُحفظ JSON داخل عمود units).
export class ItemUnit {
  readonly name: string;
  readonly factor: number;
  readonly isBase: boolean;

  constructor({
    name,
    factor,
    isBase = false,
  }: {
    readonly name: string;
    readonly factor: number;
    readonly isBase?: boolean;
  }) {
    this.name = name;
    this.factor = factor;
    this.isBase = isBase;
  }

  static fromMap(m: Record<string, unknown>): ItemUnit {
    return new ItemUnit({
      name: String(m.name ?? ''),
      factor: typeof m.factor === 'number' ? m.factor : 1,
      isBase: m.isBase === true,
    });
  }

  toMap(): { name: string; factor: number; isBase: boolean } {
    return { name: this.name, factor: this.factor, isBase: this.isBase };
  }
}

/// البيانات الأساسية: الأصناف والتصنيفات والمستودعات والموردون والوحدات المستفيدة والمطابخ.
/// منشآت الوحدة المشترَك فيها: القائمة الجديدة، وإن كانت فارغة فالارتباط
/// المفرد القديم — حتى تعمل البيانات المُرحَّلة وملفات التصدير السابقة.
export function facilityIdsOf(u: BeneficiaryUnit): string[] {
  try {
    const raw: unknown = JSON.parse(u.facilityIds);
    if (Array.isArray(raw)) {
      const out = raw.map((v) => `${v}`).filter((v) => v.length > 0);
      if (out.length > 0) return out;
    }
  } catch (err) {
    ErrorLogger.log('catalog.facilityIds', err, err instanceof Error ? err.stack : undefined);
  }
  return u.facilityId.length === 0 ? [] : [u.facilityId];
}

/// تثبيت رصيدٍ افتتاحي في مستودعٍ مجمّد بأمر جرد.
export class OpeningBlocked extends Error {
  readonly message: string;

  constructor(message: string) {
    super(message);
    this.name = 'OpeningBlocked';
    this.message = message;
  }

  override toString(): string {
    return this.message;
  }
}

/// عرض رصيد مخزَّن بالوحدة الأساسية بوحدة العرض المختارة للصنف.
///
/// الرصيد يُحفظ دائمًا بالوحدة الأساسية (كجم مثلًا)، لكن أمين المستودع يعدّ
/// بالأكياس. هذه الدالة تحوّل للعرض فقط ولا تمسّ المخزَّن إطلاقًا.
///
/// تعيد النص كاملًا: «٢٧٫٥ كيس» أو «١١٠٠ كجم» إن لم تُحدَّد وحدة عرض.
export function displayBalance(
  item: Item,
  baseQty: number,
): { readonly qty: number; readonly unit: string } {
  const r = reportUnitOf(item);
  if (r.factor === 1) return { qty: baseQty, unit: r.unit };
  const q = Math.round((baseQty / r.factor) * 1000) / 1000;
  return { qty: q === 0 ? 0 : q, unit: r.unit };
}

/// وحدة تقارير الصنف ومعاملها: الكمية الأساسية ÷ [factor] = الكمية بها.
///
/// الوحدة الافتراضية المختارة للصنف ([Item.reportUnit]) إن كانت من وحداته، وإلا
/// وحدته الأساسية بمعامل ١. مصدرٌ واحد لكل تقرير يعرض كمياتٍ مجمّعة بالأساس.
export function reportUnitOf(item: Item): {
  readonly factor: number;
  readonly unit: string;
} {
  const unit = item.reportUnit;
  if (unit.length === 0 || unit === item.baseUnit) {
    return { factor: 1.0, unit: item.baseUnit };
  }
  for (const u of unitsOfItem(item)) {
    if (u.name === unit) {
      return { factor: u.factor <= 0 ? 1.0 : u.factor, unit };
    }
  }
  return { factor: 1.0, unit: item.baseUnit };
}

/// وحدات الصنف من عمود JSON — نسخة مستقلة عن الصنف `CatalogRepo` ليستعملها
/// العرض في أي طبقة بلا حاجة إلى مستودع.
export function unitsOfItem(item: Item): ItemUnit[] {
  try {
    const raw: unknown = JSON.parse(item.units);
    if (Array.isArray(raw)) {
      const out: ItemUnit[] = [];
      for (const u of raw) {
        if (u && typeof u === 'object' && !Array.isArray(u)) {
          const rec = u as Record<string, unknown>;
          const name = `${rec.name ?? ''}`;
          if (name.length > 0) {
            out.push(
              new ItemUnit({
                name,
                factor: typeof rec.factor === 'number' ? rec.factor : 1,
                isBase: rec.isBase === true,
              }),
            );
          }
        }
      }
      return out;
    }
  } catch (err) {
    ErrorLogger.log('catalog.itemUnits', err, err instanceof Error ? err.stack : undefined);
  }
  return item.baseUnit.length === 0
    ? []
    : [new ItemUnit({ name: item.baseUnit, factor: 1, isBase: true })];
}

export class CatalogRepo {
  readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  // ───────── الأصناف ─────────
  async items({ query = '' }: { readonly query?: string } = {}): Promise<Item[]> {
    const rows = await this.db.select(this.db.items).get();
    const q = query.trim().toLowerCase();
    const list =
      q.length === 0
        ? [...rows]
        : rows.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.code.toLowerCase().includes(q) ||
              i.barcode.toLowerCase().includes(q),
          );
    list.sort(CatalogRepo._byCodeThenName);
    return list;
  }

  itemById(id: string): Promise<Item | null> {
    return this.db
      .select(this.db.items)
      .where((t) => t.id.equals(id))
      .getSingleOrNull();
  }

  /// معرّفات الأصناف «أصل ثابت» من بين [ids] — بها يُعرف أمر صرفٍ أو تحويلٍ
  /// محفوظ أهو صرف أصولٍ فيُطبع بلا قوةٍ ولا مدة إعاشة.
  async assetIdsAmong(ids: Iterable<string>): Promise<Set<string>> {
    const wanted = new Set<string>();
    for (const id of ids) {
      if (id.length > 0) wanted.add(id);
    }
    if (wanted.size === 0) return new Set();
    const rows = await this.db
      .select(this.db.items)
      .where((t) => t.id.isIn(wanted).and(t.isAsset.equals(true)))
      .get();
    return new Set(rows.map((r) => r.id));
  }

  unitsOf(item: Item): ItemUnit[] {
    try {
      const raw: unknown = JSON.parse(item.units);
      if (Array.isArray(raw) && raw.length > 0) {
        return raw
          .filter(
            (e): e is Record<string, unknown> =>
              e !== null && typeof e === 'object' && !Array.isArray(e),
          )
          .map((e) => ItemUnit.fromMap(e));
      }
    } catch (err) {
      ErrorLogger.log('catalog.itemUnits', err, err instanceof Error ? err.stack : undefined);
    }
    return [
      new ItemUnit({
        name: item.baseUnit.length === 0 ? 'وحدة' : item.baseUnit,
        factor: 1,
        isBase: true,
      }),
    ];
  }

  /// وحدات الصنف من الأكبر إلى الأصغر (تُستخدم في العد والترحيل والطباعة).
  unitsDescending(item: Item): ItemUnit[] {
    return this.unitsOf(item).sort((a, b) => b.factor - a.factor);
  }

  factorOf(item: Item, unitName: string): number {
    for (const u of this.unitsOf(item)) {
      if (u.name === unitName) return u.factor <= 0 ? 1 : u.factor;
    }
    return 1;
  }

  async saveItem({
    id,
    code,
    name,
    categoryId = '',
    categoryName = '',
    baseUnit = '',
    units = [],
    minQty = 0,
    barcode = '',
    isRefillable = false,
    reportUnit = '',
    // v27: بيانات الأصل الثابت — `null`/`undefined` يُبقي المحفوظ كما هو، فمن يحفظ صنفًا ولا
    // يعرف الأصول (الاستيراد، الإضافة السريعة) لا يُسقط عنه صفة الأصل.
    isAsset = null,
    assetType = null,
    lifespanMonths = null,
    unitValue = null,
  }: {
    readonly id?: string | null;
    readonly code: string;
    readonly name: string;
    readonly categoryId?: string;
    readonly categoryName?: string;
    readonly baseUnit?: string;
    readonly units?: readonly ItemUnit[];
    readonly minQty?: number;
    readonly barcode?: string;
    readonly isRefillable?: boolean;
    readonly reportUnit?: string;
    readonly isAsset?: boolean | null;
    readonly assetType?: string | null;
    readonly lifespanMonths?: number | null;
    readonly unitValue?: number | null;
  }): Promise<string> {
    const newId = id ?? CatalogRepo._newId('itm');
    const list =
      units.length === 0
        ? [new ItemUnit({ name: baseUnit, factor: 1, isBase: true })]
        : units;
    const unitsJson = JSON.stringify(list.map((u) => u.toMap()));
    // وحدة الأساس تُشتق من الوحدات حين لا تُمرَّر صراحةً (الوحدة ذات isBase).
    const base =
      baseUnit.length > 0
        ? baseUnit
        : (list.find((u) => u.isBase) ?? list[0]).name;
    await this.db.into(this.db.items).insertOnConflictUpdate(
      ItemsCompanion.insert({
        id: newId,
        name,
        code: Value.of(code),
        categoryId: Value.of(categoryId),
        categoryName: Value.of(categoryName),
        baseUnit: Value.of(base),
        units: Value.of(unitsJson),
        minQty: Value.of(minQty),
        barcode: Value.of(barcode),
        isRefillable: Value.of(isRefillable),
        reportUnit: Value.of(reportUnit),
        isAsset: isAsset == null ? Value.absent() : Value.of(isAsset),
        assetType: assetType == null ? Value.absent() : Value.of(assetType),
        lifespanMonths:
          lifespanMonths == null ? Value.absent() : Value.of(lifespanMonths),
        unitValue: unitValue == null ? Value.absent() : Value.of(unitValue),
      }),
    );
    return newId;
  }

  /// يحذف الصنف. من له حركات لا يُحذف: السجلات تبقى بلا صنف فتختل الأرصدة.
  /// (المشغّل `tg_items_delete_guard` يحرس القاعدة نفسها؛ هذا للرسالة الواضحة.)
  async deleteItem(id: string): Promise<void> {
    if (await this.hasMovements(id)) {
      throw new StateError(
        'لا يمكن حذف صنف له حركات (وارد أو صرف أو تحويل أو مرتجع أو رصيد افتتاحي أو تسوية)',
      );
    }
    await this.db
      .delete(this.db.items)
      .where((t) => t.id.equals(id))
      .go();
  }

  /// هل للصنف أي حركة مسجَّلة؟
  async hasMovements(id: string): Promise<boolean> {
    const rows = await this.db
      .customSelect(
        `SELECT 1 AS x WHERE ${AppDatabase.itemHasMovementsSql('?1')}`,
        { variables: [Variable.withString(id)] },
      )
      .get();
    return rows.length > 0;
  }

  // ───────── التصنيفات ─────────
  async categories(): Promise<Category[]> {
    const rows = await this.db.select(this.db.categories).get();
    rows.sort((a, b) => compareStrings(a.name, b.name));
    return rows;
  }

  async saveCategory({
    id,
    name,
    description = '',
  }: {
    readonly id?: string | null;
    readonly name: string;
    readonly description?: string;
  }): Promise<string> {
    const newId = id ?? CatalogRepo._newId('cat');
    await this.db.into(this.db.categories).insertOnConflictUpdate(
      CategoriesCompanion.insert({
        id: newId,
        name,
        description: Value.of(description),
      }),
    );
    return newId;
  }

  // ───────── المستودعات ─────────
  /// إضافة سريعة من شاشة الاستلام (➕ بجانب المستودع/المورد).
  quickAddWarehouse(name: string): Promise<void> {
    return this.db
      .into(this.db.warehouses)
      .insert(WarehousesCompanion.insert({ id: Ids.next('wh'), name: name.trim() }));
  }

  quickAddSupplier(name: string): Promise<void> {
    return this.db
      .into(this.db.suppliers)
      .insert(SuppliersCompanion.insert({ id: Ids.next('sup'), name: name.trim() }));
  }

  async warehouses({
    scope = null,
  }: { readonly scope?: readonly string[] | null } = {}): Promise<Warehouse[]> {
    const rows = await this.db.select(this.db.warehouses).get();
    const list =
      scope == null ? [...rows] : rows.filter((w) => scope.includes(w.name));
    list.sort((a, b) => compareStrings(a.name, b.name));
    return list;
  }

  /// الجداول التي تشير إلى المستودع **بالاسم** لا بالمعرّف، وعمودُ الاسم في كل
  /// منها. سجلُّ التدقيق مستثنى: هو تاريخٌ لما جرى، لا مرجعًا يُتابَع.
  static readonly warehouseNameRefs: Readonly<Record<string, readonly string[]>> = {
    receipts: ['warehouse'],
    issues: ['warehouse'],
    transfers: ['warehouse', 'dest_warehouse'],
    returns: ['warehouse'],
    adjustments: ['warehouse'],
    opening_balances: ['warehouse'],
    stocktakes: ['warehouse'],
    facilities: ['warehouse'],
    meal_plans: ['warehouse'],
    assets: ['warehouse'],
    ration_orders: ['requesting_warehouse', 'supplying_warehouse'],
    archive_files: ['warehouse'],
    warehouse_stock_limits: ['warehouse_name'],
  };

  /// هل يشير إلى مستودعٍ بهذا الاسم سجلٌّ واحد على الأقل؟
  ///
  /// نظير `FuelRepo._warehouseInUse` لقسم الإمداد، وأوسعُ منه لأن المستودع هنا
  /// تشير إليه الحركاتُ والمنشآتُ وخطط الوجبات والأصول والطلبيات والأرشيف.
  async warehouseInUse(name: string): Promise<boolean> {
    const key = name.trim();
    if (key.length === 0) return false;
    const parts: string[] = [];
    for (const [table, cols] of Object.entries(CatalogRepo.warehouseNameRefs)) {
      for (const col of cols) {
        parts.push(`SELECT 1 FROM "${table}" WHERE TRIM("${col}") = ?1`);
      }
    }
    const row = await this.db
      .customSelect(`${parts.join(' UNION ALL ')} LIMIT 1`, {
        variables: [new Variable<string>(key)],
      })
      .getSingleOrNull();
    if (row !== null) return true;
    // نطاقُ مستخدمٍ مقيَّد بأسماء مستودعاته (`users.warehouse_scope`، JSON).
    for (const u of await this.db.select(this.db.users).get()) {
      const parsed = parseWarehouseScope(u.warehouseScope, {
        source: 'catalog.warehouseInUse',
      });
      if (parsed?.includes(key)) {
        return true;
      }
    }
    return false;
  }

  /// يحفظ مستودعًا. **تغيير اسم مستودعٍ مُستعمَل مرفوض** ([WarehouseBlocked]).
  ///
  /// كل حركةٍ وكل منشأةٍ ونطاقِ مستخدمٍ تشير إلى المستودع **بنصّ اسمه** (ثلاثة
  /// عشر جدولًا، [warehouseNameRefs])، فتغييرُ الاسم يُيتّم ما أشار إليه: يظهر
  /// رصيدُه صفرًا وتبقى حركاته باسمٍ لا مستودعَ له، ويفقد المستخدم المقيَّد
  /// نطاقه. ولا تُرحَّل المراجع لأن الترحيل محليٌّ والنظام موزَّع: جهازٌ لم
  /// يُرحِّل يُرسل صفوفه بالاسم القديم فيعيد بعضها «الأحدثُ يفوز»، و`warehouse_scope`
  /// لا ينتقل أصلًا بلا توقيع المالك. والمحروقات حُسمت على الرفض نفسه
  /// (`FuelRepo.saveWarehouse`).
  async saveWarehouse({
    id,
    code,
    name,
    manager = '',
    location = '',
    feedsAllCamps = true,
    campIds = [],
    notes = '',
  }: {
    readonly id?: string | null;
    readonly code: string;
    readonly name: string;
    readonly manager?: string;
    readonly location?: string;
    readonly feedsAllCamps?: boolean;
    readonly campIds?: readonly string[];
    readonly notes?: string;
  }): Promise<string> {
    const newId = id ?? CatalogRepo._newId('wh');
    if (id != null) {
      const old = await this.db
        .select(this.db.warehouses)
        .where((t) => t.id.equals(id))
        .getSingleOrNull();
      if (
        old !== null &&
        old.name.trim() !== name.trim() &&
        (await this.warehouseInUse(old.name))
      ) {
        throw new WarehouseBlocked(
          `لا يُغيَّر اسم «${old.name}» وعليه حركة أو ارتباط — ` +
            'أنشئ مستودعًا بالاسم الجديد وحوّل إليه الرصيد',
        );
      }
    }
    await this.db.into(this.db.warehouses).insertOnConflictUpdate(
      WarehousesCompanion.insert({
        id: newId,
        name,
        code: Value.of(code),
        manager: Value.of(manager),
        location: Value.of(location),
        feedsAllCamps: Value.of(feedsAllCamps),
        campIds: Value.of(JSON.stringify(campIds)),
        notes: Value.of(notes),
      }),
    );
    return newId;
  }

  /// معسكرات المستودع (لربط التحويل بالاستحقاق).
  campsOf(w: Warehouse): string[] {
    try {
      const raw: unknown = JSON.parse(w.campIds);
      if (Array.isArray(raw)) return raw.map((e) => String(e));
    } catch (err) {
      ErrorLogger.log('catalog.campIds', err, err instanceof Error ? err.stack : undefined);
    }
    return [];
  }

  // ───────── الموردون ─────────
  async suppliers(): Promise<Supplier[]> {
    const rows = await this.db.select(this.db.suppliers).get();
    rows.sort((a, b) => compareStrings(a.name, b.name));
    return rows;
  }

  async saveSupplier({
    id,
    name,
    phone = '',
    notes = '',
    contact = '',
    city = '',
  }: {
    readonly id?: string | null;
    readonly name: string;
    readonly phone?: string;
    readonly notes?: string;
    readonly contact?: string;
    readonly city?: string;
  }): Promise<string> {
    const newId = id ?? CatalogRepo._newId('sup');
    await this.db.into(this.db.suppliers).insertOnConflictUpdate(
      SuppliersCompanion.insert({
        id: newId,
        name,
        phone: Value.of(phone),
        notes: Value.of(notes),
        contact: Value.of(contact),
        city: Value.of(city),
      }),
    );
    return newId;
  }

  // ───────── الوحدات المستفيدة والمعسكرات ─────────
  async units(): Promise<BeneficiaryUnit[]> {
    const rows = await this.db.select(this.db.beneficiaryUnits).get();
    rows.sort((a, b) => compareStrings(a.code, b.code));
    return rows;
  }

  /// بترتيب الإنشاء (بلا فرز) — لشاشةٍ تعرض الوحدات بترتيب إدخالها.
  unitsUnsorted(): Promise<BeneficiaryUnit[]> {
    return this.db.select(this.db.beneficiaryUnits).get();
  }

  async camps(): Promise<BeneficiaryUnit[]> {
    return (await this.units()).filter(
      (u) => u.isCamp || u.parentId.length === 0,
    );
  }

  /// معسكرات نطاق مستودعات المستخدم ([AccessControl.campScope]) معرّفاتٍ وأسماءً،
  /// أو `null` = كلها. التفريدة تحصر بالمعرّف، والقوة البشرية (عمودها نصّ الاسم)
  /// بالاسم.
  async campsInScope({
    isAdmin,
    scope,
  }: {
    readonly isAdmin: boolean;
    readonly scope: readonly string[] | null;
  }): Promise<{ readonly ids: Set<string>; readonly names: Set<string> } | null> {
    const whs = await this.warehouses();
    const ids = AccessControl.campScope({
      isAdmin,
      scope,
      warehouses: whs.map((w) => ({
        name: w.name,
        feedsAllCamps: w.feedsAllCamps,
        campIds: this.campsOf(w),
      })),
    });
    if (ids === null) return null;
    const names = new Set<string>();
    for (const u of await this.units()) {
      if (ids.has(u.id) && u.name.trim().length > 0) {
        names.add(u.name.trim());
      }
    }
    return { ids, names };
  }

  async childrenOf(campId: string): Promise<BeneficiaryUnit[]> {
    return (await this.units()).filter((u) => u.parentId === campId);
  }

  async saveUnit({
    id,
    code,
    name,
    type = 'unit',
    parentId = '',
    parentName = '',
    facilityId = null,
    category = '',
  }: {
    readonly id?: string | null;
    readonly code: string;
    readonly name: string;
    readonly type?: string;
    readonly parentId?: string;
    readonly parentName?: string;
    readonly facilityId?: string | null;
    readonly category?: string;
  }): Promise<string> {
    const newId = id ?? CatalogRepo._newId('unit');
    // facilityId لا يُمس عند التعديل (اشتراك المطبخ يُدار من شاشة المطابخ).
    await this.db.into(this.db.beneficiaryUnits).insertOnConflictUpdate(
      BeneficiaryUnitsCompanion.insert({
        id: newId,
        name,
        code: Value.of(code),
        type: Value.of(type),
        parentId: Value.of(parentId),
        parentName: Value.of(parentName),
        isCamp: Value.of(type === 'camp'),
        facilityId: facilityId == null ? Value.absent() : Value.of(facilityId),
        category: Value.of(category),
      }),
    );
    return newId;
  }

  // ───────── المطابخ والأفران ─────────
  async facilities(): Promise<Facility[]> {
    const rows = await this.db.select(this.db.facilities).get();
    rows.sort((a, b) => compareStrings(a.name, b.name));
    return rows;
  }

  async saveFacility({
    id,
    name,
    fType = 'KITCHEN',
    capacity = 0,
    warehouse = '',
    notes = '',
  }: {
    readonly id?: string | null;
    readonly name: string;
    readonly fType?: string;
    readonly capacity?: number;
    readonly warehouse?: string;
    readonly notes?: string;
  }): Promise<string> {
    const newId = id ?? CatalogRepo._newId('fac');
    await this.db.into(this.db.facilities).insertOnConflictUpdate(
      FacilitiesCompanion.insert({
        id: newId,
        name,
        fType: Value.of(fType),
        capacity: Value.of(capacity),
        warehouse: Value.of(warehouse),
        notes: Value.of(notes),
      }),
    );
    return newId;
  }

  private static _byCodeThenName(a: Item, b: Item): number {
    const ca = tryParseInt(a.code);
    const cb = tryParseInt(b.code);
    if (ca !== null && cb !== null) return ca - cb;
    if (a.code.length > 0 && b.code.length > 0) return compareStrings(a.code, b.code);
    if (a.code.length > 0) return -1;
    if (b.code.length > 0) return 1;
    return compareStrings(a.name, b.name);
  }

  // ───────── عمليات تستعملها شاشات الكتالوج (كانت استعلاماتٍ مباشرة في الشاشات) ─────────

  async itemByCode(code: string): Promise<Item | null> {
    const rows = await this.db
      .select(this.db.items)
      .where((t) => t.code.equals(code))
      .get();
    return rows[0] ?? null;
  }

  async setItemBarcode(id: string, barcode: string): Promise<void> {
    await this.db
      .update(this.db.items)
      .where((t) => t.id.equals(id))
      .write(ItemsCompanion({ barcode: Value.of(barcode) }));
  }

  async barcodeTaken(barcode: string): Promise<boolean> {
    const rows = await this.db
      .select(this.db.items)
      .where((t) => t.barcode.equals(barcode))
      .limit(1)
      .get();
    return rows.length > 0;
  }

  /// مولّد باركود نظامي يبدأ بعد أكبر تسلسل محفوظ في دقيقة [now].
  async barcodeGenerator(now?: Date): Promise<ItemBarcode> {
    const t = now ?? new Date();
    const prefix = ItemBarcode.prefixOf(t);
    const rows = await this.db
      .selectOnly(this.db.items)
      .addColumns([this.db.items.barcode])
      .where(this.db.items.barcode.like(`${prefix}%`))
      .map((r) => r.read(this.db.items.barcode) ?? '')
      .get();
    const seqs: number[] = [];
    for (const b of rows) {
      const seq = ItemBarcode.seqOf(b, prefix);
      if (seq !== null) seqs.push(seq);
    }
    return ItemBarcode.startingAt(t, seqs);
  }

  /// باركود نظامي جديد غير مكرر (فحص القاعدة + [reserved] الممنوحة في الدفعة نفسها).
  async newItemBarcode({
    generator,
    reserved = new Set<string>(),
  }: {
    readonly generator?: ItemBarcode;
    readonly reserved?: ReadonlySet<string>;
  } = {}): Promise<string> {
    const g = generator ?? (await this.barcodeGenerator());
    return g.nextFree(
      async (bc) => reserved.has(bc) || (await this.barcodeTaken(bc)),
    );
  }

  /// يفرّغ وحدات الصنف (استيراد صنفٍ بلا وحدة): `saveItem` يضيف وحدةً افتراضية.
  async clearItemUnits(id: string): Promise<void> {
    await this.db
      .update(this.db.items)
      .where((t) => t.id.equals(id))
      .write(ItemsCompanion({ units: Value.of('[]') }));
  }

  /// تحديث صنفٍ قائم من صفّ استيراد: الاسم والتصنيف والحد الأدنى دائمًا، والوحدة
  /// الأساسية إن وُجدت، ووحدةٌ أولى ([firstUnitJson]) إن لم يكن للصنف وحدات.
  async updateItemFromImport(
    id: string,
    {
      name,
      categoryName,
      categoryId,
      minQty,
      baseUnit = '',
      firstUnitJson = null,
    }: {
      readonly name: string;
      readonly categoryName: string;
      readonly categoryId: string;
      readonly minQty: number;
      readonly baseUnit?: string;
      readonly firstUnitJson?: string | null;
    },
  ): Promise<void> {
    await this.db
      .update(this.db.items)
      .where((t) => t.id.equals(id))
      .write(
        ItemsCompanion({
          name: Value.of(name),
          categoryName: Value.of(categoryName),
          categoryId: Value.of(categoryId),
          baseUnit: baseUnit.length === 0 ? Value.absent() : Value.of(baseUnit),
          units: firstUnitJson == null ? Value.absent() : Value.of(firstUnitJson),
          minQty: Value.of(minQty),
        }),
      );
  }

  /// آخر تاريخ رصيدٍ افتتاحي لكل صنف في مستودع.
  async openingDates(warehouse: string): Promise<Record<string, string>> {
    const rows = await this.db
      .select(this.db.openingBalances)
      .where((t) => t.warehouse.equals(warehouse))
      .get();
    const dates: Record<string, string> = {};
    for (const r of rows) {
      const prev = dates[r.itemId] ?? '';
      if (compareStrings(r.date, prev) > 0) dates[r.itemId] = r.date;
    }
    return dates;
  }

  /// الأرصدة الافتتاحية المثبَّتة في [warehouse] بصنفها (الأحدث تاريخًا إن تكرر).
  async openings(warehouse: string): Promise<Record<string, OpeningBalance>> {
    const rows = await this.db
      .select(this.db.openingBalances)
      .where((t) => t.warehouse.equals(warehouse))
      .get();
    const out: Record<string, OpeningBalance> = {};
    for (const r of rows) {
      const prev = out[r.itemId];
      if (prev === undefined || compareStrings(r.date, prev.date) > 0) {
        out[r.itemId] = r;
      }
    }
    return out;
  }

  /// معرّف الرصيد الافتتاحي لصنفٍ في مستودع — **واحدٌ** على كل الأجهزة.
  ///
  /// كان التثبيت حذفًا ثم إدراجًا بمعرّفٍ عشوائي، فجهازان يثبّتان رصيد الصنف
  /// نفسه قبل أن يتزامنا يتركان صفّين، فيُجمعان: يُحتسب الرصيد مرتين بصمت (H-7).
  static openingIdOf(itemId: string, warehouse: string): string {
    return Ids.natural('opb', [itemId, warehouse]);
  }

  /// يثبّت رصيد [item] في [warehouse]: صفٌّ واحد بالمعرّف الحتمي، وتُحذف أي
  /// صفوفٍ أخرى للمفتاح نفسه (من إصدارٍ أقدم أو من دمجٍ سابق) فيسافر شاهد حذفها.
  private async _putOpening(
    item: Item,
    warehouse: string,
    qty: number,
    actor: string,
    date: string,
    breakdown = '',
  ): Promise<void> {
    const id = CatalogRepo.openingIdOf(item.id, warehouse);
    await this.db
      .delete(this.db.openingBalances)
      .where((t) =>
        t.itemId
          .equals(item.id)
          .and(t.warehouse.equals(warehouse))
          .and(t.id.equals(id).not()),
      )
      .go();
    await this.db.into(this.db.openingBalances).insertOnConflictUpdate(
      OpeningBalancesCompanion.insert({
        id,
        itemId: item.id,
        itemCode: Value.of(item.code),
        itemName: Value.of(item.name),
        warehouse: Value.of(warehouse),
        qty: Value.of(qty),
        date: Value.of(date),
        setBy: Value.of(actor),
        createdAt: Value.of(new Date()),
        breakdown: Value.of(breakdown),
      }),
    );
  }

  /// تثبيت عدة أرصدة افتتاحية بمعاملةٍ واحدة وتاريخٍ واحد (كل صنفٍ يستبدل سابقه في المستودع).
  ///
  /// يرفض ([OpeningBlocked]) مستودعًا مجمّدًا بأمر جرد: تثبيتُ رصيدٍ افتتاحي يغيّر
  /// الدفتري أثناء العدّ كأي حركة — وكان يمرّ وحده من بين الحركات.
  ///
  /// [breakdowns] تفصيل كل صنفٍ كما أُدخل (`OpeningBreakdown.encode`) بمعرّفه — صنفٌ
  /// بلا تفصيل يُحفظ بوحدة الأساس وحدها.
  setOpeningBalances(
    warehouse: string,
    actor: string,
    entries: readonly { readonly item: Item; readonly qty: number }[],
    {
      date,
      breakdowns = {},
    }: {
      readonly date: string;
      readonly breakdowns?: Readonly<Record<string, string>>;
    },
  ): Promise<void> {
    return this.db.transaction(async () => {
      const denied = RepoGuard.check('opening', { warehouses: [warehouse] });
      if (denied !== null) throw new OpeningBlocked(denied);
      // MISSING: lib/data/repos/movements_repo.dart (المرحلة 9)
      const frozen = await new MovementsRepo(this.db).frozenMessage(warehouse);
      if (frozen !== null) throw new OpeningBlocked(frozen);
      for (const e of entries) {
        await this._putOpening(
          e.item,
          warehouse,
          e.qty,
          actor,
          date,
          breakdowns[e.item.id] ?? '',
        );
      }
    });
  }

  /// رصيدٌ افتتاحي للصنف في مستودع — تثبيتٌ يستبدل السابق (كشاشة الأرصدة الافتتاحية).
  setOpeningBalance(
    item: Item,
    warehouse: string,
    qty: number,
    actor: string,
  ): Promise<void> {
    return this.setOpeningBalances(warehouse, actor, [{ item, qty }], {
      date: isoDay(new Date()),
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db
      .delete(this.db.categories)
      .where((t) => t.id.equals(id))
      .go();
  }

  async deleteWarehouse(id: string): Promise<void> {
    await this.db
      .delete(this.db.warehouses)
      .where((t) => t.id.equals(id))
      .go();
  }

  async deleteUnit(id: string): Promise<void> {
    await this.db
      .delete(this.db.beneficiaryUnits)
      .where((t) => t.id.equals(id))
      .go();
  }

  async deleteFacility(id: string): Promise<void> {
    await this.db
      .delete(this.db.facilities)
      .where((t) => t.id.equals(id))
      .go();
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.db
      .delete(this.db.suppliers)
      .where((t) => t.id.equals(id))
      .go();
  }

  /// اشتراكات وحداتٍ في مطبخ/فرن دفعةً واحدة: كل عنصرٍ (معرّف الوحدة ← قائمة معرّفات
  /// المرافق الجديدة). العمود المفرد `facilityId` يبقى أول اشتراك للتوافق مع التصدير القديم.
  setUnitFacilities(
    idsByUnit: Readonly<Record<string, readonly string[]>>,
  ): Promise<void> {
    return this.db.transaction(async () => {
      for (const [unitId, facIds] of Object.entries(idsByUnit)) {
        await this.db
          .update(this.db.beneficiaryUnits)
          .where((t) => t.id.equals(unitId))
          .write(
            BeneficiaryUnitsCompanion({
              facilityIds: Value.of(JSON.stringify(facIds)),
              facilityId: Value.of(facIds.length === 0 ? '' : facIds[0]),
            }),
          );
      }
    });
  }

  private static _newId(prefix: string): string {
    return Ids.next(prefix);
  }
}
