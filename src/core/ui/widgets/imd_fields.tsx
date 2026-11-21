import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLInputTypeAttribute,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { ImdDensity } from '../imd_density';
import { ImdIcon } from '../imd_icon';
import { ImdPageDirty, useImdPageDirtyFlag } from '../imd_page_dirty';
import { ImdStyle } from '../imd_style';
import { ImdColor, ImdColors, ImdCursor, ImdSizes } from '../imd_tokens';

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

export interface ImdCompactValue {
  readonly on: boolean;
  readonly flush: boolean;
}

export const ImdCompactContext = createContext<ImdCompactValue>({
  on: false,
  flush: false,
});

export interface ImdCompactProps {
  readonly on?: boolean;
  readonly flush?: boolean;
  readonly children?: ReactNode;
}

/// زخرفة حقول الإدخال الموحّدة.
/// وسمٌ يُعلن أن ما تحته نمطٌ مدمج.
///
/// **تُكتب مرةً حول الجدول فتتبعها حقوله كلها** — بديلًا عن تمرير `compact:`
/// إلى كل حقلٍ في خمس شاشات، وهو ما يُنسى في أوّل حقلٍ يُضاف بعده.
export function ImdCompact({ on = true, flush = false, children }: ImdCompactProps) {
  return (
    <ImdCompactContext.Provider value={{ on, flush }}>
      {children}
    </ImdCompactContext.Provider>
  );
}

export function useImdCompact(): boolean {
  return useContext(ImdCompactContext).on;
}

export function useImdCompactFlush(): boolean {
  const ctx = useContext(ImdCompactContext);
  return ctx.on && ctx.flush;
}

export namespace ImdCompact {
  export const Context = ImdCompactContext;

  export function of(): boolean {
    return useImdCompact();
  }

  export function flushOf(): boolean {
    return useImdCompactFlush();
  }
}

export interface ImdFieldDecorationOptions {
  readonly hint?: string;
  readonly prefixIcon?: string;
  readonly suffix?: ReactNode;
  readonly dense?: boolean;
  readonly readOnly?: boolean;
  readonly errorText?: string | null;
  readonly compact?: boolean;
  readonly flush?: boolean;
  readonly colors?: ImdColors;
}

export interface ImdFieldDecorationResult {
  readonly colors: ImdColors;
  readonly compact: boolean;
  readonly flush: boolean;
  readonly dense: boolean;
  readonly readOnly: boolean;
  readonly hasError: boolean;
  readonly errorText: string | null;
  readonly hint?: string;
  readonly fillColor: string;
  readonly errorColor: string;
  readonly borderColor: string;
  readonly focusedBorderColor: string;
  readonly errorBorderColor: string;
  readonly borderRadius: number;
  readonly paddingVertical: number;
  readonly paddingHorizontal: number;
  readonly hintFontSize: number;
  readonly textFontSize: number;
  readonly minHeight?: number;
  readonly fixedHeight?: number;
  readonly prefixIcon?: string;
  readonly suffix?: ReactNode;
  readonly containerStyle: (focused: boolean) => CSSProperties;
  readonly inputStyle: CSSProperties;
  readonly errorStyle: CSSProperties;
}

