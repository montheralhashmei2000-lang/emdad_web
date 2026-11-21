import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AdjustmentsCompanion,
  AppDatabase,
  ArchiveFilesCompanion,
  AssetsCompanion,
  FacilitiesCompanion,
  IssuesCompanion,
  MealPlansCompanion,
  OpeningBalancesCompanion,
  RationOrdersCompanion,
  ReceiptsCompanion,
  ReturnsCompanion,
  StocktakesCompanion,
  TransfersCompanion,
  UsersCompanion,
  WarehouseStockLimitsCompanion,
} from '../../db/app_database';
import { NativeDatabase, Value } from '../../db/sqlite_driver';
import { CatalogRepo, WarehouseBlocked } from '../catalog_repo';

/// إعادة تسمية مستودع.
///
/// كل حركةٍ تشير إلى مستودعها **بنصّ اسمه** لا بمعرّفه (ثلاثة عشر جدولًا)، فكان
/// تغييرُ الاسم يُيتّم ما أشار إليه بلا أي تحذير: رصيدٌ يظهر صفرًا، وحركاتٌ
/// باسمٍ لا مستودعَ له، ونطاقُ مستخدمٍ مقيَّد يفرغ. والمحروقات تمنعه منذ البداية
/// (`FuelRepo.saveWarehouse`)، والإمداد كان يسمح به.
describe('warehouse_rename_test', () => {
  let db: AppDatabase;
  let repo: CatalogRepo;

  beforeEach(() => {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    repo = new CatalogRepo(db);
  });

  afterEach(async () => {
    await db.close();
  });

  async function makeWarehouse(name = 'المخزن الرئيسي'): Promise<string> {
    return repo.saveWarehouse({ code: 'W1', name });
  }

  async function rename(id: string, to: string): Promise<string | null> {
    try {
      await repo.saveWarehouse({ id, code: 'W1', name: to });
      return null;
    } catch (e) {
      if (e instanceof WarehouseBlocked) {
        return e.message;
      }
      throw e;
    }
  }

  async function nameOf(id: string): Promise<string> {
    const row = await db
      .select(db.warehouses)
      .where((t) => t.id.equals(id))
      .getSingle();
    return row.name;
  }

  it('مستودعٌ بلا أي ارتباط: الاسم يُغيَّر', async () => {
    const id = await makeWarehouse();
    expect(await rename(id, 'مخزن الإعاشة')).toBeNull();
    expect(await nameOf(id)).toBe('مخزن الإعاشة');
  });

  it('رسالة الرفض تذكر الاسم القديم وتدلّ على البديل', async () => {
    const id = await makeWarehouse();
    await db
      .into(db.receipts)
      .insert(
        ReceiptsCompanion.insert({
          id: 'r1',
          warehouse: Value.of('المخزن الرئيسي'),
        }),
      );
    const msg = await rename(id, 'مخزن الإعاشة');
    expect(msg).toContain('المخزن الرئيسي');
    expect(msg).toContain('أنشئ مستودعًا');
    expect(await nameOf(id), 'الاسم تغيّر رغم الرفض').toBe('المخزن الرئيسي');
  });

  describe('كل مرجعٍ بالاسم يمنع التسمية', () => {
    /// سجلٌّ واحد في كل جدولٍ يشير إلى المستودع بالاسم.
    const seeds: Record<string, (d: AppDatabase, w: string) => Promise<void>> = {
      receipts: (d, w) =>
        d
          .into(d.receipts)
          .insert(ReceiptsCompanion.insert({ id: 'r1', warehouse: Value.of(w) })),
      issues: (d, w) =>
        d
          .into(d.issues)
          .insert(IssuesCompanion.insert({ id: 'i1', warehouse: Value.of(w) })),
      transfers: (d, w) =>
        d
          .into(d.transfers)
          .insert(TransfersCompanion.insert({ id: 't1', warehouse: Value.of(w) })),
      'transfers.dest': (d, w) =>
        d
          .into(d.transfers)
          .insert(
            TransfersCompanion.insert({ id: 't2', destWarehouse: Value.of(w) }),
          ),
      returns: (d, w) =>
        d
          .into(d.returns)
          .insert(ReturnsCompanion.insert({ id: 'n1', warehouse: Value.of(w) })),
      adjustments: (d, w) =>
        d
          .into(d.adjustments)
          .insert(
            AdjustmentsCompanion.insert({ id: 'a1', warehouse: Value.of(w) }),
          ),
      opening_balances: (d, w) =>
        d
          .into(d.openingBalances)
          .insert(
            OpeningBalancesCompanion.insert({
              id: 'o1',
              itemId: 'it1',
              warehouse: Value.of(w),
            }),
          ),
      stocktakes: (d, w) =>
        d
          .into(d.stocktakes)
          .insert(
            StocktakesCompanion.insert({ id: 's1', warehouse: Value.of(w) }),
          ),
      facilities: (d, w) =>
        d
          .into(d.facilities)
          .insert(
            FacilitiesCompanion.insert({
              id: 'f1',
              name: 'مطبخ',
              warehouse: Value.of(w),
            }),
          ),
      meal_plans: (d, w) =>
        d
          .into(d.mealPlans)
          .insert(
            MealPlansCompanion.insert({
              id: 'm1',
              name: 'خطة',
              warehouse: Value.of(w),
            }),
          ),
      assets: (d, w) =>
        d
          .into(d.assets)
          .insert(
            AssetsCompanion.insert({
              id: 'as1',
              name: 'مولّد',
              warehouse: Value.of(w),
            }),
          ),
      'ration_orders.requesting': (d, w) =>
        d
          .into(d.rationOrders)
          .insert(
            RationOrdersCompanion.insert({
              id: 'ro1',
              requestingWarehouse: Value.of(w),
            }),
          ),
      'ration_orders.supplying': (d, w) =>
        d
          .into(d.rationOrders)
          .insert(
            RationOrdersCompanion.insert({
              id: 'ro2',
              supplyingWarehouse: Value.of(w),
            }),
          ),
      archive_files: (d, w) =>
        d.into(d.archiveFiles).insert(
          ArchiveFilesCompanion.insert({
            id: 'ar1',
            title: 'سند',
            fileName: 'a.pdf',
            storedPath: '/tmp/a.pdf',
            sizeBytes: 1,
            warehouse: Value.of(w),
          }),
        ),
      warehouse_stock_limits: (d, w) =>
        d.into(d.warehouseStockLimits).insert(
          WarehouseStockLimitsCompanion.insert({
            id: 'wl1',
            warehouseId: 'wh-x',
            itemId: 'it1',
            warehouseName: Value.of(w),
          }),
        ),
      'users.warehouse_scope': (d, w) =>
        d.into(d.users).insert(
          UsersCompanion.insert({
            id: 'u1',
            username: 'clerk',
            warehouseScope: Value.of(`["${w}"]`),
          }),
        ),
    };

    for (const [key, seed] of Object.entries(seeds)) {
      it(key, async () => {
        const id = await makeWarehouse();
        await seed(db, 'المخزن الرئيسي');
        expect(await rename(id, 'مخزن آخر'), `${key} لم يمنع التسمية`).not.toBeNull();
        expect(await nameOf(id)).toBe('المخزن الرئيسي');
      });
    }

    it('القائمة تغطي كل أعمدة الاسم المعلنة (تفشل إذا أُضيف مرجعٌ ولم يُختبر)', () => {
      const declared = new Set<string>();
      for (const [table, cols] of Object.entries(CatalogRepo.warehouseNameRefs)) {
        for (const col of cols) {
          declared.add(`${table}.${col}`);
        }
      }
      const covered = new Set<string>();
      for (const k of Object.keys(seeds)) {
        covered.add(k.includes('.') ? k : `${k}.warehouse`);
      }
      // الأسماء المختصرة في `seeds` تُبسَط إلى `جدول.عمود` كما تُعلَن.
      const aliases: Record<string, string> = {
        'transfers.dest': 'transfers.dest_warehouse',
        'ration_orders.requesting': 'ration_orders.requesting_warehouse',
        'ration_orders.supplying': 'ration_orders.supplying_warehouse',
        'warehouse_stock_limits.warehouse': 'warehouse_stock_limits.warehouse_name',
      };
      const normalized = new Set<string>(
        Array.from(covered).map((c) => aliases[c] ?? c),
      );
      const missing = Array.from(declared).filter((d) => !normalized.has(d));
      expect(missing, `مرجعٌ معلَنٌ بلا اختبار: ${missing.join('، ')}`).toEqual([]);
    });
  });

  it('تعديل بقية الحقول مسموح على مستودعٍ مستعمل (الاسم وحده المحظور)', async () => {
    const id = await makeWarehouse();
    await db
      .into(db.issues)
      .insert(
        IssuesCompanion.insert({
          id: 'i1',
          warehouse: Value.of('المخزن الرئيسي'),
        }),
      );
    await repo.saveWarehouse({
      id,
      code: 'W9',
      name: 'المخزن الرئيسي',
      manager: 'أبو بكر',
      location: 'المقر',
    });
    const row = await db
      .select(db.warehouses)
      .where((t) => t.id.equals(id))
      .getSingle();
    expect([row.code, row.manager, row.location]).toEqual([
      'W9',
      'أبو بكر',
      'المقر',
    ]);
  });

  it('المسافات الزائدة لا تُعدّ تسميةً (نفس الاسم)', async () => {
    const id = await makeWarehouse();
    await db
      .into(db.issues)
      .insert(
        IssuesCompanion.insert({
          id: 'i1',
          warehouse: Value.of('المخزن الرئيسي'),
        }),
      );
    expect(await rename(id, '  المخزن الرئيسي  ')).toBeNull();
  });

  it('نطاقٌ تالف لا يمنع التسمية بالخطأ (فشلٌ مغلق يُرجع قائمة فارغة)', async () => {
    const id = await makeWarehouse();
    await db.into(db.users).insert(
      UsersCompanion.insert({
        id: 'u1',
        username: 'clerk',
        warehouseScope: Value.of('{ليس JSON'),
      }),
    );
    expect(await rename(id, 'مخزن آخر')).toBeNull();
  });

  it('ALL لا يمنع: المستخدم غير مقيَّد بمستودعٍ بعينه', async () => {
    const id = await makeWarehouse();
    await db.into(db.users).insert(
      UsersCompanion.insert({
        id: 'u1',
        username: 'boss',
        warehouseScope: Value.of('ALL'),
      }),
    );
    expect(await rename(id, 'مخزن آخر')).toBeNull();
  });
});
