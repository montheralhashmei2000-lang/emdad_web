import {
  Children,
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ImdDensity } from './imd_density';
import { ImdIcon } from './imd_icon';
import { ImdStyle } from './imd_style';
import { ImdBp, ImdColor, ImdColors, imdShadow, ImdSizes } from './imd_tokens';

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

function useImdBp(): ImdBp {
  const [, setTick] = useState(0);

  useEffect(() => {
    const onResize = () => setTick((n) => n + 1);
    const onRebuild = () => setTick((n) => n + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
    }
    ImdDensity.addRebuildListener(onRebuild);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
      }
      ImdDensity.removeRebuildListener(onRebuild);
    };
  }, []);

  return ImdBp.of();
}

function imdShadowCss(c: ImdColors): string | undefined {
  const shadows = imdShadow(c);
  return shadows.length === 0 ? undefined : shadows.map((s) => s.css).join(', ');
}

export interface ImdFitProps {
  readonly width: number;
  readonly children: ReactNode;
  readonly className?: string;
}

/// صندوقٌ بعرضٍ **مفضَّل** لا يتجاوز المتاح: `min(width, ما يتّسع له الأب)`.
///
/// بديلُ عرضٍ ثابت في أشرطة الفلاتر والنماذج؛ يُبقي العرض المعتاد على سطح
/// المكتب ويتقلّص تلقائيًّا على الشاشة الضيقة بدل أن يفيض.
export function ImdFit({ width, children, className = '' }: ImdFitProps) {
  return (
    <div
      className={`min-w-0 max-w-full ${className}`.trim()}
      style={{ width: `min(${width}px, 100%)` }}
    >
      {children}
    </div>
  );
}

const ImdKpiStripContext = createContext<boolean>(false);

export interface ImdKpisProps {
  readonly children: ReactNode;
  /// البطاقات الكبيرة (ومعها خط الاتجاه `spark`) بدل الشريط المضغوط.
  readonly large?: boolean;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// المؤشرات.
///
/// **الافتراضي شريطٌ واحدٌ رفيع** (نحو ٤٠ بكسل): إطارٌ واحد وصفٌّ أفقيٌّ من
/// «عنوان قيمة» بفواصل رأسية، يلتفّ على الشاشة الضيّقة.
///
/// [large] ⇒ الشبكة القديمة: auto-fit بحد أدنى 210، وأربعة أعمدة عند ≥1200،
/// وعمودان بفجوة 8 على الجوال، وعمود واحد ≤420. للّوحات وحدها (الرئيسية،
/// لوحة المحروقات، الرؤى، لوحة المستودع) حيث الأرقام هي المحتوى نفسه.
export function ImdKpis({
  children,
  large = false,
  colors,
  className = '',
}: ImdKpisProps) {
  const bp = useImdBp();
  const c = resolveActiveColors(colors);
  const items = Children.toArray(children);

  if (large) {
    const gap = bp.mobile ? 8 : 14;
    if (bp.tiny || bp.mobile || bp.wide) {
      const cols = bp.tiny ? 1 : bp.mobile ? 2 : 4;
      return (
        <div className={`mb-5 ${className}`.trim()}>
          <ImdGridRows cols={cols} gap={gap}>
            {items}
          </ImdGridRows>
        </div>
      );
    }
    return (
      <div
        className={`mb-5 grid items-stretch ${className}`.trim()}
        style={{
          gap,
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',
        }}
      >
        {items}
      </div>
    );
  }

  return (
    <div className={`mb-3 ${className}`.trim()}>
      <div
        className="w-full min-w-0 px-[6px] py-[4px]"
        style={{
          backgroundColor: c.subtle.css,
          border: `1px solid ${c.line.css}`,
          borderRadius: ImdSizes.radius,
        }}
      >
        <ImdKpiStripContext.Provider value={true}>
          <div className="flex flex-wrap items-center gap-y-[2px]">
            {items.map((child, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <div
                    className="h-[18px] w-px shrink-0"
                    style={{ backgroundColor: c.line.css }}
                  />
                )}
                {child}
              </Fragment>
            ))}
          </div>
        </ImdKpiStripContext.Provider>
      </div>
    </div>
  );
}

