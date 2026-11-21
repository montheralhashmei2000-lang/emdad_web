import {
  Children,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { ImdDensity } from '../imd_density';
import { ImdIcon } from '../imd_icon';
import { ImdStyle } from '../imd_style';
import {
  ImdBp,
  ImdColor,
  ImdColors,
  type ImdEdgeInsets,
  imdShadow,
  ImdSizes,
} from '../imd_tokens';
import { ImdButtonOutline } from './imd_buttons';

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

export const ImdEmbedScopeContext = createContext<boolean>(false);

export interface ImdEmbedScopeProps {
  readonly children?: ReactNode;
}

/// يُحيط شاشةً **مضمَّنةً** داخل شاشةٍ أخرى (كأقسام الإعدادات).
///
/// الشاشة المضمَّنة لا تفتح صفحتها الخاصة: لا تمرير ولا حشوة (`ImdPage`)، ولا
/// عنوان صفحة ولا زر «رجوع» — فالشاشة المضيفة هي التي تعرض العنوان والتنقل.
export function ImdEmbedScope({ children }: ImdEmbedScopeProps) {
  return (
    <ImdEmbedScopeContext.Provider value={true}>
      {children}
    </ImdEmbedScopeContext.Provider>
  );
}

export function useImdEmbedScope(): boolean {
  return useContext(ImdEmbedScopeContext);
}

export namespace ImdEmbedScope {
  export const Context = ImdEmbedScopeContext;

  export function of(): boolean {
    return useImdEmbedScope();
  }
}

export interface ImdPageBackProps {
  readonly onPressed: () => void;
  readonly label?: string;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// زر «رجوع إلى الإعدادات» أعلى الشاشات المفتوحة من الإعدادات؛ يختفي حين تكون
/// الشاشة مضمَّنةً داخل الإعدادات نفسها.
export function ImdPageBack({
  onPressed,
  label = 'رجوع إلى الإعدادات',
  className = '',
  colors,
}: ImdPageBackProps) {
  const embedded = useImdEmbedScope();
  if (embedded) return null;
  return (
    <div
      className={`flex justify-start ${className}`.trim()}
      style={{ paddingBottom: 8 }}
    >
      <ImdButtonOutline
        label={label}
        icon="arrow-left"
        small={true}
        onPressed={onPressed}
        colors={colors}
      />
    </div>
  );
}

export const ImdActionRowContext = createContext<boolean>(false);

export interface ImdActionRowProps {
  readonly children?: ReactNode;
}

/// وسمٌ يُعلن أن ما تحته **صفّ إجراءات** في رأس الصفحة (تبويبات + أزرار): كل
/// عنصرٍ فيه بارتفاع [ImdSizes.barControl] ومحاذاةٍ وسطيّة واحدة، فتقع كلها على
/// خطٍّ أفقيٍّ واحد في كل الشاشات.
export function ImdActionRow({ children }: ImdActionRowProps) {
  return (
    <ImdActionRowContext.Provider value={true}>
      {children}
    </ImdActionRowContext.Provider>
  );
}

export function useImdActionRow(): boolean {
  return useContext(ImdActionRowContext);
}

export type ImdActionRowAlignment = 'start' | 'end' | 'center';

function ImdActionRowWrapView({
  items,
  alignment = 'start',
}: {
  readonly items: readonly ReactNode[];
  readonly alignment?: ImdActionRowAlignment;
}) {
  useDensityAndViewportTick();
  const barHeight = ImdSizes.barControl;
  const justifyContent =
    alignment === 'end'
      ? 'flex-end'
      : alignment === 'center'
        ? 'center'
        : 'flex-start';

  return (
    <ImdActionRow>
      <div
        className="flex flex-wrap items-center"
        style={{ gap: 8, justifyContent }}
      >
        {items.map((w, idx) => (
          <div
            key={idx}
            className="inline-flex items-center"
            style={{ height: barHeight }}
          >
            {w}
          </div>
        ))}
      </div>
    </ImdActionRow>
  );
}

export namespace ImdActionRow {
  export const Context = ImdActionRowContext;

  export function of(): boolean {
    return useImdActionRow();
  }

  /// يلفّ [children] في `Wrap` موحَّد المحاذاة والفجوات.
  export function wrap(
    children: readonly ReactNode[],
    options: { readonly alignment?: ImdActionRowAlignment } = {},
  ): ReactNode {
    return (
      <ImdActionRowWrapView
        items={children}
        alignment={options.alignment ?? 'start'}
      />
    );
  }
}

export interface ImdPageTitleProps {
  readonly title: string;
  readonly icon?: string;
  readonly subtitle?: string;
  /// عنصر واحد عند نهاية سطر العنوان في كل العروض (شارة، عدّاد…).
  readonly trailing?: ReactNode;
  /// أزرار الإجراءات: عند نهاية سطر العنوان قبل [trailing] على العرض الواسع،
  /// وتنزل تحت العنوان في صفٍّ يلتفّ (`Wrap`) على الجوال. [trailing] يبقى مكانه.
  readonly actions?: readonly ReactNode[];
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// عنوان الشاشة: أيقونةٌ وعنوانٌ وسطرٌ فرعي، ومكانٌ للإجراءات يمينه.
export function ImdPageTitle({
  title,
  icon,
  subtitle,
  trailing,
  actions,
  className = '',
  colors,
}: ImdPageTitleProps) {
  useDensityAndViewportTick();
  const embedded = useImdEmbedScope();

  // مضمَّنةٌ: العنوان للشاشة المضيفة، ويبقى ما يخصّ هذه الشاشة وحدها
  // (أزرار الإجراءات وشارة الحالة) في سطرٍ مضغوط.
  if (embedded) {
    const extra: ReactNode[] = [
      ...(actions ?? []),
      ...(trailing !== undefined && trailing !== null ? [trailing] : []),
    ];
    if (extra.length === 0) return null;
    return (
      <div
        className={`flex justify-end ${className}`.trim()}
        style={{ paddingBottom: 12 }}
      >
        {ImdActionRow.wrap(extra)}
      </div>
    );
  }

  const c = resolveActiveColors(colors);
  const bp = ImdBp.of();
  const mobile = bp.mobile;
  const acts = actions ?? [];
  const inline = acts.length > 0 && !mobile;
  const below = acts.length > 0 && mobile;

  const titleElement = (
    <h1
      className={inline ? 'min-w-0 flex-1' : 'min-w-0'}
      style={{
        margin: 0,
        fontSize: mobile ? 19 : 22,
        fontWeight: 700,
        color: c.text.css,
        lineHeight: mobile ? 1.5 : 1.4,
      }}
    >
      {title}
    </h1>
  );

  return (
    <div
      className={`flex flex-col items-stretch ${className}`.trim()}
      style={{ paddingBottom: mobile ? 14 : 18 }}
    >
      <div className="flex items-center">
        {icon && (
          <span
            className="inline-flex shrink-0 items-center"
            style={{ marginInlineEnd: 8 }}
          >
            <ImdIcon
              name={icon}
              size={(mobile ? 19 : 22) * 1.15}
              color={c.accent}
            />
          </span>
        )}

        {titleElement}

        {inline ? (
          <>
            <div
              style={{
                marginInlineStart: 12,
                maxWidth: bp.width * 0.6,
              }}
            >
              {ImdActionRow.wrap(acts, { alignment: 'end' })}
            </div>
            {trailing !== undefined && trailing !== null && (
              <div style={{ marginInlineStart: 8 }}>{trailing}</div>
            )}
          </>
        ) : (
          trailing !== undefined &&
          trailing !== null && (
            <div style={{ marginInlineStart: 'auto' }}>{trailing}</div>
          )
        )}
      </div>

      {subtitle !== undefined && subtitle.length > 0 && (
        <div
          style={{
            paddingTop: 4,
            fontSize: mobile ? 12 : 13.5,
            color: c.muted.css,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </div>
      )}

      {below && (
        <div style={{ paddingTop: 10 }}>{ImdActionRow.wrap(acts)}</div>
      )}
    </div>
  );
}

export interface ImdPanelProps {
  readonly children?: ReactNode;
  readonly child?: ReactNode;
  readonly title?: string;
  readonly icon?: string;
  readonly padding?: CSSProperties['padding'];
  readonly titleGap?: number;
  readonly margin?: CSSProperties['margin'];
  readonly marginBottom?: number;
  readonly actions?: readonly ReactNode[];
  readonly color?: ImdColor | string;
  readonly borderColor?: ImdColor | string;
  /// `display:flex; align-items:center` داخل البطاقة.
  readonly centerVertically?: boolean;
  readonly className?: string;
  readonly colors?: ImdColors;
}

/// لوحةٌ بخلفية السطح وحدٍّ رفيع وزوايا 12 — الحاوية الأساسية لأقسام الشاشة.
export function ImdPanel({
  children,
  child,
  title,
  icon,
  padding,
  titleGap = 14,
  margin,
  marginBottom = 20,
  actions,
  color,
  borderColor,
  centerVertically = false,
  className = '',
  colors,
}: ImdPanelProps) {
  useDensityAndViewportTick();
  const c = resolveActiveColors(colors);
  const mobile = ImdBp.of().mobile;
  const shadows = imdShadow(c);
  const content = children ?? child;

  return (
    <section
      className={`flex flex-col items-stretch ${className}`.trim()}
      style={{
        margin: margin !== undefined ? margin : undefined,
        marginBottom: margin !== undefined ? undefined : marginBottom,
        padding: padding ?? (mobile ? 12 : '18px 20px'),
        backgroundColor: color !== undefined ? resolveColorCss(color) : c.surface.css,
        border: `1px solid ${
          borderColor !== undefined ? resolveColorCss(borderColor) : c.line.css
        }`,
        borderRadius: ImdSizes.radius,
        boxShadow:
          shadows.length > 0 ? shadows.map((s) => s.css).join(', ') : undefined,
        justifyContent: centerVertically ? 'center' : 'flex-start',
      }}
    >
      {title !== undefined && (
        <div
          className="flex items-center"
          style={{ paddingBottom: titleGap }}
        >
          {icon && (
            <span
              className="inline-flex shrink-0 items-center"
              style={{ marginInlineEnd: 6 }}
            >
              <ImdIcon name={icon} size={15 * 1.15} color={c.accent} />
            </span>
          )}
          <h2
            className="min-w-0 flex-1"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: c.text.css,
            }}
          >
            {title}
          </h2>
          {actions && actions.length > 0 && (
            <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
          )}
        </div>
      )}
      {content}
    </section>
  );
}

export interface ImdGridProps {
  readonly children?: ReactNode;
  readonly columns?: number;
  readonly gap?: number;
  readonly minItemWidth?: number;
  readonly className?: string;
}

/// شبكة أعمدة متجاوبة (`grid-2/3/4`): عدد الأعمدة يقل مع ضيق العرض.
export function ImdGrid({
  children,
  columns = 2,
  gap = 16,
  minItemWidth = 220,
  className = '',
}: ImdGridProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let cols = Math.max(1, columns);
  while (cols > 1 && (width - gap * (cols - 1)) / cols < minItemWidth) {
    cols--;
  }

  return (
    <div
      ref={hostRef}
      className={`grid ${className}`.trim()}
      style={{
        gap,
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {Children.toArray(children)}
    </div>
  );
}

export interface ImdPageProps {
  readonly children?: ReactNode;
  readonly scrollRef?: Ref<HTMLDivElement>;
  readonly className?: string;
}

/// منطقة المحتوى القابلة للتمرير، بحشوةٍ تتبع عرض الشاشة.
export function ImdPage({
  children,
  scrollRef,
  className = '',
}: ImdPageProps) {
  useDensityAndViewportTick();
  const embedded = useImdEmbedScope();

  // مضمَّنةٌ داخل شاشةٍ تمرّر نفسها: لا تمريرَ داخل تمرير ولا حشوةً مضاعفة.
  if (embedded) {
    return (
      <div className={`flex flex-col items-stretch ${className}`.trim()}>
        {children}
      </div>
    );
  }

  const pad = ImdPage.paddingOf();
  return (
    <div
      ref={scrollRef}
      className={`min-h-0 flex-1 overflow-y-auto ${className}`.trim()}
      style={{
        paddingInline: pad.horizontal,
        paddingBlock: pad.vertical,
      }}
    >
      <div className="flex flex-col items-stretch">{children}</div>
    </div>
  );
}

export namespace ImdPage {
  export function paddingOf(viewportWidth?: number): ImdEdgeInsets {
    const bp = ImdBp.of(viewportWidth);
    if (bp.mobile) return ImdSizes.mainPaddingMobile;
    if (bp.tablet) return ImdSizes.mainPaddingTablet;
    const base = bp.wide ? ImdSizes.mainPadding : ImdSizes.mainPaddingMid;
    // الكثافة العالية تضيّق حشوة الصفحة على سطح المكتب لتتّسع المساحة للبيانات.
    const f = ImdDensity.spaceFactor;
    return f === 1
      ? base
      : {
          horizontal: (base.horizontal / 2) * f,
          vertical: (base.vertical / 2) * f,
        };
  }
}
