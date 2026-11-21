import { describe, expect, it } from 'vitest';
import { UsersRepo } from '../../data/repos/users_repo';
import { AccessControl, PermAction, type PermissionMap } from '../access_control';
import { PermCatalog, PermSection } from '../perm_catalog';

const ofRole = (id: string): PermissionMap => AccessControl.roles[id].permissions;
const hasPerm = (p: PermissionMap, page: string, action: string): boolean =>
  p[page]?.[action] === true;

/// الصفحات التي يمنح القالب عليها أي إجراء فعلًا.
function pagesOf(p: PermissionMap): Set<string> {
  const out = new Set<string>();
  for (const [k, actions] of Object.entries(p)) {
    if (Object.values(actions).some(Boolean)) out.add(k);
  }
  return out;
}

describe('role_templates_test', () => {
  describe('أمين المحروقات (fuel_keeper)', () => {
    const p = ofRole('fuel_keeper');

    it('كل صفحاته في قسم المحروقات — ولا شيء من الإمداد أو الإدارة', () => {
      for (const page of pagesOf(p)) {
        expect(PermCatalog.byKey[page]?.section).toBe(PermSection.fuel);
      }
    });

    it('يغطي كل صفحات المحروقات بالعرض على الأقل', () => {
      for (const e of PermCatalog.entries.filter((e) => e.section === PermSection.fuel)) {
        expect(hasPerm(p, e.key, PermAction.view)).toBe(true);
      }
    });

    it('يضع التفريدة ويصرف ويطبع ويعتمد الجرد، ويعدّل إعدادات القسم', () => {
      expect(hasPerm(p, 'fuelMoves', PermAction.create)).toBe(true);
      expect(hasPerm(p, 'fuelMoves', PermAction.print)).toBe(true);
      expect(hasPerm(p, 'fuelAllocations', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'fuelStocktake', PermAction.approve)).toBe(true);
      expect(hasPerm(p, 'fuelSettings', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'fuelReports', PermAction.print)).toBe(true);
    });

    it('لا يملك صفحة إمدادٍ ولا إدارة', () => {
      for (const page of ['items', 'receive', 'issue', 'reports', 'linkages', 'settings', 'usersAccess']) {
        expect(Object.prototype.hasOwnProperty.call(p, page)).toBe(false);
      }
    });
  });

  describe('المالية (finance)', () => {
    const p = ofRole('finance');

    it('الارتباطات والقوة البشرية وحدهما', () => {
      expect(pagesOf(p)).toEqual(new Set(['linkages', 'personnel']));
    });

    it('كامل دورة المالية: إضافة وتعديل واعتماد وطباعة وتصدير واستيراد', () => {
      for (const a of [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.delete,
        PermAction.approve,
        PermAction.print,
        PermAction.export,
        PermAction.import,
      ]) {
        expect(hasPerm(p, 'linkages', a)).toBe(true);
      }
      for (const a of [
        PermAction.view,
        PermAction.create,
        PermAction.edit,
        PermAction.print,
        PermAction.export,
      ]) {
        expect(hasPerm(p, 'personnel', a)).toBe(true);
      }
    });

    it('كل إجراءاته معروفة في الكتالوج (يراها المالك ويسحبها من الشاشة)', () => {
      for (const [page, actions] of Object.entries(p)) {
        for (const a of Object.keys(actions)) {
          expect(PermCatalog.byKey[page]!.actions).toContain(a);
        }
      }
    });
  });

  describe('مدخل البيانات (data_entry) — إضافة فقط', () => {
    const p = ofRole('data_entry');

    it('لا حذف ولا اعتماد ولا اعتماد على أي صفحة', () => {
      for (const [, actions] of Object.entries(p)) {
        for (const a of [PermAction.delete, PermAction.approve, PermAction.import]) {
          expect(actions[a] === true).toBe(false);
        }
      }
    });

    it('بلا «تعديل» على التفريدة وسجل التشغيل وخطط الوجبات، وله «إضافة»', () => {
      for (const page of ['feeding', 'kitchenLog', 'mealPlans']) {
        expect(hasPerm(p, page, PermAction.create)).toBe(true);
        expect(hasPerm(p, page, PermAction.edit)).toBe(false);
      }
    });

    it('لا «تعديل» على أي صفحة — والجرد يُعدّ بـ«إضافة»', () => {
      const withEdit = new Set(
        Object.entries(p)
          .filter(([, actions]) => actions['edit'] === true)
          .map(([k]) => k),
      );
      expect(withEdit.size).toBe(0);
      expect(hasPerm(p, 'stocktake', PermAction.create)).toBe(true);
    });

    it('ما زال يضيف السندات', () => {
      for (const page of AccessControl.opsPages) {
        expect(hasPerm(p, page, PermAction.create)).toBe(true);
      }
    });
  });

  describe('أمين المخزن (storekeeper) — موسَّع لا مقلَّص', () => {
    const p = ofRole('storekeeper');

    it('احتفظ بكل ما كان له', () => {
      for (const page of AccessControl.opsPages) {
        for (const a of [
          PermAction.view,
          PermAction.create,
          PermAction.edit,
          PermAction.approve,
          PermAction.print,
        ]) {
          expect(hasPerm(p, page, a)).toBe(true);
        }
      }
      expect(hasPerm(p, 'opening', PermAction.create)).toBe(true);
      expect(hasPerm(p, 'stocktake', PermAction.print)).toBe(true);
      expect(hasPerm(p, 'documents', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'balances', PermAction.export)).toBe(true);
      expect(hasPerm(p, 'reports', PermAction.print)).toBe(true);
      expect(hasPerm(p, 'rationOrders', PermAction.approve)).toBe(true);
      for (const page of AccessControl.basicPages) {
        expect(hasPerm(p, page, PermAction.view)).toBe(true);
      }
    });

    it('الجديد: إدارة الكتالوج + تصدير التقارير', () => {
      expect(hasPerm(p, 'items', PermAction.create)).toBe(true);
      expect(hasPerm(p, 'items', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'items', PermAction.import)).toBe(true);
      expect(hasPerm(p, 'items', PermAction.export)).toBe(true);
      expect(hasPerm(p, 'suppliers', PermAction.create)).toBe(true);
      expect(hasPerm(p, 'units', PermAction.print)).toBe(true);
      expect(hasPerm(p, 'assets', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'reports', PermAction.export)).toBe(true);
    });

    it('بلا محروقات (ليست لأمين مخزن الإمداد)', () => {
      for (const page of AccessControl.fuelPages) {
        expect(Object.prototype.hasOwnProperty.call(p, page)).toBe(false);
      }
    });

    it('الكتالوج بلا حذف، والمستودعات نفسها للعرض فقط', () => {
      for (const page of ['items', 'suppliers', 'units', 'kitchens', 'assets']) {
        expect(hasPerm(p, page, PermAction.delete)).toBe(false);
      }
      expect(hasPerm(p, 'stores', PermAction.create)).toBe(false);
      expect(hasPerm(p, 'stores', PermAction.view)).toBe(true);
    });
  });

  describe('القوالب عمومًا', () => {
    it('كل قالبٍ جديد/معدَّل يمنح مفاتيح معروفة في الكتالوج', () => {
      for (const id of ['fuel_keeper', 'finance', 'data_entry', 'storekeeper']) {
        for (const page of Object.keys(ofRole(id))) {
          expect(Object.prototype.hasOwnProperty.call(PermCatalog.byKey, page)).toBe(true);
        }
      }
    });

    it('تطبيق القالب لقطةٌ عند الإنشاء: لا يتغيّر مستخدمٌ قائم بتغيّر القالب', () => {
      const a = UsersRepo.permissionsForRoles(['data_entry']);
      const b = UsersRepo.permissionsForRoles(['data_entry']);
      expect(a).toEqual(b);
      expect(a === ofRole('data_entry')).toBe(false);
    });

    it('جمع قالبين اتحاد صلاحياتهما', () => {
      const merged = UsersRepo.permissionsForRoles(['fuel_keeper', 'finance']);
      expect(hasPerm(merged, 'fuelMoves', PermAction.create)).toBe(true);
      expect(hasPerm(merged, 'linkages', PermAction.import)).toBe(true);
    });
  });
});