export interface ImdKpiProps {
  readonly label: string;
  readonly value: string;
  readonly color?: ImdColor;
  /// محتوى إضافي أسفل القيمة (مثل شارة الحالة).
  readonly extra?: ReactNode;
  /// أيقونة اختيارية بجوار العنوان — لا تغيّر شيئًا في الاستخدامات القائمة
  /// التي لا تمرّرها.
  readonly icon?: string;
  /// سلسلة قيم (من الأقدم إلى الأحدث) تُرسم خطًّا صغيرًا أسفل القيمة — اتجاهٌ
  /// بنظرة. لا تُرسم بأقل من نقطتين.
  readonly spark?: readonly number[];
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// بطاقة مؤشرٍ واحد: عنوانٌ ورقمٌ كبير، وإضافةٌ اختيارية تحتهما.
export function ImdKpi({
  label,
  value,
  color,
  extra,
  icon,
  spark,
  colors,
  className = '',
}: ImdKpiProps) {
  const inStrip = useContext(ImdKpiStripContext);
  const bp = useImdBp();
  const c = resolveActiveColors(colors);

  if (inStrip) {
    return (
      <div className={`inline-flex min-w-0 max-w-full items-center px-[10px] py-[6px] ${className}`.trim()}>
        {icon !== undefined && (
          <span className="inline-flex shrink-0 items-center" style={{ marginInlineEnd: 5 }}>
            <ImdIcon name={icon} size={13} color={color ?? c.muted} />
          </span>
        )}
        <span
          className="min-w-0 truncate text-[12px] font-medium"
          style={{ color: c.muted.css }}
        >
          {label}
        </span>
        <span
          className="shrink-0 text-[15px] font-bold leading-[1.2]"
          style={{ color: (color ?? c.text).css, marginInlineStart: 6 }}
        >
          {value}
        </span>
        {extra !== undefined && extra !== null && (
          <span className="inline-flex shrink-0 items-center" style={{ marginInlineStart: 6 }}>
            {extra}
          </span>
        )}
      </div>
    );
  }

  const mobile = bp.mobile;
  return (
    <div
      className={`flex min-w-0 flex-col items-start ${mobile ? 'p-3' : 'px-[18px] py-4'} ${className}`.trim()}
      style={{
        backgroundColor: c.subtle.css,
        border: `1px solid ${c.line.css}`,
        borderRadius: ImdSizes.radius,
        boxShadow: imdShadowCss(c),
      }}
    >
      <div className="flex min-w-0 max-w-full items-center">
        {icon !== undefined && (
          <span className="inline-flex shrink-0 items-center" style={{ marginInlineEnd: 5 }}>
            <ImdIcon name={icon} size={13} color={color ?? c.muted} />
          </span>
        )}
        <span
          className="min-w-0 text-[12.5px] font-medium leading-[1.6]"
          style={{ color: c.muted.css }}
        >
          {label}
        </span>
      </div>

      <div
        className="mt-[5px] font-bold leading-none"
        style={{
          fontSize: mobile ? 22 : 28,
          color: (color ?? c.text).css,
        }}
      >
        {value}
      </div>

      {spark !== undefined && spark.length >= 2 && (
        <div className="mt-2 h-[22px] w-full">
          <ImdSparkPainter values={spark} color={color ?? c.accent} />
        </div>
      )}

      {extra !== undefined && extra !== null && <div className="mt-[6px]">{extra}</div>}
    </div>
  );
}

export interface ImdSparkPainterProps {
  readonly values: readonly number[];
  readonly color: ImdColor;
}

/// خطٌّ مصغَّر (sparkline) بلا محاور — مقياسه من أدنى السلسلة إلى أعلاها، ونقطته
/// الأخيرة معلَّمةٌ بدائرة. في RTL يُرسم الأحدث عند الطرف البدئي (اليمين).
export function ImdSparkPainter({ values, color }: ImdSparkPainterProps) {
  if (values.length < 2) return null;

  const width = 200;
  const height = 22;
  const pad = 3.0;
  let lo = values[0];
  let hi = values[0];
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo === 0 ? 1.0 : hi - lo;

  const points = values.map((v, i) => {
    const x = pad + ((width - 2 * pad) * i) / (values.length - 1);
    const y = height - pad - (height - 2 * pad) * ((v - lo) / span);
    return { x, y };
  });

  const d = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={color.withValues({ alpha: 0.85 }).css}
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color.css} />
    </svg>
  );
}

export interface ImdGridRowsProps {
  readonly children: ReactNode;
  readonly cols: number;
  readonly gap?: number;
  readonly runGap?: number;
  readonly className?: string;
}

