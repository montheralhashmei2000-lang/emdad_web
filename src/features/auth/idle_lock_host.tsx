import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { AuthService } from '../../core/security/auth_service';
import type { IdleLock } from '../../core/security/idle_lock';
import { ImdFld, ImdLabeled, ImdTextController } from '../../core/ui/imd_form';
import { ImdIcon } from '../../core/ui/imd_icon';
import { ImdStyle } from '../../core/ui/imd_style';
import { ImdColors } from '../../core/ui/imd_tokens';
import { ImdButton, ImdButtonOutline } from '../../core/ui/imd_widgets';

function resolveActiveColors(explicit?: ImdColors): ImdColors {
  if (explicit) return explicit;
  if (typeof document !== 'undefined') {
    const ds = document.documentElement.dataset;
    const isDark = ds.theme === 'dark';
    const isFuel = ds.section === 'fuel';
    if (isFuel) return isDark ? ImdColors.fuelDark : ImdColors.fuelLight;
    if (isDark) return ImdColors.dark;
  }
  return ImdStyle.classic ? ImdColors.classicLight : ImdColors.light;
}

export interface IdleLockHostProps {
  readonly lock: IdleLock;
  readonly auth: AuthService;
  readonly onSignOut: () => Promise<void>;
  readonly children?: ReactNode;
  readonly child?: ReactNode;
  readonly colors?: ImdColors;
}

/// يلفّ التطبيق: يرصد نشاط المستخدم (لمس/فأرة) ويُظهر غطاء القفل فوق كل شيء
/// حين يقفل [IdleLock]. المحتوى يبقى مبنيًّا خلف الغطاء فلا تضيع حالته، لكنه
/// معزول عن اللمس والتركيز (لا تُكتب فيه مفاتيح ولا تعمل اختصاراته).
export function IdleLockHost({
  lock,
  auth,
  onSignOut,
  children,
  child,
  colors,
}: IdleLockHostProps) {
  const [, setTick] = useState(0);
  const bgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    lock.addListener(l);
    return () => lock.removeListener(l);
  }, [lock]);

  const locked = lock.locked;

  useEffect(() => {
    if (bgRef.current) {
      bgRef.current.inert = locked;
    }
  }, [locked]);

  return (
    <div dir="rtl" className="relative h-full w-full">
      <div
        ref={bgRef}
        aria-hidden={locked || undefined}
        onPointerDown={() => lock.touch()}
        onPointerMove={() => lock.touch()}
        onWheel={() => lock.touch()}
        onTouchStart={() => lock.touch()}
        className="h-full w-full"
        style={{
          pointerEvents: locked ? 'none' : undefined,
        }}
      >
        {children ?? child}
      </div>
      {locked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="الشاشة مقفلة"
          className="fixed inset-0 z-50"
        >
          <IdleLockScreen
            lock={lock}
            auth={auth}
            onSignOut={onSignOut}
            colors={colors}
          />
        </div>
      )}
    </div>
  );
}

export interface IdleLockScreenProps {
  readonly lock: IdleLock;
  readonly auth: AuthService;
  readonly onSignOut: () => Promise<void>;
  readonly colors?: ImdColors;
}

/// غطاء القفل: كلمة المرور لفتح الشاشة، أو تسجيل الخروج.
export function IdleLockScreen({
  lock,
  auth,
  onSignOut,
  colors,
}: IdleLockScreenProps) {
  const c = resolveActiveColors(colors);
  const passRef = useRef<ImdTextController | null>(null);
  if (passRef.current === null) {
    passRef.current = new ImdTextController();
  }
  const pass = passRef.current;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /// يتغيّر عند العودة من الخلفية أو بعد فشل الفتح فيُبنى حقل كلمة المرور من جديد.
  const [fieldGen, setFieldGen] = useState(0);
  const mountedRef = useRef(true);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || busyRef.current) return;
      pass.text = '';
      setFieldGen((g) => g + 1);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pass]);

  const handleUnlock = async () => {
    if (busyRef.current) return;
    const user = auth.currentUser;
    if (user === null) {
      await onSignOut();
      return;
    }
    if (pass.text.length === 0) {
      setError('✖ أدخل كلمة المرور');
      return;
    }
    setBusy(true);
    busyRef.current = true;
    setError('');
    // بمعرّف صاحب الجلسة لا باسمه (M-13)، بعدّاد المحاولات والقفل المؤقت نفسيهما.
    const res = await auth.unlock(pass.text);
    if (!mountedRef.current) return;
    if (res.isOk) {
      pass.text = '';
      lock.unlock();
      return;
    }
    pass.text = '';
    setBusy(false);
    busyRef.current = false;
    setError(res.message);
    setFieldGen((g) => g + 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
      void handleUnlock();
    }
  };

  const user = auth.currentUser;
  const name =
    user === null ? '' : user.name.length > 0 ? user.name : user.username;

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-y-auto"
      style={{
        backgroundColor: c.bg.css,
        padding: 16,
      }}
    >
      <div
        onKeyDown={handleKeyDown}
        className="w-full"
        style={{
          maxWidth: 400,
          padding: 28,
          backgroundColor: c.surface.css,
          border: `1px solid ${c.line.css}`,
          borderRadius: 20,
        }}
      >
        <div className="flex flex-col items-stretch">
          <div className="flex justify-center">
            <ImdIcon name="lock" size={36} color={c.accent} />
          </div>
          <div style={{ height: 12 }} />
          <div
            style={{
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: c.text.css,
            }}
          >
            الشاشة مقفلة
          </div>
          <div style={{ height: 6 }} />
          <div
            style={{
              textAlign: 'center',
              fontSize: 13,
              color: c.muted.css,
            }}
          >
            {`قُفل النظام لخمولٍ طويل${name.length === 0 ? '' : ` — ${name}`}`}
          </div>
          <div style={{ height: 18 }} />
          <ImdLabeled label="كلمة المرور" colors={c}>
            <ImdFld
              key={`lock-pass-${fieldGen}`}
              controller={pass}
              obscure={true}
              enabled={!busy}
              autofocus={true}
              onSubmitted={() => void handleUnlock()}
              colors={c}
              data-testid="idle-lock-password"
            />
          </ImdLabeled>
          {error.length > 0 && (
            <div
              role="alert"
              style={{
                paddingTop: 4,
                paddingBottom: 4,
                fontSize: 13,
                color: c.danger.css,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ height: 10 }} />
          <ImdButton
            label="فتح"
            icon="lock"
            busy={busy}
            expand={true}
            onPressed={() => void handleUnlock()}
            colors={c}
          />
          <div style={{ height: 8 }} />
          <ImdButtonOutline
            label="تسجيل الخروج"
            expand={true}
            onPressed={busy ? null : () => void onSignOut()}
            colors={c}
          />
        </div>
      </div>
    </div>
  );
}
