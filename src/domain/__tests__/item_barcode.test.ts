import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../../data/db/app_database';
import { NativeDatabase } from '../../data/db/sqlite_driver';
import { CatalogRepo } from '../../data/repos/catalog_repo';
import { ItemBarcode, ItemBarcodeStateError } from '../item_barcode';

describe('item_barcode_test', () => {
  describe('صيغة الباركود النظامي', () => {
    it('١٢ رقمًا: السنة + يوم-ساعة-دقيقة + تسلسل', () => {
      const h = ItemBarcode.startingAt(new Date(2026, 9, 10, 14, 30), []);
      const first = h.take();
      expect(first).toBe('202610143001');
      expect(first.length).toBe(ItemBarcode.length);
      expect(h.take()).toBe('202610143002');
    });

    it('السنة من الساعة لا ثابتة', () => {
      const g = ItemBarcode.startingAt(new Date(2027, 9, 10, 14, 30), []);
      expect(g.take()).toBe('202710143001');
    });

    it('يبدأ بعد أكبر تسلسل مستعمل في الدقيقة', () => {
      const g = ItemBarcode.startingAt(
        new Date(2026, 9, 10, 14, 30),
        [1, 7, 3],
      );
      expect(g.take()).toBe('202610143008');
    });

    it('بعد 99 ينتقل إلى الدقيقة التالية', () => {
      const g = ItemBarcode.startingAt(new Date(2026, 9, 10, 14, 30), [98]);
      expect(g.take()).toBe('202610143099');
      expect(g.take()).toBe('202610143101');
      const full = ItemBarcode.startingAt(new Date(2026, 9, 10, 14, 59), [99]);
      expect(full.take()).toBe('202610150001');
    });

    it('seqOf يتعرّف على الصيغة ويتجاهل غيرها', () => {
      expect(ItemBarcode.seqOf('202610143042', '2026101430')).toBe(42);
      expect(ItemBarcode.seqOf('104123456789', '2026101430')).toBeNull();
      expect(ItemBarcode.seqOf('20261014304', '2026101430')).toBeNull();
    });

    it('يتخطى المستعمل ويستسلم بعد 10 محاولات', async () => {
      const g = ItemBarcode.startingAt(new Date(2026, 9, 10, 14, 30), []);
      expect(
        await g.nextFree(
          async (bc) => bc.endsWith('01') || bc.endsWith('02'),
        ),
      ).toBe('202610143003');
      const all = ItemBarcode.startingAt(new Date(2026, 9, 10, 14, 30), []);
      let tries = 0;
      await expect(
        all.nextFree(async () => {
          tries++;
          return true;
        }),
      ).rejects.toThrow(ItemBarcodeStateError);
      expect(tries).toBe(ItemBarcode.maxAttempts);
    });
  });

  describe('توليد من القاعدة', () => {
    let db: AppDatabase;

    beforeEach(() => {
      db = AppDatabase.forTesting(NativeDatabase.memory());
    });

    afterEach(async () => {
      await db.close();
    });

    it('لا يكرر باركودًا محفوظًا، ولا يمسّ القديم', async () => {
      const repo = new CatalogRepo(db);
      const now = new Date(2026, 9, 10, 14, 30);
      const a = await repo.saveItem({
        code: 'A',
        name: 'أ',
        barcode: '202610143001',
      });
      const b = await repo.saveItem({
        code: 'B',
        name: 'ب',
        barcode: '104000000001',
      });
      const gen = await repo.barcodeGenerator(now);
      const bc = await repo.newItemBarcode({ generator: gen });
      expect(bc).toBe('202610143002');
      expect((await repo.itemById(a))!.barcode).toBe('202610143001');
      expect((await repo.itemById(b))!.barcode).toBe('104000000001');
      expect(await repo.barcodeTaken('202610143001')).toBe(true);
      expect(await repo.barcodeTaken(bc)).toBe(false);
    });
  });

  describe('حجم ملصق الباركود', () => {
    // MISSING: lib/core/print/barcode_labels.dart
    it.skip('الافتراضي 35×25 ويُحفظ محليًا', () => {
      // يعتمد على LabelSize (المرحلة 18).
    });

    // MISSING: lib/core/print/barcode_labels.dart
    it.skip('قيمة تالفة أو خارج الحدود ⇒ الافتراضي', () => {
      // يعتمد على LabelSize (المرحلة 18).
    });

    // MISSING: lib/core/print/barcode_labels.dart
    it.skip('PDF: صفحة لكل ملصق بحجمه', () => {
      // يعتمد على BarcodeLabelsSheet.buildPdf و LabelSize (المرحلة 18).
    });
  });
});
