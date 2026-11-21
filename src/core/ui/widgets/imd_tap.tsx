import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { ImdStyle } from '../imd_style';
import { ImdColors, ImdCursor, ImdSizes } from '../imd_tokens';

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

export interface ImdTapPointDetails {
  readonly globalPosition: { readonly dx: number; readonly dy: number };
}

export interface ImdTapProps {
  readonly children?: ReactNode;
  readonly onTap?: (() => void) | null;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly tooltip?: string;
  readonly selected?: boolean;
  readonly focusable?: boolean;
  readonly radius?: number;
  readonly minTouchSize?: boolean;
  readonly cursor?: string;
  readonly className?: string;
  readonly colors?: ImdColors;
  readonly onHoverChange?: (hovered: boolean) => void;
  readonly onTapDown?: (details: ImdTapPointDetails) => void;
  readonly onTapUp?: (details: ImdTapPointDetails) => void;
  readonly onTapCancel?: () => void;
  readonly onSecondaryTapDown?: (details: ImdTapPointDetails) => void;
  readonly onTertiaryTapUp?: (details: ImdTapPointDetails) => void;
  readonly onLongPressStart?: (details: ImdTapPointDetails) => void;
}

/// سطحٌ قابل للنقر **يصل إليه لوحُ المفاتيح وقارئُ الشاشة** (M-24).
///
/// • عقدة دلالة (`role="button"`) يندمج فيها نصّ ما بداخله، و[label] إن لزم اسمٌ أوضح.
/// • تركيزٌ بلوح المفاتيح مع إطارٍ ظاهر حوله، وتفعيلٌ بـ Enter/المسافة.
/// • مؤشر الفأرة يتبع [ImdCursor.click] عند التفعيل، مع دعم حالات التمرير والتعطيل والتلميحات.
///
/// [focusable] = `false` للأسطح التي تملك تنقّلها بلوح المفاتيح أصلًا (قوائم
/// المنتقيات بالأسهم)، فلا يُضاف إليها توقّفٌ زائد عند Tab.
export function ImdTap({
  children,
  onTap,
  disabled = false,
  label,
  tooltip,
  selected,
  focusable = true,
  radius = 8,
  minTouchSize = false,
  cursor,
  className = '',
  colors,
  onHoverChange,
  onTapDown,
  onTapUp,
  onTapCancel,
  onSecondaryTapDown,
  onTertiaryTapUp,
  onLongPressStart,
}: ImdTapProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef(false);

  const enabled = Boolean(onTap) && !disabled;
  const activeColors = resolveActiveColors(colors);
  const trimmedTooltip = tooltip?.trim();
  const hasTooltip = Boolean(trimmedTooltip && trimmedTooltip.length > 0);
  const ariaLabel = label?.trim() ? label : hasTooltip ? trimmedTooltip : undefined;

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearLongPress, [clearLongPress]);

  const pointDetails = (e: MouseEvent<HTMLElement>): ImdTapPointDetails => ({
    globalPosition: { dx: e.clientX, dy: e.clientY },
  });

  const handleMouseEnter = () => {
    setHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    onHoverChange?.(false);
    clearLongPress();
    if (pointerDownRef.current) {
      pointerDownRef.current = false;
      onTapCancel?.();
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (e.button === 2 && onSecondaryTapDown) {
      onSecondaryTapDown(pointDetails(e));
      return;
    }
    if (!enabled || e.button !== 0) return;
    pointerDownRef.current = true;
    const details = pointDetails(e);
    onTapDown?.(details);
    if (onLongPressStart) {
      clearLongPress();
      longPressTimerRef.current = setTimeout(() => {
        onLongPressStart(details);
      }, 500);
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLElement>) => {
    clearLongPress();
    if (e.button === 1 && onTertiaryTapUp) {
      e.preventDefault();
      e.stopPropagation();
      onTertiaryTapUp(pointDetails(e));
      return;
    }
    if (!enabled || e.button !== 0) return;
    if (pointerDownRef.current) {
      pointerDownRef.current = false;
      onTapUp?.(pointDetails(e));
    }
  };

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    e.stopPropagation();
    onTap?.();
  };

  const handleContextMenu = (e: MouseEvent<HTMLElement>) => {
    if (!onSecondaryTapDown) return;
    e.preventDefault();
    e.stopPropagation();
    onSecondaryTapDown(pointDetails(e));
  };

  const handleAuxClick = (e: MouseEvent<HTMLElement>) => {
    if (e.button !== 1 || !onTertiaryTapUp) return;
    e.preventDefault();
    e.stopPropagation();
    onTertiaryTapUp(pointDetails(e));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!enabled || !focusable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onTap?.();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (!focusable || !enabled) return;
    try {
      setFocused(e.currentTarget.matches(':focus-visible'));
    } catch {
      setFocused(true);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    clearLongPress();
    if (pointerDownRef.current) {
      pointerDownRef.current = false;
      onTapCancel?.();
    }
  };

  const resolvedCursor = enabled ? (cursor ?? ImdCursor.click) : ImdCursor.click;

  return (
    <div
      role="button"
      tabIndex={focusable && enabled ? 0 : -1}
      title={hasTooltip ? trimmedTooltip : undefined}
      aria-label={ariaLabel}
      aria-disabled={!enabled}
      aria-pressed={selected !== undefined ? selected : undefined}
      data-hovered={hovered ? 'true' : undefined}
      data-focused={focused ? 'true' : undefined}
      data-disabled={!enabled ? 'true' : undefined}
      data-selected={selected ? 'true' : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onAuxClick={handleAuxClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`outline-none select-none ${className}`.trim()}
      style={{
        cursor: resolvedCursor,
        borderRadius: radius,
        ...(minTouchSize
          ? { minWidth: ImdSizes.touchMin, minHeight: ImdSizes.touchMin }
          : undefined),
        ...(focused
          ? { boxShadow: `inset 0 0 0 2px ${activeColors.accent.css}` }
          : undefined),
      }}
    >
      {children}
    </div>
  );
}
