import { useEffect, useState } from 'react';
import { useAuthService } from '../security/auth_service';
import { Perm } from '../security/perm';
import { ImdFiles } from './imd_files';
import { ImdStyle } from './imd_style';
import { ImdColors } from './imd_tokens';
import { ImdButton, ImdButtonOutline } from './imd_widgets';

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

/// إعداد أدوات الجدول لكل شاشة — نفس `PM` و`IMP` في forms-ux.js:
/// p طباعة، x تصدير Excel. الافتراضي يُعدَّل من الإعدادات ويُحفظ على الجهاز (imdad.toolbarCfg).
export class ImdToolbarMeta {
  readonly label: string;
  readonly group: string;
  readonly table: boolean;
  readonly p: boolean;
  readonly x: boolean;
  readonly doc: boolean;
  readonly own: boolean;

  constructor(
    label: string,
    group: string,
    {
      table = false,
      p = false,
      x = false,
      doc = false,
      own = false,
    }: {
      readonly table?: boolean;
      readonly p?: boolean;
      readonly x?: boolean;
      readonly doc?: boolean;
      readonly own?: boolean;
    } = {},
  ) {
    this.label = label;
    this.group = group;
    this.table = table;
    this.p = p;
    this.x = x;
    this.doc = doc;
    this.own = own;
  }
}

export class ImdToolbarCfg {
  private constructor() {}

  static readonly key = 'imdad.toolbarCfg';

  static readonly pages: Readonly<Record<string, ImdToolbarMeta>> = {
    items: new ImdToolbarMeta('الأصناف', 'البيانات الأساسية', {
      table: true,
      x: true,
    }),
    units: new ImdToolbarMeta('الوحدات المستفيدة', 'البيانات الأساسية'),
    suppliers: new ImdToolbarMeta('الموردون', 'البيانات الأساسية', {
      table: true,
    }),
    stores: new ImdToolbarMeta('المستودعات', 'البيانات الأساسية', {
      table: true,
    }),
    kitchens: new ImdToolbarMeta('المطابخ والأفران', 'البيانات الأساسية'),
    receive: new ImdToolbarMeta('الاستلام (الواردات)', 'العمليات المخزنية', {
      doc: true,
    }),
    issue: new ImdToolbarMeta('الصرف', 'العمليات المخزنية', { doc: true }),
    transfer: new ImdToolbarMeta('التحويل المخزني', 'العمليات المخزنية', {
      doc: true,
    }),
    returns: new ImdToolbarMeta('المرتجعات', 'العمليات المخزنية', { doc: true }),
    pendingOrders: new ImdToolbarMeta('أوامر التوريد', 'العمليات المخزنية'),
    feeding: new ImdToolbarMeta('التفريدة اليومية', 'التشغيل اليومي', {
      own: true,
    }),
    kitchenLog: new ImdToolbarMeta('سجل التشغيل', 'التشغيل اليومي'),
    ratios: new ImdToolbarMeta('نسب الاستحقاق', 'التشغيل اليومي', {
      table: true,
      own: true,
    }),
    balances: new ImdToolbarMeta('الأرصدة الحالية', 'التقارير والجرد', {
      table: true,
      own: true,
    }),
    stocktake: new ImdToolbarMeta('جرد المخزون', 'التقارير والجرد', {
      own: true,
    }),
    auditTrail: new ImdToolbarMeta('سجل النشاط والتدقيق', 'التقارير والجرد', {
      table: true,
      x: true,
    }),
  };

  static async overrides(): Promise<Record<string, unknown>> {
    try {
      if (typeof localStorage === 'undefined') return {};
      const raw = localStorage.getItem(ImdToolbarCfg.key) ?? '{}';
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  static async set(page: string, flag: string, on: boolean): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      const all = await ImdToolbarCfg.overrides();
      const cur = all[page];
      const m: Record<string, unknown> =
        cur && typeof cur === 'object' && !Array.isArray(cur)
          ? { ...(cur as Record<string, unknown>) }
          : {};
      m[flag] = on;
      all[page] = m;
      localStorage.setItem(ImdToolbarCfg.key, JSON.stringify(all));
    } catch {
      // تعذّر الكتابة إلى localStorage لا يُسقط الواجهة.
    }
  }

