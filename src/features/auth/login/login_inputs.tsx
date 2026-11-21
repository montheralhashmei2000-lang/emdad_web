import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ImdTextController } from '../../../core/ui/imd_form';
import { ImdIcon } from '../../../core/ui/imd_icon';
import { ImdStyle } from '../../../core/ui/imd_style';
import { ImdColor, ImdColors, ImdCursor } from '../../../core/ui/imd_tokens';
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

export interface LoginInputProps {
  readonly controller: ImdTextController;
  readonly fontSize: number;
  readonly hint?: string;
  readonly icon?: string;
  readonly obscure?: boolean;
  readonly ltr?: boolean;
  readonly eye?: ReactNode;
  readonly onSubmitted?: (value: string) => void;
  readonly colors?: ImdColors;
  readonly testId?: string;
}

/// حقل الدخول: أيقونة يمينًا وزر إظهار يسارًا، ولون الأيقونة يتحول للأساسي عند التركيز.
export function LoginInput({
  controller,
  fontSize,
  hint,
  icon,
  obscure = false,
  ltr = false,
  eye,
  onSubmitted,
  colors,
  testId,
}: LoginInputProps) {
  const c = resolveActiveColors(colors);
  const [focused, setFocused] = useState(false);
  const [hover, setHover] = useState(false);
  const [value, setValue] = useState(() => controller.text);

  useEffect(() => {
    setValue(controller.text);
    const l = () => setValue(controller.text);
    controller.addListener(l);
    return () => controller.removeListener(l);
  }, [controller]);

  const accent = c.accent;
  const border = focused
    ? accent
    : hover
      ? ImdColor.lerp(c.lineStrong, c.faint, 0.45)
      : c.lineStrong;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmitted) {
      onSubmitted(value);
    }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex h-full w-full items-center transition-colors duration-150"
      style={{
        backgroundColor: c.surface.css,
        border: `1px solid ${border.css}`,
        borderRadius: 12,
        boxShadow: focused
          ? `0 0 0 3px ${accent.withValues({ alpha: 0.18 }).css}`
          : undefined,
      }}
    >
      {icon !== undefined ? (
        <span
          className="inline-flex shrink-0 items-center"
          style={{ paddingInlineStart: 14, paddingInlineEnd: 12 }}
        >
          <ImdIcon name={icon} size={18} color={focused ? accent : c.faint} />
        </span>
      ) : (
        <span style={{ width: 14, flexShrink: 0 }} />
      )}
      <input
        data-testid={testId}
        type={obscure ? 'password' : 'text'}
        dir={ltr ? 'ltr' : undefined}
        value={value}
        placeholder={hint}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const next = e.target.value;
          controller.text = next;
          setValue(next);
        }}
        onKeyDown={handleKeyDown}
        className="min-w-0 flex-1 bg-transparent text-start outline-none placeholder:text-[color:var(--imd-faint)]"
        style={{
          fontSize,
          color: c.text.css,
          border: 'none',
          caretColor: accent.css,
        }}
      />
      {eye !== undefined && eye !== null ? (
        <span
          className="inline-flex shrink-0 items-center"
          style={{ paddingInlineEnd: 6 }}
        >
          {eye}
        </span>
      ) : (
        <span style={{ width: 14, flexShrink: 0 }} />
      )}
    </div>
  );
}

export interface LoginEyeBtnProps {
  readonly on: boolean;
  readonly onTap: () => void;
  readonly colors?: ImdColors;
}

export function LoginEyeBtn({ on, onTap, colors }: LoginEyeBtnProps) {
  const c = resolveActiveColors(colors);
  const [hover, setHover] = useState(false);

  return (
    <ImdTap
      // أيقونةٌ بلا نص: اسمها يصف ما يفعله النقر الآن.
      label={on ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
      onTap={onTap}
      onHoverChange={setHover}
      cursor={ImdCursor.click}
      radius={8}
    >
      <div
        className="flex items-center justify-center transition-colors duration-150"
        style={{
          width: 36,
          height: 36,
          backgroundColor: hover ? c.hover.css : 'transparent',
          borderRadius: 8,
        }}
      >
        <ImdIcon
          name="eye"
          size={18}
          color={on ? c.accent : hover ? c.text : c.muted}
        />
      </div>
    </ImdTap>
  );
}