/// زخرفة حقول الإدخال الموحّدة — توحّد الألوان والحشوة والارتفاع والحدود عبر الحقول والمنتقيات.
export function imdFieldDecoration(
  options: ImdFieldDecorationOptions = {},
): ImdFieldDecorationResult {
  const ctxCompact = useContext(ImdCompactContext);
  const c = resolveActiveColors(options.colors);
  const compact = options.compact ?? ctxCompact.on;
  const flush = options.flush ?? (compact && ctxCompact.flush);
  const dense = options.dense ?? false;
  const readOnly = options.readOnly ?? false;
  const rawError = options.errorText ?? null;
  const hasError = rawError !== null && rawError.length > 0;
  // رسالة الخطأ من `colorScheme.error` (`c.danger`)، وحدّ الحقل يوافقها فلا يختلف لونان.
  const errColor = c.danger;
  const borderRadius = flush ? 0 : compact ? ImdSizes.compactRadius : 10;
  const paddingHorizontal = compact ? ImdSizes.compactPadH : 12;
  const paddingVertical = compact ? ImdSizes.compactPadV : dense ? 8 : 12;
  const hintFontSize = compact ? 12.5 : 14;
  const textFontSize = compact ? 13 : 14;
  const fixedHeight = compact ? ImdSizes.compactField : undefined;
  const minHeight = compact ? ImdSizes.compactField : dense ? undefined : ImdSizes.touchMin;
  const fillColor = readOnly ? c.bg.css : c.surface.css;
  const borderColor = flush ? 'transparent' : c.lineStrong.css;
  const focusedBorderColor = c.accent.css;
  const errorBorderColor = errColor.css;

  const containerStyle = (focused: boolean): CSSProperties => {
    const activeBorder = hasError
      ? errorBorderColor
      : focused
        ? focusedBorderColor
        : borderColor;
    const showBorder = hasError || focused || !flush;
    return {
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      minHeight,
      height: fixedHeight,
      backgroundColor: fillColor,
      borderRadius,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: showBorder ? activeBorder : 'transparent',
      paddingInline: paddingHorizontal,
      paddingBlock: compact ? 0 : paddingVertical,
      transition: 'border-color 120ms ease, background-color 120ms ease',
    };
  };

  const inputStyle: CSSProperties = {
    fontSize: textFontSize,
    lineHeight: 1.4,
    color: readOnly ? c.muted.css : c.text.css,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    minWidth: 0,
    padding: 0,
    margin: 0,
  };

  const errorStyle: CSSProperties = {
    fontSize: 12,
    lineHeight: 1.4,
    color: errColor.css,
  };

  return {
    colors: c,
    compact,
    flush,
    dense,
    readOnly,
    hasError,
    errorText: hasError ? rawError : null,
    hint: options.hint,
    fillColor,
    errorColor: errColor.css,
    borderColor,
    focusedBorderColor,
    errorBorderColor,
    borderRadius,
    paddingVertical,
    paddingHorizontal,
    hintFontSize,
    textFontSize,
    minHeight,
    fixedHeight,
    prefixIcon: options.prefixIcon,
    suffix: options.suffix,
    containerStyle,
    inputStyle,
    errorStyle,
  };
}

export interface ImdFieldController {
  readonly value: string;
  readonly setValue?: (value: string) => void;
}

