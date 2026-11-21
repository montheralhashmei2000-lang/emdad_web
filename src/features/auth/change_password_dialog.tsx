import { useEffect, useState } from 'react';
import { PasswordHash } from '../../core/security/password_hash';
import { ImdFld, ImdLabeled, ImdTextController } from '../../core/ui/imd_form';
import { ValueNotifier } from '../../core/ui/imd_numbers';
import { ImdStyle } from '../../core/ui/imd_style';
import { ImdColors } from '../../core/ui/imd_tokens';
import {
  ImdButton,
  ImdButtonOutline,
  showImdModal,
  showImdToast,
} from '../../core/ui/imd_widgets';
import type { AppDatabase } from '../../data/db/app_database';
import { AuditRepo } from '../../data/repos/audit_repo';
import { ArgumentError, StateError, UsersRepo } from '../../data/repos/users_repo';
import { PasswordPolicy } from '../../domain/password_policy';

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

function DialogErrorText({
  error,
  colors,
}: {
  readonly error: ValueNotifier<string>;
  readonly colors: ImdColors;
}) {
  const [msg, setMsg] = useState(error.value);

  useEffect(() => {
    setMsg(error.value);
    const l = () => setMsg(error.value);
    error.addListener(l);
    return () => error.removeListener(l);
  }, [error]);

  if (msg.length === 0) return null;
  return (
    <div
      role="alert"
      style={{
        paddingTop: 10,
        fontSize: 13,
        color: colors.danger.css,
      }}
    >
      {msg}
    </div>
  );
}

/// نافذة «تغيير كلمة المرور» للمستخدم نفسه: يُثبت كلمته الحالية ثم يضع جديدة
/// تحقق [PasswordPolicy] (٨ أحرف فأكثر، نوعان من الحروف، غير شائعة). تُفتح من بطاقة المستخدم
/// في الشريط العلوي، ومن تنبيه الترقية بعد الدخول.
export async function showChangePasswordDialog({
  db,
  userId,
  colors,
}: {
  readonly db: AppDatabase;
  readonly userId: string;
  readonly colors?: ImdColors;
}): Promise<void> {
  if (typeof document === 'undefined' || !document.body) return;

  const activeColors = resolveActiveColors(colors);
  const current = new ImdTextController();
  const next = new ImdTextController();
  const confirm = new ImdTextController();
  const error = new ValueNotifier<string>('');

  const submit = async (): Promise<boolean> => {
    const repo = new UsersRepo(db);
    const me = await repo.byId(userId);
    const weak = PasswordPolicy.problem(next.text, {
      username: me?.username ?? '',
    });
    if (weak !== null) {
      error.value = `✖ ${weak}`;
      return false;
    }
    if (next.text !== confirm.text) {
      error.value = '✖ كلمتا المرور غير متطابقتين';
      return false;
    }
    const user = await repo.byId(userId);
    if (user === null) {
      error.value = '✖ تعذّر العثور على الحساب';
      return false;
    }
    const ok = await PasswordHash.verify(
      current.text,
      user.saltHex,
      user.hashHex,
      user.iterations,
    );
    if (!ok) {
      error.value = '✖ كلمة المرور الحالية غير صحيحة';
      return false;
    }
    try {
      await repo.resetPassword({
        id: userId,
        password: next.text,
        actorId: userId,
        actorRole: user.role,
      });
      await new AuditRepo(db).log({
        action: 'user.password_change',
        entityType: 'مستخدم',
        summary: `غيّر المستخدم ${user.username} كلمة مروره بنفسه`,
        actorEmail: user.email,
      });
    } catch (e) {
      const msg =
        e instanceof ArgumentError || e instanceof StateError
          ? e.message
          : String(e);
      error.value = `✖ ${msg}`;
      return false;
    }
    return true;
  };

  const saved = await showImdModal<boolean>({
    title: 'تغيير كلمة المرور',
    icon: 'user',
    maxWidth: 440,
    colors: activeColors,
    builder: (ctx) => (
      <div className="flex flex-col items-stretch">
        <ImdLabeled label="كلمة المرور الحالية" colors={ctx.colors}>
          <ImdFld
            controller={current}
            obscure={true}
            colors={ctx.colors}
            data-testid="change-pass-current"
          />
        </ImdLabeled>
        <div style={{ height: 10 }} />
        <ImdLabeled label="كلمة المرور الجديدة" colors={ctx.colors}>
          <ImdFld
            controller={next}
            obscure={true}
            hint="٨ أحرف فأكثر"
            colors={ctx.colors}
            data-testid="change-pass-next"
          />
        </ImdLabeled>
        <div style={{ height: 10 }} />
        <ImdLabeled label="تأكيد كلمة المرور الجديدة" colors={ctx.colors}>
          <ImdFld
            controller={confirm}
            obscure={true}
            colors={ctx.colors}
            data-testid="change-pass-confirm"
          />
        </ImdLabeled>
        <DialogErrorText error={error} colors={ctx.colors} />
      </div>
    ),
    actions: (ctx) => (
      <>
        <ImdButtonOutline
          label="إلغاء"
          onPressed={() => ctx.close(false)}
          colors={ctx.colors}
        />
        <ImdButton
          label="حفظ"
          icon="save"
          onPressed={async () => {
            const ok = await submit();
            if (ok) ctx.close(true);
          }}
          colors={ctx.colors}
        />
      </>
    ),
  });

  if (saved === true) {
    showImdToast('✔ غُيّرت كلمة المرور', { colors: activeColors });
  }
}
