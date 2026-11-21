import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, UsersCompanion } from '../../../data/db/app_database';
import { NativeDatabase, Value } from '../../../data/db/sqlite_driver';
import { ArgumentError, UsersRepo } from '../../../data/repos/users_repo';
import { AccessControl, PermAction, SysPerm, UserRole } from '../../../domain/access_control';
import { AuthService } from '../auth_service';
import { Perm } from '../perm';
import { SharedPreferences } from '../shared_prefs';

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

/// المالك و`sys.*`: الأساس. المالك وحده يملك `sys.*`، ولا شيء مخزَّن يمنحها لغيره.
describe('sys_perm_test', () => {
  describe('الأدوار', () => {
    it('المالك والمدير كلاهما «مدير» لصلاحيات الصفحات، والمالك وحده «مالك»', () => {
      expect(UserRole.isAdmin(UserRole.owner)).toBe(true);
      expect(UserRole.isAdmin(UserRole.admin)).toBe(true);
      expect(UserRole.isAdmin(UserRole.user)).toBe(false);
      expect(UserRole.isAdmin(null)).toBe(false);
      expect(UserRole.isOwner(UserRole.owner)).toBe(true);
      expect(UserRole.isOwner(UserRole.admin)).toBe(false);
      expect(UserRole.label(UserRole.owner)).toBe('المالك');
      expect(UserRole.label('نص غريب')).toBe('مستخدم');
    });
  });

  describe('AccessControl.can مع sys.*', () => {
    it('المالك وحده', () => {
      for (const key of SysPerm.all) {
        expect(
          AccessControl.can({
            isAdmin: true,
            isOwner: true,
            permissions: {},
            page: key,
          }),
        ).toBe(true);
        expect(
          AccessControl.can({
            isAdmin: true,
            permissions: {},
            page: key,
          }),
        ).toBe(false);
        expect(
          AccessControl.can({
            isAdmin: false,
            permissions: {},
            page: key,
          }),
        ).toBe(false);
      }
    });

    it('مفتاحٌ sys.* داخل الصلاحيات المخزَّنة لا أثر له (فشلٌ مغلق)', () => {
      const injected: Record<string, Record<string, boolean>> = {};
      for (const k of SysPerm.all) {
        injected[k] = { view: true, edit: true, create: true };
      }
      for (const key of SysPerm.all) {
        expect(
          AccessControl.can({
            isAdmin: false,
            permissions: injected,
            page: key,
          }),
        ).toBe(false);
        expect(
          AccessControl.can({
            isAdmin: true,
            permissions: injected,
            page: key,
          }),
        ).toBe(false);
      }
    });

    it('صفحات العمل العادية لا تتأثر', () => {
      expect(
        AccessControl.can({ isAdmin: true, permissions: {}, page: 'items' }),
      ).toBe(true);
      expect(
        AccessControl.can({ isAdmin: false, permissions: {}, page: 'items' }),
      ).toBe(false);
    });

    it('ستة مفاتيح بأسماء مقروءة', () => {
      expect(SysPerm.all).toHaveLength(6);
      for (const k of SysPerm.all) {
        expect(k.startsWith('sys.')).toBe(true);
        expect(SysPerm.labels[k]!.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('مع حسابات حقيقية', () => {
    let db: AppDatabase;
    let auth: AuthService;
    let repo: UsersRepo;

    beforeEach(async () => {
      SharedPreferences.setMockInitialValues({});
      db = AppDatabase.forTesting(NativeDatabase.memory());
      auth = new AuthService(db);
      repo = new UsersRepo(db);
      await auth.createAdmin({ username: 'root', password: 'Test@12345' });
    }, 60_000);

    afterEach(async () => {
      await db.close();
    });

    async function loginAs(user: string, role = UserRole.admin): Promise<void> {
      await db
        .update(db.users)
        .where((t) => t.username.equals(user))
        .write(UsersCompanion({ role: Value.of(role) }));
      const r = await auth.login(user, 'Test@12345');
      expect(r.isOk).toBe(true);
    }

    it('المالك يملك sys.* ويملك كل صفحات العمل', async () => {
      await loginAs('root', UserRole.owner);
      const perm = new Perm(auth);
      expect(perm.owner).toBe(true);
      expect(perm.admin).toBe(true);
      for (const k of SysPerm.all) {
        expect(perm.sys(k)).toBe(true);
        expect(perm.has(k)).toBe(true);
      }
      expect(perm.has('items', PermAction.delete)).toBe(true);
      expect(auth.can(auth.currentUser!, SysPerm.backup)).toBe(true);
      expect(auth.warehouseScopeOf(auth.currentUser!)).toBeNull();
    }, 60_000);

    it('المدير: كل الصفحات وبلا sys.*', async () => {
      await repo.createUser({
        username: 'second',
        password: 'Test@12345',
        name: 's',
        isAdmin: true,
      });
      await loginAs('root'); // role = admin
      const perm = new Perm(auth);
      expect(perm.admin).toBe(true);
      expect(perm.owner).toBe(false);
      for (const k of SysPerm.all) {
        expect(perm.sys(k)).toBe(false);
        expect(perm.has(k)).toBe(false);
      }
      expect(perm.has('items', PermAction.delete)).toBe(true);
      expect(auth.can(auth.currentUser!, SysPerm.devices)).toBe(false);
    }, 60_000);

    it('مستخدمٌ عاديٌّ مخزَّنٌ له sys.* يدويًا: لا يملكها', async () => {
      const permissions: Record<string, Record<string, boolean>> = {
        items: { view: true },
      };
      for (const k of SysPerm.all) {
        permissions[k] = { view: true, edit: true };
      }
      await repo.createUser({
        username: 'sneaky',
        password: 'Test@12345',
        name: 'x',
        permissions,
      });
      const r = await auth.login('sneaky', 'Test@12345');
      expect(r.isOk).toBe(true);
      const perm = new Perm(auth);
      for (const k of SysPerm.all) {
        expect(perm.sys(k)).toBe(false);
        expect(perm.has(k, PermAction.edit)).toBe(false);
      }
      expect(perm.has('items')).toBe(true);
    }, 60_000);

    describe('حماية حساب المالك', () => {
      async function makeOwner(): Promise<string> {
        await db
          .update(db.users)
          .where((t) => t.username.equals('root'))
          .write(UsersCompanion({ role: Value.of(UserRole.owner) }));
        const row = await db
          .select(db.users)
          .where((t) => t.username.equals('root'))
          .getSingle();
        return row.id;
      }

      it('لا يتغيّر دوره ولا يُعطَّل', async () => {
        const id = await makeOwner();
        await expect(
          repo.updateUser({ id, isAdmin: false }),
        ).rejects.toThrow(ArgumentError);
        await expect(
          repo.updateUser({ id, isAdmin: true }),
        ).rejects.toThrow(ArgumentError);
        await expect(
          repo.updateUser({ id, active: false }),
        ).rejects.toThrow(ArgumentError);
        const after = await db
          .select(db.users)
          .where((t) => t.id.equals(id))
          .getSingle();
        expect(after.role).toBe(UserRole.owner);
        expect(after.active).toBe(true);
      });

      it('تعديل غير الدور والتفعيل مسموح (الاسم)', async () => {
        const id = await makeOwner();
        await repo.updateUser({ id, name: 'اسم جديد' });
        const after = await db
          .select(db.users)
          .where((t) => t.id.equals(id))
          .getSingle();
        expect(after.name).toBe('اسم جديد');
      });

      it('لا يُحذف ولو وُجد مدير آخر', async () => {
        const id = await makeOwner();
        await repo.createUser({
          username: 'second',
          password: 'Test@12345',
          name: 's',
          isAdmin: true,
        });
        expect(await repo.deleteUser(id)).toBe(false);
        expect((await db.select(db.users).get()).length).toBe(2);
      }, 60_000);

      it('المدير الآخر يُحذف ما دام المالك باقيًا (المالك يُحسب مديرًا)', async () => {
        await makeOwner();
        const adminId = await repo.createUser({
          username: 'second',
          password: 'Test@12345',
          name: 's',
          isAdmin: true,
        });
        expect(await repo.deleteUser(adminId)).toBe(true);
      }, 60_000);

      it('آخر مديرٍ (دون مالك) لا يُحذف كما كان', async () => {
        const rows = await db.select(db.users).get();
        expect(rows).toHaveLength(1);
        expect(await repo.deleteUser(rows[0].id)).toBe(false);
      });
    });
  });

  it('كل مفتاح sys.* في الكود معرَّف في SysPerm (لا أخطاء إملائية)', () => {
    const lit = /['"](sys\.\w+)['"]/g;
    const known = new Set<string>(SysPerm.all);
    const unknown = new Set<string>();
    for (const filePath of walkSourceFiles('src')) {
      const src = fs.readFileSync(filePath, 'utf8');
      lit.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = lit.exec(src)) !== null) {
        if (!known.has(m[1])) {
          unknown.add(`${m[1]} (${filePath})`);
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });
});
