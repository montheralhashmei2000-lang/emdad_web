import { useState, type ReactNode } from 'react';
import { ImdEmojiText, ImdIcon } from '../imd_icon';
import { ImdStyle } from '../imd_style';
import { ImdColor, ImdColors } from '../imd_tokens';
import { ImdTap } from './imd_tap';

export enum ImdTone {
  ok = 'ok',
  off = 'off',
  pend = 'pend',
  code = 'code',
  err = 'err',
  info = 'info',
}

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

export interface ImdChipProps {
  readonly label: string;
  readonly tone?: ImdTone;
  readonly icon?: string | null;
  readonly onTap?: (() => void) | null;
  /// الخلفية = لون النص بشفافية 0.15 بدل لون `*Soft` من القالب.
  /// تضمن تطابق الخلفية مع النص في أي سمة (فاتحة أو داكنة أو وقود).
  readonly deriveBackgroundFromText?: boolean;
  readonly tooltip?: string;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// شارة حالة: نصٌّ قصير بخلفيةٍ ولونٍ يحدّدهما [ImdTone].
export function ImdChip({
  label,
  tone = ImdTone.off,
  icon = null,
  onTap = null,
  deriveBackgroundFromText = false,
  tooltip,
  className = '',
  colors,
}: ImdChipProps) {
  const [hover, setHover] = useState(false);
  const c = resolveActiveColors(colors);
  const [soft, fg] = ImdChip.colors(c, tone);
  const bg = deriveBackgroundFromText ? fg.withValues({ alpha: 0.15 }) : soft;
  const hoverBg =
    onTap && hover ? ImdColor.alphaBlend(fg.withValues({ alpha: 0.1 }), bg) : bg;

  const chip = (
    <div
      data-tone={tone}
      className={`inline-flex w-fit max-w-full min-w-0 items-center overflow-hidden rounded-full px-[10px] py-[3px] transition-colors duration-150 ${className}`.trim()}
      style={{ backgroundColor: hoverBg.css }}
    >
      {icon !== null && (
        <span className="inline-flex shrink-0 items-center" style={{ marginInlineEnd: 6 }}>
          <ImdIcon name={icon} size={13} color={fg} />
        </span>
      )}
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        <ImdEmojiText
          text={label}
          iconSize={13}
          gap={4}
          maxLines={1}
          overflow="ellipsis"
          colors={c}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: fg.css,
            lineHeight: 1.6,
          }}
        />
      </span>
    </div>
  );

  if (!onTap) return chip;

  return (
    <ImdTap
      onTap={onTap}
      onHoverChange={setHover}
      tooltip={tooltip}
      radius={999}
      colors={c}
      className="inline-flex w-fit max-w-full min-w-0"
    >
      {chip}
    </ImdTap>
  );
}

export namespace ImdChip {
  export function colors(c: ImdColors, tone: ImdTone): readonly [ImdColor, ImdColor] {
    switch (tone) {
      case ImdTone.ok:
        return [c.successSoft, c.success];
      case ImdTone.off:
        return [c.subtle, c.text2];
      case ImdTone.pend:
        return [c.warnSoft, c.warn];
      case ImdTone.code:
      case ImdTone.info:
        return [c.infoSoft, c.info];
      case ImdTone.err:
        return [c.dangerSoft, c.danger];
    }
  }
}

/// اسمٌ بديل لـ[ImdChip] لعرض الحالات: `ImdTone.pend` «لم يُضبط بعد» برتقالي،
/// `ok` «مضبوط» أخضر، `off` «قيد الانتظار» رمادي، `err` أحمر، `info` أزرق.
export const StatusBadge = ImdChip;
export type StatusBadgeProps = ImdChipProps;

export interface ImdNoteProps {
  readonly text?: string | null;
  readonly children?: ReactNode;
  readonly margin?: string;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// صندوق ملاحظة أصفر.
export function ImdNote({
  text = null,
  children,
  margin,
  className = '',
  colors,
}: ImdNoteProps) {
  const c = resolveActiveColors(colors);
  return (
    <div
      className={`min-w-0 max-w-full rounded-[12px] border px-3 py-[10px] ${className}`.trim()}
      style={{
        backgroundColor: c.noteBg.css,
        borderColor: c.noteBorder.css,
        margin: margin ?? 0,
      }}
    >
      {children ?? (
        <ImdEmojiText
          text={text ?? ''}
          colors={c}
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: c.noteText.css,
            lineHeight: 1.6,
          }}
        />
      )}
    </div>
  );
}

export interface ImdAlertProps {
  readonly text: string;
  readonly tone?: ImdTone;
  readonly margin?: string;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// شريط تنبيه: خطأ أو تحذير أو نجاح أو معلومة، بنبرة [ImdTone].
export function ImdAlert({
  text,
  tone = ImdTone.err,
  margin,
  className = '',
  colors,
}: ImdAlertProps) {
  const c = resolveActiveColors(colors);
  const [bg, fg] = ImdChip.colors(c, tone);
  return (
    <div
      data-tone={tone}
      className={`min-w-0 max-w-full rounded-[10px] px-3 py-[10px] ${margin ? '' : 'mb-3'} ${className}`.trim()}
      style={{
        backgroundColor: bg.css,
        ...(margin ? { margin } : undefined),
      }}
    >
      <ImdEmojiText
        text={text}
        colors={c}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: fg.css,
          lineHeight: 1.6,
        }}
      />
    </div>
  );
}
