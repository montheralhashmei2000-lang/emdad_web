import { useEffect, useRef, useState, type RefObject } from 'react';
import { arDigits, nf } from './imd_format';
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

function useContainerWidth(
  ref: RefObject<HTMLDivElement | null>,
  fallback = 560,
): number {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (Number.isFinite(w) && w > 0) setWidth(w);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// الشبكة والنصوص تتبع السمة؛ القيمتان أدناه هما لونا الوضع الفاتح فقط، وفي
// الداكن تُشتقّ من رموز الثيم — بلا ذلك تختفي الشبكة الفاتحة على خلفيةٍ داكنة.
const _gridColor = ImdColors.chartGridLight;
const _tickColor = ImdColors.chartTickLight;

export interface ImdSeriesLike {
  readonly label: string;
  readonly values: readonly number[];
  readonly color: ImdColor;
}

export class ImdSeries implements ImdSeriesLike {
  readonly label: string;
  readonly values: readonly number[];
  readonly color: ImdColor;

  constructor(label: string, values: readonly number[], color: ImdColor) {
    this.label = label;
    this.values = values;
    this.color = color;
  }
}

/// «خطوات» المحور: أرقامٌ مستريحة (1، 2، 5 ومضاعفاتها) تغطّي أكبر قيمة.
export function _niceTicks(maxV: number, maxTicks = 11): number[] {
  if (!Number.isFinite(maxV) || maxV <= 0) {
    return Array.from({ length: 11 }, (_, i) => i / 10);
  }
  const nice = (range: number, round: boolean): number => {
    if (!Number.isFinite(range) || range <= 0) return 1;
    const exp = Math.floor(Math.log(range) / Math.LN10);
    const pow10 = Math.pow(10, exp);
    const f = range / pow10;
    let factor: number;
    if (round) {
      factor = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
    } else {
      factor = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    }
    return factor * pow10;
  };

  const step = Math.max(
    1.0,
    nice(nice(maxV, false) / Math.max(1, maxTicks - 1), true),
  );
  const top = Math.ceil(maxV / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) {
    out.push(v);
  }
  return out;
}

/// القيم تُعرض بعدد خانات الخطوة: الصفر «0» والباقي «0.1 … 1.0» عند خطوة كسرية،
/// وتُحوَّل أرقامها عبر `ImdFormat` (عربية/لاتينية).
function _tickLabel(v: number, ticks: readonly number[]): string {
  const fractional = ticks.length > 1 && ticks[1] - ticks[0] < 1;
  if (v === 0) return arDigits('0');
  return fractional ? arDigits(v.toFixed(1)) : nf(Math.trunc(v));
}

function estimateTextWidth(s: string, fontSize = 12): number {
  return Math.max(8, s.length * fontSize * 0.62);
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

/// منحنى بيزيه بتوتّرٍ يُنعّم الخط بلا أن يتجاوز نقاطه.
function smoothPath(p: readonly Pt[], t: number): string {
  if (p.length === 0) return '';
  const parts: string[] = [`M ${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = i > 0 ? p[i - 1] : p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = i + 2 < p.length ? p[i + 2] : p2;
    const c1x = p1.x + ((p2.x - p0.x) * t) / 2;
    const c1y = p1.y + ((p2.y - p0.y) * t) / 2;
    const c2x = p2.x - ((p3.x - p1.x) * t) / 2;
    const c2y = p2.y - ((p3.y - p1.y) * t) / 2;
    parts.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }
  return parts.join(' ');
}

export interface ImdLineChartProps {
  readonly labels: readonly string[];
  readonly series: readonly ImdSeriesLike[];
  readonly height?: number;
  readonly gridColor?: ImdColor;
  readonly tickColor?: ImdColor;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// مخطط خطي متعدد السلاسل مع تعبئة شفافة وانحناء 0.35.
export function ImdLineChart({
  labels,
  series,
  height = 280,
  gridColor,
  tickColor,
  colors,
  className = '',
}: ImdLineChartProps) {
  const c = resolveActiveColors(colors);
  const grid = gridColor ?? (c.isDark ? c.line : _gridColor);
  const tick = tickColor ?? c.muted ?? _tickColor;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const width = useContainerWidth(containerRef, 560);
  const legendHeight = 28;
  const svgH = Math.max(80, height - legendHeight);

  let maxV = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (Number.isFinite(v) && v > maxV) maxV = v;
    }
  }
  const ticks =
    maxV <= 0
      ? Array.from({ length: 11 }, (_, i) => i / 10)
      : _niceTicks(maxV);
  const top = ticks[ticks.length - 1] || 1;
  const yLabelW =
    ticks.reduce(
      (maxW, t) => Math.max(maxW, estimateTextWidth(_tickLabel(t, ticks))),
      0,
    ) + 10;

  const bottomH = 22.0;
  const plotLeft = yLabelW;
  const plotTop = 6;
  const plotRight = Math.max(plotLeft + 1, width - 6);
  const plotBottom = Math.max(plotTop + 1, svgH - bottomH);
  const plotW = Math.max(0, plotRight - plotLeft);
  const plotH = Math.max(0, plotBottom - plotTop);

  const n = labels.length;
  const xOf = (i: number) =>
    n <= 1 ? plotLeft + plotW / 2 : plotLeft + (plotW * i) / (n - 1);
  // تسميات المحور السيني: 8 كحد أقصى (autoSkip).
  const skip = Math.min(1000, Math.max(1, Math.ceil(n / 8)));

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={`flex w-full min-w-0 flex-col ${className}`.trim()}
      style={{ height }}
    >
      <div className="min-h-0 w-full flex-1">
        <svg
          viewBox={`0 0 ${width} ${svgH}`}
          className="block h-full w-full overflow-visible"
          role="img"
        >
          {ticks.map((t, idx) => {
            const ratio = top === 0 ? 0 : t / top;
            const y = plotBottom - ratio * plotH;
            return (
              <g key={`y-${idx}`}>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke={grid.css}
                  strokeWidth={1}
                />
                <text
                  x={plotLeft - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={tick.css}
                  fontSize={12}
                >
                  {_tickLabel(t, ticks)}
                </text>
              </g>
            );
          })}

          {n > 0 &&
            Array.from({ length: n }, (_, i) => i)
              .filter((i) => i % skip === 0)
              .map((i) => (
                <text
                  key={`x-${i}`}
                  x={xOf(i)}
                  y={plotBottom + 16}
                  textAnchor="middle"
                  fill={tick.css}
                  fontSize={12}
                >
                  {arDigits(labels[i])}
                </text>
              ))}

          {n > 0 &&
            series.map((s, sIdx) => {
              const pts: Pt[] = [];
              for (let i = 0; i < n; i++) {
                const raw = i < s.values.length ? s.values[i] : 0;
                const val = Number.isFinite(raw) ? raw : 0;
                const y = plotBottom - (top === 0 ? 0 : (val / top) * plotH);
                pts.push({ x: xOf(i), y });
              }
              if (pts.length === 0) return null;
              const pathD = smoothPath(pts, 0.35);
              const fillD = `${pathD} L ${pts[pts.length - 1].x.toFixed(2)} ${plotBottom.toFixed(2)} L ${pts[0].x.toFixed(2)} ${plotBottom.toFixed(2)} Z`;

              return (
                <g key={`s-${sIdx}`}>
                  <path d={fillD} fill={s.color.withValues({ alpha: 0.125 }).css} />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={s.color.css}
                    strokeWidth={2.4}
                    strokeLinejoin="round"
                  />
                  {pts.map((p, pIdx) => (
                    <circle
                      key={`pt-${pIdx}`}
                      cx={p.x}
                      cy={p.y}
                      r={2.5}
                      fill={s.color.withValues({ alpha: 0.125 }).css}
                      stroke={s.color.css}
                      strokeWidth={1}
                    />
                  ))}
                </g>
              );
            })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-[10px] gap-y-1">
        {series.map((s, idx) => (
          <div key={idx} className="inline-flex items-center gap-[10px]">
            <span
              className="inline-block h-3 w-10 shrink-0"
              style={{
                backgroundColor: s.color.withValues({ alpha: 0.125 }).css,
                border: `2.4px solid ${s.color.css}`,
              }}
            />
            <span className="text-[12px]" style={{ color: tick.css }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface ImdHBarChartProps {
  readonly labels: readonly string[];
  readonly values: readonly number[];
  /// لون الأعمدة — الافتراضي لون التمييز في السمة الحالية.
  readonly color?: ImdColor;
  readonly height?: number;
  readonly gridColor?: ImdColor;
  readonly tickColor?: ImdColor;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// مخطط أعمدة أفقية (indexAxis: 'y') بزوايا 8 وسماكة 20.
export function ImdHBarChart({
  labels,
  values,
  color,
  height = 280,
  gridColor,
  tickColor,
  colors,
  className = '',
}: ImdHBarChartProps) {
  const c = resolveActiveColors(colors);
  const barColor = color ?? c.accent;
  const grid = gridColor ?? (c.isDark ? c.line : _gridColor);
  const tick = tickColor ?? c.muted ?? _tickColor;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const width = useContainerWidth(containerRef, 560);

  let maxV = 0;
  for (const v of values) {
    if (Number.isFinite(v) && v > maxV) maxV = v;
  }
  const ticks =
    maxV <= 0
      ? Array.from({ length: 6 }, (_, i) => i / 5)
      : _niceTicks(maxV, 8);
  const top = ticks[ticks.length - 1] || 1;
  // التسميات على يسار المحور: اللوحة تُرسم باتجاه LTR.
  const labelW =
    labels.reduce((m, l) => Math.max(m, estimateTextWidth(l)), 0) + 10;

  const bottomH = 22.0;
  const plotLeft = labelW;
  const plotTop = 6;
  const plotRight = Math.max(plotLeft + 1, width - 12);
  const plotBottom = Math.max(plotTop + 1, height - bottomH);
  const plotW = Math.max(0, plotRight - plotLeft);
  const plotH = Math.max(0, plotBottom - plotTop);
  const n = labels.length;
  const band = n > 0 ? plotH / n : 0;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={`w-full min-w-0 ${className}`.trim()}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-full w-full overflow-visible"
        role="img"
      >
        {ticks.map((t, idx) => {
          const x = plotLeft + (top === 0 ? 0 : (t / top) * plotW);
          return (
            <g key={`x-${idx}`}>
              <line
                x1={x}
                y1={plotTop}
                x2={x}
                y2={plotBottom}
                stroke={grid.css}
                strokeWidth={1}
              />
              <text
                x={x}
                y={plotBottom + 16}
                textAnchor="middle"
                fill={tick.css}
                fontSize={12}
              >
                {_tickLabel(t, ticks)}
              </text>
            </g>
          );
        })}

        {n > 0 &&
          labels.map((label, i) => {
            const cy = plotTop + band * i + band / 2;
            const raw = i < values.length && Number.isFinite(values[i]) ? values[i] : 0;
            const w = top <= 0 ? 0 : Math.max(0, (raw / top) * plotW);
            return (
              <g key={`bar-${i}`}>
                <text
                  x={plotLeft - 8}
                  y={cy}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={tick.css}
                  fontSize={12}
                >
                  {label}
                </text>
                {w > 0 && (
                  <rect
                    x={plotLeft}
                    y={cy - 10}
                    width={w}
                    height={20}
                    rx={8}
                    ry={8}
                    fill={barColor.css}
                  />
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}

export interface ImdScoreRingProps {
  readonly percent: number;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// حلقة مؤشر بنسبة مئوية.
export function ImdScoreRing({
  percent,
  colors,
  className = '',
}: ImdScoreRingProps) {
  const c = resolveActiveColors(colors);
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const p = Math.min(1, Math.max(0, safePercent / 100));

  const size = 112;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  let arcPath = '';
  if (p >= 1) {
    arcPath = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  } else if (p > 0) {
    const startAngle = -Math.PI / 2;
    const sweep = 2 * Math.PI * p;
    const endAngle = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    arcPath = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }

  return (
    <div
      className={`relative inline-flex h-[112px] w-[112px] shrink-0 items-center justify-center ${className}`.trim()}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle cx={cx} cy={cy} r={r} fill={c.subtle.css} />
        {arcPath && <path d={arcPath} fill={c.accent.css} />}
      </svg>
      <div
        className="relative z-10 flex h-[78px] w-[78px] items-center justify-center rounded-full"
        style={{
          backgroundColor: c.surface.css,
          border: `1px solid ${c.line.css}`,
        }}
      >
        <span
          className="text-[26px] font-black leading-[1.2]"
          style={{ color: c.text.css }}
        >
          {`${nf(safePercent)}%`}
        </span>
      </div>
    </div>
  );
}

export interface ImdVBarChartProps {
  readonly labels: readonly string[];
  readonly series: readonly ImdSeriesLike[];
  readonly height?: number;
  readonly gridColor?: ImdColor;
  readonly tickColor?: ImdColor;
  readonly colors?: ImdColors;
  readonly className?: string;
}

function topRoundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rad = Math.max(0, Math.min(r, w / 2, h));
  if (rad <= 0) {
    return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
  return [
    `M ${x} ${y + rad}`,
    `A ${rad} ${rad} 0 0 1 ${x + rad} ${y}`,
    `H ${x + w - rad}`,
    `A ${rad} ${rad} 0 0 1 ${x + w} ${y + rad}`,
    `V ${y + h}`,
    `H ${x}`,
    'Z',
  ].join(' ');
}

/// مخطط أعمدةٍ رأسية مجمَّعة — سلسلةٌ أو أكثر لكل تسمية.
///
/// يأخذ ألوان الشبكة والتسميات من خارجه لأن قسم المحروقات داكن: شبكةٌ فاتحة
/// ثابتة تختفي على أرضيته، والرسم الذي لا يُقرأ زينةٌ لا معلومة.
export function ImdVBarChart({
  labels,
  series,
  height = 260,
  gridColor,
  tickColor,
  colors,
  className = '',
}: ImdVBarChartProps) {
  const c = resolveActiveColors(colors);
  const grid = gridColor ?? (c.isDark ? c.line : _gridColor);
  const tick = tickColor ?? c.muted ?? _tickColor;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const width = useContainerWidth(containerRef, 560);

  if (labels.length === 0 || series.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`w-full min-w-0 ${className}`.trim()}
        style={{ height }}
      />
    );
  }

  let maxV = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (Number.isFinite(v) && v > maxV) maxV = v;
    }
  }
  const ticks = _niceTicks(maxV, 6);
  const top = ticks[ticks.length - 1] || 1;
  const axisW =
    ticks.reduce(
      (maxW, t) => Math.max(maxW, estimateTextWidth(_tickLabel(t, ticks))),
      0,
    ) + 10;

  const bottomH = 26.0;
  const plotLeft = axisW;
  const plotTop = 8;
  const plotRight = Math.max(plotLeft + 1, width - 8);
  const plotBottom = Math.max(plotTop + 1, height - bottomH);
  const plotW = Math.max(0, plotRight - plotLeft);
  const plotH = Math.max(0, plotBottom - plotTop);

  const band = plotW / labels.length;
  // ثلث الحزمة فراغٌ بين المجموعات، وما بقي يُقسم على السلاسل.
  const groupW = band * 0.66;
  const barW = groupW / series.length;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={`w-full min-w-0 ${className}`.trim()}
      style={{ height }}
    >
      {plotW > 0 && plotH > 0 && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-full w-full overflow-visible"
          role="img"
        >
          {ticks.map((t, idx) => {
            const y = plotBottom - (top === 0 ? 0 : t / top) * plotH;
            return (
              <g key={`y-${idx}`}>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={plotRight}
                  y2={y}
                  stroke={grid.css}
                  strokeWidth={1}
                />
                <text
                  x={plotLeft - 6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={tick.css}
                  fontSize={12}
                >
                  {_tickLabel(t, ticks)}
                </text>
              </g>
            );
          })}

          {labels.map((label, i) => {
            const left = plotLeft + band * i + (band - groupW) / 2;
            const cx = plotLeft + band * i + band / 2;
            const showLabel = estimateTextWidth(label, 11) < band;

            return (
              <g key={`grp-${i}`}>
                {series.map((s, sIdx) => {
                  const raw = i < s.values.length ? s.values[i] : 0;
                  const v = Number.isFinite(raw) ? raw : 0;
                  if (v <= 0 || top === 0) return null;
                  const h = (v / top) * plotH;
                  const w = Math.max(1, barW - 2);
                  return (
                    <path
                      key={`bar-${sIdx}`}
                      d={topRoundedRectPath(
                        left + barW * sIdx,
                        plotBottom - h,
                        w,
                        h,
                        4,
                      )}
                      fill={s.color.css}
                    />
                  );
                })}
                {showLabel && (
                  <text
                    x={cx}
                    y={plotBottom + 17}
                    textAnchor="middle"
                    fill={tick.css}
                    fontSize={11}
                  >
                    {arDigits(label)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