/// صفوف شبكة متساوية الأعمدة بارتفاع موحّد داخل كل صف (سلوك CSS grid: align-items: stretch).
export function ImdGridRows({
  children,
  cols,
  gap = 16,
  runGap,
  className = '',
}: ImdGridRowsProps) {
  const safeCols = Math.max(1, cols);
  return (
    <div
      className={`grid items-stretch ${className}`.trim()}
      style={{
        gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))`,
        columnGap: gap,
        rowGap: runGap ?? gap,
      }}
    >
      {Children.toArray(children)}
    </div>
  );
}

export interface ImdEqualRowProps {
  readonly children: ReactNode;
  readonly gap?: number;
  readonly className?: string;
}

/// صف بأعمدة متساوية العرض، يُمدَّد كل عمود لارتفاع أطول عمود.
export function ImdEqualRow({ children, gap = 16, className = '' }: ImdEqualRowProps) {
  return (
    <div
      className={`grid grid-flow-col auto-cols-[minmax(0,1fr)] items-stretch ${className}`.trim()}
      style={{ gap }}
    >
      {Children.toArray(children)}
    </div>
  );
}

export interface ImdGrid2Props {
  readonly children: ReactNode;
  readonly cols?: number;
  readonly gap?: number;
  readonly bottom?: number;
  readonly className?: string;
}

/// عمودان متساويان بفجوة 16 وهامش سفلي 20؛ عمود واحد ≤900.
export function ImdGrid2({
  children,
  cols = 2,
  gap = 16,
  bottom = 20,
  className = '',
}: ImdGrid2Props) {
  const one = useImdBp().tablet;
  return (
    <div className={className} style={{ marginBottom: bottom }}>
      <ImdGridRows cols={one ? 1 : cols} gap={gap}>
        {children}
      </ImdGridRows>
    </div>
  );
}

export interface ImdRbarProps {
  readonly children: ReactNode;
  readonly bottom?: number;
  /// العنصر الأول بعرض كامل (حقل بحثٍ داخل الشريط) والباقي في سطر تحته.
  readonly fullFirst?: boolean;
  readonly className?: string;
}

/// شريط أزرار ملتف بفجوة 8؛ على الجوال كل زر بعرض كامل.
export function ImdRbar({
  children,
  bottom = 10,
  fullFirst = false,
  className = '',
}: ImdRbarProps) {
  const mobile = useImdBp().mobile;
  const items = Children.toArray(children);

  if (fullFirst && !mobile && items.length > 0) {
    return (
      <div
        className={`flex flex-col items-stretch ${className}`.trim()}
        style={{ marginBottom: bottom }}
      >
        {items[0]}
        {items.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">{items.slice(1)}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${
        mobile
          ? 'flex flex-col items-stretch gap-2'
          : 'flex flex-wrap items-end gap-2'
      } ${className}`.trim()}
      style={{ marginBottom: bottom }}
    >
      {items}
    </div>
  );
}

export type ImdStatusListItem = readonly [status: string, title: string, description: string];

export interface ImdStatusListProps {
  /// (الحالة: '' | 'warn' | 'err'، العنوان، الوصف)
  readonly items: readonly ImdStatusListItem[];
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// قائمة حالات: لكل سطرٍ نقطةٌ ملوّنة وعنوانٌ ووصف.
export function ImdStatusList({
  items,
  colors,
  className = '',
}: ImdStatusListProps) {
  const c = resolveActiveColors(colors);
  return (
    <div className={`flex flex-col items-stretch gap-[10px] ${className}`.trim()}>
      {items.map(([status, title, description], i) => {
        const dotColor =
          status === 'err' ? c.danger : status === 'warn' ? c.warn : c.success;
        return (
          <div
            key={i}
            className="flex items-start gap-[10px] p-3"
            style={{
              backgroundColor: c.surface.css,
              border: `1px solid ${c.line.css}`,
              borderRadius: ImdSizes.radius,
              boxShadow: imdShadowCss(c),
            }}
          >
            <span
              className="mt-[5px] h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: dotColor.css }}
            />
            <div className="min-w-0 flex-1 flex flex-col items-start">
              <div
                className="text-[14px] font-black leading-[1.6]"
                style={{ color: c.text.css }}
              >
                {title}
              </div>
              <div
                className="text-[12.5px] leading-[1.8]"
                style={{ color: c.muted.css }}
              >
                {description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface ImdAutoGridProps {
  readonly children: ReactNode;
  readonly minItem?: number;
  readonly gap?: number;
  readonly bottom?: number;
  readonly className?: string;
}

/// `repeat(auto-fit, minmax(<minItem>px, 1fr))` — شبكة تتكيّف بعدد الأعمدة حسب العرض.
export function ImdAutoGrid({
  children,
  minItem = 180,
  gap = 12,
  bottom = 0,
  className = '',
}: ImdAutoGridProps) {
  return (
    <div
      className={`grid items-stretch ${className}`.trim()}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItem}px, 100%), 1fr))`,
        gap,
        marginBottom: bottom,
      }}
    >
      {Children.toArray(children)}
    </div>
  );
}

/// أعلى تكبيرٍ للخط يتحمّله التخطيط.
///
/// المستخدم يضبط حجم الخط من إعدادات الهاتف فيُضرب كل نصٍّ فيه. السقف ٢٠٠٪
/// (WCAG 1.4.4، M-24) — ما فوق السقف يُقصّ إليه، وما دونه يُترك كما اختاره.
export const kImdMaxTextScale = 2.0;

export function imdClampedTextScale(scale: number): number {
  if (!Number.isFinite(scale) || scale < 0) return 0;
  return scale > kImdMaxTextScale ? kImdMaxTextScale : scale;
}
