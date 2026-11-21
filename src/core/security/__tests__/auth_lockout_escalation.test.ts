import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../../../data/db/app_database';
import { NativeDatabase } from '../../../data/db/sqlite_driver';
import { SettingsRepo } from '../../../data/repos/settings_repo';
import { AuthResult, AuthService, AuthStatus } from '../auth_service';
import { SharedPreferences } from '../shared_prefs';

const MIN = 60_000;
const HOUR = 60 * MIN;

/// تصعيد قفل الدخول: كان ثلاث دقائق كل مرة، فينال المخمِّن ~١٠٠ محاولة في الساعة
/// على حساب المدير بلا نهاية. الآن ٣ ثم ١٥ ثم ٦٠ دقيقة، وتُنسى المرّات بعد ٢٤ ساعة.
describe('auth_lockout_escalation_test', () => {
  let db: AppDatabase;

  beforeEach(() => {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  afterEach(async () => {
    await db.close();
  });

  const ms = (t: number) => t;

  /// حالة قفلٍ سابق انتهت مدته: [strikes] مرةً، آخرها قبل [agoMs].
  function seed({ strikes, agoMs }: { strikes: number; agoMs: number }): Promise<void> {
    const now = Date.now();
    return new SettingsRepo(db).write('authLocks', {
      ghost: {
        fails: 0,
        until: ms(now - 1000),
        strikes,
        lastLockAt: ms(now - agoMs),
      },
    });
  }

  async function failFiveTimes(): Promise<AuthResult> {
    const auth = new AuthService(db);
    let last!: AuthResult;
    for (let i = 0; i < AuthService.maxAttempts; i++) {
      last = await auth.login('ghost', `wrong-pass-${i}`);
    }
    return last;
  }

  it('مدد القفل: ٣ ثم ١٥ ثم ٦٠ ثم تبقى ٦٠', () => {
    expect(AuthService.lockDurationFor(1)).toBe(AuthService.lockDurationMs);
    expect(AuthService.lockDurationFor(2)).toBe(15 * MIN);
    expect(AuthService.lockDurationFor(3)).toBe(60 * MIN);
    expect(AuthService.lockDurationFor(9)).toBe(60 * MIN);
  });

  it('القفل الأول ثلاث دقائق', async () => {
    const r = await failFiveTimes();
    expect(r.status).toBe(AuthStatus.locked);
    expect(r.lockRemainingMs).toBe(AuthService.lockDurationMs);
    const locks = await new SettingsRepo(db).read('authLocks');
    expect((locks['ghost'] as Record<string, unknown>)['strikes']).toBe(1);
  }, 60_000);

  it('القفل الثاني خلال ٢٤ ساعة ١٥ دقيقة، والثالث ساعة', async () => {
    await seed({ strikes: 1, agoMs: 10 * MIN });
    expect((await failFiveTimes()).lockRemainingMs).toBe(15 * MIN);

    await seed({ strikes: 2, agoMs: 30 * MIN });
    expect((await failFiveTimes()).lockRemainingMs).toBe(60 * MIN);
  }, 60_000);

  it('بعد ٢٤ ساعة بلا قفل تُنسى المرّات السابقة', async () => {
    await seed({ strikes: 3, agoMs: 25 * HOUR });
    const r = await failFiveTimes();
    expect(r.lockRemainingMs).toBe(AuthService.lockDurationMs);
    const locks = await new SettingsRepo(db).read('authLocks');
    expect((locks['ghost'] as Record<string, unknown>)['strikes']).toBe(1);
  }, 60_000);

  it('محاولةٌ خاطئة دون القفل تحفظ المرّات ولا تُسقطها', async () => {
    await seed({ strikes: 2, agoMs: 5 * MIN });
    await new AuthService(db).login('ghost', 'wrong-pass');
    const locks = await new SettingsRepo(db).read('authLocks');
    const st = locks['ghost'] as Record<string, unknown>;
    expect(st['fails']).toBe(1);
    expect(st['strikes']).toBe(2);
  }, 30_000);
});