export interface ImdFieldProps {
  readonly label: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly controller?: ImdFieldController;
  readonly hint?: string;
  /// رسالة خطأ تظهر تحت الحقل بلون `c.danger`.
  readonly errorText?: string | null;
  /// عنصر عند نهاية الحقل (يسار الحقل في RTL). لا يُطبَّق مع [child]/[children] المخصص.
  readonly suffix?: ReactNode;
  readonly child?: ReactNode;
  readonly children?: ReactNode;
  readonly required?: boolean;
  readonly readOnly?: boolean;
  readonly keyboardType?: HTMLInputTypeAttribute;
  readonly onChanged?: (value: string) => void;
  readonly maxLines?: number;
  readonly obscure?: boolean;
  readonly inputFormatters?: readonly ((value: string) => string)[];
  readonly textAlign?: 'start' | 'end' | 'center' | 'left' | 'right';
  readonly onSubmitted?: (value: string) => void;
  readonly prefixIcon?: string;
  readonly autofocus?: boolean;
  readonly inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  readonly id?: string;
  readonly name?: string;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// عنوان فوق الحقل (13/600) ثم الحقل.
export function ImdField({
  label,
  value,
  defaultValue,
  controller,
  hint,
  errorText,
  suffix,
  child,
  children,
  required = false,
  readOnly = false,
  keyboardType = 'text',
  onChanged,
  maxLines = 1,
  obscure = false,
  inputFormatters,
  textAlign = 'start',
  onSubmitted,
  prefixIcon,
  autofocus = false,
  inputRef,
  id,
  name,
  className = '',
  colors,
}: ImdFieldProps) {
  useDensityRebuildTick();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [focused, setFocused] = useState(false);

  const deco = imdFieldDecoration({
    hint,
    readOnly,
    prefixIcon,
    suffix,
    errorText,
    colors,
  });
  const c = deco.colors;
  const customChild = child ?? children;

  const controlledValue = value ?? controller?.value;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const currentValue = controlledValue !== undefined ? controlledValue : uncontrolled;

  const handleValueChange = (raw: string) => {
    let next = raw;
    if (inputFormatters && inputFormatters.length > 0) {
      for (const fmt of inputFormatters) {
        next = fmt(next);
      }
    }
    if (controlledValue === undefined) {
      setUncontrolled(next);
    }
    controller?.setValue?.(next);
    onChanged?.(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmitted) {
      onSubmitted(currentValue);
    }
  };

  const containerCss = deco.containerStyle(focused);
  const inputCss: CSSProperties = {
    ...deco.inputStyle,
    fontSize: 14,
    color: readOnly ? c.muted.css : c.text.css,
    textAlign,
  };

  return (
    <div className={`flex flex-col items-stretch ${className}`.trim()} style={{ paddingBottom: 13 }}>
      {label.length > 0 && (
        <label
          htmlFor={customChild ? undefined : fieldId}
          style={{
            paddingBottom: 6,
            fontSize: 13,
            fontWeight: 600,
            color: c.text2.css,
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: c.danger.css }}> *</span>}
        </label>
      )}

      {customChild ?? (
        <div
          className="imd-field-box"
          style={{
            ...containerCss,
            ...(maxLines > 1 ? { alignItems: 'flex-start', height: undefined } : undefined),
          }}
        >
          {prefixIcon && (
            <span
              className="inline-flex shrink-0 items-center leading-none"
              style={{ marginInlineStart: 0, marginInlineEnd: 8 }}
            >
              <ImdIcon name={prefixIcon} size={16} color={c.faint} />
            </span>
          )}
          {maxLines > 1 ? (
            <textarea
              ref={inputRef as Ref<HTMLTextAreaElement>}
              id={fieldId}
              name={name}
              rows={maxLines}
              value={currentValue}
              placeholder={hint}
              readOnly={readOnly}
              autoFocus={autofocus}
              aria-invalid={deco.hasError || undefined}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => handleValueChange(e.target.value)}
              className="resize-y bg-transparent placeholder:text-[color:var(--imd-faint)]"
              style={inputCss}
            />
          ) : (
            <input
              ref={inputRef as Ref<HTMLInputElement>}
              id={fieldId}
              name={name}
              type={obscure ? 'password' : keyboardType}
              dir={obscure ? 'ltr' : undefined}
              value={currentValue}
              placeholder={hint}
              readOnly={readOnly}
              autoFocus={autofocus}
              aria-invalid={deco.hasError || undefined}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent placeholder:text-[color:var(--imd-faint)]"
              style={inputCss}
            />
          )}
          {suffix && (
            <span
              className="inline-flex shrink-0 items-center leading-none"
              style={{ marginInlineStart: 10 }}
            >
              {suffix}
            </span>
          )}
        </div>
      )}

      {deco.hasError && deco.errorText && (
        <div role="alert" style={{ paddingTop: 4, ...deco.errorStyle }}>
          {deco.errorText}
        </div>
      )}
    </div>
  );
}

export type ImdSelectItem<T> = readonly [T, string];

