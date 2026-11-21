import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { ImdDensity } from '../../imd_density';
import { nf } from '../../imd_format';
import { ImdEmojiText } from '../../imd_icon';
import { ImdBp, ImdColors, ImdSizes } from '../../imd_tokens';
import { ImdIconButton } from '../imd_buttons';
import type { ImdTableBaseState } from './base_part';
import {
  ImdTableCard,
  ImdTableFooterCard,
  pageCountFor,
} from './cards_part';
import { ImdTableCellWrapper, ImdTableHeaderCellContent } from './cells_part';
import type { ImdTableDataLayer } from './data_part';
import { ImdTableGroupCard, ImdTableGroupRow, resolveZebraColor } from './groups_part';
import {
  AUTO_PAGE_SIZE,
  AUTO_PAGE_THRESHOLD,
  VIRTUALIZE_ABOVE,
  normalizeImdCol,
  resolveTableColors,
  toTableColorCss,
  type ImdCol,
  type ImdTableProps,
  type TableItem,
} from './support_part';
import { ImdTableToolbarPart } from './toolbar_part';

const VIRTUAL_OVERSCAN = 10;

function computeColWidths(
  cols: readonly ImdCol[],
  sticky: boolean,
  frozenWidth: number | null,
): (string | undefined)[] {
  if (!sticky && frozenWidth === null) {
    return cols.map((col) =>
      col.width !== undefined ? `${col.width}px` : undefined,
    );
  }

  let fixedPx = 0;
  let flexSum = 0;
  for (let j = 0; j < cols.length; j++) {
    const w = j === 0 && frozenWidth !== null ? frozenWidth : cols[j].width;
    if (w !== undefined) {
      fixedPx += w;
    } else {
      flexSum += cols[j].flex;
    }
  }

  return cols.map((col, j) => {
    const w = j === 0 && frozenWidth !== null ? frozenWidth : col.width;
    if (w !== undefined) return `${w}px`;
    if (!sticky && col.auto) return undefined;
    if (flexSum <= 0) return undefined;
    const ratio = col.flex / flexSum;
    if (fixedPx <= 0) {
      return `${(ratio * 100).toFixed(4)}%`;
    }
    return `calc((100% - ${fixedPx}px) * ${ratio.toFixed(6)})`;
  });
}

function TableColGroup({
  widths,
}: {
  readonly widths: readonly (string | undefined)[];
}) {
  return (
    <colgroup>
      {widths.map((w, j) => (
        <col key={j} style={w ? { width: w } : undefined} />
      ))}
    </colgroup>
  );
}

function ImdTablePager({
  page,
  pageCount,
  pageStart,
  pageEnd,
  total,
  onGoToPage,
  colors: c,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly total: number;
  readonly onGoToPage: (target: number) => void;
  readonly colors: ImdColors;
}) {
  const textStyle = {
    fontSize: 12.5,
    fontWeight: 500,
    color: c.muted.css,
  };
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
      style={{ paddingTop: 10 }}
    >
      <span style={textStyle}>
        {`عرض ${nf(pageStart + 1)}–${nf(pageEnd)} من ${nf(total)}`}
      </span>
      <div className="inline-flex min-w-0 items-center">
        <ImdIconButton
          icon="chevron-right"
          tooltip="الصفحة السابقة"
          onPressed={page > 0 ? () => onGoToPage(page - 1) : null}
          colors={c}
        />
        <span
          className="min-w-0 truncate text-center"
          style={{ ...textStyle, paddingInline: 10 }}
        >
          {`صفحة ${nf(page + 1)} من ${nf(pageCount)}`}
        </span>
        <ImdIconButton
          icon="chevron-left"
          tooltip="الصفحة التالية"
          onPressed={page < pageCount - 1 ? () => onGoToPage(page + 1) : null}
          colors={c}
        />
      </div>
    </div>
  );
}

