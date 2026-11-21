import {
  useRef,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { ImdMenuItem } from '../../imd_context_menu';
import { ImdDensity } from '../../imd_density';
import { ImdEmojiText, ImdIcon } from '../../imd_icon';
import { ImdBp, ImdColors, ImdCursor } from '../../imd_tokens';
import type { ImdTableBaseState } from './base_part';
import type { ImdTableDataLayer } from './data_part';
import { eventClientPoint, openTableRowMenu } from './groups_part';
import {
  HTML_COLUMN_MAX_AUTO,
  resolveTablePadding,
  toTableColorCss,
  type ImdCol,
  type ImdTableColor,
  type ImdTablePadding,
} from './support_part';

export interface ImdTableHeaderCellContentProps {
  readonly col: ImdCol;
  readonly index: number;
  readonly sortIndex?: number | null;
  readonly sortAsc: boolean;
  readonly headerForeground?: ImdTableColor | null;
  readonly onHeaderTap?: ((index: number) => void) | null;
  readonly filterable: boolean;
  readonly groupable: boolean;
  readonly base: ImdTableBaseState;
  readonly data: ImdTableDataLayer;
  readonly colors: ImdColors;
}

/// محتوى رأس العمود مع سهم الفرز وأيقونة التصفية وسحب العمود للتجميع.
export function ImdTableHeaderCellContent({
  col,
  index,
  sortIndex,
  sortAsc,
  headerForeground,
  onHeaderTap,
  filterable,
  groupable,
  base,
  data,
  colors: c,
}: ImdTableHeaderCellContentProps) {
  const sorted = sortIndex === index;
  const fgCss =
    toTableColorCss(headerForeground) ?? (sorted ? c.accent.css : c.muted.css);
  const mobile = ImdBp.of().mobile;

  const labelEl = (
    <ImdEmojiText
      text={col.label}
      iconSize={13}
      colors={c}
      style={{
        fontSize: 12.5,
        fontWeight: sorted ? 700 : 600,
        color: fgCss,
        lineHeight: 1.3,
      }}
    />
  );

  // السهم على العمود المفروز وحده: لو وُضع على كل عمودٍ قابلٍ للفرز لاتّسعت
  // كل الأعمدة (عرضها ذاتيٌّ من محتواها) وضاق الجدول بلا طائل.
  const titleEl = !sorted ? (
    labelEl
  ) : (
    <span className="inline-flex min-w-0 items-center">
      <span className="min-w-0 truncate">{labelEl}</span>
      <span style={{ width: 4, flexShrink: 0 }} />
      <ImdIcon
        name={sortAsc ? 'chevron-up' : 'chevron-down'}
        size={12}
        color={c.accent}
      />
    </span>
  );

  const showFilterBtn =
    base.tools && filterable && col.label.length > 0 && !mobile;
  const filterActive = base.filters.has(index);

  const headWithFilter = !showFilterBtn ? (
    titleEl
  ) : (
    <span className="inline-flex min-w-0 items-center">
      <span className="min-w-0 truncate">{titleEl}</span>
      <span style={{ width: 4, flexShrink: 0 }} />
      <button
        type="button"
        title="تصفية العمود"
        aria-label="تصفية العمود"
        onClick={(e) => {
          e.stopPropagation();
          void data.editFilter(index);
        }}
        className="inline-flex shrink-0 items-center justify-center rounded border-0 bg-transparent p-0.5 transition-colors hover:bg-[color:var(--imd-hover)]"
        style={{ cursor: ImdCursor.click }}
      >
        <ImdIcon
          name="sliders"
          size={11}
          color={filterActive ? c.accent : c.faint}
        />
      </button>
    </span>
  );

  const canDrag = base.tools && groupable && col.label.length > 0 && !mobile;

  const handleDragStart = (e: DragEvent<HTMLElement>) => {
    base.setDragCol(index);
    try {
      e.dataTransfer?.setData('text/imd-table-col', String(index));
      e.dataTransfer?.setData('text/plain', col.label);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    } catch {
      // بعض بيئات الاختبار قد لا تهيئ dataTransfer بالكامل
    }
  };

  const handleDragEnd = () => {
    base.setDragCol(null);
  };

  if (!onHeaderTap) {
    if (!canDrag) return headWithFilter;
    return (
      <div
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="inline-flex min-w-0 items-center"
      >
        {headWithFilter}
      </div>
    );
  }

  const hovered = base.headerHover === index;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canDrag}
      onDragStart={canDrag ? handleDragStart : undefined}
      onDragEnd={canDrag ? handleDragEnd : undefined}
      onMouseEnter={() => base.setHeaderHover(index)}
      onMouseLeave={() => base.setHeaderHover(-1)}
      onClick={() => onHeaderTap(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onHeaderTap(index);
        }
      }}
      className="inline-flex min-w-0 items-center rounded transition-colors duration-100"
      style={{
        padding: '2px 4px',
        backgroundColor: hovered ? c.headerHover.css : 'transparent',
        cursor: ImdCursor.click,
      }}
    >
      {headWithFilter}
    </div>
  );
}

