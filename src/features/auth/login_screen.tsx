import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthService, useAuthService } from '../../core/security/auth_service';
import {
  BiometricAvailability,
  BiometricService,
} from '../../core/security/biometric_service';
import { SharedPreferences } from '../../core/security/shared_prefs';
import { SysTransitionNotice } from '../../core/security/sys_notice';
import { ImdCheckbox, ImdTextController } from '../../core/ui/imd_form';
import { ImdEmojiText, ImdIcon } from '../../core/ui/imd_icon';
import { ImdStyle } from '../../core/ui/imd_style';
import { ImdColors, ImdSizes } from '../../core/ui/imd_tokens';
import { ImdWindow } from '../../core/ui/imd_window';
import { showImdModal, showImdToast } from '../../core/ui/imd_widgets';
import type { AppDatabase } from '../../data/db/app_database';
import type { User } from '../../data/db/tables/core_tables';
import { UserRole } from '../../domain/access_control';
import { showChangePasswordDialog } from './change_password_dialog';
import { BioChoice, BioOfferDialog } from './login/login_bio_dialog';
import {
  LoginBioBtn,
  LoginCornerCloseBtn,
  LoginExitBtn,
  LoginPrimaryBtn,
} from './login/login_buttons';
import { LoginEyeBtn, LoginInput } from './login/login_inputs';

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

const REMEMBERED_USER_KEY = 'imdad.login.rememberedUsername';

function showPasswordUpgradeNotice(
  db: AppDatabase,
  userId: string,
  colors: ImdColors,
): void {
  if (typeof document === 'undefined' || !document.body) return;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    queueMicrotask(() => {
      root.unmount();
      host.remove();
    });
  };

  const timer = setTimeout(close, 15_000);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const side = Math.max(16, (vw - 460) / 2);

  root.render(
    <div
      dir="rtl"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 12,
        left: side,
        right: side,
        zIndex: 90,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: 460,
          backgroundColor: colors.inverse.css,
          color: colors.onInverse.css,
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: `0 6px 20px ${colors.shadowMd.css}`,
          fontFamily: ImdSizes.font,
          fontSize: 13.5,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span className="min-w-0 flex-1">
          {`كلمة مرورك أقصر من ${AuthService.minPasswordLength} أحرف — يُنصح بتغييرها.`}
        </span>
        <button
          type="button"
          onClick={close}
          className="shrink-0 bg-transparent border-0 text-xs font-semibold cursor-pointer"
          style={{ color: colors.onInverse.css, opacity: 0.85 }}
        >
          لاحقًا
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            void showChangePasswordDialog({ db, userId, colors });
          }}
          className="shrink-0 bg-transparent border-0 text-xs font-bold cursor-pointer"
          style={{ color: colors.accent.css }}
        >
          غيّرها الآن
        </button>
      </div>
    </div>,
  );
}

export interface LoginScreenProps {
  readonly onSignedIn: () => void;
  readonly db?: AppDatabase;
  readonly auth?: AuthService;
  readonly colors?: ImdColors;
}

