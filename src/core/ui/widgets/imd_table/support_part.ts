import type { CSSProperties, Key, ReactNode } from 'react';
import type { ImdMenuItem } from '../../imd_context_menu';
import { ImdStyle } from '../../imd_style';
import { ImdColor, ImdColors } from '../../imd_tokens';

export function resolveTableColors(explicit?: ImdColors): ImdColors {
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

export type ImdTableColor = ImdColor | string;

export function toTableColorCss(
  val: ImdTableColor | null | undefined,
): string | undefined {
  if (val === null || val === undefined) return undefined;
  return val instanceof ImdColor ? val.css : val;
}

export interface ImdTablePadding {
  readonly horizontal?: number;
  readonly vertical?: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

export function resolveTablePadding(
  pad: ImdTablePadding | string | undefined,
  fallbackVertical: number,
  fallbackHorizontal = 12,
): CSSProperties {
  if (typeof pad === 'string') {
    return { padding: pad };
  }
  if (!pad) {
    return {
      paddingTop: fallbackVertical,
      paddingBottom: fallbackVertical,
      paddingLeft: fallbackHorizontal,
      paddingRight: fallbackHorizontal,
    };
  }
  const v = pad.vertical;
  const h = pad.horizontal;
  return {
    paddingTop: pad.top ?? v ?? fallbackVertical,
    paddingBottom: pad.bottom ?? v ?? fallbackVertical,
    paddingLeft: pad.left ?? h ?? fallbackHorizontal,
    paddingRight: pad.right ?? h ?? fallbackHorizontal,
  };
}

export interface ImdColOptions {
  readonly flex?: number;
  readonly width?: number;
  readonly numeric?: boolean;
  readonly center?: boolean;
  readonly auto?: boolean;
}

export interface ImdColSpec extends ImdColOptions {
  readonly label: string;
}

/// عمود في `table.u`
export class ImdCol implements ImdColSpec {
  readonly label: string;
  /// يُستخدم فقط حين `auto: false` (عمود نسبي ثابت لخلايا لا تدعم القياس الذاتي مثل القوائم المنسدلة).
  readonly flex: number;
  readonly width?: number;
  readonly numeric: boolean;
  readonly center: boolean;
  /// عرض تلقائي حسب المحتوى كجداول HTML (الافتراضي).
  readonly auto: boolean;

  constructor(label: string, options: ImdColOptions = {}) {
    this.label = label;
    this.flex = options.flex ?? 1;
    this.width = options.width;
    this.numeric = options.numeric ?? false;
    this.center = options.center ?? false;
    this.auto = options.auto ?? true;
  }
}

export function normalizeImdCol(col: ImdColSpec): ImdCol {
  if (col instanceof ImdCol) return col;
  return new ImdCol(col.label, {
    flex: col.flex,
    width: col.width,
    numeric: col.numeric,
    center: col.center,
    auto: col.auto,
  });
}

/// أقصى عرضٍ يبلغه عمودٌ تلقائي — ملاحظةٌ من مئتي حرف لا تجعل الجدول شريطًا.
export const HTML_COLUMN_MAX_AUTO = 560;

/// عدد الصفوف الذي يُفعَّل بعده الترقيم التلقائي حين لا يُمرَّر [pageSize].
export const AUTO_PAGE_THRESHOLD = 300;

/// صفوف الصفحة التي يُمثَّل بعدها الجسم افتراضيًّا (يُبنى الظاهر وحده) حين
/// يكون للجدول سقف ارتفاع ([maxHeight]).
export const VIRTUALIZE_ABOVE = 80;

/// حجم الصفحة في الترقيم التلقائي.
export const AUTO_PAGE_SIZE = 100;

/// بند عرضٍ في [ImdTable]: صفٌّ بفهرسه المطلق، أو رأس مجموعة.
export class TableItem {
  readonly row: number;
  readonly key: string | null;
  readonly count: number;
  readonly collapsed: boolean;

  private constructor(
    row: number,
    key: string | null,
    count: number,
    collapsed: boolean,
  ) {
    this.row = row;
    this.key = key;
    this.count = count;
    this.collapsed = collapsed;
  }

  static row(row: number): TableItem {
    return new TableItem(row, null, 0, false);
  }

  static group(key: string, count: number, collapsed: boolean): TableItem {
    return new TableItem(-1, key, count, collapsed);
  }

  get isGroup(): boolean {
    return this.key !== null;
  }
}

export interface ImdTableProps {
  readonly columns: readonly ImdColSpec[];
  readonly rows: readonly (readonly ReactNode[])[];
  readonly rowKeys?: readonly Key[] | null;
  readonly empty?: string;
  readonly onRowTap?: ((index: number) => void) | null;
  readonly rowMenu?: ((index: number) => readonly ImdMenuItem[]) | null;
  readonly rowColor?: ((index: number) => ImdTableColor | null | undefined) | null;
  readonly footer?: readonly ReactNode[] | null;
  readonly zebra?: boolean;
  readonly minWidth?: number;
  readonly maxHeight?: number;
  readonly onHeaderTap?: ((index: number) => void) | null;
  readonly sortIndex?: number | null;
  readonly sortAsc?: boolean;
  readonly pageSize?: number | null;
  readonly onPageChanged?: ((page: number) => void) | null;
  readonly cards?: boolean;
  readonly headerBackground?: ImdTableColor | null;
  readonly headerForeground?: ImdTableColor | null;
  readonly headerPadding?: ImdTablePadding | string;
  readonly cellPadding?: ImdTablePadding | string;
  readonly gridLines?: boolean;
  readonly cellFontSize?: number;
  readonly flushCells?: boolean;
  readonly values?: readonly (readonly unknown[])[] | null;
  readonly filterable?: boolean;
  readonly groupable?: boolean;
  readonly freezeFirst?: boolean | null;
  readonly colors?: ImdColors;
  readonly className?: string;
}
