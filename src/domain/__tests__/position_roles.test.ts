import { describe, expect, it } from 'vitest';
import { AccessControl, PermAction, type PermissionMap } from '../access_control';
import { PermCatalog, PermSection } from '../perm_catalog';

/// قوالب المناصب (طلب المالك 2026-10-26) ونطاق خزّانات المحروقات.
describe('position_roles_test', () => {
  const ofRole = (id: string): PermissionMap => AccessControl.roles[id].permissions;
  const hasPerm = (p: PermissionMap, page: string, action: string): boolean =>
    p[page]?.[action] === true;
  const pagesOf = (p: PermissionMap): Set<string> =>
    new Set(
      Object.entries(p)
        .filter(([, actions]) => Object.values(actions).some(Boolean))
        .map(([k]) => k),
    );

  describe('قوالب المناصب', () => {
    it('كلها في قائمة القوالب التي تعرضها شاشة المستخدمين', () => {
      expect(Object.keys(AccessControl.positions).length).toBe(9);
      for (const id of Object.keys(AccessControl.positions)) {
        expect(Object.prototype.hasOwnProperty.call(AccessControl.roles, id)).toBe(true);
      }
    });

    it('كل صفحةٍ وإجراءٍ في كل قالب معروفٌ في الكتالوج (يُرى ويُسحب من المصفوفة)', () => {
      for (const r of Object.values(AccessControl.roles)) {
        for (const [page, actions] of Object.entries(r.permissions)) {
          const entry = PermCatalog.byKey[page];
          expect(entry).toBeDefined();
          for (const a of Object.keys(actions)) {
            expect(entry!.actions).toContain(a);
          }
        }
      }
    });

    it('لا قالب يمنح الإدارة ولا التوقيع ولا السرية ولا sys', () => {
      for (const r of Object.values(AccessControl.positions)) {
        for (const page of [
          'settings',
          'usersAccess',
          'esign',
          'cables.view.secret',
          'cables.view.topsecret',
        ]) {
          expect(Object.prototype.hasOwnProperty.call(r.permissions, page)).toBe(false);
        }
        expect(
          Object.keys(r.permissions).filter((k) => k.startsWith('sys.')),
        ).toEqual([]);
      }
    });

    it('لا حذف إلا في المحروقات لمسؤول الفرقة', () => {
      for (const [id, r] of Object.entries(AccessControl.positions)) {
        for (const [page, actions] of Object.entries(r.permissions)) {
          if (actions[PermAction.delete] !== true) continue;
          expect(id).toBe('fuel_division_officer');
          expect(PermCatalog.byKey[page]!.section).toBe(PermSection.fuel);
        }
      }
    });

    it('رئيس الشعبة يعتمد ولا يُدخل سندًا', () => {
      const p = ofRole('supply_head');
      for (const page of [...AccessControl.opsPages, 'opening', 'destruction', 'stocktake']) {
        expect(hasPerm(p, page, PermAction.create)).toBe(false);
        expect(hasPerm(p, page, PermAction.edit)).toBe(false);
      }
      for (const page of [
        'rationOrders',
        'pendingOrders',
        'stocktake',
        'destruction',
        'opening',
        'campSettlement',
        'mealPlans',
      ]) {
        expect(hasPerm(p, page, PermAction.approve)).toBe(true);
      }
      expect(hasPerm(p, 'fuelReports', PermAction.view)).toBe(true);
    });

    it('ركن إمداد الفرقة يخطط ويعتمد الخطط والطلبيات والتحويل', () => {
      const p = ofRole('supply_deputy');
      expect(hasPerm(p, 'ratios', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'mealPlans', PermAction.approve)).toBe(true);
      expect(hasPerm(p, 'rationOrders', PermAction.approve)).toBe(true);
      expect(hasPerm(p, 'transfer', PermAction.approve)).toBe(true);
      expect(hasPerm(p, 'campSettlement', PermAction.approve)).toBe(true);
      expect(hasPerm(p, 'receive', PermAction.create)).toBe(false);
    });

    it('ركن إمداد المعسكر يصرف من مخزنه ولا ينشّط الخطة ولا يعدّل المقررات', () => {
      const p = ofRole('camp_supply_officer');
      expect(hasPerm(p, 'issue', PermAction.approve)).toBe(true);
      expect(hasPerm(p, 'feeding', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'rationOrders', PermAction.create)).toBe(true);
      expect(hasPerm(p, 'rationOrders', PermAction.approve)).toBe(false);
      expect(hasPerm(p, 'mealPlans', PermAction.approve)).toBe(false);
      expect(hasPerm(p, 'ratios', PermAction.edit)).toBe(false);
      expect(hasPerm(p, 'receive', PermAction.create)).toBe(false);
    });

    it('قالبا المحروقات في قسم المحروقات وحده', () => {
      for (const id of ['fuel_division_officer', 'fuel_camp_keeper']) {
        for (const page of pagesOf(ofRole(id))) {
          expect(PermCatalog.byKey[page]!.section).toBe(PermSection.fuel);
        }
      }
    });

    it('أمين محروقات المعسكر يصرف ويعدّ ولا يعتمد ولا يعدّل التفريدة', () => {
      const p = ofRole('fuel_camp_keeper');
      expect(hasPerm(p, 'fuelMoves', PermAction.create)).toBe(true);
      expect(hasPerm(p, 'fuelStocktake', PermAction.edit)).toBe(true);
      expect(hasPerm(p, 'fuelStocktake', PermAction.approve)).toBe(false);
      expect(hasPerm(p, 'fuelAllocations', PermAction.edit)).toBe(false);
      expect(hasPerm(p, 'fuelSettings', PermAction.edit)).toBe(false);
      expect(hasPerm(ofRole('fuel_division_officer'), 'fuelStocktake', PermAction.approve)).toBe(true);
    });

    it('أمينا المخازن بلا محروقات، والفرعي بلا كتالوج ولا افتتاحي', () => {
      for (const id of ['main_storekeeper', 'sub_storekeeper']) {
        for (const page of pagesOf(ofRole(id))) {
          expect(PermCatalog.byKey[page]!.section).not.toBe(PermSection.fuel);
        }
        expect(hasPerm(ofRole(id), 'destruction', PermAction.approve)).toBe(false);
        expect(hasPerm(ofRole(id), 'rationOrders', PermAction.approve)).toBe(false);
      }
      const main = ofRole('main_storekeeper');
      expect(hasPerm(main, 'receive', PermAction.approve)).toBe(true);
      expect(hasPerm(main, 'opening', PermAction.create)).toBe(true);
      const sub = ofRole('sub_storekeeper');
      expect(hasPerm(sub, 'items', PermAction.create)).toBe(false);
      expect(hasPerm(sub, 'opening', PermAction.view)).toBe(false);
      expect(hasPerm(sub, 'transfer', PermAction.create)).toBe(true);
      expect(hasPerm(sub, 'issue', PermAction.approve)).toBe(true);
    });

    it('مديرا المكتب: برقيات وأرشيف وقوة بشرية، بلا سندات ولا اعتماد', () => {
      for (const id of ['supply_office_manager', 'branch_office_manager']) {
        const p = ofRole(id);
        expect(hasPerm(p, 'cables', PermAction.create)).toBe(true);
        expect(hasPerm(p, 'archive', PermAction.create)).toBe(true);
        expect(hasPerm(p, 'personnel', PermAction.edit)).toBe(true);
        for (const [page, actions] of Object.entries(p)) {
          expect(actions[PermAction.approve] === true).toBe(false);
          if (AccessControl.opsPages.includes(page)) {
            expect(actions[PermAction.create] === true).toBe(false);
          }
        }
      }
    });
  });

  describe('نطاق المعسكرات (التفريدة)', () => {
    const whs = [
      { name: 'المخزن الرئيسي', feedsAllCamps: true, campIds: [] as string[] },
      { name: 'مخزن معسكر أ', feedsAllCamps: false, campIds: ['camp-a'] },
      { name: 'مخزن غير مربوط', feedsAllCamps: true, campIds: [] as string[] },
    ] as const;

    it('مخزن معسكرٍ في النطاق يحصر التفريدة بمعسكره', () => {
      expect(
        AccessControl.campScope({
          isAdmin: false,
          scope: ['مخزن معسكر أ'],
          warehouses: whs,
        }),
      ).toEqual(new Set(['camp-a']));
    });

    it('الرئيسي أو مخزنٌ لا يُشتقّ منه معسكر أو بلا نطاق: لا قيد (كما كان)', () => {
      expect(
        AccessControl.campScope({
          isAdmin: false,
          scope: ['المخزن الرئيسي', 'مخزن معسكر أ'],
          warehouses: whs,
        }),
      ).toBeNull();
      expect(
        AccessControl.campScope({
          isAdmin: false,
          scope: ['مخزن غير مربوط'],
          warehouses: whs,
        }),
      ).toBeNull();
      expect(
        AccessControl.campScope({
          isAdmin: false,
          scope: null,
          warehouses: whs,
        }),
      ).toBeNull();
      expect(
        AccessControl.campScope({
          isAdmin: true,
          scope: ['مخزن معسكر أ'],
          warehouses: whs,
        }),
      ).toBeNull();
    });
  });

  describe('نطاق خزّانات المحروقات', () => {
    const tanks = ['خزان الفرقة', 'خزان المعسكر أ'] as const;

    it('نطاقٌ لا يذكر خزّانًا لا يقيّد المحروقات (توافقٌ مع ما قبل)', () => {
      expect(
        AccessControl.canUseFuelWarehouse({
          isAdmin: false,
          scope: ['المخزن الرئيسي'],
          fuelWarehouses: tanks,
          warehouse: 'خزان الفرقة',
        }),
      ).toBe(true);
    });

    it('نطاقٌ يذكر خزّانًا يحصره فيه', () => {
      const scope = ['مخزن المعسكر أ', 'خزان المعسكر أ'];
      expect(
        AccessControl.canUseFuelWarehouse({
          isAdmin: false,
          scope,
          fuelWarehouses: tanks,
          warehouse: 'خزان المعسكر أ',
        }),
      ).toBe(true);
      expect(
        AccessControl.canUseFuelWarehouse({
          isAdmin: false,
          scope,
          fuelWarehouses: tanks,
          warehouse: 'خزان الفرقة',
        }),
      ).toBe(false);
    });

    it('المدير وكل المستودعات بلا قيد', () => {
      expect(
        AccessControl.canUseFuelWarehouse({
          isAdmin: true,
          scope: ['خزان المعسكر أ'],
          fuelWarehouses: tanks,
          warehouse: 'خزان الفرقة',
        }),
      ).toBe(true);
      expect(
        AccessControl.canUseFuelWarehouse({
          isAdmin: false,
          scope: null,
          fuelWarehouses: tanks,
          warehouse: 'خزان الفرقة',
        }),
      ).toBe(true);
    });
  });
});
