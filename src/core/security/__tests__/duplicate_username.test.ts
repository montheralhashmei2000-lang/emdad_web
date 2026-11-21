import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, UsersCompanion } from '../../../data/db/app_database';
import { NativeDatabase, Value } from '../../../data/db/sqlite_driver';
import { ArgumentError } from '../../../data/repos/users_repo';
import { AuthService } from '../auth_service';
import { PasswordHash } from '../password_hash';
import { SharedPreferences } from '../shared_prefs';

/// اسمُ دخولٍ واحدٌ لحسابين: من يُصادَق؟
describe('duplicate_username_test', () => {
  let db: AppDatabase;
  let auth: AuthService;

  beforeEach(() => {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
    auth = new AuthService(db);
  });

  afterEach(async () => {
    await db.close();
  });

  /// حسابٌ باسمٍ وكلمة مرور ومعرّفٍ صريح.
  async function seed({
    id,
    username,
    password,
    role = 'admin',
    updatedAt = null,
  }: {
    id: string;
    username: string;
    password: string;
    role?: string;
    updatedAt?: Date | null;
  }): Promise<void> {
    const ph = await PasswordHash.create(password);
    await db.into(db.users).insert(
      UsersCompanion.insert({
        id,
        username,
        role: Value.of(role),
        saltHex: Value.of(ph.saltHex),
        hashHex: Value.of(ph.hashHex),
        iterations: Value.of(ph.iterations),
        warehouseScope: Value.of('ALL'),
        updatedAt: Value.of(updatedAt),
      }),
    );
  }

  it('الحساب المحلي يُقدَّم على الوارد بالمزامنة عند تكرار الاسم', async () => {
    // الوارد أحدثُ تعديلًا — ومع ذلك المحلي أحقُّ بالدخول على جهازه.
    await seed({ id: 'remote-9', username: 'admin', password: 'remote-pass-1' });
    await seed({
      id: 'local-admin',
      username: 'admin',
      password: 'local-pass-1',
      updatedAt: new Date(2020, 0, 1),
    });

    const ok = await auth.login('admin', 'local-pass-1');
    expect(ok.isOk).toBe(true);
    expect(ok.user!.id).toBe('local-admin');

    // وكلمة مرور الحساب الآخر لا تفتح الجلسة: حسابٌ واحد هو المقصود بالاسم.
    const other = await new AuthService(db).login('admin', 'remote-pass-1');
    expect(other.isOk).toBe(false);
  }, 120_000);

  it('بلا حسابٍ محلي يفوز الأحدث تعديلًا — والاختيار ثابت لا عشوائي', async () => {
    await seed({
      id: 'b-old',
      username: 'nasser',
      password: 'old-pass-11',
      updatedAt: new Date(2021, 0, 1),
    });
    await seed({
      id: 'a-new',
      username: 'nasser',
      password: 'new-pass-11',
      updatedAt: new Date(2026, 0, 1),
    });

    // يُعاد بخدماتٍ جديدة: لو كان الاختيار رهنَ ترتيب الصفوف لتبدّل.
    for (let i = 0; i < 3; i++) {
      const r = await new AuthService(db).login('nasser', 'new-pass-11');
      expect(r.isOk).toBe(true);
      expect(r.user!.id).toBe('a-new');
    }
  }, 120_000);

  it('تهيئة مدير باسمٍ مستعمل تُرفض (ولو باختلاف حالة الأحرف)', async () => {
    await auth.createAdmin({ username: 'Admin', password: 'first-pass-1' });

    await expect(
      new AuthService(db).createAdmin({
        username: 'admin',
        password: 'second-pass-1',
      }),
    ).rejects.toThrow(ArgumentError);
    expect((await db.select(db.users).get()).length).toBe(1);
  }, 60_000);

  // MISSING: lib/data/repos/selfcheck_repo.dart
  it.skip('فحص السلامة يكشف الاسم المكرّر ويسكت عن المفرد', () => {
    // يعتمد على SelfCheckRepo (مرحلة لاحقة).
  });
});
