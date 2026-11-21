import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AppDatabase,
  RationOrdersCompanion,
  ReceiptsCompanion,
  SupplyAuthoritiesCompanion,
  WarehousesCompanion,
} from '../app_database';
import { NativeDatabase, Value } from '../sqlite_driver';

/// الترحيل يحتمل قاعدةً سبقت طابَعها.
///
/// جهازٌ فُتحت عليه نسخةٌ أحدث ثم نسخةٌ أقدم يُخفَّض طابَع قاعدته وتبقى
/// أعمدتُها. فإن رُقّي بعدها أعاد الترحيل إضافةَ عمودٍ قائم، فتُرمى
/// `duplicate column name` **أثناء فتح القاعدة** — فلا يفتح التطبيق أصلًا،
/// ولا يعرض خطأً مفهومًا، ولا سبيل للمستخدم إلى إصلاحه من داخله.
///
/// وقع هذا فعلًا عند تبادل نسختين في يوم واحد، فهذه الاختبارات تحرسه.
describe('migration_idempotent_test', () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'imdad_mig_idem_'));
    filePath = path.join(dir, 'db.sqlite');
  });

  afterEach(() => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // يبقى مقفلًا أحيانًا — لا يعني فشلًا.
      }
    }
  });

  /// يفتح القاعدة ويغلقها، فتجري الترحيلات.
  async function openDb(
    probe?: (db: AppDatabase) => Promise<void>,
  ): Promise<void> {
    const db = AppDatabase.forTesting(NativeDatabase.file(filePath));
    try {
      await db.customSelect('SELECT 1').get();
      if (probe) await probe(db);
    } finally {
      await db.close();
    }
  }

  it('طابَعٌ مخفَّض على قاعدة كاملة لا يُسقط الفتح', async () => {
    // قاعدة بأحدث مخطط: كل الأعمدة والجداول موجودة.
    await openDb();

    // ثم يُخفَّض طابَعها كما يفعل فتحُ نسخةٍ أقدم من التطبيق.
    const down = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await down.customStatement('PRAGMA user_version = 8');
    await down.close();

    // إعادة الفتح تُرقّيها من 8 — وكل عمود تحاول إضافته موجود سلفًا.
    await expect(openDb()).resolves.toBeUndefined();
  });

  it('الترقية بعد الطابَع المخفَّض تحفظ البيانات', async () => {
    await openDb(async (db) => {
      await db.into(db.warehouses).insert(
        WarehousesCompanion.insert({ id: 'wh1', name: 'الرئيسي' }),
      );
      await db.into(db.supplyAuthorities).insert(
        SupplyAuthoritiesCompanion.insert({ id: 'a1', name: 'ركن الإمداد' }),
      );
    });

    const down = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await down.customStatement('PRAGMA user_version = 10');
    await down.close();

    await openDb(async (db) => {
      expect((await db.select(db.warehouses).get())[0].name).toBe('الرئيسي');
      expect((await db.select(db.supplyAuthorities).get())[0].name).toBe(
        'ركن الإمداد',
      );
    });
  });

  it('الطابَع يعود إلى أحدث إصدار بعد الترقية', async () => {
    await openDb();
    const down = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await down.customStatement('PRAGMA user_version = 3');
    await down.close();

    await openDb(async (db) => {
      const row = await db.customSelect('PRAGMA user_version').getSingle();
      expect(Object.values(row.data)[0]).toBe(db.schemaVersion);
    });
  });

  it('جدولٌ محذوف يُعاد إنشاؤه عند الترقية', async () => {
    await openDb();

    const down = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await down.customStatement('DROP TABLE supply_authorities');
    await down.customStatement('PRAGMA user_version = 13');
    await down.close();

    await openDb(async (db) => {
      await db.into(db.supplyAuthorities).insert(
        SupplyAuthoritiesCompanion.insert({ id: 'a2', name: 'قائد الفرقة' }),
      );
      expect(await db.select(db.supplyAuthorities).get()).toHaveLength(1);
    });
  });

  it('NULL في عمودٍ لا يقبله يُصلَح فلا تسقط القراءة', async () => {
    await openDb(async (db) => {
      await db.into(db.receipts).insert(
        ReceiptsCompanion.insert({
          id: 'r1',
          refNo: Value.of('و-000001'),
          baseQty: Value.of(4),
        }),
      );
    });

    // تنقّلُ القاعدة بين نسختين يترك العمود بلا قيد NOT NULL وفيه NULL —
    // وهو ما وُجد فعلًا في قاعدة ميدانية تبادلت نسختين في يوم.
    const broken = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await broken.customStatement('ALTER TABLE receipts DROP COLUMN expiry_date');
    await broken.customStatement('ALTER TABLE receipts ADD COLUMN expiry_date TEXT');
    await broken.customStatement('PRAGMA user_version = 13');
    await broken.close();

    await openDb(async (db) => {
      const rows = await db.select(db.receipts).get();
      expect(rows).toHaveLength(1);
      const r = rows[0];
      expect(r.expiryDate, 'القراءة كانت تسقط قبل الإصلاح').toBe('');
      expect(r.refNo, 'الإصلاح مسّ ما لا يخصّه').toBe('و-000001');
      expect(r.baseQty).toBe(4);
    });
  });

  it('عمودٌ فات بوابته يُستدرك عند الفتح — لا الطابَع وحده يحكم', async () => {
    // هذه هي العطلة التي أوقفت التطبيق فعلًا: الطابَع 15 وبوابة v12 مرّت
    // دون أن تُنفَّذ قط، فبقي العمود مفقودًا وسقطت أول قراءة للسندات.
    await openDb(async (db) => {
      await db.into(db.receipts).insert(
        ReceiptsCompanion.insert({
          id: 'r1',
          refNo: Value.of('و-000001'),
          baseQty: Value.of(4),
        }),
      );
    });

    const broken = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await broken.customStatement('ALTER TABLE receipts DROP COLUMN expiry_date');
    // الطابَع يبقى أحدث إصدار: كل بوابات الترحيل ستُتخطّى.
    await broken.close();

    await openDb(async (db) => {
      const rows = await db.select(db.receipts).get();
      expect(rows).toHaveLength(1);
      const r = rows[0];
      expect(r.expiryDate, 'العمود المفقود لم يُستدرك').toBe('');
      expect(r.refNo).toBe('و-000001');
      expect(r.baseQty, 'الاستدراك مسّ بيانات قائمة').toBe(4);
    });
  });

  it('جدولٌ مفقود يُستدرك عند الفتح ولو كان الطابَع أحدث', async () => {
    await openDb();
    const broken = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await broken.customStatement('DROP TABLE supply_authorities');
    await broken.close();

    await openDb(async (db) => {
      await db.into(db.supplyAuthorities).insert(
        SupplyAuthoritiesCompanion.insert({ id: 'a9', name: 'رئيس الشعبة' }),
      );
      expect(await db.select(db.supplyAuthorities).get()).toHaveLength(1);
    });
  });

  it('عمودٌ واحد ناقص يُضاف والباقي لا يُمسّ', async () => {
    await openDb(async (db) => {
      await db.into(db.rationOrders).insert(
        RationOrdersCompanion.insert({
          id: 'o1',
          refNo: Value.of('ط-000001'),
          requestingWarehouse: Value.of('الفرع'),
        }),
      );
    });

    const down = AppDatabase.forTesting(NativeDatabase.file(filePath));
    await down.customStatement('DROP INDEX IF EXISTS ix_ration_kind');
    await down.customStatement(
      'ALTER TABLE ration_orders DROP COLUMN fulfill_kind',
    );
    await down.customStatement('PRAGMA user_version = 13');
    await down.close();

    await openDb(async (db) => {
      const rows = await db.select(db.rationOrders).get();
      expect(rows).toHaveLength(1);
      const o = rows[0];
      expect(o.refNo, 'السطر القائم تغيّر أثناء الترحيل').toBe('ط-000001');
      expect(o.fulfillKind).toBe('');
      expect(o.orderKind).toBe('BRANCH');
    });
  });
});
