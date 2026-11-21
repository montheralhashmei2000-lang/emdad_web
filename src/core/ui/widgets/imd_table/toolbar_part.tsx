import { useState, type DragEvent } from 'react';
import { ImdDensity } from '../../imd_density';
import { nf } from '../../imd_format';
import { ImdIcon } from '../../imd_icon';
import { ImdBp, ImdColors, ImdCursor } from '../../imd_tokens';
import { ImdMenuButton, type ImdMenuButtonItem } from '../imd_buttons';
import { imdFieldDecoration } from '../imd_fields';
import type { ImdTableBaseState } from './base_part';
import { shownCellValue, type ImdTableDataLayer } from './data_part';
import type { ImdCol } from './support_part';

export interface ImdTableToolbarPartProps {
  readonly cols: readonly ImdCol[];
  readonly totalRows: number;
  readonly shown: number;
  readonly groupable: boolean;
  readonly filterable: boolean;
  readonly base: ImdTableBaseState;
  readonly data: ImdTableDataLayer;
  readonly colors: ImdColors;
}

/// شريط أدوات الجدول: بحثٌ فوري، لوحة التجميع (إسقاط رأس عمود)، قائمتا التجميع
/// والتصفية، وشارات الفلاتر الفعّالة. يظهر مع [ImdTable.values] وحدها.
export function ImdTableToolbarPart({
  cols,
  totalRows,
  shown,
  groupable,
  filterable,
  base,
  data,
  colors: c,
}: ImdTableToolbarPartProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [dropHot, setDropHot] = useState(false);

  const desktop = !ImdBp.of().mobile;
  const labelled: number[] = [];
  for (let j = 0; j < cols.length; j++) {
    if (cols[j].label.length > 0) labelled.push(j);
  }

  const deco = imdFieldDecoration({
    hint: 'بحث فوري…',
    dense: true,
    colors: c,
  });

  const groupMenuItems: ImdMenuButtonItem<number>[] = [
    ...(base.groupBy !== null
      ? [{ value: -1, label: 'إلغاء التجميع' } satisfies ImdMenuButtonItem<number>]
      : []),
    ...labelled.map(
      (j) =>
        ({
          value: j,
          label: cols[j].label,
        }) satisfies ImdMenuButtonItem<number>,
    ),
  ];

  const filterMenuItems: ImdMenuButtonItem<number>[] = labelled.map((j) => ({
    value: j,
    label: cols[j].label,
  }));

  const canDropColumn = (e: DragEvent<HTMLDivElement>): number | null => {
    const raw = e.dataTransfer?.getData('text/imd-table-col');
    const idx =
      raw !== undefined && raw !== '' ? Number(raw) : base.dragCol;
    if (
      idx === null ||
      !Number.isInteger(idx) ||
      idx < 0 ||
      idx >= cols.length ||
      cols[idx].label.length === 0
    ) {
      return null;
    }
    return idx;
  };

  return (
    <div className="flex flex-col items-stretch" style={{ paddingBottom: 8 }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <div
          style={{
            minWidth: 180,
            maxWidth: 280,
            flex: '1 1 180px',
            ...deco.containerStyle(searchFocused),
          }}
        >
          <span
            className="inline-flex shrink-0 items-center leading-none"
            style={{ marginInlineEnd: 6 }}
          >
            <ImdIcon name="search" size={14} color={c.faint} />
          </span>
          <input
            type="text"
            value={base.findInput}
            placeholder="بحث فوري…"
            aria-label="بحث فوري…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onChange={(e) => base.setFindInput(e.target.value)}
            className="min-w-0 flex-1 bg-transparent placeholder:text-[color:var(--imd-faint)]"
            style={{
              ...deco.inputStyle,
              fontSize: ImdDensity.cellFont,
              color: c.text.css,
            }}
          />
          {base.findQ.length > 0 && (
            <button
              type="button"
              aria-label="مسح البحث"
              title="مسح البحث"
              onClick={() => base.setFindInput('')}
              className="inline-flex shrink-0 items-center justify-center border-0 bg-transparent p-1.5"
              style={{ cursor: ImdCursor.click }}
            >
              <ImdIcon name="x" size={12} color={c.muted} />
            </button>
          )}
        </div>

        {groupable && !desktop && (
          <ImdMenuButton<number>
            label={
              base.groupBy === null
                ? 'تجميع حسب'
                : `مجمَّع: ${cols[base.groupBy]?.label ?? ''}`
            }
            icon="folder"
            small={true}
            items={groupMenuItems}
            onSelected={(j) => data.setGroup(j < 0 ? null : j)}
            colors={c}
          />
        )}

        {filterable && !desktop && (
          <ImdMenuButton<number>
            label="تصفية"
            icon="sliders"
            small={true}
            items={filterMenuItems}
            onSelected={(j) => {
              void data.editFilter(j);
            }}
            colors={c}
          />
        )}

        {Array.from(base.filters.entries()).map(([colIdx, valuesSet]) => {
          const firstVal = valuesSet.values().next().value ?? '';
          const summary =
            valuesSet.size === 1
              ? shownCellValue(firstVal)
              : `${valuesSet.size} قيم`;
          return (
            <div
              key={colIdx}
              className="inline-flex items-center rounded-full"
              style={{
                backgroundColor: c.warnSoft.css,
                padding: '4px 10px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void data.editFilter(colIdx);
                }}
                className="border-0 bg-transparent p-0"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: c.warn.css,
                  cursor: ImdCursor.click,
                }}
              >
                {`${cols[colIdx]?.label ?? ''}: ${summary}`}
              </button>
              <span style={{ width: 6, flexShrink: 0 }} />
              <button
                type="button"
                aria-label={`إزالة تصفية ${cols[colIdx]?.label ?? ''}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  base.setFilters((prev) => {
                    const next = new Map(prev);
                    next.delete(colIdx);
                    return next;
                  });
                  base.setPage(0);
                }}
                className="inline-flex items-center justify-center border-0 bg-transparent p-0"
                style={{ cursor: ImdCursor.click }}
              >
                <ImdIcon name="x" size={11} color={c.warn} />
              </button>
            </div>
          );
        })}

        {base.filters.size > 0 && (
          <button
            type="button"
            onClick={data.clearFilters}
            className="border-0 bg-transparent px-2 py-1"
            style={{
              fontSize: 12,
              color: c.muted.css,
              cursor: ImdCursor.click,
            }}
          >
            مسح الفلاتر
          </button>
        )}

        {(base.filters.size > 0 || base.findQ.length > 0) && (
          <span style={{ fontSize: 12, color: c.muted.css }}>
            {`${nf(shown)} من ${nf(totalRows)}`}
          </span>
        )}
      </div>

      {groupable && desktop && (
        <>
          <div style={{ height: 6 }} />
          <div
            data-testid="imd-table-group-panel"
            onDragOver={(e) => {
              const colIdx = canDropColumn(e);
              if (colIdx !== null || base.dragCol !== null) {
                e.preventDefault();
                setDropHot(true);
              }
            }}
            onDragEnter={(e) => {
              const colIdx = canDropColumn(e);
              if (colIdx !== null || base.dragCol !== null) {
                e.preventDefault();
                setDropHot(true);
              }
            }}
            onDragLeave={() => setDropHot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropHot(false);
              const colIdx = canDropColumn(e);
              if (colIdx !== null) {
                data.setGroup(colIdx);
              }
              base.setDragCol(null);
            }}
            className="flex items-center"
            style={{
              minHeight: 30,
              padding: '4px 10px',
              backgroundColor: dropHot ? c.accentSoft.css : c.subtle.css,
              border: `1px solid ${(dropHot ? c.accent : c.line).css}`,
              borderRadius: 4,
            }}
          >
            <ImdIcon name="folder" size={13} color={c.muted} />
            <span style={{ width: 8, flexShrink: 0 }} />
            {base.groupBy === null ? (
              <span style={{ fontSize: 12, color: c.muted.css }}>
                اسحب رأس العمود هنا للتجميع
              </span>
            ) : (
              <button
                type="button"
                onClick={() => data.setGroup(null)}
                className="inline-flex items-center"
                style={{
                  padding: '3px 10px',
                  backgroundColor: c.surface.css,
                  border: `1px solid ${c.lineStrong.css}`,
                  borderRadius: 4,
                  cursor: ImdCursor.click,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: c.text2.css,
                  }}
                >
                  {cols[base.groupBy]?.label ?? ''}
                </span>
                <span style={{ width: 6, flexShrink: 0 }} />
                <ImdIcon name="x" size={11} color={c.muted} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
