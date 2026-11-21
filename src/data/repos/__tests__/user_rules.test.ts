import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SysTransitionNotice } from '../../../core/security/sys_notice';
import { SharedPreferences } from '../../../core/security/shared_prefs';
import { UserRole } from '../../../domain/access_control';
import { AppDatabase, UsersCompanion } from '../../db/app_database';
import { NativeDatabase, Value } from '../../db/sqlite_driver';
import type { User } from '../../db/tables/core_tables';
import { PermissionImpact } from '../../permission_impact';
import { ArgumentError, UsersRepo } from '../users_repo';

/// قواعد المالك والمدير في إدارة الحسابات + تنبيه الانتقال + تقرير الأثر.
describe('user_rules_test', () => {
  let db: AppDatabase;
  let repo: UsersRepo;

  beforeEach(async () => {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
    repo = new UsersRepo(db);
    // مالك + مدير + مستخدم، بإنشاءٍ داخلي موثوق (بلا actorRole).
    await repo.createUser({
      username: 'boss',
      password: 'Test@12345',
      name: 'b',
      isAdmin: true,
    });
    await repo.createUser({
      username: 'adm',
      password: 'Test@12345',
      name: 'a',
      isAdmin: true,
    });
    await repo.createUser({
      username: 'clerk',
      password: 'Test@12345',
      name: 'c',
    });
    await db
      .update(db.users)
      .where((t) => t.username.equals('boss'))
      .write(UsersCompanion({ role: Value.of(UserRole.owner) }));
  }, 60_000);

  afterEach(async () => {
    await db.close();
  });

  const byName = (n: string): Promise<User> =>
    db
      .select(db.users)
      .where((t) => t.username.equals(n))
      .getSingle();

  describe('المدير (admin)', () => {
    const asRole = UserRole.admin;

    it('ينشئ «مستخدمًا» بقالبٍ جاهز', async () => {
      const id = await repo.createUser({
        username: 'new1',
        password: 'Test@12345',
        name: 'n',
        roleIds: ['data_entry'],
        actorRole: asRole,
      });
      const u = await db
        .select(db.users)
        .where((t) => t.id.equals(id))
        .getSingle();
      expect(u.role).toBe(UserRole.user);
      expect(UsersRepo.rolesOf(u)).toEqual(['data_entry']);
      expect(u.permissions).toContain('stocktake');
    }, 30_000);

    it('لا يمنح دور مدير ولا يخصّص صلاحيات ولا نطاقًا ولا يستعمل قالبًا مجهولًا', async () => {
      await expect(
        repo.createUser({
          username: 'x1',
          password: 'Test@12345',
          name: 'x',
          isAdmin: true,
          actorRole: asRole,
        }),
      ).rejects.toThrow(ArgumentError);
      await expect(
        repo.createUser({
          username: 'x2',
          password: 'Test@12345',
          name: 'x',
          permissions: { items: { view: true } },
          actorRole: asRole,
        }),
      ).rejects.toThrow(ArgumentError);
      await expect(
        repo.createUser({
          username: 'x3',
          password: 'Test@12345',
          name: 'x',
          warehouseScope: ['w'],
          actorRole: asRole,
        }),
      ).rejects.toThrow(ArgumentError);
      await expect(
        repo.createUser({
          username: 'x4',
          password: 'Test@12345',
          name: 'x',
          roleIds: ['nope'],
          actorRole: asRole,
        }),
      ).rejects.toThrow(ArgumentError);
    });

    it('يعدّل اسم مستخدمٍ عادي ويفعّله، ولا يعطّله ولا يعدّل صلاحياته أو دوره أو نطاقه', async () => {
      const clerk = await byName('clerk');
      await repo.updateUser({ id: clerk.id, name: 'جديد', actorRole: asRole });
      await repo.updateUser({ id: clerk.id, active: true, actorRole: asRole });
      expect((await byName('clerk')).name).toBe('جديد');
      await expect(
        repo.updateUser({ id: clerk.id, active: false, actorRole: asRole }),
      ).rejects.toThrow(ArgumentError);
      await expect(
        repo.updateUser({
          id: clerk.id,
          permissions: { items: { view: true } },
          actorRole: asRole,
        }),
      ).rejects.toThrow(ArgumentError);
      await expect(
        repo.updateUser({ id: clerk.id, isAdmin: true, actorRole: asRole }),
      ).rejects.toThrow(ArgumentError);
      await expect(
        repo.updateUser({ id: clerk.id, allWarehouses: true, actorRole: asRole }),
      ).rejects.toThrow(ArgumentError);
      await expect(
        repo.updateUser({ id: clerk.id, warehouseScope: ['w'], actorRole: asRole }),
      ).rejects.toThrow(ArgumentError);
    });

    it('لا يمسّ حساب مديرٍ أو مالك', async () => {
      for (const name of ['adm', 'boss']) {
        const t = await byName(name);
        await expect(
          repo.updateUser({ id: t.id, name: 'x', actorRole: asRole }),
        ).rejects.toThrow(ArgumentError);
      }
    });

    it('لا يحذف أحدًا', async () => {
      const clerk = await byName('clerk');
      await expect(
        repo.deleteUser(clerk.id, { actorRole: asRole }),
      ).rejects.toThrow(ArgumentError);
      expect((await db.select(db.users).get()).length).toBe(3);
    });
  });

  describe('المالك (owner)', () => {
    const asRole = UserRole.owner;

    it('يمنح دور المدير ويخصّص الصلاحيات والنطاق ويعطّل', async () => {
      await repo.createUser({
        username: 'adm3',
        password: 'Test@12345',
        name: 'x',
        isAdmin: true,
        actorRole: asRole,
      });
      const clerk = await byName('clerk');
      await repo.updateUser({
        id: clerk.id,
        permissions: { items: { view: true } },
        actorRole: asRole,
      });
      await repo.updateUser({
        id: clerk.id,
        allWarehouses: true,
        actorRole: asRole,
      });
      await repo.updateUser({
        id: clerk.id,
        active: false,
        actorRole: asRole,
      });
      expect((await byName('clerk')).active).toBe(false);
      expect((await byName('adm3')).role).toBe(UserRole.admin);
    }, 30_000);

    it('يحذف مستخدمًا عاديًا، ولا يحذف نفسه', async () => {
      const clerk = await byName('clerk');
      expect(await repo.deleteUser(clerk.id, { actorRole: asRole })).toBe(true);
      expect(
        await repo.deleteUser((await byName('boss')).id, { actorRole: asRole }),
      ).toBe(false);
    });
  });

  it('مستخدم عادي لا يدير حسابات إطلاقًا', async () => {
    const clerk = await byName('clerk');
    await expect(
      repo.updateUser({ id: clerk.id, name: 'x', actorRole: UserRole.user }),
    ).rejects.toThrow(ArgumentError);
    await expect(
      repo.createUser({
        username: 'z',
        password: 'Test@12345',
        name: 'z',
        actorRole: UserRole.user,
      }),
    ).rejects.toThrow(ArgumentError);
  });

  it('الاستدعاء الداخلي الموثوق (بلا actorRole) لا يخضع للقواعد', async () => {
    const clerk = await byName('clerk');
    await repo.updateUser({
      id: clerk.id,
      permissions: { items: { view: true } },
      isAdmin: true,
    });
    expect((await byName('clerk')).role).toBe(UserRole.admin);
  });

  describe('تنبيه الانتقال', () => {
    it('يظهر مرةً واحدة لكل مدير غير مالك، ولا يظهر للمالك ولا للمستخدم', async () => {
      const notice = new SysTransitionNotice(db);
      const adm = await byName('adm');
      expect(await notice.shouldShow(adm)).toBe(true);
      await notice.markSeen(adm);
      expect(await notice.shouldShow(adm)).toBe(false);
      expect(await notice.shouldShow(await byName('boss'))).toBe(false);
      expect(await notice.shouldShow(await byName('clerk'))).toBe(false);
    });

    it('مديرٌ آخر يراه رغم أن الأول رآه، ويبقى «مرئيًا» بعد إعادة بناء الخدمة', async () => {
      await repo.createUser({
        username: 'adm2',
        password: 'Test@12345',
        name: 'a2',
        isAdmin: true,
      });
      await new SysTransitionNotice(db).markSeen(await byName('adm'));
      expect(await new SysTransitionNotice(db).shouldShow(await byName('adm'))).toBe(false);
      expect(await new SysTransitionNotice(db).shouldShow(await byName('adm2'))).toBe(true);
    }, 30_000);

    it('الرسالة نصّها المتّفق عليه', () => {
      expect(SysTransitionNotice.message).toBe(
        'النسخ الاحتياطي والتفعيل والمزامنة انتقلت للمالك. تواصل معه.',
      );
    });
  });

  describe('تقرير الأثر', () => {
    it('يصنّف المستخدمين بلا تعديل أي حساب', async () => {
      const a = await byName('clerk');
      await db
        .update(db.users)
        .where((t) => t.id.equals(a.id))
        .write(
          UsersCompanion({
            permissions: Value.of(
              '{"settings":{"edit":true},"usersAccess":{"view":true},"suppliers":{"create":true},"stores":{"create":true,"edit":true},"items":{"create":true}}',
            ),
          }),
        );
      const report = PermissionImpact.build(await db.select(db.users).get());
      const names = (id: string) =>
        report.find((i) => i.id === id)!.users.map((u) => u.username);
      expect(names('admins')).toEqual(['adm']);
      expect(names('settingsEditors')).toEqual(['clerk']);
      expect(names('usersAccess')).toEqual(['clerk']);
      expect(names('suppliersCreateOnly')).toEqual(['clerk']);
      expect(names('storesCreateOnly')).toEqual([]); // لديه edit أيضًا
      expect(names('importInherit')).toEqual(['clerk']);
      // قراءةٌ فقط.
      expect((await byName('clerk')).role).toBe(UserRole.user);
    });

    it('import صريح يُخرج المستخدم من «يرث»', async () => {
      const a = await byName('clerk');
      await db
        .update(db.users)
        .where((t) => t.id.equals(a.id))
        .write(
          UsersCompanion({
            permissions: Value.of('{"items":{"create":true,"import":false}}'),
          }),
        );
      const r = PermissionImpact.build(await db.select(db.users).get());
      expect(r.find((i) => i.id === 'importInherit')!.users).toEqual([]);
    });
  });
});
