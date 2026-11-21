import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createRoot } from 'react-dom/client';
import { ImdIcon } from './imd_icon';
import { ImdStyle } from './imd_style';
import { ImdColors, imdShadowOverlay, ImdSizes } from './imd_tokens';

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

function isRtlDocument(): boolean {
  if (typeof document === 'undefined') return true;
  const dir = document.documentElement.dir || document.body?.dir;
  return dir ? dir.toLowerCase() === 'rtl' : true;
}

/// بندٌ في قائمة السياق (كليك يمين على سطح المكتب، وضغطةٌ مطوّلة على اللمس).
export interface ImdMenuItem {
  readonly label: string;
  readonly onTap: () => void;
  /// اسم أيقونة من [ImdIcon].
  readonly icon?: string | null;
  /// بندٌ هدّام (حذف) — يُلوَّن بلون الخطر ويُفصل عمّا قبله.
  readonly danger?: boolean;
  readonly enabled?: boolean;
  /// نصٌّ يُعرض في طرف البند (مثل `Ctrl+S`) — للعلم فقط، لا يربط اختصارًا.
  readonly shortcut?: string | null;
}

export interface ImdMenuOffset {
  readonly dx: number;
  readonly dy: number;
}

export interface ImdContextMenuProps {
  readonly position: ImdMenuOffset;
  readonly items: readonly ImdMenuItem[];
  readonly onClose: () => void;
  readonly colors?: ImdColors;
}

/// حساب إحداثيات القائمة المنبثقة داخل حدود الشاشة (خاصة الحافة اليسرى والسفلية في RTL).
export function computeImdContextMenuPosition({
  position,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  rtl = true,
  margin = 8,
}: {
  position: ImdMenuOffset;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  rtl?: boolean;
  margin?: number;
}): { readonly left: number; readonly top: number } {
  const maxLeft = Math.max(margin, viewportWidth - menuWidth - margin);
  const maxTop = Math.max(margin, viewportHeight - menuHeight - margin);

  let left: number;
  if (rtl) {
    // في RTL: تفتح القائمة عادةً متمددةً إلى اليسار من نقطة النقر (dx - menuWidth)،
    // وإذا قاربت الحافة اليسرى تُقلب أو تُقيد داخل [margin, maxLeft] فلا تخرج عن الشاشة.
    const rtlLeft = position.dx - menuWidth;
    left = rtlLeft >= margin ? Math.min(rtlLeft, maxLeft) : Math.min(Math.max(position.dx, margin), maxLeft);
  } else {
    left =
      position.dx + menuWidth <= viewportWidth - margin
        ? Math.max(margin, position.dx)
        : Math.max(margin, Math.min(position.dx - menuWidth, maxLeft));
  }

  let top: number;
  if (position.dy + menuHeight <= viewportHeight - margin) {
    top = Math.max(margin, position.dy);
  } else if (position.dy - menuHeight >= margin) {
    top = position.dy - menuHeight;
  } else {
    top = maxTop;
  }

  return {
    left: Math.max(margin, Math.min(left, maxLeft)),
    top: Math.max(margin, Math.min(top, maxTop)),
  };
}

