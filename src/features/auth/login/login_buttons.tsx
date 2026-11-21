import { useState } from 'react';
import { ImdIcon } from '../../../core/ui/imd_icon';
import { ImdStyle } from '../../../core/ui/imd_style';
import { ImdColors, ImdCursor } from '../../../core/ui/imd_tokens';
import { ImdTap } from '../../../core/ui/widgets/imd_tap';

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

export interface LoginPrimaryBtnProps {
  readonly label: string;
  readonly icon?: string;
  readonly busy: boolean;
  readonly height: number;
  readonly fontSize: number;
  readonly onTap: () => void;
  readonly colors?: ImdColors;
}

/// زرّ الدخول الأساسي — يعرض مؤشر انتظارٍ أثناء التحقق.
export function LoginPrimaryBtn({
  label,
  icon,
  busy,
  height,
  fontSize,
  onTap,
  colors,
}: LoginPrimaryBtnProps) {
  const c = resolveActiveColors(colors);
  const [hover, setHover] = useState(false);
  const bg = (hover && !busy ? c.accentHover : c.accent).withValues({
    alpha: busy ? 0.85 : 1,
  });

  return (
    <ImdTap
      onTap={busy ? null : onTap}
      disabled={busy}
      cursor={busy ? 'progress' : ImdCursor.click}
      radius={12}
      onHoverChange={setHover}
    >
      <div
        className="flex w-full items-center justify-center transition-colors duration-150"
        style={{
          height,
          backgroundColor: bg.css,
          borderRadius: 12,
        }}
      >
        {busy ? (
          <>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width={16}
              height={16}
              className="animate-spin shrink-0"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke={c.onAccent.withValues({ alpha: 0.4 }).css}
                strokeWidth="2"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke={c.onAccent.css}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ width: 8, flexShrink: 0 }} />
          </>
        ) : icon !== undefined ? (
          <>
            <ImdIcon name={icon} size={fontSize + 2} color={c.onAccent} />
            <span style={{ width: 8, flexShrink: 0 }} />
          </>
        ) : null}
        <span
          className="truncate"
          style={{
            fontSize,
            fontWeight: 600,
            color: c.onAccent.css,
          }}
        >
          {label}
        </span>
      </div>
    </ImdTap>
  );
}

export interface LoginCornerCloseBtnProps {
  readonly onTap: () => void;
  readonly colors?: ImdColors;
}

/// علامة الإغلاق عند الزاوية — دائرةٌ صغيرة تحمرّ عند المرور، بنفس دلالة «خروج».
export function LoginCornerCloseBtn({ onTap, colors }: LoginCornerCloseBtnProps) {
  const c = resolveActiveColors(colors);
  const [hover, setHover] = useState(false);

  return (
    <ImdTap
      label="إغلاق التطبيق"
      onTap={onTap}
      focusable={false}
      cursor={ImdCursor.click}
      radius={14}
      onHoverChange={setHover}
    >
      <div
        className="flex items-center justify-center transition-colors duration-150"
        style={{
          width: 28,
          height: 28,
          backgroundColor: hover ? c.dangerSoft.css : 'transparent',
          borderRadius: 9999,
        }}
      >
        <ImdIcon name="x" size={15} color={hover ? c.danger : c.text2} />
      </div>
    </ImdTap>
  );
}

export interface LoginExitBtnProps {
  readonly height: number;
  readonly fontSize: number;
  readonly onTap: () => void;
  readonly colors?: ImdColors;
}

/// زر «خروج»: ثانوي بإطار، ويتلوّن بلون التحذير عند المرور لأنه يغلق التطبيق.
export function LoginExitBtn({
  height,
  fontSize,
  onTap,
  colors,
}: LoginExitBtnProps) {
  const c = resolveActiveColors(colors);
  const [hover, setHover] = useState(false);
  const fg = hover ? c.danger : c.text2;

  return (
    <ImdTap
      label="إغلاق النظام"
      onTap={onTap}
      cursor={ImdCursor.click}
      radius={12}
      onHoverChange={setHover}
    >
      <div
        className="flex w-full items-center justify-center transition-colors duration-150"
        style={{
          height,
          backgroundColor: hover ? c.dangerSoft.css : c.surface.css,
          border: `1px solid ${
            hover ? c.danger.withValues({ alpha: 0.35 }).css : c.lineStrong.css
          }`,
          borderRadius: 12,
        }}
      >
        <ImdIcon name="log-out" size={fontSize + 2} color={fg} />
        <span style={{ width: 8, flexShrink: 0 }} />
        <span
          style={{
            fontSize,
            fontWeight: 600,
            color: fg.css,
          }}
        >
          خروج
        </span>
      </div>
    </ImdTap>
  );
}

export interface LoginBioBtnProps {
  readonly height: number;
  readonly fontSize: number;
  readonly busy: boolean;
  readonly onTap: () => void;
  readonly colors?: ImdColors;
}

/// زرّ «الدخول بالبصمة»: ثانويٌّ بإطارٍ بلون التمييز تحت زر «دخول».
export function LoginBioBtn({
  height,
  fontSize,
  busy,
  onTap,
  colors,
}: LoginBioBtnProps) {
  const c = resolveActiveColors(colors);

  return (
    <ImdTap
      label="الدخول بالبصمة"
      onTap={busy ? null : onTap}
      disabled={busy}
      cursor={busy ? 'default' : ImdCursor.click}
      radius={12}
    >
      <div
        className="flex w-full items-center justify-center"
        style={{
          height,
          backgroundColor: c.accent.withValues({ alpha: 0.08 }).css,
          border: `1px solid ${c.accent.withValues({ alpha: 0.5 }).css}`,
          borderRadius: 12,
        }}
      >
        <ImdIcon name="fingerprint" size={fontSize + 5} color={c.accent} />
        <span style={{ width: 8, flexShrink: 0 }} />
        <span
          style={{
            fontSize,
            fontWeight: 600,
            color: c.accent.css,
          }}
        >
          الدخول بالبصمة
        </span>
      </div>
    </ImdTap>
  );
}