/// شاشة الدخول: الشعار والعنوان، رسالة الخطأ، اسم المستخدم، كلمة المرور بزر
/// الإظهار، ثم «دخول» و«خروج» جنبًا إلى جنب.
export function LoginScreen({
  onSignedIn,
  db: explicitDb,
  auth: explicitAuth,
  colors,
}: LoginScreenProps) {
  const ctxAuth = useAuthService();
  const auth = explicitAuth ?? ctxAuth;
  const db = explicitDb ?? auth?.db ?? null;
  const c = resolveActiveColors(colors);

  const userRef = useRef<ImdTextController | null>(null);
  if (userRef.current === null) userRef.current = new ImdTextController();
  const passRef = useRef<ImdTextController | null>(null);
  if (passRef.current === null) passRef.current = new ImdTextController();

  const userCtrl = userRef.current;
  const passCtrl = passRef.current;

  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [bioReady, setBioReady] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [vw, setVw] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  const mountedRef = useRef(true);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const bioRef = useRef<BiometricService | null>(null);
  if (bioRef.current === null && db !== null && auth !== null) {
    bioRef.current = new BiometricService(db, auth);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const prefs = await SharedPreferences.getInstance();
      const saved = prefs.getString(REMEMBERED_USER_KEY);
      if (!active || !mountedRef.current || saved === null || saved.length === 0) {
        return;
      }
      userCtrl.text = saved;
      setRemember(true);
    })();
    return () => {
      active = false;
    };
  }, [userCtrl]);

  const loginWithBiometric = useCallback(async () => {
    const bio = bioRef.current;
    if (!bio || busyRef.current) return;
    setBusy(true);
    busyRef.current = true;
    setError('');
    const res = await bio.signIn();
    if (!mountedRef.current) return;
    setBusy(false);
    busyRef.current = false;
    if (res.isOk) {
      onSignedIn();
      return;
    }
    if ((await bio.enrolledUserId()) === null && mountedRef.current) {
      setBioReady(false);
    }
    setError(res.message);
  }, [onSignedIn]);

  useEffect(() => {
    const bio = bioRef.current;
    if (!bio) return;
    let active = true;
    void (async () => {
      if ((await bio.availability()) !== BiometricAvailability.available) return;
      if ((await bio.enrolledUserId()) === null) return;
      if (!active || !mountedRef.current) return;
      setBioReady(true);
      queueMicrotask(() => {
        if (active && mountedRef.current) {
          void loginWithBiometric();
        }
      });
    })();
    return () => {
      active = false;
    };
  }, [loginWithBiometric]);

  const offerBiometric = async (user: User, password: string) => {
    const bio = bioRef.current;
    if (!bio) return;
    if ((await bio.availability()) !== BiometricAvailability.available) return;
    if ((await bio.enrolledUserId()) === user.id) return;
    if (await bio.declinedPrompt()) return;
    if (!mountedRef.current) return;
    const choice = await showImdModal<BioChoice>({
      title: 'الدخول بالبصمة',
      icon: 'fingerprint',
      maxWidth: 400,
      colors: c,
      builder: () => <BioOfferDialog />,
    });
    if (choice === BioChoice.never) {
      await bio.rememberDeclined();
    } else if (choice === BioChoice.enable) {
      const ok = await bio.enroll(user, password);
      showImdToast(
        ok ? 'تم تفعيل الدخول بالبصمة' : 'لم يُفعَّل الدخول بالبصمة',
        { colors: c },
      );
    }
  };

  const handleLogin = async () => {
    if (busyRef.current || auth === null || db === null) return;
    setBusy(true);
    busyRef.current = true;
    setError('');
    const res = await auth.login(userCtrl.text.trim(), passCtrl.text);
    if (!mountedRef.current) return;
    setBusy(false);
    busyRef.current = false;
    if (res.isOk) {
      const prefs = await SharedPreferences.getInstance();
      if (remember) {
        await prefs.setString(REMEMBERED_USER_KEY, userCtrl.text.trim());
      } else {
        await prefs.remove(REMEMBERED_USER_KEY);
      }
      if (!mountedRef.current) return;
      const user = res.user;
      const ownerPending =
        user !== null &&
        UserRole.isAdmin(user.role) &&
        (await auth.ownerSelectionNeeded());
      if (!mountedRef.current) return;
      const sysNotice = new SysTransitionNotice(db);
      const showSysNotice = user !== null && (await sysNotice.shouldShow(user));
      if (showSysNotice && user !== null) await sysNotice.markSeen(user);
      if (!mountedRef.current) return;
      const weak =
        user !== null &&
        AuthService.shouldSuggestPasswordChange({
          role: user.role,
          password: passCtrl.text,
          username: user.username,
        });
      if (user !== null) await offerBiometric(user, passCtrl.text);
      if (!mountedRef.current) return;
      onSignedIn();
      if (showSysNotice) {
        showImdToast(SysTransitionNotice.message, { colors: c });
      }
      if (ownerPending) {
        showImdToast(
          'لم يُحدَّد مالك للنظام — حدّد المالك من الإعدادات ← نظرة عامة.',
          { colors: c },
        );
      }
      if (weak && user !== null) {
        showPasswordUpgradeNotice(db, user.id, c);
      }
      return;
    }
    setError(res.message);
  };

  const handleExit = async () => {
    await ImdWindow.exit();
  };

  const narrow = vw <= 520;
  const canExit = LoginScreen.debugShowExit ?? false;
  const inputH = narrow ? 44 : 48;
  const inputFs = 15;

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto"
      style={{
        backgroundColor: narrow ? c.surface.css : c.bg.css,
        fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        className="w-full"
        style={{
          padding: narrow ? 0 : '24px 16px',
          maxWidth: narrow ? '100%' : 420,
        }}
      >
        <div
          style={{
            padding: narrow ? '22px 20px 18px' : '36px 32px 24px',
            backgroundColor: narrow ? 'transparent' : c.surface.css,
            border: narrow ? 'none' : `1px solid ${c.line.css}`,
            borderRadius: narrow ? 0 : 20,
            boxShadow: narrow
              ? undefined
              : `0 1px 2px ${c.shadowXs.css}, 0 16px 40px ${c.shadowSm.css}`,
          }}
        >
          <div className="flex flex-col items-stretch">
            <div className="flex flex-col items-stretch">
              <div className="flex justify-center">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: narrow ? 84 : 132,
                    height: narrow ? 72 : 112,
                  }}
                >
                  {!logoFailed ? (
                    <img
                      src="/assets/logo.png"
                      alt="شعار نظام الإمداد والتموين"
                      onError={() => setLogoFailed(true)}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ImdIcon
                      name="shield"
                      size={narrow ? 48 : 64}
                      color={c.accent}
                    />
                  )}
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div
                style={{
                  textAlign: 'center',
                  fontSize: narrow ? 19 : 24,
                  fontWeight: 700,
                  color: c.text.css,
                  lineHeight: 1.3,
                }}
              >
                نظام الإمداد والتموين
              </div>
              <div style={{ height: narrow ? 12 : 22 }} />
            </div>

            {error.length > 0 && (
              <div
                role="alert"
                style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  backgroundColor: c.dangerSoft.css,
                  border: `1px solid ${c.danger.withValues({ alpha: 0.35 }).css}`,
                  borderRadius: 12,
                }}
              >
                <ImdEmojiText
                  text={error}
                  colors={c}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: c.danger.css,
                    lineHeight: 1.5,
                  }}
                />
              </div>
            )}

            <div
              style={{
                paddingBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: c.text2.css,
              }}
            >
              اسم المستخدم
            </div>
            <div style={{ paddingBottom: 10 }}>
              <div style={{ height: inputH }}>
                <LoginInput
                  controller={userCtrl}
                  icon="user"
                  fontSize={inputFs}
                  onSubmitted={() => void handleLogin()}
                  colors={c}
                  testId="login-username"
                />
              </div>
            </div>

            <div
              style={{
                paddingBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: c.text2.css,
              }}
            >
              كلمة المرور
            </div>
            <div style={{ paddingBottom: 2 }}>
              <div style={{ height: inputH }}>
                <LoginInput
                  controller={passCtrl}
                  icon="lock"
                  fontSize={inputFs}
                  obscure={!showPass}
                  ltr={true}
                  onSubmitted={() => void handleLogin()}
                  eye={
                    <LoginEyeBtn
                      on={showPass}
                      onTap={() => setShowPass((v) => !v)}
                      colors={c}
                    />
                  }
                  colors={c}
                  testId="login-password"
                />
              </div>
            </div>

            <div style={{ paddingBottom: 10 }}>
              <ImdCheckbox
                value={remember}
                label="تذكّر اسم المستخدم"
                onChanged={(v) => setRemember(v)}
                colors={c}
              />
            </div>

            <div className="flex items-center">
              <div style={{ flex: 3 }}>
                <LoginPrimaryBtn
                  label={busy ? 'جارٍ التحقق…' : 'دخول'}
                  icon="log-in"
                  busy={busy}
                  height={inputH}
                  fontSize={inputFs}
                  onTap={() => void handleLogin()}
                  colors={c}
                />
              </div>
              {canExit && (
                <>
                  <div style={{ width: 10, flexShrink: 0 }} />
                  <div style={{ flex: 2 }}>
                    <LoginExitBtn
                      height={inputH}
                      fontSize={inputFs}
                      onTap={() => void handleExit()}
                      colors={c}
                    />
                  </div>
                </>
              )}
            </div>

            {bioReady && (
              <>
                <div style={{ height: 10 }} />
                <LoginBioBtn
                  height={inputH}
                  fontSize={inputFs}
                  busy={busy}
                  onTap={() => void loginWithBiometric()}
                  colors={c}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {canExit && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <LoginCornerCloseBtn onTap={() => void handleExit()} colors={c} />
        </div>
      )}
    </div>
  );
}

LoginScreen.debugShowExit = null as boolean | null;
