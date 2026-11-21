import { describe, expect, it } from 'vitest';
import { Perm } from '../../core/security/perm';
import { kMenuDoors, menuDoorAllows, selfReferencingDoors } from '../menu_doors';

/// أبواب القائمة وصلاحياتها.
///
/// **بابٌ يشير إلى نفسه يُسقط القائمة كلها.** فحصُ الصلاحية يستدعي نفسه بلا
/// نهاية فيفيض المكدّس؛ وفي نسخة الإصدار لا تظهر رسالة، بل مستطيلٌ رمادي
/// مكان الشريط الجانبي. وقع ذلك فعلًا في `supplyReports`، ولذلك هذا الملف.
describe('menu_doors_test', () => {
  describe('سلامة الخريطة', () => {
    it('لا بابَ يشير إلى نفسه', () => {
      expect(selfReferencingDoors()).toEqual([]);
    });

    it('لا بابَ فارغ', () => {
      for (const [, tabs] of Object.entries(kMenuDoors)) {
        expect(tabs.length).toBeGreaterThan(0);
      }
    });

    it('كل تبويبةٍ صلاحيةٌ معروفة', () => {
      for (const [, tabs] of Object.entries(kMenuDoors)) {
        for (const tab of tabs) {
          // التبويبة صلاحيةٌ معرَّفة، أو بابٌ آخر بتبويباته.
          const ok =
            Object.prototype.hasOwnProperty.call(Perm.labels, tab) ||
            Object.prototype.hasOwnProperty.call(kMenuDoors, tab);
          expect(ok).toBe(true);
        }
      }
    });

    it('لا تبويبةَ تتكرر في بابين', () => {
      const seen = new Map<string, string>();
      for (const [door, tabs] of Object.entries(kMenuDoors)) {
        for (const tab of tabs) {
          expect(seen.has(tab)).toBe(false);
          seen.set(tab, door);
        }
      }
    });
  });

  describe('فتح الباب', () => {
    it('يُفتح لمن ملك تبويبةً واحدة', () => {
      expect(menuDoorAllows('supplyMoves', (p) => p === 'issue')).toBe(true);
    });

    it('يُغلق عمّن لم يملك شيئًا منه', () => {
      expect(menuDoorAllows('supplyMoves', (p) => p === 'items')).toBe(false);
    });

    it('بابٌ مجهول لا يُفتح', () => {
      expect(menuDoorAllows('لا-شيء', () => true)).toBe(false);
    });

    it('بابٌ يشير إلى نفسه لا يتكرر إلى ما لا نهاية', () => {
      // الحارس يتخطّى التبويبة التي تحمل اسم بابها، فلو دخلت الخريطة يومًا
      // لم تسقط القائمة — يُغلق الباب ولا يفيض المكدّس.
      let calls = 0;
      const ok = menuDoorAllows('supplyData', (p) => {
        calls++;
        return p === 'supplyData';
      });
      expect(ok).toBe(false);
      expect(calls).toBeLessThan(20);
    });
  });
});
