import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, UsersCompanion } from '../../../data/db/app_database';
import { NativeDatabase, Value } from '../../../data/db/sqlite_driver';
import type { User } from '../../../data/db/tables/core_tables';
import { UsersRepo } from '../../../data/repos/users_repo';
import { AuthService } from '../auth_service';
import { Pbkdf2 } from '../pbkdf2';
import { SharedPreferences } from '../shared_prefs';

/// ترقية بصمات كلمات المرور: الحسابات القديمة (45,000 دورة) تبقى تعمل، وتُعاد
/// تجزئتها بالعدد الحالي عند أول دخول ناجح، والحسابات الجديدة تُحفظ بعددها صراحة.
describe('password_upgrade_test', () => {
  let db: AppDatabase;

  beforeEach(() => {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  afterEach(async () => {
    await db.close();
  });

  const row = (id: string): Promise<User> =>
    db
      .select(db.users)
      .where((t) => t.id.equals(id))
      .getSingle();

  it('حساب قديم يدخل ثم تُرقّى بصمته ويبقى يدخل بعدها', async () => {
    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    await db.into(db.users).insert(
      UsersCompanion.insert({
        id: 'web-1',
        username: 'keeper',
        saltHex: Value.of(salt),
        hashHex: Value.of(
          Pbkdf2.deriveHex('Admin#12345', salt, {
            iterations: Pbkdf2.legacyIterations,
          }),
        ),
        iterations: Value.of(Pbkdf2.legacyIterations),
      }),
    );
    const auth = new AuthService(db);

    const first = await auth.login('keeper', 'Admin#12345');
    expect(first.isOk).toBe(true);
    const upgraded = await row('web-1');
    expect(upgraded.iterations).toBe(Pbkdf2.iterations);
    expect(upgraded.saltHex).not.toBe(salt); // ملح جديد مع البصمة الجديدة
    expect(upgraded.updatedAt).not.toBeNull(); // حتى تلتقطه المزامنة

    await auth.logout();
    expect((await auth.login('keeper', 'Admin#12345')).isOk).toBe(true);
    expect((await auth.login('keeper', 'wrong-pass')).isOk).toBe(false);
  }, 60_000);

  it('الدخول الفاشل لا يغيّر البصمة', async () => {
    const salt = '00112233445566778899aabbccddeeff';
    const hash = Pbkdf2.deriveHex('secret-1', salt, {
      iterations: Pbkdf2.legacyIterations,
    });
    await db.into(db.users).insert(
      UsersCompanion.insert({
        id: 'web-2',
        username: 'clerk',
        saltHex: Value.of(salt),
        hashHex: Value.of(hash),
        iterations: Value.of(Pbkdf2.legacyIterations),
      }),
    );

    await new AuthService(db).login('clerk', 'nope');

    const r = await row('web-2');
    expect(r.hashHex).toBe(hash);
    expect(r.iterations).toBe(Pbkdf2.legacyIterations);
  }, 30_000);

  it('المدير الأول والمستخدم الجديد يُحفظان بالعدد الحالي صراحة', async () => {
    const admin = await new AuthService(db).createAdmin({
      username: 'admin',
      password: 'correct-horse',
    });
    expect(admin.iterations).toBe(Pbkdf2.iterations);

    const id = await new UsersRepo(db).createUser({
      username: 'clerk',
      password: 'desk-pass-1',
      name: 'كاتب',
    });
    expect((await row(id)).iterations).toBe(Pbkdf2.iterations);
  }, 60_000);

  it('إعادة تعيين كلمة مرور حساب مُرحَّل بعدد مختلف تكتب العدد الجديد معها', async () => {
    await db.into(db.users).insert(
      UsersCompanion.insert({
        id: 'web-3',
        username: 'storekeeper',
        saltHex: Value.of('00112233445566778899aabbccddeeff'),
        hashHex: Value.of('00'),
        iterations: Value.of(100000),
      }),
    );

    await new UsersRepo(db).resetPassword({
      id: 'web-3',
      password: 'new-pass-123',
      actorId: 'web-3',
      actorRole: 'user',
    });

    expect((await row('web-3')).iterations).toBe(Pbkdf2.iterations);
    expect((await new AuthService(db).login('storekeeper', 'new-pass-123')).isOk).toBe(true);
  }, 60_000);
});
