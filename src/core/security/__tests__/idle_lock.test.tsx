// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, AppSettingsCompanion, UsersCompanion } from '../../../data/db/app_database';
import { NativeDatabase, Value } from '../../../data/db/sqlite_driver';
import { SettingsRepo } from '../../../data/repos/settings_repo';
import { IdleLockHost } from '../../../features/auth/idle_lock_host';
import { AuthService } from '../auth_service';
import { AppLifecycleState, IdleLock } from '../idle_lock';
import { Pbkdf2 } from '../pbkdf2';
import { SharedPreferences } from '../shared_prefs';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/// القفل التلقائي بعد الخمول: المنطق (ساعة مُحاكاة) والغطاء (كلمة المرور).
describe('idle_lock_test', () => {
  let db: AppDatabase;
  let now: Date;

  beforeEach(() => {
    SharedPreferences.setMockInitialValues({});
    db = AppDatabase.forTesting(NativeDatabase.memory());
    now = new Date(2026, 9, 4, 9, 0, 0);
  });

  afterEach(async () => {
    cleanup();
    await db.close();
  });

  const make = () => new IdleLock(db, { clock: () => now, tickMs: HOUR });

  describe('المنطق', () => {
    it('الافتراضي ١٥ دقيقة، ولا قفل قبل المهلة', () => {
      const lock = make();
      lock.activate();
      try {
        expect(lock.minutes).toBe(IdleLock.defaultMinutes);
        now = new Date(now.getTime() + 14 * MIN + 59_000);
        expect(lock.checkNow()).toBe(false);
        expect(lock.locked).toBe(false);
      } finally {
        lock.dispose();
      }
    });

    it('يُقفل عند انقضاء المهلة، والنشاط يؤجّله', () => {
      const lock = make();
      lock.activate();
      try {
        now = new Date(now.getTime() + 10 * MIN);
        lock.touch();
        now = new Date(now.getTime() + 10 * MIN);
        expect(lock.checkNow()).toBe(false);

        now = new Date(now.getTime() + 5 * MIN);
        expect(lock.checkNow()).toBe(true);
        expect(lock.locked).toBe(true);
      } finally {
        lock.dispose();
      }
    });

    it('أثناء القفل لا يفتحه النشاط، والفتح يعيد ضبط المهلة', () => {
      const lock = make();
      lock.activate();
      try {
        lock.lockNow();
        lock.touch();
        expect(lock.locked).toBe(true);

        lock.unlock();
        expect(lock.locked).toBe(false);
        now = new Date(now.getTime() + 14 * MIN);
        expect(lock.checkNow()).toBe(false);
      } finally {
        lock.dispose();
      }
    });

    it('المعطَّل (٠) لا يقفل أبدًا، والإعداد يُحفظ في القاعدة ويُقرأ', async () => {
      const lock = make();
      await lock.setMinutes(0);
      lock.activate();
      try {
        now = new Date(now.getTime() + 2 * DAY);
        expect(lock.checkNow()).toBe(false);

        await lock.setMinutes(5);
        expect((await new SettingsRepo(db).read('security'))['idleLockMinutes']).toBe(5);

        const other = make();
        await other.load();
        expect(other.minutes).toBe(5);
        expect(SettingsRepo.localOnlyKeys).toContain('security');
      } finally {
        lock.dispose();
      }
    });

    it('غير نشط (قبل الدخول أو بعد الخروج) لا يقفل، والخروج يُزيل القفل', () => {
      const lock = make();
      now = new Date(now.getTime() + 3 * HOUR);
      expect(lock.checkNow()).toBe(false);
      lock.lockNow();
      expect(lock.locked).toBe(false);

      lock.activate();
      lock.lockNow();
      expect(lock.locked).toBe(true);
      lock.deactivate();
      expect(lock.locked).toBe(false);
      lock.dispose();
    });
  });

  describe('الغطاء', () => {
    async function mountHost(): Promise<{ auth: AuthService; lock: IdleLock }> {
      const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
      await db.into(db.users).insert(
        UsersCompanion.insert({
          id: 'u1',
          username: 'sara',
          name: Value.of('سارة'),
          saltHex: Value.of(salt),
          hashHex: Value.of(Pbkdf2.deriveHex('right-pass-1', salt, { iterations: 1000 })),
          iterations: Value.of(1000),
        }),
      );
      await db.into(db.appSettings).insertOnConflictUpdate(
        AppSettingsCompanion.insert({
          key: 'authSession',
          value: Value.of(`{"userId":"u1","startedAt":${Date.now()}}`),
        }),
      );
      const auth = new AuthService(db);
      await auth.restoreSession();
      const lock = new IdleLock(db, { tickMs: HOUR });
      lock.activate();
      render(
        <IdleLockHost lock={lock} auth={auth} onSignOut={async () => {}}>
          <div>المحتوى</div>
        </IdleLockHost>,
      );
      act(() => {
        lock.lockNow();
      });
      return { auth, lock };
    }

    it('يعرض الغطاء، يرفض كلمة خاطئة، ويفتح بالصحيحة، ويخرج بزر الخروج', async () => {
      const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
      await db.into(db.users).insert(
        UsersCompanion.insert({
          id: 'u1',
          username: 'sara',
          name: Value.of('سارة'),
          saltHex: Value.of(salt),
          hashHex: Value.of(Pbkdf2.deriveHex('right-pass-1', salt, { iterations: 1000 })),
          iterations: Value.of(1000),
        }),
      );
      await db.into(db.appSettings).insertOnConflictUpdate(
        AppSettingsCompanion.insert({
          key: 'authSession',
          value: Value.of(`{"userId":"u1","startedAt":${Date.now()}}`),
        }),
      );
      const auth = new AuthService(db);
      expect((await auth.restoreSession())?.username).toBe('sara');

      const lock = new IdleLock(db, { tickMs: HOUR });
      lock.activate();
      let signedOut = 0;
      let taps = 0;

      render(
        <IdleLockHost
          lock={lock}
          auth={auth}
          onSignOut={async () => {
            signedOut++;
          }}
        >
          <button type="button" onClick={() => taps++}>
            المحتوى
          </button>
        </IdleLockHost>,
      );

      const contentBtn = screen.getByRole('button', { name: 'المحتوى' });
      fireEvent.click(contentBtn);
      expect(taps).toBe(1);
      expect(screen.queryByText('الشاشة مقفلة')).toBeNull();

      act(() => {
        lock.lockNow();
      });
      expect(screen.getByText('الشاشة مقفلة')).not.toBeNull();
      expect(screen.getByText(/سارة/)).not.toBeNull();

      // المحتوى خلف الغطاء معزول عن اللمس والتركيز.
      const bgWrapper = contentBtn.parentElement as HTMLElement;
      expect(bgWrapper.inert).toBe(true);
      expect(bgWrapper.getAttribute('aria-hidden')).toBe('true');
      expect(bgWrapper.style.pointerEvents).toBe('none');

      // كلمة خاطئة.
      const passInput1 = screen
        .getByTestId('idle-lock-password')
        .querySelector('input')!;
      fireEvent.change(passInput1, { target: { value: 'wrong-pass' } });
      fireEvent.click(screen.getByRole('button', { name: 'فتح' }));

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('غير صحيحة');
      });
      expect(lock.locked).toBe(true);

      // زر الخروج.
      fireEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));
      expect(signedOut).toBe(1);

      // كلمة صحيحة.
      const passInput2 = screen
        .getByTestId('idle-lock-password')
        .querySelector('input')!;
      fireEvent.change(passInput2, { target: { value: 'right-pass-1' } });
      fireEvent.click(screen.getByRole('button', { name: 'فتح' }));

      await waitFor(() => {
        expect(lock.locked).toBe(false);
      });
      expect(screen.queryByText('الشاشة مقفلة')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'المحتوى' }));
      expect(taps).toBe(2);

      lock.dispose();
    }, 60_000);

    it('حقل كلمة المرور بلا اقتراحات ولا تصحيح، واتجاهه من اليسار', async () => {
      const { lock } = await mountHost();
      try {
        const input = screen
          .getByTestId('idle-lock-password')
          .querySelector('input')!;
        expect(input.type).toBe('password');
        expect(input.getAttribute('dir')).toBe('ltr');
        expect(input.getAttribute('autocomplete')).toBe('off');
        expect(input.getAttribute('spellcheck')).toBe('false');
      } finally {
        lock.dispose();
      }
    });

    it('العودة من الخلفية تبني الحقل من جديد وتمسح ما كُتب قبل الخمول', async () => {
      const { lock } = await mountHost();
      try {
        const beforeInput = screen
          .getByTestId('idle-lock-password')
          .querySelector('input')!;
        fireEvent.change(beforeInput, { target: { value: '123' } });
        expect(beforeInput.value).toBe('123');

        act(() => {
          for (const st of [
            AppLifecycleState.inactive,
            AppLifecycleState.hidden,
            AppLifecycleState.paused,
            AppLifecycleState.hidden,
            AppLifecycleState.inactive,
            AppLifecycleState.resumed,
          ]) {
            lock.didChangeAppLifecycleState(st);
          }
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
          });
          document.dispatchEvent(new Event('visibilitychange'));
        });

        const afterInput = screen
          .getByTestId('idle-lock-password')
          .querySelector('input')!;
        expect(afterInput.value).toBe('');
        expect(afterInput === beforeInput).toBe(false);

        fireEvent.change(afterInput, { target: { value: '45' } });
        expect(afterInput.value).toBe('45');
      } finally {
        lock.dispose();
      }
    });

    it('القفل يترك التركيز عن أي حقلٍ في الصفحة خلفه', async () => {
      render(<input data-testid="behind-field" autoFocus />);
      const field = screen.getByTestId('behind-field');
      field.focus();
      expect(document.activeElement).toBe(field);

      const lock = new IdleLock(db, { tickMs: HOUR });
      lock.activate();
      try {
        lock.lockNow();
        expect(document.activeElement).not.toBe(field);
      } finally {
        lock.dispose();
      }
    });
  });
});
