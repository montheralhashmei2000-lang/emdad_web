import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LimitStatus, WarehouseLimits } from '../../../domain/warehouse_limits';
import { AppDatabase, WarehousesCompanion } from '../../db/app_database';
import { NativeDatabase, Value } from '../../db/sqlite_driver';
import { CatalogRepo, ItemUnit } from '../catalog_repo';
import { LimitInput, WarehouseLimitsRepo } from '../warehouse_limits_repo';

/// حدود مخزون المستودعات.
///
/// الخطر هنا **وحدتان لرقم واحد**: الرصيد بوحدة الأساس والمستخدم يكتب بوحدة
/// التعامل. فخطأٌ في التحويل لا يُسقط شيئًا — يُظهر مخزونًا كافيًا وهو نافد.
describe('warehouse_limits_test', () => {
  describe('التحويل بين الوحدات', () => {
    it('الإدخال بالكرتون يُخزَّن بالحبة', () => {
      // كرتون = ١٢ حبة، فـ٥ كراتين = ٦٠ حبة.
      expect(WarehouseLimits.toBase(5, 12)).toBe(60);
      expect(WarehouseLimits.fromBase(60, 12)).toBe(5);
    });

    it('معامل غير موجب يُعامَل ١ فلا تُقسم كمية على صفر', () => {
      expect(WarehouseLimits.safeFactor(0)).toBe(1);
      expect(WarehouseLimits.safeFactor(-3)).toBe(1);
      expect(WarehouseLimits.fromBase(60, 0)).toBe(60);
      expect(WarehouseLimits.toBase(5, 0)).toBe(5);
    });

    it('الذهاب والإياب لا يُراكم كسرًا', () => {
      for (const f of [1.0, 2.5, 12.0, 0.5, 33.0]) {
        const base = WarehouseLimits.toBase(7, f);
        expect(WarehouseLimits.fromBase(base, f), `معامل ${f}`).toBe(7);
      }
    });
  });

  describe('الحكم على الرصيد', () => {
    const st = (bal: number, min: number, max: number): LimitStatus =>
      WarehouseLimits.statusOf({ balance: bal, minStock: min, maxStock: max });

    it('بلا حدود لا حكم', () => {
      expect(
        st(0, 0, 0),
        'مستودع بلا حدّ لا يُنبَّه عليه كلما فرغ صنف لا يعني أحدًا',
      ).toBe(LimitStatus.none);
    });

    it('تحت الأدنى', () => expect(st(5, 10, 100)).toBe(LimitStatus.low));
    it('فوق الأعلى', () => expect(st(150, 10, 100)).toBe(LimitStatus.over));
    it('ضمن الحدود', () => expect(st(50, 10, 100)).toBe(LimitStatus.ok));

    it('الحد الأدنى بلا أعلى يحكم وحده', () => {
      expect(st(5, 10, 0)).toBe(LimitStatus.low);
      expect(st(50, 10, 0)).toBe(LimitStatus.ok);
    });

    it('المساواة للأدنى ليست نقصًا', () => {
      expect(st(10, 10, 100)).toBe(LimitStatus.ok);
    });

    it('النقص والفائض يُحسبان', () => {
      expect(WarehouseLimits.shortfall({ balance: 4, minStock: 10 })).toBe(6);
      expect(WarehouseLimits.shortfall({ balance: 40, minStock: 10 })).toBe(0);
      expect(WarehouseLimits.surplus({ balance: 140, maxStock: 100 })).toBe(40);
      expect(WarehouseLimits.surplus({ balance: 40, maxStock: 100 })).toBe(0);
    });

    it('نسبة الامتلاء تتجاوز ١ عند الفائض', () => {
      expect(WarehouseLimits.fillRatio({ balance: 50, maxStock: 100 })).toBe(0.5);
      expect(WarehouseLimits.fillRatio({ balance: 150, maxStock: 100 })).toBe(1.5);
      expect(WarehouseLimits.fillRatio({ balance: 5, maxStock: 0 })).toBeNull();
    });
  });

  describe('التحقق قبل الحفظ', () => {
    it('صنف بلا معرّف يُرفض', () => {
      expect(WarehouseLimits.validate({ itemId: '', min: 1, max: 2 })).toContain(
        'الصنف',
      );
    });

    it('حدّان صفران يُرفضان', () => {
      expect(
        WarehouseLimits.validate({ itemId: 'i1', min: 0, max: 0 }),
      ).toContain('حدًّا واحدًا');
    });

    it('الأعلى دون الأدنى يُرفض', () => {
      expect(
        WarehouseLimits.validate({ itemId: 'i1', min: 50, max: 10 }),
      ).toContain('أقل من الأدنى');
    });

    it('السالب يُرفض', () => {
      expect(
        WarehouseLimits.validate({ itemId: 'i1', min: -1, max: 10 }),
      ).toContain('سالبة');
    });

    it('حدٌّ واحد يكفي', () => {
      expect(
        WarehouseLimits.validate({ itemId: 'i1', min: 10, max: 0 }),
      ).toBeNull();
      expect(
        WarehouseLimits.validate({ itemId: 'i1', min: 0, max: 10 }),
      ).toBeNull();
    });

    it('الصنف المكرر في الدفعة يُرفض', () => {
      const err = WarehouseLimits.validateBatch([
        { itemId: 'i1', min: 5.0, max: 10.0 },
        { itemId: 'i1', min: 7.0, max: 20.0 },
      ]);
      expect(
        err,
        'آخر سطر يدهس ما قبله صامتًا فلا يدري أيّهما بقي',
      ).toContain('مكرر');
    });

    it('دفعة فارغة تُرفض', () => {
      expect(WarehouseLimits.validateBatch([])).toContain('سطرًا');
    });
  });

  describe('اللوحة على قاعدة حقيقية', () => {
    let db: AppDatabase;
    let repo: WarehouseLimitsRepo;

    beforeEach(async () => {
      db = AppDatabase.forTesting(NativeDatabase.memory());
      repo = new WarehouseLimitsRepo(db);
      await db.into(db.warehouses).insert(
        WarehousesCompanion.insert({
          id: 'wh1',
          name: 'الرئيسي',
          isMain: Value.of(true),
        }),
      );
      await new CatalogRepo(db).saveItem({
        code: 'X1',
        name: 'رز',
        baseUnit: 'كجم',
        units: [
          new ItemUnit({ name: 'كجم', factor: 1, isBase: true }),
          new ItemUnit({ name: 'شوال', factor: 50 }),
        ],
      });
    });

    afterEach(async () => {
      await db.close();
    });

    async function itemId(): Promise<string> {
      const all = await new CatalogRepo(db).items();
      expect(all).toHaveLength(1);
      return all[0].id;
    }

    // MISSING: lib/data/repos/movements_repo.dart
    it.skip('الحفظ بالشوال يُخزَّن بالكجم ويُعرض بالشوال', () => {
      // يعتمد على حساب الرصيد في WarehouseLimitsRepo.dashboard عبر MovementsRepo.balances (المرحلة 9).
    });

    // MISSING: lib/data/repos/movements_repo.dart
    it.skip('الرصيد دون الأدنى يظهر تحت الأدنى بالنقص الصحيح', () => {
      // يعتمد على حساب الرصيد في WarehouseLimitsRepo.dashboard عبر MovementsRepo.balances (المرحلة 9).
    });

    it('الحفظ مرتين يُحدّث ولا يُكرّر', async () => {
      const id = await itemId();
      const row = new LimitInput({
        itemId: id,
        itemName: 'رز',
        unitName: 'كجم',
        factor: 1,
        min: 10,
        max: 50,
      });
      await repo.saveBatch({
        warehouseId: 'wh1',
        warehouseName: 'الرئيسي',
        rows: [row],
      });
      await repo.saveBatch({
        warehouseId: 'wh1',
        warehouseName: 'الرئيسي',
        rows: [
          new LimitInput({
            itemId: id,
            itemName: 'رز',
            unitName: 'كجم',
            factor: 1,
            min: 20,
            max: 80,
          }),
        ],
      });
      const all = await repo.limits();
      expect(all, 'ضبط الحد مرتين أنشأ سطرين').toHaveLength(1);
      expect(all[0].minStock).toBe(20);
    });

    it('لوحة مستودع لا حدود فيه فارغة', async () => {
      expect(await repo.dashboard('الرئيسي')).toEqual([]);
    });

    // MISSING: lib/data/repos/movements_repo.dart
    it.skip('الأحرج يُعرض أولًا', () => {
      // يعتمد على حساب الرصيد في WarehouseLimitsRepo.dashboard عبر MovementsRepo.balances (المرحلة 9).
    });

    it('الحذف يزيل الحد وحده', async () => {
      const id = await itemId();
      await repo.saveBatch({
        warehouseId: 'wh1',
        warehouseName: 'الرئيسي',
        rows: [
          new LimitInput({
            itemId: id,
            itemName: 'رز',
            unitName: 'كجم',
            factor: 1,
            min: 10,
            max: 0,
          }),
        ],
      });
      const allLimits = await repo.limits();
      expect(allLimits).toHaveLength(1);
      const limit = allLimits[0];
      expect((await repo.delete(limit.id)).ok).toBe(true);
      expect(await repo.limits()).toEqual([]);
      expect(
        await new CatalogRepo(db).items(),
        'حذف الحد مسّ الصنف نفسه',
      ).toHaveLength(1);
    });
  });
});