export function ImdContextMenu({
  position,
  items,
  onClose,
  colors,
}: ImdContextMenuProps) {
  const c = resolveActiveColors(colors);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rtl = isRtlDocument();

  const [coords, setCoords] = useState<{ left: number; top: number }>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    return computeImdContextMenuPosition({
      position,
      menuWidth: 200,
      menuHeight: items.length * 36 + 8,
      viewportWidth: vw,
      viewportHeight: vh,
      rtl,
    });
  });

  const enabledIndices = useMemo(
    () =>
      items
        .map((item, idx) => (item.enabled !== false ? idx : -1))
        .filter((idx) => idx >= 0),
    [items],
  );

  const [activeIdx, setActiveIdx] = useState<number>(
    enabledIndices.length > 0 ? enabledIndices[0] : -1,
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setCoords(
      computeImdContextMenuPosition({
        position,
        menuWidth: rect.width || 200,
        menuHeight: rect.height || items.length * 36 + 8,
        viewportWidth: vw,
        viewportHeight: vh,
        rtl,
      }),
    );
  }, [position, items.length, rtl]);

  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handleBlurOrResize = () => onClose();

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKey, true);
    window.addEventListener('resize', handleBlurOrResize);
    window.addEventListener('blur', handleBlurOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('resize', handleBlurOrResize);
      window.removeEventListener('blur', handleBlurOrResize);
    };
  }, [onClose]);

  const moveFocus = useCallback(
    (delta: number) => {
      if (enabledIndices.length === 0) return;
      const curPos = enabledIndices.indexOf(activeIdx);
      const nextPos =
        curPos < 0
          ? 0
          : (curPos + delta + enabledIndices.length) % enabledIndices.length;
      setActiveIdx(enabledIndices[nextPos]);
    },
    [activeIdx, enabledIndices],
  );

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === 'Home' && enabledIndices.length > 0) {
      e.preventDefault();
      setActiveIdx(enabledIndices[0]);
    } else if (e.key === 'End' && enabledIndices.length > 0) {
      e.preventDefault();
      setActiveIdx(enabledIndices[enabledIndices.length - 1]);
    } else if ((e.key === 'Enter' || e.key === ' ') && activeIdx >= 0) {
      e.preventDefault();
      const picked = items[activeIdx];
      if (picked && picked.enabled !== false) {
        onClose();
        picked.onTap();
      }
    } else if (e.key === 'Tab') {
      onClose();
    }
  };

  if (items.length === 0) return null;

  const shadows = imdShadowOverlay(c);
  const shadowCss =
    shadows.length > 0
      ? shadows.map((s) => s.css).join(', ')
      : `0 6px 18px ${c.shadowPopup.css}`;
  const radius = Math.min(ImdSizes.radius, 8);

  return (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      dir={rtl ? 'rtl' : 'ltr'}
      onKeyDown={handleKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 min-w-[180px] py-1 outline-none"
      style={{
        left: coords.left,
        top: coords.top,
        backgroundColor: c.surface.css,
        border: `1px solid ${c.line.css}`,
        borderRadius: radius,
        boxShadow: shadowCss,
      }}
    >
      {items.map((item, i) => {
        const enabled = item.enabled !== false;
        const danger = Boolean(item.danger);
        const showDivider = danger && i > 0 && !items[i - 1].danger;
        const color = !enabled ? c.muted : danger ? c.danger : c.text;
        const isHighlighted = enabled && (hoveredIdx === i || activeIdx === i);

        return (
          <div key={i}>
            {showDivider && (
              <div
                role="separator"
                className="my-1 h-px w-full"
                style={{ backgroundColor: c.line.css }}
              />
            )}
            <button
              type="button"
              role="menuitem"
              disabled={!enabled}
              aria-disabled={!enabled}
              onMouseEnter={() => {
                setHoveredIdx(i);
                if (enabled) setActiveIdx(i);
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => {
                if (!enabled) return;
                onClose();
                item.onTap();
              }}
              className="flex min-h-[36px] w-full items-center border-0 bg-transparent text-start outline-none transition-colors duration-100"
              style={{
                paddingLeft: ImdSizes.compactPadH + 4,
                paddingRight: ImdSizes.compactPadH + 4,
                backgroundColor: isHighlighted ? c.hover.css : 'transparent',
                cursor: 'default',
              }}
            >
              {item.icon !== undefined && item.icon !== null && (
                <span
                  className="inline-flex shrink-0 items-center"
                  style={{ marginInlineEnd: 10 }}
                >
                  <ImdIcon name={item.icon} size={15} color={color} />
                </span>
              )}
              <span
                className="min-w-0 flex-1 truncate text-[13px]"
                style={{ color: color.css }}
              >
                {item.label}
              </span>
              {item.shortcut !== undefined && item.shortcut !== null && (
                <span
                  dir="ltr"
                  className="shrink-0 text-[11.5px]"
                  style={{
                    color: c.muted.css,
                    marginInlineStart: 24,
                  }}
                >
                  {item.shortcut}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

let activeDismiss: (() => void) | null = null;

/// يفتح قائمة سياقٍ عند [position] (إحداثيات الشاشة) ويُنفّذ البند المختار.
///
/// القائمة بلا بنودٍ لا تُفتح. تُلوَّن من [ImdColors] فتتبع السمة، وتأخذ
/// شكل قوائم ويندوز: صفوفٌ كثيفة، وفاصلٌ قبل البند الهدّام.
export function showImdContextMenu(
  position: ImdMenuOffset,
  items: readonly ImdMenuItem[],
  options: { colors?: ImdColors } = {},
): Promise<void> {
  if (items.length === 0 || typeof document === 'undefined') {
    return Promise.resolve();
  }

  activeDismiss?.();

  return new Promise<void>((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    let closed = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (activeDismiss === cleanup) activeDismiss = null;
      queueMicrotask(() => {
        root.unmount();
        host.remove();
      });
      resolve();
    };

    activeDismiss = cleanup;
    root.render(
      <ImdContextMenu
        position={position}
        items={items}
        onClose={cleanup}
        colors={options.colors}
      />,
    );
  });
}
