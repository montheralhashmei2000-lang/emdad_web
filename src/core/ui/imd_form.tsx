import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { parseIsoDay } from '../../domain/iso_date';
import { ImdDensity } from './imd_density';
import { arDateText, arDigits, fmtDate, isoDay } from './imd_format';
import { ImdEmojiText, ImdIcon } from './imd_icon';
import { ImdEqualRow, ImdRbar } from './imd_layout';
import { ValueNotifier } from './imd_numbers';
import { ImdPageDirty, useImdPageDirtyFlag } from './imd_page_dirty';
import { ImdStyle } from './imd_style';
import {
  ImdBp,
  ImdColor,
  ImdColors,
  ImdCursor,
  imdShadow,
  imdShadowOverlay,
  ImdSizes,
} from './imd_tokens';
import {
  ImdButton,
  ImdButtonOutline,
  ImdCompact,
  imdFieldDecoration,
  ImdIconButton,
  ImdModalDialog,
  ImdPillTabs,
  type ImdTabItem,
  ImdTap,
  useImdActionRow,
  useImdCompact,
} from './imd_widgets';

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

function resolveColorCss(color: ImdColor | string): string {
  return color instanceof ImdColor ? color.css : color;
}

function useDensityAndViewportTick(): number {
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

/// متحكم نصّي قابل للاستماع (مكافئ خفيف لـ`TextEditingController`).
export class ImdTextController extends ValueNotifier<string> {
  constructor(text = '') {
    super(text);
  }

  get text(): string {
    return this.value;
  }

  set text(v: string) {
    this.value = v;
  }
}

export interface ImdItabsProps {
  readonly tabs: readonly ImdTabItem<string>[];
  readonly value: string;
  readonly onChanged: (value: string) => void;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// صف تبويبات أفقي قابل للتمرير بفجوة 6.
export function ImdItabs({
  tabs,
  value,
  onChanged,
  colors,
  className = '',
}: ImdItabsProps) {
  // داخل صفّ إجراءات العنوان ([ImdActionRow]) بلا أيّ حشوةٍ سفلية، وإلا
  // ارتفع التبويب عن الأزرار المجاورة وطفا عن خطّها الأفقي.
  const inline = useImdActionRow();
  return (
    <div
      className={className}
      style={{ paddingBottom: inline ? 0 : 14 }}
    >
      <div style={{ paddingBottom: inline ? 0 : 6 }}>
        <ImdPillTabs<string>
          tabs={tabs}
          value={value}
          onChanged={onChanged}
          wrap={false}
          colors={colors}
        />
      </div>
    </div>
  );
}

export interface ImdICardProps {
  readonly title?: string;
  readonly icon?: string;
  readonly titleColor?: ImdColor | string;
  readonly child?: ReactNode;
  readonly children?: ReactNode;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// حشوة 16 وهامش 14 وعنوان h4.
export function ImdICard({
  title,
  icon,
  titleColor,
  child,
  children,
  colors,
  className = '',
}: ImdICardProps) {
  const c = resolveActiveColors(colors);
  const shadows = imdShadow(c);
  const content = children ?? child;

  return (
    <div
      className={`flex flex-col items-stretch ${className}`.trim()}
      style={{
        marginBottom: 14,
        padding: 16,
        backgroundColor: c.surface.css,
        border: `1px solid ${c.line.css}`,
        borderRadius: ImdSizes.radius,
        boxShadow:
          shadows.length > 0 ? shadows.map((s) => s.css).join(', ') : undefined,
      }}
    >
      {title !== undefined && (
        <div className="flex items-center" style={{ paddingBottom: 12 }}>
          {icon !== undefined && (
            <span
              className="inline-flex shrink-0 items-center"
              style={{ marginInlineEnd: 6 }}
            >
              <ImdIcon name={icon} size={17} color={c.accent} />
            </span>
          )}
          <h4
            className="min-w-0 flex-1"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: titleColor !== undefined ? resolveColorCss(titleColor) : c.text.css,
            }}
          >
            {title}
          </h4>
        </div>
      )}
      {content}
    </div>
  );
}

export interface ImdF2Props {
  readonly children?: ReactNode;
  /// عدد الأعمدة: ٢ أو ٣ أو ٤، وتنهار إلى عمودٍ واحد على الشاشات الضيّقة.
  readonly cols?: number;
  readonly gap?: number;
  readonly className?: string;
}

/// عمودان بفجوة 12، وعمود واحد ≤900.
export function ImdF2({
  children,
  cols = 2,
  gap = 12,
  className = '',
}: ImdF2Props) {
  useDensityAndViewportTick();
  // عمودٌ واحد على الجوال بنقطة الفصل الوحيدة (900) كبقية النظام.
  const one = ImdBp.of().mobile;
  const n = one ? 1 : Math.max(1, cols);
  const items = Children.toArray(children);

  const rows: ReactNode[] = [];
  for (let i = 0; i < items.length; i += n) {
    const slice = items.slice(i, Math.min(i + n, items.length));
    if (n === 1) {
      rows.push(<div key={i}>{slice[0]}</div>);
    } else {
      const padded: ReactNode[] = [];
      for (let j = 0; j < n; j++) {
        padded.push(
          j < slice.length ? (
            <div key={j} className="min-w-0 self-start">
              {slice[j]}
            </div>
          ) : (
            <div key={j} />
          ),
        );
      }
      rows.push(
        <ImdEqualRow key={i} gap={gap}>
          {padded}
        </ImdEqualRow>,
      );
    }
  }

  return (
    <div
      className={`flex flex-col items-stretch ${className}`.trim()}
      style={{ gap }}
    >
      {rows}
    </div>
  );
}

export interface ImdLabeledProps {
  readonly label: string;
  readonly child?: ReactNode;
  readonly children?: ReactNode;
  /// 12 ⇒ عنوانٌ أبرز بوزن 700، و11 ⇒ عنوانٌ أصغر بوزن 600 بلون النص الثانوي.
  readonly size?: number;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// حقل بعنوان صغير (`label style="font-size:12px;font-weight:700"`).
export function ImdLabeled({
  label,
  child,
  children,
  size = 12,
  colors,
  className = '',
}: ImdLabeledProps) {
  const c = resolveActiveColors(colors);
  const content = children ?? child;
  return (
    <div className={`flex flex-col items-stretch ${className}`.trim()}>
      <ImdEmojiText
        text={label}
        colors={c}
        style={{
          fontSize: size,
          fontWeight: size <= 11 ? 600 : 700,
          color: (size <= 11 ? c.text2 : c.text).css,
          lineHeight: 1.6,
        }}
      />
      <div style={{ height: 2 }} />
      {content}
    </div>
  );
}

export interface ImdFldProps {
  readonly controller?: ImdTextController;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly hint?: string;
  /// يأخذ التركيز عند أول بناء — لحقلٍ هو سبب فتح الحوار (كمدخل البحث العام)،
  /// لا لحقول النماذج فيُسرق التركيز من أولها.
  readonly autofocus?: boolean;
  /// ضغط Enter في الحقل (لا يُستدعى في الحقول متعددة الأسطر).
  readonly onSubmitted?: (value: string) => void;
  /// رسالة خطأ تظهر تحت الحقل بلون `c.danger`.
  readonly errorText?: string | null;
  /// عنصر عند نهاية الحقل (يسار الحقل في RTL).
  readonly suffix?: ReactNode;
  readonly readOnly?: boolean;
  readonly number?: boolean;
  readonly dense?: boolean;
  readonly enabled?: boolean;
  readonly onChanged?: (value: string) => void;
  readonly maxLines?: number;
  /// حقل كلمة مرور — يُخفي النص المكتوب.
  readonly obscure?: boolean;
  /// قيمٌ تُقترح ولا تُلزم — كـ`<datalist>`: الحقل يبقى نصًّا حرًّا، والقائمة
  /// تختصر الكتابة وتوحّد الإملاء.
  readonly suggestions?: readonly string[];
  readonly colors?: ImdColors;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

function ImdSuggestionsMenu({
  items,
  onPick,
  colors,
}: {
  readonly items: readonly string[];
  readonly onPick: (value: string) => void;
  readonly colors: ImdColors;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const onPointerDown = (e: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shadows = imdShadowOverlay(colors);

  return (
    <div ref={hostRef} className="relative shrink-0">
      <ImdIconButton
        icon={open ? 'chevron-up' : 'chevron-down'}
        tooltip="اقتراحات"
        onPressed={() => setOpen((v) => !v)}
        colors={colors}
      />
      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 overflow-y-auto"
          style={{
            insetInlineEnd: 0,
            minWidth: 200,
            maxWidth: 320,
            maxHeight: 280,
            backgroundColor: colors.surface.css,
            border: `1px solid ${colors.popupLine.css}`,
            borderRadius: ImdSizes.radius,
            boxShadow:
              shadows.length > 0 ? shadows.map((s) => s.css).join(', ') : undefined,
            paddingBlock: 4,
          }}
        >
          {items.map((v, idx) => (
            <button
              key={`${idx}-${v}`}
              type="button"
              role="option"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx((p) => (p === idx ? null : p))}
              onClick={() => {
                setOpen(false);
                onPick(v);
              }}
              className="flex w-full items-center text-start transition-colors"
              style={{
                padding: '8px 12px',
                fontSize: 13,
                color: colors.text2.css,
                backgroundColor:
                  hoveredIdx === idx ? colors.hover.css : 'transparent',
                border: 'none',
                cursor: ImdCursor.click,
              }}
            >
              <span className="truncate">{v}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImdFld({
  controller,
  value,
  defaultValue,
  hint,
  autofocus = false,
  onSubmitted,
  errorText,
  suffix,
  readOnly = false,
  number = false,
  dense = false,
  enabled = true,
  onChanged,
  maxLines = 1,
  obscure = false,
  suggestions = [],
  colors,
  className = '',
  'data-testid': dataTestId,
}: ImdFldProps) {
  useDensityAndViewportTick();
  const dirtyFlag = useImdPageDirtyFlag();
  const compact = useImdCompact();
  const [focused, setFocused] = useState(false);

  const [ctrlVal, setCtrlVal] = useState(() => controller?.text ?? '');
  useEffect(() => {
    if (!controller) return;
    setCtrlVal(controller.text);
    const listener = () => setCtrlVal(controller.text);
    controller.addListener(listener);
    return () => controller.removeListener(listener);
  }, [controller]);

  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const currentValue =
    value !== undefined ? value : controller ? ctrlVal : uncontrolled;

  const deco = imdFieldDecoration({
    hint,
    readOnly: readOnly || !enabled,
    dense,
    suffix,
    errorText,
    colors,
  });
  const c = deco.colors;

  const fixed =
    compact && maxLines === 1 && !(errorText && errorText.length > 0);
  const effectiveFixedHeight =
    fixed && suggestions.length === 0 ? ImdSizes.compactField : undefined;
  const effectiveMinHeight = compact ? ImdSizes.compactField : ImdSizes.touchMin;

  const handleChange = (next: string) => {
    ImdPageDirty.mark(dirtyFlag);
    if (controller) {
      imdSetText(controller, next);
    } else if (value === undefined) {
      setUncontrolled(next);
    }
    onChanged?.(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmitted && maxLines === 1) {
      onSubmitted(currentValue);
    }
  };

  const boxStyle: CSSProperties = {
    ...deco.containerStyle(focused),
    height: effectiveFixedHeight,
    minHeight: effectiveMinHeight,
    ...(maxLines > 1 ? { alignItems: 'flex-start' } : undefined),
  };

  const inputCss: CSSProperties = {
    ...deco.inputStyle,
    fontSize: compact ? 13 : 14,
    color: enabled ? c.text.css : c.muted.css,
  };

  const fieldElement = (
    <div className="flex min-w-0 flex-1 flex-col items-stretch">
      <div data-testid={dataTestId} style={boxStyle}>
        {maxLines > 1 ? (
          <textarea
            rows={maxLines}
            value={currentValue}
            placeholder={hint}
            readOnly={readOnly}
            disabled={!enabled}
            autoFocus={autofocus}
            aria-invalid={deco.hasError || undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full resize-y bg-transparent placeholder:text-[color:var(--imd-faint)]"
            style={inputCss}
          />
        ) : (
          <input
            type={obscure ? 'password' : 'text'}
            inputMode={number && !obscure ? 'decimal' : undefined}
            dir={obscure ? 'ltr' : undefined}
            autoComplete={obscure ? 'off' : undefined}
            spellCheck={obscure ? false : undefined}
            value={currentValue}
            placeholder={hint}
            readOnly={readOnly}
            disabled={!enabled}
            autoFocus={autofocus}
            aria-invalid={deco.hasError || undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent placeholder:text-[color:var(--imd-faint)]"
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
      {deco.hasError && deco.errorText && (
        <div role="alert" style={{ paddingTop: 4, ...deco.errorStyle }}>
          {deco.errorText}
        </div>
      )}
    </div>
  );

  if (suggestions.length === 0 || readOnly || !enabled) {
    return <div className={`w-full ${className}`.trim()}>{fieldElement}</div>;
  }

  return (
    <div className={`flex w-full items-center gap-[6px] ${className}`.trim()}>
      {fieldElement}
      <ImdSuggestionsMenu
        items={suggestions}
        colors={c}
        onPick={(v) => {
          if (controller) imdSetText(controller, v);
          else if (value === undefined) setUncontrolled(v);
          ImdPageDirty.mark(dirtyFlag);
          onChanged?.(v);
        }}
      />
    </div>
  );
}

export interface ImdChipsRowProps {
  readonly children?: ReactNode;
  readonly bottom?: number;
  readonly className?: string;
}

export function ImdChipsRow({
  children,
  bottom = 12,
  className = '',
}: ImdChipsRowProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`.trim()}
      style={{ paddingBottom: bottom }}
    >
      {children}
    </div>
  );
}

export interface ImdLdProps {
  readonly text: string;
  readonly center?: boolean;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// نص تحميل/فراغ رمادي.
export function ImdLd({
  text,
  center = false,
  colors,
  className = '',
}: ImdLdProps) {
  return (
    <div className={className} style={{ paddingBlock: 10 }}>
      <ImdLdText text={text} center={center} colors={colors} />
    </div>
  );
}

export function ImdLdText({
  text,
  center = false,
  colors,
  className = '',
}: ImdLdProps) {
  const c = resolveActiveColors(colors);
  return (
    <ImdEmojiText
      text={text}
      colors={c}
      className={className}
      textAlign={center ? 'center' : undefined}
      style={{
        fontSize: 14,
        fontWeight: 500,
        color: c.muted.css,
      }}
    />
  );
}

export interface ImdSearchBarProps {
  readonly controller?: ImdTextController;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly hint: string;
  readonly onChanged?: (value: string) => void;
  readonly actions?: readonly ReactNode[];
  readonly inline?: boolean;
  /// عناصر بجوار الحقل مباشرة (مثل زر الكاميرا).
  readonly leading?: readonly ReactNode[];
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// شريط أدواتٍ بحقل بحث: الحقل يأخذ عرض السطر كاملًا فتنزل الأزرار تحته،
/// و`inline: true` ⇒ الحقل والأزرار في سطرٍ واحد.
export function ImdSearchBar({
  controller,
  value,
  defaultValue,
  hint,
  onChanged,
  actions = [],
  inline = false,
  leading = [],
  colors,
  className = '',
}: ImdSearchBarProps) {
  useDensityAndViewportTick();
  const [focused, setFocused] = useState(false);
  const [ctrlVal, setCtrlVal] = useState(() => controller?.text ?? '');
  useEffect(() => {
    if (!controller) return;
    setCtrlVal(controller.text);
    const l = () => setCtrlVal(controller.text);
    controller.addListener(l);
    return () => controller.removeListener(l);
  }, [controller]);

  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const currentValue =
    value !== undefined ? value : controller ? ctrlVal : uncontrolled;

  const deco = imdFieldDecoration({ hint, colors });
  const c = deco.colors;

  const field = (
    <div
      className="min-w-0 flex-1"
      style={{
        ...deco.containerStyle(focused),
        minHeight: ImdSizes.touchMin,
      }}
    >
      <input
        type="text"
        value={currentValue}
        placeholder={hint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const next = e.target.value;
          if (controller) imdSetText(controller, next);
          else if (value === undefined) setUncontrolled(next);
          onChanged?.(next);
        }}
        className="w-full bg-transparent placeholder:text-[color:var(--imd-faint)]"
        style={{ ...deco.inputStyle, fontSize: 14, color: c.text.css }}
      />
    </div>
  );

  if (inline && !ImdBp.of().mobile) {
    return (
      <div
        className={`flex items-center ${className}`.trim()}
        style={{ paddingBottom: 10 }}
      >
        {field}
        {leading.map((l, i) => (
          <div key={`l-${i}`} style={{ marginInlineStart: 6 }}>
            {l}
          </div>
        ))}
        {actions.map((a, i) => (
          <div key={`a-${i}`} style={{ marginInlineStart: 8 }}>
            {a}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ImdRbar fullFirst={true} className={className}>
      {[
        <div key="search-row" className="flex w-full items-center">
          {field}
          {leading.map((l, i) => (
            <div key={`l-${i}`} style={{ marginInlineStart: 6 }}>
              {l}
            </div>
          ))}
        </div>,
        ...actions,
      ]}
    </ImdRbar>
  );
}

export interface ImdBulletsProps {
  readonly lines: readonly string[];
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// نقاط ملاحظات (`<div>• …</div>` بخط 13 وارتفاع سطر 2).
export function ImdBullets({
  lines,
  colors,
  className = '',
}: ImdBulletsProps) {
  const c = resolveActiveColors(colors);
  return (
    <div className={`flex flex-col items-stretch ${className}`.trim()}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontSize: 13,
            lineHeight: 2,
            color: c.text.css,
          }}
        >
          • {l}
        </div>
      ))}
    </div>
  );
}

export interface ImdDateFieldProps {
  readonly value: string;
  readonly onChanged: (value: string) => void;
  readonly enabled?: boolean;
  readonly colors?: ImdColors;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

const kArMonths = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

const kArWeekdays = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] as const;

/// `input type=date` — قيمة YYYY-MM-DD مع منتقي التاريخ.
export function ImdDateField({
  value,
  onChanged,
  enabled = true,
  colors,
  className = '',
  'data-testid': dataTestId,
}: ImdDateFieldProps) {
  useDensityAndViewportTick();
  const dirtyFlag = useImdPageDirtyFlag();
  const compact = useImdCompact();
  const [open, setOpen] = useState(false);

  const deco = imdFieldDecoration({ readOnly: !enabled, colors });
  const c = deco.colors;
  const shownText = ImdDateField.display(value);
  const h = compact ? ImdSizes.compactField : ImdSizes.touchMin;

  const initialDate = useMemo(() => ImdDateField.initialFor(value), [value]);
  const [viewYear, setViewYear] = useState(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => initialDate.getMonth());
  const [pickedDate, setPickedDate] = useState<Date>(() => initialDate);

  const openPicker = () => {
    if (!enabled) return;
    const init = ImdDateField.initialFor(value);
    setViewYear(init.getFullYear());
    setViewMonth(init.getMonth());
    setPickedDate(init);
    setOpen(true);
  };

  const confirmDate = (d: Date) => {
    ImdPageDirty.mark(dirtyFlag);
    onChanged(isoDay(d));
    setOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return (
    <>
      <ImdTap
        disabled={!enabled}
        cursor={enabled ? ImdCursor.click : 'default'}
        radius={deco.borderRadius}
        onTap={enabled ? openPicker : undefined}
        className={className}
      >
        <div
          data-testid={dataTestId}
          style={{
            ...deco.containerStyle(false),
            height: h,
            minHeight: h,
            justifyContent: 'space-between',
            gap: 8,
            cursor: enabled ? ImdCursor.click : 'default',
          }}
        >
          <span
            className="min-w-0 flex-1 truncate text-start"
            style={{
              fontSize: compact ? 12.5 : 14,
              lineHeight: 1.4,
              color: value.length === 0 ? c.faint.css : c.text.css,
            }}
          >
            {shownText}
          </span>
          <span className="inline-flex shrink-0 items-center leading-none">
            <ImdIcon name="calendar" size={16} color={c.muted} />
          </span>
        </div>
      </ImdTap>

      <ImdModalDialog
        open={open}
        onClose={() => setOpen(false)}
        title="اختيار التاريخ"
        icon="calendar"
        maxWidth={360}
        colors={c}
        actions={
          <>
            <ImdButtonOutline
              label="إلغاء"
              onPressed={() => setOpen(false)}
              colors={c}
            />
            <ImdButton
              label="تأكيد"
              onPressed={() => confirmDate(pickedDate)}
              colors={c}
            />
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <select
              aria-label="الشهر"
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="rounded-lg border px-2 py-1 text-sm"
              style={{
                backgroundColor: c.surface.css,
                borderColor: c.lineStrong.css,
                color: c.text.css,
              }}
            >
              {kArMonths.map((mName, idx) => (
                <option key={idx} value={idx}>
                  {mName}
                </option>
              ))}
            </select>
            <select
              aria-label="السنة"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="rounded-lg border px-2 py-1 text-sm"
              style={{
                backgroundColor: c.surface.css,
                borderColor: c.lineStrong.css,
                color: c.text.css,
              }}
            >
              {Array.from({ length: 101 }, (_, i) => 2000 + i).map((yr) => (
                <option key={yr} value={yr}>
                  {arDigits(String(yr))}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {kArWeekdays.map((wd) => (
              <div
                key={wd}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: c.muted.css,
                  paddingBlock: 4,
                }}
              >
                {wd}
              </div>
            ))}
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const candidate = new Date(viewYear, viewMonth, day);
              const outOfRange =
                candidate.getTime() < ImdDateField.firstDate.getTime() ||
                candidate.getTime() > ImdDateField.lastDate.getTime();
              const isSelected =
                pickedDate.getFullYear() === viewYear &&
                pickedDate.getMonth() === viewMonth &&
                pickedDate.getDate() === day;
              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={outOfRange}
                  onClick={() => {
                    setPickedDate(candidate);
                    confirmDate(candidate);
                  }}
                  className="flex h-9 items-center justify-center rounded-lg border-0 text-sm transition-colors"
                  style={{
                    backgroundColor: isSelected ? c.accent.css : 'transparent',
                    color: isSelected
                      ? c.onAccent.css
                      : outOfRange
                        ? c.faint.css
                        : c.text.css,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: outOfRange ? 'default' : ImdCursor.click,
                    opacity: outOfRange ? 0.45 : 1,
                  }}
                >
                  {arDigits(String(day))}
                </button>
              );
            })}
          </div>
        </div>
      </ImdModalDialog>
    </>
  );
}

export namespace ImdDateField {
  export const firstDate = new Date(2000, 0, 1);
  export const lastDate = new Date(2100, 0, 1);

  /// مستحيلٌ (`2026-02-30`) يُعرض فارغًا لا يومًا مدوَّرًا ([parseIsoDay]).
  export function display(v: string): string {
    const d = parseIsoDay(v);
    if (d === null) return 'سنة-شهر-يوم';
    return arDateText(fmtDate(d));
  }

  /// بداية المنتقي: المحفوظ إن صحّ، **محصورًا في المدى** — تاريخٌ مستورد خارجه
  /// (1999 مثلًا) كان يكسر شرط `showDatePicker` فلا يُفتح المنتقي أصلًا.
  export function initialFor(
    v: string,
    options: { readonly now?: Date } = {},
  ): Date {
    const d = parseIsoDay(v) ?? options.now ?? new Date();
    if (d.getTime() < firstDate.getTime()) return new Date(firstDate.getTime());
    if (d.getTime() > lastDate.getTime()) return new Date(lastDate.getTime());
    return d;
  }
}

export interface ImdCheckboxProps {
  readonly value: boolean;
  readonly label: string;
  readonly onChanged?: ((value: boolean) => void) | null;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// `<input type="checkbox">` مع نصه — مربع 18px بحدود السمة ووزن نص 500.
export function ImdCheckbox({
  value,
  label,
  onChanged,
  colors,
  className = '',
}: ImdCheckboxProps) {
  useDensityAndViewportTick();
  const c = resolveActiveColors(colors);
  const on = onChanged !== null && onChanged !== undefined;

  return (
    <ImdTap
      onTap={on ? () => onChanged(!value) : undefined}
      disabled={!on}
      selected={value}
      minTouchSize={true}
      cursor={on ? ImdCursor.click : 'default'}
      className={`inline-flex items-center ${className}`.trim()}
    >
      <div
        role="checkbox"
        aria-checked={value}
        className="inline-flex items-center"
        style={{ minHeight: ImdSizes.touchMin }}
      >
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 18,
            height: 18,
            backgroundColor: value ? c.accent.css : c.surface.css,
            border: `1.5px solid ${(value ? c.accent : c.line).css}`,
            borderRadius: 5,
          }}
        >
          {value && <ImdIcon name="check" size={13} color={c.onAccent} />}
        </div>
        <span style={{ width: 8, flexShrink: 0 }} />
        <ImdEmojiText
          text={label}
          colors={c}
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: (on ? c.text : c.muted).css,
          }}
        />
      </div>
    </ImdTap>
  );
}

/// إسناد نص إلى متحكّم حقل موجود.
export function imdSetText(c: ImdTextController, value: string): void {
  if (c.text === value) return;
  c.text = value;
}

export interface ImdInputGroupProps {
  readonly field: ReactNode;
  readonly button: ReactNode;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// قائمةٌ أو حقلٌ + زرّ («+» إضافة سريعة) في **مجموعة إدخالٍ** واحدة: الاثنان
/// بارتفاعٍ واحد، وحدودهما ملتصقة بفاصلٍ رفيعٍ واحد داخل إطارٍ واحدٍ مدوَّر.
export function ImdInputGroup({
  field,
  button,
  colors,
  className = '',
}: ImdInputGroupProps) {
  useDensityAndViewportTick();
  const c = resolveActiveColors(colors);
  // المجموعة مدمجةٌ دائمًا: ارتفاعها ارتفاع الحقل المدمج، فتتساوى مع جيرانها
  // في صفّ النموذج.
  const h = ImdSizes.compactField;

  return (
    <ImdCompact on={true} flush={true}>
      <div
        className={`flex w-full items-stretch overflow-hidden ${className}`.trim()}
        style={{
          height: h,
          backgroundColor: c.surface.css,
          border: `1px solid ${c.lineStrong.css}`,
          borderRadius: ImdSizes.compactRadius,
        }}
      >
        <div className="min-w-0 flex-1">{field}</div>
        <div
          style={{
            width: 1,
            backgroundColor: c.lineStrong.css,
            flexShrink: 0,
          }}
        />
        <div style={{ width: h, flexShrink: 0 }}>{button}</div>
      </div>
    </ImdCompact>
  );
}
