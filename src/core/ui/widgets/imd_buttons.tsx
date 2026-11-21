import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { ImdDensity } from '../imd_density';
import { ImdIcon } from '../imd_icon';
import { ImdStyle } from '../imd_style';
import { ImdColor, ImdColors, ImdCursor, ImdSizes, imdShadowOverlay } from '../imd_tokens';
import { useImdCompact, useImdCompactFlush } from './imd_fields';
import { ImdTap } from './imd_tap';

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

function useDensityRebuildTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    ImdDensity.addRebuildListener(bump);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', bump);
    }
    return () => {
      ImdDensity.removeRebuildListener(bump);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', bump);
      }
    };
  }, []);
  return tick;
}

export enum ImdBtnKind {
  primary = 'primary',
  outline = 'outline',
  danger = 'danger',
  blue = 'blue',
  warn = 'warn',
  purple = 'purple',
  dark = 'dark',
}

export type ImdMenuButtonItem<T> =
  | {
      readonly divider?: false;
      readonly value: T;
      readonly label: string;
      readonly icon?: string;
      readonly shortcut?: string;
      readonly danger?: boolean;
      readonly disabled?: boolean;
    }
  | {
      readonly divider: true;
    };

export interface ImdMenuButtonProps<T> {
  readonly label: string;
  readonly items: readonly ImdMenuButtonItem<T>[] | (() => readonly ImdMenuButtonItem<T>[]);
  readonly onSelected: (value: T) => void;
  readonly icon?: string;
  readonly small?: boolean;
  /// أصغر من [small]: لشريط التطبيق العلوي (ارتفاع 28).
  readonly dense?: boolean;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// زر قائمة للإجراءات الثانوية في الشاشات التشغيلية.
export function ImdMenuButton<T>({
  label,
  items,
  onSelected,
  icon = 'menu',
  small = false,
  dense = false,
  className = '',
  colors,
}: ImdMenuButtonProps<T>) {
  useDensityRebuildTick();
  const c = resolveActiveColors(colors);
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const resolvedItems = typeof items === 'function' ? items() : items;

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const minHeight = dense ? 28 : small ? 34 : ImdSizes.touchMin;
  const padH = dense ? 9 : small ? 12 : 16;
  const padV = dense ? 3 : small ? 6 : 9;
  const fontSize = dense ? 12 : small ? 12.5 : 13.5;
  const iconSize = small || dense ? 13 : 15;
  const overlayShadows = imdShadowOverlay(c);

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`.trim()}>
      <ImdTap
        label={label}
        tooltip={label}
        radius={ImdSizes.radius}
        onTap={() => setOpen((v) => !v)}
      >
        <div
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center"
          style={{
            minHeight,
            padding: `${padV}px ${padH}px`,
            backgroundColor: c.surface.css,
            border: `1px solid ${c.lineStrong.css}`,
            borderRadius: ImdSizes.radius,
            cursor: ImdCursor.click,
          }}
        >
          <ImdIcon name={icon} size={iconSize} color={c.text} />
          <span
            style={{
              marginInlineStart: 6,
              marginInlineEnd: 4,
              fontSize,
              fontWeight: 600,
              color: c.text.css,
            }}
          >
            {label}
          </span>
          <ImdIcon name="chevron-down" size={13} color={c.muted} />
        </div>
      </ImdTap>

      {open && (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute z-50 mt-1 min-w-[180px] overflow-hidden"
          style={{
            insetInlineStart: 0,
            backgroundColor: c.surface.css,
            border: `1px solid ${c.popupLine.css}`,
            borderRadius: ImdSizes.radius,
            boxShadow:
              overlayShadows.length > 0
                ? overlayShadows.map((s) => s.css).join(', ')
                : undefined,
            paddingBlock: 4,
          }}
        >
          {resolvedItems.map((entry, idx) => {
            if (entry.divider) {
              return (
                <div
                  key={`div-${idx}`}
                  role="separator"
                  style={{
                    height: 1,
                    backgroundColor: c.line.css,
                    marginBlock: 4,
                  }}
                />
              );
            }
            const disabled = Boolean(entry.disabled);
            const isHover = hoveredIdx === idx && !disabled;
            const fg = entry.danger ? c.danger : disabled ? c.muted : c.text;
            return (
              <button
                key={`item-${idx}-${entry.label}`}
                type="button"
                role="menuitem"
                disabled={disabled}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
                onClick={() => {
                  if (disabled) return;
                  setOpen(false);
                  onSelected(entry.value);
                }}
                className="flex w-full items-center gap-2 text-start transition-colors"
                style={{
                  minHeight: ImdSizes.touchMin - 8,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: fg.css,
                  backgroundColor: isHover ? c.hover.css : 'transparent',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'default' : ImdCursor.click,
                  border: 'none',
                }}
              >
                {entry.icon && <ImdIcon name={entry.icon} size={14} color={fg} />}
                <span className="flex-1 truncate">{entry.label}</span>
                {entry.shortcut && (
                  <span
                    dir="ltr"
                    className="shrink-0"
                    style={{
                      marginInlineStart: 16,
                      fontSize: 11,
                      color: c.muted.css,
                    }}
                  >
                    {entry.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface ImdButtonProps {
  readonly label: string;
  readonly icon?: string | null;
  readonly onPressed?: (() => void) | null;
  readonly kind?: ImdBtnKind;
  readonly small?: boolean;
  readonly expand?: boolean;
  readonly busy?: boolean;
  readonly height?: number;
  /// اسم الزرّ لقارئ الشاشة حين لا نصّ فيه (زرّ أيقونة) — يُعلَّق على عقدة النقر
  /// نفسها لا على أبٍ لها، وإلا أُعلن زرٌّ بلا اسم (M-24، `labeledTapTargetGuideline`).
  readonly semanticLabel?: string | null;
  readonly tooltip?: string | null;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// زرّ النظام بأنواعه: أساسي، مُحاط، خطر، أزرق، تحذير، بنفسجي، داكن — وبمقاسٍ صغير.
export function ImdButton({
  label,
  icon,
  onPressed,
  kind = ImdBtnKind.primary,
  small = false,
  expand = false,
  busy = false,
  height,
  semanticLabel,
  tooltip,
  className = '',
  colors,
}: ImdButtonProps) {
  useDensityRebuildTick();
  const c = resolveActiveColors(colors);
  // داخل [ImdCompact] (نماذج السندات وجداول الإدخال) يأخذ الزرّ ارتفاع الحقل
  // المدمج وزواياه نفسها، فلا يعلو أخاه الحقل بجواره.
  const compact = useImdCompact();
  const flush = useImdCompactFlush();

  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);

  const enabled = Boolean(onPressed) && !busy;

  let bg: ImdColor;
  let fg: ImdColor;
  let border: ImdColor | undefined;

  switch (kind) {
    case ImdBtnKind.primary:
      bg = hover ? c.accentHover : c.accent;
      fg = c.onAccent;
      break;
    case ImdBtnKind.outline:
      bg = hover ? c.hover : c.surface;
      fg = c.text;
      border = hover ? c.lineHover : c.lineStrong;
      break;
    case ImdBtnKind.danger:
      bg = hover ? c.dangerHover : c.dangerSoft;
      fg = c.danger;
      break;
    case ImdBtnKind.blue:
      bg = c.info;
      fg = c.isDark ? c.bg : c.surface;
      break;
    case ImdBtnKind.warn:
      bg = hover ? c.warn.withValues({ alpha: 0.88 }) : c.warn;
      fg = c.isDark ? c.bg : c.surface;
      break;
    case ImdBtnKind.purple:
      bg = c.info;
      fg = c.isDark ? c.bg : c.surface;
      break;
    case ImdBtnKind.dark:
      bg = hover ? c.text2 : c.text;
      fg = c.onText;
      break;
  }

  const h = height ?? (compact ? ImdSizes.compactField : undefined);
  const iconOnly = label.length === 0;
  const fs = small || compact ? 12.5 : 13.5;
  const pad: CSSProperties = compact
    ? { paddingInline: iconOnly ? 0 : 10, paddingBlock: 0 }
    : small
      ? { paddingInline: 12, paddingBlock: 6 }
      : { paddingInline: 16, paddingBlock: 9 };

  const borderRadius = flush
    ? 0
    : compact
      ? ImdSizes.compactRadius
      : small
        ? 8
        : 10;

  const trimmedTooltip = tooltip?.trim() ?? '';
  const trimmedSemantic = semanticLabel?.trim() ?? '';

  const buttonBoxStyle: CSSProperties = {
    boxSizing: 'border-box',
    display: expand ? 'flex' : 'inline-flex',
    width: compact && iconOnly && h !== undefined ? h : expand ? '100%' : 'auto',
    height: h,
    minHeight: h === undefined ? ImdSizes.touchMin : undefined,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg.css,
    borderRadius,
    border: border && !flush ? `1px solid ${border.css}` : 'none',
    boxShadow:
      enabled && hover && !down && !flush
        ? `0 3px 8px ${c.shadowMd.css}`
        : undefined,
    transform: down ? 'scale(0.98)' : 'scale(1)',
    opacity: onPressed === null || onPressed === undefined ? 0.5 : 1,
    transition: 'transform 80ms ease, background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
    ...pad,
  };

  return (
    <ImdTap
      label={trimmedSemantic.length > 0 ? trimmedSemantic : undefined}
      tooltip={trimmedTooltip.length > 0 ? trimmedTooltip : undefined}
      disabled={!enabled}
      radius={borderRadius}
      cursor={enabled ? ImdCursor.click : 'default'}
      onHoverChange={(v) => setHover(v)}
      onTapDown={enabled ? () => setDown(true) : undefined}
      onTapUp={enabled ? () => setDown(false) : undefined}
      onTapCancel={() => setDown(false)}
      onTap={enabled ? onPressed ?? undefined : undefined}
      className={`${expand ? 'block w-full' : 'inline-block'} ${className}`.trim()}
    >
      <div style={buttonBoxStyle}>
        {busy ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={fs + 2}
            height={fs + 2}
            className="animate-spin shrink-0"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke={fg.css}
              strokeOpacity="0.25"
              strokeWidth="2.5"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke={fg.css}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        ) : icon ? (
          <ImdIcon name={icon} size={fs * 1.1} color={fg} />
        ) : null}

        {(busy || Boolean(icon)) && label.length > 0 && (
          <span style={{ width: 6, flexShrink: 0 }} />
        )}

        {label.length > 0 && (
          <span
            className="min-w-0 truncate"
            style={{
              fontSize: fs,
              fontWeight: 600,
              color: fg.css,
              lineHeight: 1.3,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </ImdTap>
  );
}

export type ImdButtonOutlineProps = Omit<ImdButtonProps, 'kind'>;

/// مكافئ `ImdButton.outline` من المصدر.
export function ImdButtonOutline(props: ImdButtonOutlineProps) {
  return <ImdButton {...props} kind={ImdBtnKind.outline} />;
}

export namespace ImdButton {
  export const Outline = ImdButtonOutline;
  export const outline = ImdButtonOutline;
}

export interface ImdIconButtonProps {
  readonly icon: string;
  readonly onPressed?: (() => void) | null;
  readonly tooltip?: string | null;
  readonly kind?: ImdBtnKind;
  /// ارتفاع 28 لشريط التطبيق العلوي.
  readonly dense?: boolean;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// أزرار أيقونة فقط بإطار (`btn btn-o btn-sm` بأيقونة).
export function ImdIconButton({
  icon,
  onPressed,
  tooltip,
  kind = ImdBtnKind.outline,
  dense = false,
  className = '',
  colors,
}: ImdIconButtonProps) {
  const hint = tooltip?.trim() ?? '';
  const hasHint = hint.length > 0;
  return (
    <ImdButton
      label=""
      icon={icon}
      onPressed={onPressed}
      kind={kind}
      small={true}
      height={dense ? 28 : undefined}
      semanticLabel={hasHint ? hint : null}
      tooltip={hasHint ? hint : null}
      className={className}
      colors={colors}
    />
  );
}