/// بناء الجدول وشريط ترقيم الصفحات.
export function ImdTableBuildPart({
  props,
  base,
  data,
}: {
  readonly props: ImdTableProps;
  readonly base: ImdTableBaseState;
  readonly data: ImdTableDataLayer;
}) {
  const c = resolveTableColors(props.colors);
  const cols = props.columns.map(normalizeImdCol);
  const rows = props.rows;
  const empty = props.empty ?? 'لا توجد بيانات';
  const flushCells = props.flushCells ?? false;
  const gridLines = props.gridLines ?? false;
  const zebra = props.zebra ?? false;
  const sortAsc = props.sortAsc ?? true;
  const cards = props.cards ?? false;
  const filterable = props.filterable ?? true;
  const groupable = props.groupable ?? true;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [vScrollTop, setVScrollTop] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setBoxWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setBoxWidth(entry.contentRect.width);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    return undefined;
  }, []);

  // جدولٌ طويل بلا ترقيم يبني كل صفوفه دفعةً واحدة، فبعد
  // [AUTO_PAGE_THRESHOLD] صفًّا يُرقَّم تلقائيًّا بـ[AUTO_PAGE_SIZE].
  const pageSize =
    props.pageSize !== undefined
      ? props.pageSize
      : !flushCells && rows.length > AUTO_PAGE_THRESHOLD
        ? AUTO_PAGE_SIZE
        : null;

  const visible = data.visibleRows;
  const items = data.items;

  const pageCount = pageSize === null ? 1 : pageCountFor(items.length, pageSize);
  const page = Math.min(pageCount - 1, Math.max(0, base.page));
  const pageStart = pageSize === null ? 0 : page * pageSize;
  const pageEnd =
    pageSize === null
      ? items.length
      : Math.min(items.length, pageStart + pageSize);

  const goToPage = (target: number) => {
    const next = Math.min(pageCount - 1, Math.max(0, target));
    base.setPage(next);
    setVScrollTop(0);
    props.onPageChanged?.(next);
  };

  const mobile = ImdBp.of().mobile;

  // وضع البطاقات على الشاشة الضيقة
  if (cards && mobile && rows.length > 0 && cols.length > 0) {
    const cardsArea = (
      <div className="flex flex-col items-stretch">
        {items.slice(pageStart, pageEnd).map((item, offsetIdx) => {
          const k = pageStart + offsetIdx;
          const isLast = k === pageEnd - 1 && !props.footer;
          const key = item.isGroup
            ? `grp-${item.key}`
            : (props.rowKeys?.[item.row] ?? `row-${item.row}`);
          return (
            <div
              key={key}
              style={{ marginBottom: isLast ? 0 : ImdDensity.cardGap }}
            >
              {item.isGroup ? (
                <ImdTableGroupCard
                  item={item}
                  cols={cols}
                  groupBy={base.groupBy ?? 0}
                  onToggle={data.toggleGroup}
                  colors={c}
                />
              ) : (
                <ImdTableCard
                  rowIndex={item.row}
                  cols={cols}
                  row={rows[item.row] ?? []}
                  hovered={base.hover === item.row}
                  zebra={zebra}
                  onHoverChange={base.setHover}
                  onRowTap={props.onRowTap}
                  rowMenu={props.rowMenu}
                  rowColor={props.rowColor}
                  colors={c}
                />
              )}
            </div>
          );
        })}
        {props.footer && <ImdTableFooterCard cols={cols} footer={props.footer} colors={c} />}
      </div>
    );

    if (pageSize === null && !base.tools) {
      return <div className={props.className}>{cardsArea}</div>;
    }

    return (
      <div className={`flex flex-col items-stretch ${props.className ?? ''}`.trim()}>
        {base.tools && (
          <ImdTableToolbarPart
            cols={cols}
            totalRows={rows.length}
            shown={visible.length}
            groupable={groupable}
            filterable={filterable}
            base={base}
            data={data}
            colors={c}
          />
        )}
        {cardsArea}
        {pageSize !== null && (
          <ImdTablePager
            page={page}
            pageCount={pageCount}
            pageStart={pageStart}
            pageEnd={pageEnd}
            total={items.length}
            onGoToPage={goToPage}
            colors={c}
          />
        )}
      </div>
    );
  }

  // جدولٌ بلا صفوف لا جسم له يُمرَّر تحت الرأس، فلا رأس ثابتًا له.
  const sticky =
    props.maxHeight !== undefined && items.length > 0 && cols.length > 0;

  // الجوال بلا بطاقات: جدولٌ بعرضٍ طبيعيٍّ يُمرَّر أفقيًّا (والعمود الأول مثبَّت)
  let minW = props.minWidth;
  if (mobile && !cards && cols.length > 0) {
    const natural = cols.reduce(
      (a, col) => a + (col.width ?? (col.flex > 1 ? 180 : 110)),
      0,
    );
    if (minW === undefined || natural > minW) minW = natural;
  }

  const pageSlice = items.slice(pageStart, pageEnd);
  const headerBg = toTableColorCss(props.headerBackground) ?? c.tableHead.css;
  const borderRadius = mobile ? 10 : ImdSizes.radius;
  const estRowHeight = ImdDensity.isHigh ? 30 : 40;

  const renderHeaderRow = () => (
    <tr
      style={{
        backgroundColor: headerBg,
        borderBottom:
          props.headerBackground == null ? `1px solid ${c.line.css}` : undefined,
      }}
    >
      {cols.map((col, j) => (
        <ImdTableCellWrapper
          key={`hdr-${j}`}
          col={col}
          row={-1}
          pad={
            props.headerPadding ?? {
              horizontal: 12,
              vertical: ImdDensity.headPadV,
            }
          }
          flushCells={flushCells}
          gridLines={gridLines}
          isLastCol={j === cols.length - 1}
          isHeader={true}
          sticky={sticky}
          nowrap={!flushCells}
          base={base}
          colors={c}
        >
          <ImdTableHeaderCellContent
            col={col}
            index={j}
            sortIndex={props.sortIndex}
            sortAsc={sortAsc}
            headerForeground={props.headerForeground}
            onHeaderTap={props.onHeaderTap}
            filterable={filterable}
            groupable={groupable}
            base={base}
            data={data}
            colors={c}
          />
        </ImdTableCellWrapper>
      ))}
    </tr>
  );

  const renderBodyRow = (item: TableItem, k: number) => {
    if (item.isGroup) {
      return (
        <ImdTableGroupRow
          key={`group:${item.key}`}
          item={item}
          cols={cols}
          groupBy={base.groupBy ?? 0}
          onToggle={data.toggleGroup}
          colors={c}
        />
      );
    }

    const i = item.row;
    const isLastBody = k === pageEnd - 1 && !props.footer;
    const rowBg =
      base.hover === i
        ? c.rowHover.css
        : toTableColorCss(props.rowColor?.(i)) ??
          (zebra && i % 2 === 1 ? resolveZebraColor(c).css : undefined);
    const rowData = rows[i] ?? [];
    const rowKey = props.rowKeys?.[i] ?? `row-${i}`;

    return (
      <tr
        key={rowKey}
        style={{
          backgroundColor: rowBg,
          borderBottom: isLastBody
            ? undefined
            : `1px solid ${c.tableRowLine.css}`,
        }}
      >
        {cols.map((col, j) => (
          <ImdTableCellWrapper
            key={`cell-${j}`}
            col={col}
            row={i}
            cellPadding={props.cellPadding}
            flushCells={flushCells}
            gridLines={gridLines}
            isLastCol={j === cols.length - 1}
            sticky={sticky}
            nowrap={!flushCells}
            onRowTap={props.onRowTap}
            rowMenu={props.rowMenu}
            base={base}
            colors={c}
          >
            <div
              className={flushCells ? undefined : 'min-w-0 truncate'}
              style={{
                fontSize: props.cellFontSize ?? ImdDensity.cellFont,
                color: c.text.css,
                lineHeight: 1.5,
              }}
            >
              {j < rowData.length ? rowData[j] : null}
            </div>
          </ImdTableCellWrapper>
        ))}
      </tr>
    );
  };

  const renderFooterRow = () => {
    if (!props.footer || items.length === 0) return null;
    return (
      <tr style={{ backgroundColor: c.accentSoft.css }}>
        {cols.map((col, j) => (
          <ImdTableCellWrapper
            key={`foot-${j}`}
            col={col}
            row={-1}
            cellPadding={props.cellPadding}
            flushCells={flushCells}
            gridLines={gridLines}
            isLastCol={j === cols.length - 1}
            sticky={sticky}
            nowrap={true}
            base={base}
            colors={c}
          >
            <div
              className="min-w-0 truncate"
              style={{
                fontSize: ImdDensity.cellFont,
                fontWeight: 700,
                color: c.accent.css,
                lineHeight: 1.5,
              }}
            >
              {j < props.footer!.length ? props.footer![j] : null}
            </div>
          </ImdTableCellWrapper>
        ))}
      </tr>
    );
  };

  const buildTable = (
    vcRef: MutableRefObject<HTMLDivElement | null>,
    otherVcRef: MutableRefObject<HTMLDivElement | null> | null,
    {
      frozenWidth = null,
      showScrollbar = true,
      minTableWidth,
      fixedTableWidth,
    }: {
      readonly frozenWidth?: number | null;
      readonly showScrollbar?: boolean;
      readonly minTableWidth?: number;
      readonly fixedTableWidth?: number;
    } = {},
  ): ReactNode => {
    const colWidths = computeColWidths(cols, sticky, frozenWidth);
    const tableWidthStyle =
      fixedTableWidth !== undefined
        ? { width: fixedTableWidth }
        : minTableWidth !== undefined
          ? { minWidth: minTableWidth, width: '100%' }
          : { width: '100%' };

    let innerBody: ReactNode;

    if (cols.length === 0) {
      innerBody = (
        <div style={{ padding: '9px 12px' }}>
          <ImdEmojiText
            text={empty}
            colors={c}
            style={{
              fontSize: ImdDensity.cellFont,
              fontWeight: 500,
              color: c.muted.css,
              lineHeight: 1.5,
            }}
          />
        </div>
      );
    } else if (items.length === 0) {
      const emptyText =
        rows.length === 0 ? empty : 'لا نتائج مطابقة للتصفية';
      innerBody = (
        <div className="flex flex-col items-stretch">
          <table
            className="border-collapse"
            style={{
              ...tableWidthStyle,
              tableLayout: 'auto',
            }}
          >
            <TableColGroup widths={colWidths} />
            <thead>{renderHeaderRow()}</thead>
          </table>
          <div style={{ padding: '10px 12px' }}>
            <ImdEmojiText
              text={emptyText}
              textAlign="center"
              colors={c}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: c.faint.css,
                lineHeight: 1.4,
              }}
            />
          </div>
        </div>
      );
    } else if (!sticky) {
      innerBody = (
        <table
          className="border-collapse"
          style={{
            ...tableWidthStyle,
            tableLayout: 'auto',
          }}
        >
          <TableColGroup widths={colWidths} />
          <thead>{renderHeaderRow()}</thead>
          <tbody>
            {pageSlice.map((item, offsetIdx) =>
              renderBodyRow(item, pageStart + offsetIdx),
            )}
            {renderFooterRow()}
          </tbody>
        </table>
      );
    } else {
      const totalBodyItems =
        pageSlice.length + (props.footer && items.length > 0 ? 1 : 0);
      const lazy =
        totalBodyItems > VIRTUALIZE_ABOVE && props.rowKeys == null;
      const viewportH = props.maxHeight ?? 400;
      const visibleCount = Math.max(1, Math.ceil(viewportH / estRowHeight));
      const startIdx = lazy
        ? Math.max(0, Math.floor(vScrollTop / estRowHeight) - VIRTUAL_OVERSCAN)
        : 0;
      const endIdx = lazy
        ? Math.min(pageSlice.length, startIdx + visibleCount + VIRTUAL_OVERSCAN * 2)
        : pageSlice.length;

      const topPad = lazy ? startIdx * estRowHeight : 0;
      const bottomPad = lazy
        ? Math.max(0, (pageSlice.length - endIdx) * estRowHeight)
        : 0;
      const showFooterHere = !lazy || endIdx >= pageSlice.length;

      innerBody = (
        <div className="flex min-h-0 flex-col items-stretch">
          <table
            className="shrink-0 border-collapse"
            style={{
              ...tableWidthStyle,
              tableLayout: 'fixed',
            }}
          >
            <TableColGroup widths={colWidths} />
            <thead>{renderHeaderRow()}</thead>
          </table>

          <div
            ref={vcRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (lazy) setVScrollTop(el.scrollTop);
              if (otherVcRef) {
                base.syncVertical(el, otherVcRef.current);
              }
            }}
            className={`min-h-0 flex-1 overflow-y-auto ${
              showScrollbar ? '' : '[scrollbar-width:none]'
            }`.trim()}
          >
            {topPad > 0 && <div style={{ height: topPad }} />}
            <table
              className="border-collapse"
              style={{
                ...tableWidthStyle,
                tableLayout: 'fixed',
              }}
            >
              <TableColGroup widths={colWidths} />
              <tbody>
                {pageSlice.slice(startIdx, endIdx).map((item, idx) =>
                  renderBodyRow(item, pageStart + startIdx + idx),
                )}
                {showFooterHere && renderFooterRow()}
              </tbody>
            </table>
            {bottomPad > 0 && <div style={{ height: bottomPad }} />}
          </div>
        </div>
      );
    }

    return (
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: c.surface.css,
          border: `1px solid ${(gridLines ? c.lineStrong : c.line).css}`,
          borderRadius,
          maxHeight: sticky ? props.maxHeight : undefined,
          display: sticky ? 'flex' : undefined,
          flexDirection: sticky ? 'column' : undefined,
        }}
      >
        {innerBody}
      </div>
    );
  };

  const natural = !sticky && items.length > 0 && cols.length > 0;
  const overflowing =
    minW !== undefined && boxWidth > 0 && boxWidth < minW;
  const floor = overflowing && minW !== undefined ? minW : boxWidth;
  const frozen =
    (props.freezeFirst ?? props.values != null) &&
    !flushCells &&
    cols.length > 0 &&
    cols[0].label.length > 0 &&
    (overflowing || mobile);
  const fw = frozen ? (cols[0].width ?? 120) : null;
  const showFrozenOverlay =
    frozen && fw !== null && Math.abs(base.hScrollOffset) >= 0.5;

  let tableArea: ReactNode;
  if (!natural && (minW === undefined || items.length === 0)) {
    tableArea = buildTable(base.vScrollRef, base.vScroll2Ref);
  } else {
    tableArea = (
      <div className="relative w-full">
        <div
          ref={base.hScrollRef}
          onScroll={(e) => {
            base.setHScrollOffset(e.currentTarget.scrollLeft);
          }}
          className="w-full overflow-x-auto"
          style={{ paddingBottom: overflowing ? 10 : 0 }}
        >
          {buildTable(base.vScrollRef, base.vScroll2Ref, {
            frozenWidth: fw,
            minTableWidth: natural ? (floor > 0 ? floor : undefined) : undefined,
            fixedTableWidth: !natural ? minW : undefined,
          })}
        </div>

        {showFrozenOverlay && fw !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-auto absolute top-0 overflow-hidden"
            style={{
              insetInlineStart: 0,
              bottom: overflowing ? 10 : 0,
              width: fw,
            }}
          >
            <div
              style={{
                width: natural ? (floor > 0 ? floor : 'max-content') : minW,
              }}
            >
              {buildTable(base.vScroll2Ref, base.vScrollRef, {
                frozenWidth: fw,
                showScrollbar: false,
                minTableWidth: natural
                  ? floor > 0
                    ? floor
                    : undefined
                  : undefined,
                fixedTableWidth: !natural ? minW : undefined,
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const tableWithTools = !base.tools ? (
    tableArea
  ) : (
    <div className="flex flex-col items-stretch">
      <ImdTableToolbarPart
        cols={cols}
        totalRows={rows.length}
        shown={visible.length}
        groupable={groupable}
        filterable={filterable}
        base={base}
        data={data}
        colors={c}
      />
      {tableArea}
    </div>
  );

  return (
    <div ref={containerRef} className={`w-full ${props.className ?? ''}`.trim()}>
      {pageSize === null || items.length === 0 ? (
        tableWithTools
      ) : (
        <div className="flex flex-col items-stretch">
          {tableWithTools}
          <ImdTablePager
            page={page}
            pageCount={pageCount}
            pageStart={pageStart}
            pageEnd={pageEnd}
            total={items.length}
            onGoToPage={goToPage}
            colors={c}
          />
        </div>
      )}
    </div>
  );
}
