import { arDigits, nf } from './imd_format';
import { ImdStyle } from './imd_style';
import { ImdColors } from './imd_tokens';

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

export interface ImdOccupancyBarProps {
  readonly name: string;
  readonly used: number;
  readonly capacity: number;
  /// يُلحَق برقمَي الاستخدام والسعة في السطر السفلي (مثل «لتر»).
  readonly unit?: string;
  /// النسبة% التي يتحوّل عندها اللون إلى `c.warn` (امتلاء).
  readonly highAt?: number;
  /// النسبة% التي يتحوّل تحتها اللون إلى `c.danger` (نضوب).
  readonly lowAt?: number;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// شريط إشغال مع نسبة: اسم فوقه، شريط تقدّم، ونصّ «كذا من كذا» تحته.
///
/// اللون يتبع النسبة: `c.warn` عند الامتلاء (قرب طفح)، `c.danger` عند
/// الانخفاض الشديد، و`c.accent` بينهما، و`c.muted` إن كانت السعة غير معروفة
/// (صفر أو أقل) فلا نسبة تُحسب أصلًا.
///
/// عتباتها معاملاتٌ لا قيمًا ثابتة كي تصلح لأي مقياس سعة/استخدام آخر لاحقًا
/// (خزّانات المحروقات، مستودع، حصة، إلخ).
export function ImdOccupancyBar({
  name,
  used,
  capacity,
  unit = '',
  highAt = 90,
  lowAt = 20,
  colors,
  className = '',
}: ImdOccupancyBarProps) {
  const c = resolveActiveColors(colors);
  const safeUsed = Number.isFinite(used) ? used : 0;
  const safeCapacity = Number.isFinite(capacity) ? capacity : 0;
  const known = safeCapacity > 0;
  // لا حدّ أعلى للنسبة نفسها (خزّانٌ تجاوز سعته المسجَّلة يظهر رقمه الحقيقي
  // ولو فوق 100٪)؛ الشريط وحده يُقيَّد بصريًّا بين 0% و100%.
  const pct = known ? (safeUsed / safeCapacity) * 100 : 0.0;
  const fillPercent = known ? Math.min(100, Math.max(0, pct)) : 0;
  const color = !known
    ? c.muted
    : pct >= highAt
      ? c.warn
      : pct <= lowAt
        ? c.danger
        : c.accent;

  const pctText = known ? arDigits(`${Math.round(pct)}٪`) : 'بلا سعة';
  const unitSuffix = unit.length === 0 ? '' : ` ${unit}`;
  const detailText = known
    ? `${nf(safeUsed)}${unitSuffix} من ${nf(safeCapacity)}`
    : `${nf(safeUsed)}${unitSuffix}`;

  return (
    <div className={`flex w-full min-w-0 flex-col items-stretch ${className}`.trim()}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span
          className="min-w-0 flex-1 truncate text-[13.5px] font-bold"
          style={{ color: c.text.css }}
        >
          {name}
        </span>
        <span className="shrink-0 text-[11.5px]" style={{ color: c.muted.css }}>
          {pctText}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? Math.min(100, Math.max(0, Math.round(pct))) : 0}
        className="my-[6px] h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: c.subtle.css }}
      >
        <div
          className="h-full rounded-full transition-all duration-150"
          style={{
            width: `${fillPercent}%`,
            backgroundColor: color.css,
          }}
        />
      </div>

      <div
        className="min-w-0 truncate text-[11.5px]"
        style={{ color: c.muted.css }}
      >
        {detailText}
      </div>
    </div>
  );
}