export interface ImdTableCellWrapperProps {
  readonly col: ImdCol;
  readonly children: ReactNode;
  readonly row: number;
  readonly pad?: ImdTablePadding | string;
  readonly cellPadding?: ImdTablePadding | string;
  readonly flushCells: boolean;
  readonly gridLines: boolean;
  readonly isLastCol: boolean;
  readonly isHeader?: boolean;
  readonly sticky: boolean;
  readonly nowrap?: boolean;
  readonly onRowTap?: ((index: number) => void) | null;
  readonly rowMenu?: ((index: number) => readonly ImdMenuItem[]) | null;
  readonly base: ImdTableBaseState;
  readonly colors: ImdColors;
}

function isNestedInteractiveClick(e: MouseEvent<HTMLElement>): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const interactive = target.closest(
    'button, a, input, select, textarea, [role="menuitem"]',
  );
  return Boolean(interactive && interactive !== e.currentTarget);
}

export function ImdTableCellWrapper({
  col,
  children,
  row,
  pad,
  cellPadding,
  flushCells,
  gridLines,
  isLastCol,
  isHeader = false,
  sticky,
  nowrap = true,
  onRowTap,
  rowMenu,
  base,
  colors: c,
}: ImdTableCellWrapperProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Tag = isHeader ? 'th' : 'td';

  const bodyPadStyle =
    flushCells && row >= 0
      ? { padding: 0 }
      : resolveTablePadding(pad ?? cellPadding, ImdDensity.cellPadV, 12);

  const alignStyle = {
    textAlign: col.center ? ('center' as const) : ('start' as const),
    verticalAlign: 'middle' as const,
    borderInlineEnd:
      gridLines && !isLastCol ? `1px solid ${c.line.css}` : undefined,
    fontWeight: isHeader ? 600 : undefined,
    ...(nowrap && !flushCells
      ? {
          whiteSpace: 'nowrap' as const,
          maxWidth:
            col.width !== undefined
              ? col.width
              : col.auto && !sticky
                ? HTML_COLUMN_MAX_AUTO
                : undefined,
        }
      : undefined),
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const interactiveRow = row >= 0 && (Boolean(onRowTap) || Boolean(rowMenu));

  return (
    <Tag
      onMouseEnter={row >= 0 ? () => base.setHover(row) : undefined}
      onMouseLeave={
        row >= 0
          ? () => {
              base.setHover(-1);
              clearLongPress();
            }
          : undefined
      }
      onClick={
        interactiveRow && onRowTap
          ? (e) => {
              if (isNestedInteractiveClick(e)) return;
              onRowTap(row);
            }
          : undefined
      }
      onContextMenu={
        interactiveRow && rowMenu
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              openTableRowMenu(eventClientPoint(e), row, rowMenu, c);
            }
          : undefined
      }
      onMouseDown={
        interactiveRow && rowMenu
          ? (e) => {
              if (e.button !== 0) return;
              const pt = eventClientPoint(e);
              clearLongPress();
              longPressTimerRef.current = setTimeout(() => {
                openTableRowMenu(pt, row, rowMenu, c);
              }, 500);
            }
          : undefined
      }
      onMouseUp={clearLongPress}
      style={{
        ...bodyPadStyle,
        ...alignStyle,
        cursor:
          row >= 0 && onRowTap ? ImdCursor.click : undefined,
      }}
    >
      <div
        className={
          nowrap && !flushCells
            ? 'min-w-0 truncate whitespace-nowrap'
            : 'min-w-0'
        }
        style={{
          display: col.center ? 'flex' : 'block',
          justifyContent: col.center ? 'center' : undefined,
          alignItems: col.center ? 'center' : undefined,
          maxWidth:
            nowrap && !flushCells && col.auto && col.width === undefined && !sticky
              ? HTML_COLUMN_MAX_AUTO
              : undefined,
        }}
      >
        {children}
      </div>
    </Tag>
  );
}
