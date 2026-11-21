import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, UsersCompanion } from '../../../data/db/app_database';
import { NativeDatabase, Value } from '../../../data/db/sqlite_driver';
import { AuthService, AuthStatus } from '../auth_service';
import { Pbkdf2 } from '../pbkdf2';
import { SharedPreferences } from '../shared_prefs';

/// اسمٌ غير موجود يمرّ بمسار PBKDF2 كما تمرّ كلمة مرورٍ خاطئة لحسابٍ موجود، فلا
/// يُكشف الموجود بفارق زمن الرد.
describe('auth_user_enumeration_test', () => {
  let db: AppDatabase;
  let auth: AuthService;

  beforeEach(async () => {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
    auth = new AuthService(db);
    await auth.createAdmin({ username: 'admin', password: 'Test@12345' });
    await auth.logout();
    AuthService.dummyVerifications = 0;
  }, 60_000);

  afterEach(async () => {
    await db.close();
  });

  it('اسم غير موجود يشغّل الاشتقاق الوهمي ويفشل بالرسالة نفسها', async () => {
    const unknown = await auth.login('ghost', 'Whatever@123');
    expect(AuthService.dummyVerifications).toBe(1);
    expect(unknown.status).toBe(AuthStatus.badCredentials);

    const wrong = await auth.login('admin', 'Wrong@12345');
    expect(AuthService.dummyVerifications).toBe(1);
    expect(wrong.status).toBe(AuthStatus.badCredentials);
    // الرسالة نفسها بصيغتها (عدا العدّاد): لا فرق يكشف وجود الاسم.
    expect(unknown.message.replace(/\d/g, '')).toBe(
      wrong.message.replace(/\d/g, ''),
    );
  }, 60_000);

  it('الدخول الصحيح لا يمرّ بالمسار الوهمي', async () => {
    const ok = await auth.login('admin', 'Test@12345');
    expect(ok.isOk).toBe(true);
    expect(AuthService.dummyVerifications).toBe(0);
  }, 60_000);

  /// دورات الاشتقاق الوهمي تُحاكي أسرعَ حسابٍ في القاعدة لا المعيارَ الحالي.
  describe('دورات المسار الوهمي', () => {
    it('قاعدةٌ فيها حسابٌ قديم ⇒ الوهميُّ بدوراته هو', async () => {
      const memDb = AppDatabase.forTesting(NativeDatabase.memory());
      try {
        await memDb.into(memDb.users).insert(
          UsersCompanion.insert({
            id: 'u1',
            username: 'legacy',
            saltHex: Value.of('aa'.repeat(16)),
            hashHex: Value.of('bb'.repeat(32)),
            iterations: Value.of(Pbkdf2.legacyIterations),
          }),
        );

        const t0 = performance.now();
        await new AuthService(memDb).login('لا-وجود-له', 'كلمة-مرور-طويلة');
        const unknown = performance.now() - t0;

        const t1 = performance.now();
        await new AuthService(memDb).login('legacy', 'كلمة-مرور-خاطئة');
        const wrong = performance.now() - t1;

        // النسبة لا الفرق المطلق: الآلة تتفاوت. قبل الإصلاح كانت ≈٧×.
        expect(unknown).toBeLessThan(wrong * 4 + 400);
      } finally {
        await memDb.close();
      }
    }, 120_000);

    it('قاعدةٌ فارغة تعود إلى المعيار الحالي', async () => {
      const memDb = AppDatabase.forTesting(NativeDatabase.memory());
      try {
        const before = AuthService.dummyVerifications;
        await new AuthService(memDb).login('أحد', 'كلمة-مرور-طويلة');
        expect(AuthService.dummyVerifications).toBe(before + 1);
      } finally {
        await memDb.close();
      }
    }, 120_000);
  });
});
