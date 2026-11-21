import { createElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { ImdColumnFilterBody } from '../imd_column_filter';
import { showImdModal } from '../imd_dialogs';
import type { ImdColors } from '../../imd_tokens';
import type { ImdTableBaseState } from './base_part';
import { TableItem, type ImdCol, type ImdTableProps } from './support_part';

export const BLANK_CELL_LABEL = '(فارغ)';

export function shownCellValue(t: string): string {
  return t.length === 0 ? BLANK_CELL_LABEL : t;
}

function tryParseFiniteNum(t: string): number | null {
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface ImdTableDataLayer {
  readonly visibleRows: readonly number[];
  readonly items: readonly TableItem[];
  readonly editFilter: (col: number) => Promise<void>;
  readonly clearFilters: () => void;
  readonly toggleGroup: (key: string) => void;
  readonly setGroup: (col: number | null) => void;
}

/// طبقة القيم: نصّ الخلية، والتصفية، والتجميع، وإبلاغ شريط الحالة بالعدد.
export function useImdTableData(
  props: ImdTableProps,
  cols: readonly ImdCol[],
  base: ImdTableBaseState,
  colors: ImdColors,
): ImdTableDataLayer {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cellText = useCallback(
    (row: number, col: number): string => {
      const vals = props.values;
      if (!vals || row >= vals.length) return '';
      const v = vals[row];
      const x = col < v.length ? v[col] : null;
      return x === null || x === undefined ? '' : String(x).trim();
    },
    [props.values],
  );

  /// الصفوف المطابقة لكل المرشِّحات، بترتيبها الأصلي.
  const visibleRows = useMemo(() => {
    const n = props.rows.length;
    if (!base.tools || (base.filters.size === 0 && base.findQ.length === 0)) {
      return Array.from({ length: n }, (_, i) => i);
    }
    const q = base.findQ.toLowerCase();
    const colCount = cols.length;
    const filterEntries = Array.from(base.filters.entries());

    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      let found = q.length === 0;
      if (!found) {
        for (let j = 0; j < colCount; j++) {
          if (cellText(i, j).toLowerCase().includes(q)) {
            found = true;
            break;
          }
        }
      }
      if (
        found &&
        filterEntries.every(([colIdx, allowed]) =>
          allowed.has(cellText(i, colIdx)),
        )
      ) {
        out.push(i);
      }
    }
    return out;
  }, [base.filters, base.findQ, base.tools, cellText, cols.length, props.rows.length]);

  /// قيم عمودٍ المميّزة مرتَّبة (رقميًّا إن كانت كلها أرقامًا).
  const distinct = useCallback(
    (col: number): string[] => {
      const set = new Set<string>();
      for (let i = 0; i < props.rows.length; i++) {
        set.add(cellText(i, col));
      }
      const list = Array.from(set);
      const nums = new Map<string, number | null>(
        list.map((t) => [t, tryParseFiniteNum(t)]),
      );
      if (
        list.length > 0 &&
        list.every((t) => t.length === 0 || nums.get(t) !== null)
      ) {
        list.sort((a, b) => {
          const na = nums.get(a) ?? -Infinity;
          const nb = nums.get(b) ?? -Infinity;
          return na - nb;
        });
      } else {
        list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      }
      return list;
    },
    [cellText, props.rows.length],
  );

  const editFilter = useCallback(
    async (col: number): Promise<void> => {
      const all = distinct(col);
      const result = await showImdModal<Set<string>>({
        title: `تصفية: ${cols[col]?.label ?? ''}`,
        icon: 'sliders',
        maxWidth: 380,
        colors,
        builder: (ctx) =>
          createElement(ImdColumnFilterBody, {
            values: all,
            selected: base.filters.get(col) ?? null,
            shown: shownCellValue,
            colors: ctx.colors,
            onApply: (sel) => ctx.close(sel),
            onCancel: () => ctx.close(null),
          }),
      });
      if (result === null || !mountedRef.current) return;
      base.setPage(0);
      base.setFilters((prev) => {
        const next = new Map(prev);
        // اختيار كل القيم = لا تصفية (ولا يُحتفظ بمجموعةٍ تتقادم مع البيانات).
        if (result.size === all.length) {
          next.delete(col);
        } else {
          next.set(col, result);
        }
        return next;
      });
    },
    [base, colors, cols, distinct],
  );

  const clearFilters = useCallback(() => {
    base.setFilters(new Map());
    base.setPage(0);
  }, [base]);

  /// بنود العرض: صفوفٌ (فهرسها المطلق) أو رؤوس مجموعات.
  const items = useMemo(() => {
    const g = base.groupBy;
    if (!base.tools || g === null) {
      return visibleRows.map((i) => TableItem.row(i));
    }
    const groups = new Map<string, number[]>();
    for (const i of visibleRows) {
      const key = cellText(i, g);
      const arr = groups.get(key);
      if (arr) arr.push(i);
      else groups.set(key, [i]);
    }
    const keys = Array.from(groups.keys()).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const out: TableItem[] = [];
    for (const k of keys) {
      const members = groups.get(k) ?? [];
      const isCollapsed = base.collapsed.has(k);
      out.push(TableItem.group(k, members.length, isCollapsed));
      if (!isCollapsed) {
        for (const rowIdx of members) {
          out.push(TableItem.row(rowIdx));
        }
      }
    }
    return out;
  }, [base.collapsed, base.groupBy, base.tools, cellText, visibleRows]);

  const toggleGroup = useCallback(
    (key: string) => {
      base.setCollapsed((prev) => {
        const next = new Set(prev);
        if (!next.delete(key)) next.add(key);
        return next;
      });
      base.setPage(0);
    },
    [base],
  );

  const setGroup = useCallback(
    (col: number | null) => {
      base.setGroupBy(col);
      base.setCollapsed(new Set());
      base.setPage(0);
    },
    [base],
  );

  /// يُبلّغ شريط الحالة بعدد الصفوف — بعد الإطار لا أثناءه (الإبلاغ يُعيد بناء الشريط).
  useEffect(() => {
    const sink = base.sink;
    if (!sink) return;
    const shown = visibleRows.length;
    const total = props.rows.length;
    const owner = base.ownerRef.current;
    const flush = () => {
      if (mountedRef.current) {
        sink.report(owner, { shown, total });
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      const raf = requestAnimationFrame(flush);
      return () => cancelAnimationFrame(raf);
    }
    queueMicrotask(flush);
    return undefined;
  }, [base.ownerRef, base.sink, props.rows.length, visibleRows.length]);

  return {
    visibleRows,
    items,
    editFilter,
    clearFilters,
    toggleGroup,
    setGroup,
  };
}