export interface ImdSelectProps<T> {
  readonly items: readonly ImdSelectItem<T>[];
  readonly value: T | null | undefined;
  readonly onChanged: ((value: T | null) => void) | null | undefined;
  readonly hint?: string;
  readonly dense?: boolean;
  /// عنوان النافذة — الافتراضي [hint] أو «اختر».
  readonly title?: string;
  readonly className?: string;
  readonly colors?: ImdColors;
  readonly 'data-testid'?: string;
}

/// قائمة اختيارٍ تُفتح كنافذةٍ كبيرة بها بحثٌ وقائمةُ خيارات — لا القائمة الصغيرة
/// المنسدلة الافتراضية: على سطح المكتب تُقرأ عشرات الخيارات دفعةً واحدة، وعلى
/// الجوال تُنقر بالإصبع بلا تصويبٍ على سطرٍ ضيّق.
///
/// الحقل نفسه يعرض القيمة المختارة بإطار الحقول المعتاد. [onChanged] `null` ⇒
/// معطَّل.
export function ImdSelect<T>({
  items,
  value,
  onChanged,
  hint,
  dense = false,
  title,
  className = '',
  colors,
  'data-testid': dataTestId,
}: ImdSelectProps<T>) {
  useDensityRebuildTick();
  const dirtyFlag = useImdPageDirtyFlag();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const deco = imdFieldDecoration({
    dense,
    readOnly: onChanged === null || onChanged === undefined,
    colors,
  });
  const c = deco.colors;
  const compact = deco.compact;
  const enabled = onChanged !== null && onChanged !== undefined;

  const shown: string[] = [];
  for (const [itemVal, itemLabel] of items) {
    if (Object.is(itemVal, value)) {
      shown.push(itemLabel);
      break;
    }
  }

  const isEmpty = shown.length === 0;
  const displayText = isEmpty ? (hint ?? '') : shown[0];
  const modalTitle = title ?? hint ?? 'اختر';
  const ariaLabel = isEmpty && !(hint ?? '').length ? (title ?? 'اختر') : undefined;
  const radius = deco.flush ? 0 : compact ? ImdSizes.compactRadius : ImdSizes.radius;

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const handlePick = useCallback(
    (picked: T | null) => {
      ImdPageDirty.mark(dirtyFlag);
      onChanged?.(picked);
      setOpen(false);
    },
    [dirtyFlag, onChanged],
  );

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeModal]);

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    }
  };

  const boxStyle = deco.containerStyle(focused);
  const hoverBg =
    enabled && hovered && !deco.readOnly ? c.hover.css : boxStyle.backgroundColor;

  const modalContent = open ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: c.scrim.css }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden"
        style={{
          maxWidth: 460,
          maxHeight: '90vh',
          backgroundColor: c.surface.css,
          borderRadius: 16,
          padding: '18px 20px 16px',
          boxShadow: `0 10px 30px ${c.shadowBase.withValues({ alpha: 0.25 }).css}`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center" style={{ marginBottom: 14 }}>
          <span className="inline-flex shrink-0 items-center" style={{ marginInlineEnd: 8 }}>
            <ImdIcon name="search" size={18} color={c.accent} />
          </span>
          <h2
            className="flex-1 truncate"
            style={{ fontSize: 16, fontWeight: 700, color: c.text.css, margin: 0 }}
          >
            {modalTitle}
          </h2>
          <button
            type="button"
            title="إغلاق"
            aria-label="إغلاق"
            onClick={closeModal}
            className="inline-flex items-center justify-center rounded-lg border transition-colors"
            style={{
              width: 32,
              height: 32,
              backgroundColor: c.surface.css,
              borderColor: c.lineStrong.css,
              color: c.text.css,
              cursor: ImdCursor.click,
            }}
          >
            <ImdIcon name="x" size={14} color={c.text} />
          </button>
        </div>

        <ImdPickerBody items={items} value={value} onPick={handlePick} colors={c} />
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        role="button"
        tabIndex={enabled ? 0 : -1}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-disabled={!enabled}
        aria-label={ariaLabel}
        data-testid={dataTestId}
        onClick={() => {
          if (enabled) setOpen(true);
        }}
        onKeyDown={handleTriggerKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`outline-none select-none ${className}`.trim()}
        style={{
          ...boxStyle,
          borderRadius: radius,
          backgroundColor: hoverBg,
          cursor: enabled ? ImdCursor.click : 'default',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          className="min-w-0 flex-1 truncate text-start"
          style={{
            fontSize: isEmpty ? deco.hintFontSize : deco.textFontSize,
            lineHeight: 1.4,
            color: isEmpty ? c.faint.css : enabled ? c.text.css : c.muted.css,
          }}
        >
          {displayText || '\u200B'}
        </span>
        <span className="inline-flex shrink-0 items-center leading-none">
          <ImdIcon name="chevron-down" size={16} color={c.muted} />
        </span>
      </div>

      {modalContent &&
        (typeof document !== 'undefined'
          ? createPortal(modalContent, document.body)
          : modalContent)}
    </>
  );
}

export interface ImdPickerBodyProps<T> {
  readonly items: readonly ImdSelectItem<T>[];
  readonly value: T | null | undefined;
  readonly onPick?: (value: T | null) => void;
  readonly colors?: ImdColors;
}

/// محتوى نافذة الاختيار: بحثٌ فوريّ وقائمةٌ تُمرَّر. Enter يختار أول المطابقات،
/// والخيار الحالي معلَّمٌ بعلامة ✓.
export function ImdPickerBody<T>({
  items,
  value,
  onPick,
  colors,
}: ImdPickerBodyProps<T>) {
  useDensityRebuildTick();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const deco = imdFieldDecoration({
    dense: true,
    hint: 'بحث…',
    compact: false,
    flush: false,
    colors,
  });
  const c = deco.colors;

  const trimmed = query.trim().toLowerCase();
  const list =
    trimmed.length === 0
      ? items
      : items.filter(([, label]) => label.toLowerCase().includes(trimmed));

  useEffect(() => {
    if (items.length > 6) {
      searchRef.current?.focus();
    }
  }, [items.length]);

  return (
    <div className="flex min-h-0 flex-col items-stretch">
      {items.length > 6 && (
        <div style={{ marginBottom: 8 }}>
          <div style={deco.containerStyle(searchFocused)}>
            <input
              ref={searchRef}
              type="text"
              autoFocus
              value={query}
              placeholder="بحث…"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && list.length > 0) {
                  e.preventDefault();
                  onPick?.(list[0][0]);
                }
              }}
              className="bg-transparent placeholder:text-[color:var(--imd-faint)]"
              style={{
                ...deco.inputStyle,
                fontSize: 13.5,
                color: c.text.css,
              }}
            />
          </div>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: '55vh' }}>
        {list.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ padding: 16, color: c.muted.css, fontSize: 13 }}
          >
            لا خيارات مطابقة
          </div>
        ) : (
          <div className="flex flex-col">
            {list.map(([itemValue, itemLabel], idx) => {
              const on = Object.is(itemValue, value);
              const isHover = hoveredIdx === idx;
              const bg: ImdColor | null = on
                ? c.accentSoft
                : isHover
                  ? c.hover
                  : null;
              return (
                <button
                  key={`${idx}-${itemLabel}`}
                  type="button"
                  onClick={() => onPick?.(itemValue)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
                  className="flex w-full items-center text-start transition-colors"
                  style={{
                    minHeight: ImdSizes.touchMin - 6,
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: bg ? bg.css : 'transparent',
                    cursor: ImdCursor.click,
                    border: 'none',
                  }}
                >
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{
                      fontSize: 13.5,
                      fontWeight: on ? 700 : 500,
                      color: on ? c.accent.css : c.text.css,
                    }}
                  >
                    {itemLabel}
                  </span>
                  {on && <ImdIcon name="check" size={15} color={c.accent} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
