import { createContext, useContext, type ReactNode } from 'react';
import { ImdAutoGrid } from './imd_layout';
import { ImdStyle } from './imd_style';
import { ImdColor, ImdColors, ImdSizes } from './imd_tokens';

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

function resolveRtl(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  if (typeof document !== 'undefined') {
    const dir = document.documentElement.dir || document.body?.dir;
    if (dir) return dir.toLowerCase() === 'rtl';
  }
  return true;
}

interface ImdShimmerState {
  readonly enabled: boolean;
  readonly baseColor: ImdColor;
  readonly highlightColor: ImdColor;
  readonly rtl: boolean;
}

const ImdShimmerContext = createContext<ImdShimmerState | null>(null);

export interface ImdShimmerProps {
  readonly children: ReactNode;
  /// false ⇒ يُعرض [children] كما هو (للحالات التي يُستغنى فيها عن الحركة).
  readonly enabled?: boolean;
  readonly colors?: ImdColors;
  readonly rtl?: boolean;
  readonly className?: string;
}

/// غلاف تحميل لامع (Skeleton) بألوان السمة.
///
/// يُلفّ حول أشكالٍ **مصمَتة** تحاكي المحتوى القادم؛ فاللمعان يُرسم على شكلها
/// فقط. مثال: صفوف حاويات بزوايا 12 بدل جدولٍ يُحمَّل.
///
/// الألوان مشتقّة من `c.text` فوق `c.surface` فتصلح في الفاتح والداكن
/// وسمة المحروقات. ويسير اللمعان مع اتجاه القراءة (يمين→يسار في RTL).
export function ImdShimmer({
  children,
  enabled = true,
  colors,
  rtl,
  className = '',
}: ImdShimmerProps) {
  if (!enabled) return <>{children}</>;

  const c = resolveActiveColors(colors);
  const baseColor = ImdColor.alphaBlend(c.text.withValues({ alpha: 0.08 }), c.surface);
  const highlightColor = ImdColor.alphaBlend(c.text.withValues({ alpha: 0.16 }), c.surface);
  const isRtl = resolveRtl(rtl);

  return (
    <ImdShimmerContext.Provider
      value={{ enabled, baseColor, highlightColor, rtl: isRtl }}
    >
      <div
        aria-busy="true"
        data-shimmer-dir={isRtl ? 'rtl' : 'ltr'}
        className={className}
      >
        {children}
      </div>
    </ImdShimmerContext.Provider>
  );
}

export interface ImdShimmerBarProps {
  readonly width?: number | string;
  readonly height: number;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// شريطٌ مصمَتٌ بزوايا 4 — الوحدة الأساسية لكل هياكل التحميل هنا.
export function ImdShimmerBar({
  width,
  height,
  colors,
  className = '',
}: ImdShimmerBarProps) {
  const ctx = useContext(ImdShimmerContext);
  const c = resolveActiveColors(colors);

  if (!ctx || !ctx.enabled) {
    return (
      <div
        className={`rounded-[4px] ${className}`.trim()}
        style={{
          width: width ?? '100%',
          height,
          backgroundColor: c.subtle.css,
        }}
      />
    );
  }

  const gradient = `linear-gradient(90deg, ${ctx.baseColor.css} 0%, ${ctx.baseColor.css} 35%, ${ctx.highlightColor.css} 50%, ${ctx.baseColor.css} 65%, ${ctx.baseColor.css} 100%)`;

  return (
    <div
      className={`rounded-[4px] ${ctx.rtl ? 'imd-shimmer-rtl' : 'imd-shimmer-ltr'} ${className}`.trim()}
      style={{
        width: width ?? '100%',
        height,
        backgroundColor: ctx.baseColor.css,
        backgroundImage: gradient,
      }}
    />
  );
}

export interface ImdShimmerKpisProps {
  /// عدد بطاقات الهيكل — يُستحسن مطابقته لعدد `ImdKpi` الحقيقية القادمة.
  readonly count?: number;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// هيكل تحميلٍ لصفّ `ImdKpis`: بطاقاتٌ بنفس حجم `ImdKpi` وحشوته، بشريطين
/// مكان العنوان والقيمة، داخل `ImdAutoGrid` (نفس تكيّف الشبكة الحقيقية).
export function ImdShimmerKpis({
  count = 6,
  colors,
  className = '',
}: ImdShimmerKpisProps) {
  const c = resolveActiveColors(colors);
  return (
    <div className={`mb-5 ${className}`.trim()}>
      <ImdShimmer colors={c}>
        <ImdAutoGrid minItem={210} gap={14}>
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className="flex flex-col items-start px-[18px] py-4"
              style={{
                backgroundColor: c.surface.css,
                border: `1px solid ${c.line.css}`,
                borderRadius: ImdSizes.radius,
              }}
            >
              <ImdShimmerBar width={90} height={10} colors={c} />
              <div className="mt-[11px]">
                <ImdShimmerBar width={60} height={22} colors={c} />
              </div>
            </div>
          ))}
        </ImdAutoGrid>
      </ImdShimmer>
    </div>
  );
}

export interface ImdShimmerTableProps {
  readonly rows?: number;
  readonly columns?: number;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// هيكل تحميلٍ لـ `ImdTable`: نفس حاوية الجدول الحقيقية (حدّ وزوايا) برأسٍ
/// وصفوفٍ من أشرطة بعدد الأعمدة المطلوب، بدل انتظار البيانات بلا شكل.
export function ImdShimmerTable({
  rows = 5,
  columns = 4,
  colors,
  className = '',
}: ImdShimmerTableProps) {
  const c = resolveActiveColors(colors);

  const renderCells = (barHeight: number) => (
    <div className="flex w-full items-center gap-4">
      {Array.from({ length: columns }, (_, j) => (
        <div key={j} className="min-w-0 flex-1">
          <ImdShimmerBar height={barHeight} colors={c} />
        </div>
      ))}
    </div>
  );

  return (
    <ImdShimmer colors={c} className={className}>
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: c.surface.css,
          border: `1px solid ${c.line.css}`,
          borderRadius: ImdSizes.radius,
        }}
      >
        <div
          className="px-3 py-3"
          style={{
            backgroundColor: c.tableHead.css,
            borderBottom: `1px solid ${c.line.css}`,
          }}
        >
          {renderCells(10)}
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="px-3 py-[13px]"
            style={{
              borderBottom:
                i === rows - 1 ? undefined : `1px solid ${c.tableRowLine.css}`,
            }}
          >
            {renderCells(13)}
          </div>
        ))}
      </div>
    </ImdShimmer>
  );
}
