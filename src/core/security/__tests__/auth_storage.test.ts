import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, AppSettingsCompanion, UsersCompanion } from '../../../data/db/app_database';
import { NativeDatabase, Value } from '../../../data/db/sqlite_driver';
import { SettingsRepo } from '../../../data/repos/settings_repo';
import { AuthResult, AuthService, AuthStatus } from '../auth_service';
import { SharedPreferences } from '../shared_prefs';

/// قفل الدخول والجلسة محفوظان في القاعدة المشفّرة لا في SharedPreferences،
/// مع ترحيل القديم دون إسقاط الجلسات القائمة.
describe('auth_storage_test', () => {
  let db: AppDatabase;

  const addUser = (id: string, name: string): Promise<void> =>
    db.into(db.users).insert(
      UsersCompanion.insert({
        id,
        username: name,
        name: Value.of(name),
      }),
    );

  async function prefKeys(): Promise<Set<string>> {
    return (await SharedPreferences.getInstance()).getKeys();
  }

  beforeEach(() => {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  afterEach(async () => {
    await db.close();
  });

  it('مفاتيح القفل والجلسة محلية للجهاز: لا تُصدَّر ولا تُستورد', () => {
    expect(SettingsRepo.localOnlyKeys).toContain('authSession');
    expect(SettingsRepo.localOnlyKeys).toContain('authLocks');
  });

  describe('قفل الدخول', () => {
    it('خمس محاولات خاطئة تقفل، والعدّاد في القاعدة لا في SharedPreferences', async () => {
      const auth = new AuthService(db);
      let last: AuthResult | null = null;
      for (let i = 0; i < AuthService.maxAttempts; i++) {
        last = await auth.login('ghost', `wrong-pass-${i}`);
      }
      expect(last!.status).toBe(AuthStatus.locked);

      const locks = await new SettingsRepo(db).read('authLocks');
      expect(Object.keys(locks)).toContain('ghost');
      const keys = [...(await prefKeys())].filter((k) =>
        k.startsWith('imdad.auth.lock.'),
      );
      expect(keys).toEqual([]);

      // «إعادة تشغيل»: نسخة جديدة من الخدمة تقرأ القفل نفسه.
      expect((await new AuthService(db).login('ghost', 'anything-else')).status).toBe(
        AuthStatus.locked,
      );
    }, 60_000);

    it('قفلٌ قديم في SharedPreferences يُحترم ثم يُنقل إلى القاعدة ويُمسح', async () => {
      const until = Date.now() + 2 * 60_000;
      SharedPreferences.setMockInitialValues({
        'imdad.auth.lock.ghost': `{"fails":0,"until":${until}}`,
      });

      expect((await new AuthService(db).login('Ghost', 'whatever-pass')).status).toBe(
        AuthStatus.locked,
      );

      const locks = await new SettingsRepo(db).read('authLocks');
      const ghost = locks['ghost'];
      expect(ghost != null && typeof ghost === 'object' && !Array.isArray(ghost)).toBe(
        true,
      );
      expect(await prefKeys()).not.toContain('imdad.auth.lock.ghost');
    });
  });

  describe('الجلسة', () => {
    it('جلسة قديمة سارية في SharedPreferences تُستعاد وتُنقل إلى القاعدة', async () => {
      await addUser('u1', 'sara');
      const started = Date.now() - 2 * 60 * 60 * 1000;
      SharedPreferences.setMockInitialValues({
        'imdad.session.userId': 'u1',
        'imdad.session.startedAt': started,
      });

      expect((await new AuthService(db).restoreSession())?.username).toBe('sara');

      const keys = await prefKeys();
      expect(keys).not.toContain('imdad.session.userId');
      expect(keys).not.toContain('imdad.session.startedAt');
      const stored = await new SettingsRepo(db).read('authSession');
      expect(stored['userId']).toBe('u1');
      // وقت البدء الأصلي يبقى فلا تتمدّد الجلسة
      expect(stored['startedAt']).toBe(started);

      // وبعدها تُستعاد من القاعدة وحدها.
      expect((await new AuthService(db).restoreSession())?.username).toBe('sara');
    });

    it('جلسة قديمة منتهية (أكثر من ١٢ ساعة) لا تُستعاد', async () => {
      await addUser('u1', 'sara');
      SharedPreferences.setMockInitialValues({
        'imdad.session.userId': 'u1',
        'imdad.session.startedAt': Date.now() - 13 * 60 * 60 * 1000,
      });
      expect(await new AuthService(db).restoreSession()).toBeNull();
      expect(await prefKeys()).not.toContain('imdad.session.userId');
    });

    it('الخروج يمسح الجلسة من القاعدة', async () => {
      await addUser('u1', 'sara');
      await db.into(db.appSettings).insertOnConflictUpdate(
        AppSettingsCompanion.insert({
          key: 'authSession',
          value: Value.of(`{"userId":"u1","startedAt":${Date.now()}}`),
        }),
      );
      const auth = new AuthService(db);
      expect((await auth.restoreSession())?.username).toBe('sara');

      await auth.logout();

      expect(await new SettingsRepo(db).read('authSession')).toEqual({});
      expect(await new AuthService(db).restoreSession()).toBeNull();
    });
  });
});
