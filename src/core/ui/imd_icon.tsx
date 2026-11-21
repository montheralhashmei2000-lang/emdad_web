import type { CSSProperties, ReactNode } from 'react';
import { kImdEmojiIcons, kImdIconBodies } from './imd_icon_data';
import { ImdStyle } from './imd_style';
import { ImdColor, ImdColors } from './imd_tokens';

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

function resolveColorValue(color?: ImdColor | string | null): string | undefined {
  if (color === undefined || color === null) return undefined;
  return color instanceof ImdColor ? color.css : color;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ImdIconProps {
  readonly name: string;
  readonly size?: number;
  readonly color?: ImdColor | string | null;
  readonly strokeWidth?: number;
  readonly tooltip?: string;
  readonly className?: string;
}

/// أيقونة من مكتبة النظام: مسار SVG بخط 2 داخل `viewBox 24`، بلون النص الحالي.
export function ImdIcon({
  name,
  size,
  color,
  strokeWidth = 2,
  tooltip,
  className = '',
}: ImdIconProps) {
  const s = size ?? '1.15em';
  const resolvedColor = resolveColorValue(color);
  const body = ImdIcon.body(name).replaceAll('#000', 'currentColor');
  const trimmedTip = tooltip?.trim();
  const hasTip = Boolean(trimmedTip && trimmedTip.length > 0);

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={s}
      height={s}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      color={resolvedColor}
      role={hasTip ? 'img' : undefined}
      aria-label={hasTip ? trimmedTip : undefined}
      aria-hidden={hasTip ? undefined : true}
      className={`inline-block shrink-0 align-middle ${className}`.trim()}
      // المحتوى من الثوابت المُضمَّنة فقط (kImdIconBodies / ImdIcon.extra).
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );

  if (!hasTip) return svgElement;

  return (
    <span title={trimmedTip} className="inline-flex shrink-0 items-center justify-center">
      {svgElement}
    </span>
  );
}

export namespace ImdIcon {
  /// أيقونات تُضاف هنا يدويًا لأن `imd_icon_data.ts` مولَّد فلا يُعدَّل.
  export const extra: Readonly<Record<string, string>> = {
    'log-in':
      '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
    'log-out':
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    // كانت تُرسم نقطةً بديلة لأنها غير موجودة في الجدول المولَّد.
    'key':
      '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    'copy':
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'qr-code':
      '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    'list':
      '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    'mail':
      '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    'fingerprint':
      '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    'archive':
      '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  };

  const _cache = new Map<string, string>();

  export function body(name: string): string {
    return kImdIconBodies[name] ?? extra[name] ?? kImdIconBodies['dot'] ?? '';
  }

  /// النغمة اللونية المرافقة للرموز التعبيرية (`ic-success` …).
  export function toneColor(c: ImdColors, tone?: string | null): ImdColor | null;
  export function toneColor(tone?: string | null): ImdColor | null;
  export function toneColor(
    cOrTone?: ImdColors | string | null,
    maybeTone?: string | null,
  ): ImdColor | null {
    const c = cOrTone instanceof ImdColors ? cOrTone : resolveActiveColors();
    const tone = cOrTone instanceof ImdColors ? maybeTone : cOrTone;
    switch (tone) {
      case 'success':
        return c.success;
      case 'danger':
        return c.danger;
      case 'warn':
        return c.warn;
      case 'accent':
        return c.accent;
    }
    return null;
  }

  export function svg(name: string, stroke = 2): string {
    const key = `${name}@${stroke}`;
    const cached = _cache.get(key);
    if (cached !== undefined) return cached;
    const svgBody = body(name);
    const out =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
      `stroke="#000" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${svgBody}</svg>`;
    _cache.set(key, out);
    return out;
  }
}

export interface ImdEmojiTextProps {
  readonly text: string;
  readonly style?: CSSProperties;
  readonly className?: string;
  readonly gap?: number;
  readonly iconSize?: number;
  readonly textAlign?: CSSProperties['textAlign'];
  readonly maxLines?: number;
  readonly overflow?: 'ellipsis' | 'clip' | 'visible';
  readonly colors?: ImdColors;
}

const _emojiPattern = (() => {
  const keys = Object.keys(kImdEmojiIcons).sort((a, b) => b.length - a.length);
  return `(${keys.map(escapeRegExp).join('|')})\uFE0F?\\s?`;
})();

/// نصٌّ قد يبدأ برمزٍ تعبيري ⇒ يُستبدل الرمز بأيقونة النظام المقابلة ويُعرض
/// قبل النص، فتتوحّد الرموز في الواجهة بدل أن تتبع خطّ نظام التشغيل.
export function ImdEmojiText({
  text,
  style,
  className = '',
  gap = 6,
  iconSize,
  textAlign,
  maxLines,
  overflow,
  colors,
}: ImdEmojiTextProps) {
  const activeColors = resolveActiveColors(colors);
  const re = new RegExp(_emojiPattern, 'g');
  const nodes: ReactNode[] = [];
  let last = 0;
  let idx = 0;

  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) {
      nodes.push(text.slice(last, start));
    }
    const key = m[1];
    const def = kImdEmojiIcons[key];
    if (def) {
      const toneColor = def.length > 1 ? ImdIcon.toneColor(activeColors, def[1]) : null;
      nodes.push(
        <span
          key={`ic-${idx++}`}
          className="inline-flex items-center align-middle"
          style={gap !== 0 ? { marginInlineEnd: gap } : undefined}
        >
          <ImdIcon name={def[0]} size={iconSize} color={toneColor} />
        </span>,
      );
    }
    last = start + m[0].length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  const clampClass =
    maxLines === 1 && overflow === 'ellipsis'
      ? 'block truncate'
      : maxLines && maxLines > 1
        ? 'overflow-hidden'
        : '';

  const mergedStyle: CSSProperties | undefined =
    style || textAlign || (maxLines && maxLines > 1)
      ? {
          ...style,
          ...(textAlign ? { textAlign } : undefined),
          ...(maxLines && maxLines > 1
            ? {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical' as const,
                textOverflow: overflow === 'ellipsis' ? 'ellipsis' : undefined,
              }
            : undefined),
        }
      : undefined;

  return (
    <span className={`${clampClass} ${className}`.trim()} style={mergedStyle}>
      {nodes}
    </span>
  );
}
