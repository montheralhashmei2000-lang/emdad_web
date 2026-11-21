import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccessControl, PermAction } from '../access_control';
import { AppSpace } from '../app_space';
import { kMenuDoors } from '../menu_doors';
import { PermCatalog, PermSection } from '../perm_catalog';

function walkSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...walkSourceFiles(full));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('perm_catalog_test', () => {
  const knownActions = new Set<string>([
    PermAction.view,
    PermAction.create,
    PermAction.edit,
    PermAction.delete,
    PermAction.approve,
    PermAction.print,
    PermAction.export,
    PermAction.import,
  ]);

  describe('كتالوج الصلاحيات', () => {
    it('المفاتيح فريدة ولكل مدخلٍ اسمٌ وإجراءاتٌ معروفة تبدأ بالعرض', () => {
      const seen = new Set<string>();
      for (const e of PermCatalog.entries) {
        expect(seen.has(e.key)).toBe(false);
        seen.add(e.key);
        expect(e.label.trim().length).toBeGreaterThan(0);
        expect(PermSection.all).toContain(e.section);
        expect(e.actions).toContain(PermAction.view);
        expect(new Set(e.actions).size).toBe(e.actions.length);
        for (const a of e.actions) {
          expect(knownActions.has(a)).toBe(true);
        }
      }
    });

    it('صفحات كل مساحة عمل لها مدخلات في الكتالوج (أو أبواب)', () => {
      for (const pages of Object.values(AppSpace.pages)) {
        for (const p of pages) {
          const ok =
            Object.prototype.hasOwnProperty.call(PermCatalog.byKey, p) ||
            Object.prototype.hasOwnProperty.call(kMenuDoors, p);
          expect(ok).toBe(true);
        }
      }
    });

    it('كل إجراءٍ تمنحه قوالب الأدوار موجودٌ في مدخله بالكتالوج', () => {
      const inertGrants = new Set<string>([
        'campDashboard.create',
        'campDashboard.edit',
        'campDashboard.export',
        'campDashboard.print',
        'fuelAllocations.export',
        'fuelConsumption.export',
        'fuelDashboard.export',
        'fuelDashboard.print',
        'fuelMoves.export',
        'fuelReports.export',
        'fuelSettings.export',
        'fuelSettings.print',
        'fuelStocktake.export',
        'fuelUnits.export',
        'fuelUnits.print',
        'fuelVehicles.export',
        'fuelVehicles.print',
        'fuelWarehouses.export',
        'fuelWarehouses.print',
        'rationOrders.export',
      ]);
      const offenders = new Set<string>();
      for (const role of Object.values(AccessControl.roles)) {
        for (const [page, actions] of Object.entries(role.permissions)) {
          const entry = PermCatalog.byKey[page];
          expect(entry).toBeDefined();
          for (const [a, on] of Object.entries(actions)) {
            if (on && !entry!.actions.includes(a) && !inertGrants.has(`${page}.${a}`)) {
              offenders.add(`${role.id}: ${page}.${a}`);
            }
          }
        }
      }
      expect([...offenders]).toEqual([]);
    });

    it('كل مفتاحٍ يُفحص في الكود موجودٌ في الكتالوج (لا صلاحية تُستعمل ولا تُمنح)', () => {
      // نمطٌ على نصوص src: استدعاءات Perm/AuthService/AccessControl وperm: 'key'.
      const permCall = /\b(?:this|p|perm|Perm\.of\([^)]*\)|usePerm\(\))\.(?:has|guard|writable|manage)\(\s*['"](\w+)['"]/g;
      const authCan = /\bauth\.can\([^,)]+,\s*['"](\w+)['"]/g;
      const accessCan = /\bAccessControl\.can\(\s*\{[^}]*\bpage:\s*['"](\w+)['"]/g;
      const permProp = /\bperm:\s*['"](\w+)['"]/g;
      const allowed = new Set<string>([
        ...Object.keys(PermCatalog.byKey),
        ...Object.keys(kMenuDoors),
        ...Object.keys(PermCatalog.aliasLabels),
      ]);
      const missing = new Set<string>();
      for (const filePath of walkSourceFiles('src')) {
        const src = fs.readFileSync(filePath, 'utf8');
        for (const re of [permCall, authCan, accessCan, permProp]) {
          re.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = re.exec(src)) !== null) {
            const key = m[1];
            if (!allowed.has(key)) {
              missing.add(`${key}  (${filePath})`);
            }
          }
        }
      }
      expect([...missing]).toEqual([]);
    });
  });

  describe('«import» إجراءٌ مستقل', () => {
    it('بلا مفتاح import صريح يرث «إضافة» (لا يفقد أحدٌ ما كان له)', () => {
      expect(AccessControl.allows({ create: true }, PermAction.import)).toBe(true);
      expect(AccessControl.allows({ view: true }, PermAction.import)).toBe(false);
    });

    it('المفتاح الصريح هو الحكم: false يمنع ولو ملك «إضافة»', () => {
      expect(
        AccessControl.allows({ create: true, import: false }, PermAction.import),
      ).toBe(false);
      expect(AccessControl.allows({ import: true }, PermAction.import)).toBe(true);
    });

    it('الوراثة خاصةٌ بالاستيراد: بقية الإجراءات كما هي', () => {
      expect(AccessControl.allows({ create: true }, PermAction.export)).toBe(false);
      expect(AccessControl.allows({ edit: true }, PermAction.edit)).toBe(true);
      expect(AccessControl.allows(null, PermAction.view)).toBe(false);
    });

    it('المدير يتجاوز عبر can()', () => {
      expect(
        AccessControl.can({
          isAdmin: true,
          permissions: {},
          page: 'items',
          action: PermAction.import,
        }),
      ).toBe(true);
      expect(
        AccessControl.can({
          isAdmin: false,
          permissions: { items: { create: true } },
          page: 'items',
          action: PermAction.import,
        }),
      ).toBe(true);
    });
  });
});