  static async reset(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(ImdToolbarCfg.key);
    } catch {
      // تجاهل أخطاء التخزين المحلي.
    }
  }

  /// `tbFor(page)`
  static async of(
    page: string,
  ): Promise<{ readonly p: boolean; readonly x: boolean }> {
    const m = ImdToolbarCfg.pages[page];
    if (!m) return { p: false, x: false };
    const all = await ImdToolbarCfg.overrides();
    const rawOverride = all[page];
    const o: Record<string, unknown> =
      rawOverride && typeof rawOverride === 'object' && !Array.isArray(rawOverride)
        ? (rawOverride as Record<string, unknown>)
        : {};
    const v = (k: string, def: boolean): boolean =>
      Object.prototype.hasOwnProperty.call(o, k) ? o[k] === true : def;
    return {
      p: m.table && v('p', m.p),
      x: m.table && v('x', m.x),
    };
  }
}

export interface ImdTableToolbarProps {
  readonly page: string;
  readonly onPrint?: (() => void) | null;
  readonly onExport?: (() => void) | null;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// `#imdTbar` — شريط الأدوات فوق الجدول.
export function ImdTableToolbar({
  page,
  onPrint,
  onExport,
  colors,
  className = '',
}: ImdTableToolbarProps) {
  const [cfg, setCfg] = useState<{
    readonly p: boolean;
    readonly x: boolean;
  } | null>(null);

  const auth = useAuthService();

  useEffect(() => {
    let active = true;
    ImdToolbarCfg.of(page).then((v) => {
      if (active) setCfg(v);
    });
    return () => {
      active = false;
    };
  }, [page]);

  if (cfg === null) return null;

  // أدوات الشاشة تخضع لصلاحيات المستخدم: طباعة / تصدير / (استيراد = إضافة).
  // بلا مزوّد مصادقة (الاختبارات المعزولة) لا تُقيَّد.
  const perm = auth === null ? null : new Perm(auth);
  const allowed = (action: string): boolean =>
    perm === null || perm.has(page, action);

  const t = {
    p: cfg.p && allowed('print'),
    x: cfg.x && allowed('export'),
  };

  if (!t.p && !t.x) return null;

  const c = resolveActiveColors(colors);

  return (
    <div
      className={`flex flex-wrap items-center gap-[6px] ${className}`.trim()}
      style={{
        marginTop: 4,
        marginBottom: 10,
        padding: 6,
        backgroundColor: c.toolbarFill.css,
        border: `1px solid ${c.toolbarLine.css}`,
        borderRadius: 12,
      }}
    >
      {t.p && (
        <ImdButton
          label="طباعة / PDF"
          icon="printer"
          small={true}
          onPressed={onPrint}
          colors={c}
        />
      )}
      {t.x && (
        <ImdButtonOutline
          label="تصدير Excel"
          icon="chart"
          small={true}
          onPressed={onExport}
          colors={c}
        />
      )}
    </div>
  );
}

/// تصدير Excel بورقة واحدة «Sheet1». الاستيراد انتقل إلى قوالب `ExcelTemplates`.
export class ImdExcel {
  private constructor() {}

  // MISSING: xlsx (المرحلة 3/19)
  static build(
    _headers: readonly string[],
    _rows: readonly (readonly string[])[],
  ): Uint8Array {
    return new Uint8Array(0);
  }

  /// `jsonToXLSX(headers, rows, fn)` / `tableXLSX(tbl, fn)`
  static async save(
    fileName: string,
    headers: readonly string[],
    rows: readonly (readonly string[])[],
  ): Promise<void> {
    await ImdFiles.saveBytes(`${fileName}.xlsx`, ImdExcel.build(headers, rows));
  }
}
