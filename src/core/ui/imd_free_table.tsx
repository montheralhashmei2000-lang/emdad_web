import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { FreeCol, FreeTable } from '../../domain/free_table';
import { ImdFld } from './imd_form';
import { ImdStyle } from './imd_style';
import { ImdColors } from './imd_tokens';
import { ImdBtnKind, ImdButtonOutline, ImdIconButton } from './imd_widgets';

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

const NUM_W = 40; // عمود «م»
const ACT_W = 44; // عمود حذف الصف
const MIN_COL = 84;
const HANDLE = 10;

interface InternalCol {
  readonly key: string;
  title: string;
  weight: number;
}

interface InternalRow {
  readonly key: string;
  cells: string[];
}

export interface ImdFreeTableEditorProps {
  readonly initial: FreeTable;
  readonly onChanged: (table: FreeTable) => void;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// محرر جدولٍ حر: يضيف المستخدم عمودًا بجانب أي عمود، ويسمّيه بنفسه، ويسحب
/// حافة العمود لتكبيره أو تصغيره، ويضيف الصفوف ويحذفها.
///
/// لا يحمل حالةً خارجية: يُستلم [initial] مرةً واحدة، وكل تعديلٍ يُبلَّغ به
/// [onChanged] بجدولٍ كامل. لإعادة تهيئته من الخارج يُغيَّر `key`.
export function ImdFreeTableEditor({
  initial,
  onChanged,
  colors,
  className = '',
}: ImdFreeTableEditorProps) {
  const c = resolveActiveColors(colors);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef(0);
  const makeKey = (prefix: string) => {
    nextIdRef.current += 1;
    return `${prefix}-${nextIdRef.current}`;
  };

  const [initialCols] = useState<InternalCol[]>(() =>
    initial.cols.map((col, idx) => ({
      key: `col-init-${idx}`,
      title: col.title,
      weight: col.weight,
    })),
  );
  const [initialRows] = useState<InternalRow[]>(() => {
    const colCount = initialCols.length;
    const mapped = initial.rows.map((r, ri) => ({
      key: `row-init-${ri}`,
      cells: Array.from({ length: colCount }, (_, i) =>
        i < r.length ? r[i] : '',
      ),
    }));
    if (mapped.length === 0) {
      mapped.push({
        key: 'row-init-empty',
        cells: Array<string>(colCount).fill(''),
      });
    }
    return mapped;
  });

  const titleRef = useRef(initial.title);
  const colsRef = useRef<InternalCol[]>(initialCols);
  const rowsRef = useRef<InternalRow[]>(initialRows);

  const [, setVersion] = useState(0);
  const forceRender = useCallback(() => setVersion((v) => v + 1), []);

  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      setBoxWidth(el.clientWidth);
    };
    updateWidth();
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
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    return undefined;
  }, []);

  const buildTable = useCallback(
    () =>
      new FreeTable({
        title: titleRef.current,
        cols: colsRef.current.map(
          (col) => new FreeCol(col.title.trim(), col.weight),
        ),
        rows: rowsRef.current.map((r) => [...r.cells]),
      }),
    [],
  );

  const emit = useCallback(() => {
    onChanged(buildTable());
  }, [buildTable, onChanged]);

  const addColAfter = (i: number) => {
    const nextCols = [...colsRef.current];
    nextCols.splice(i + 1, 0, {
      key: makeKey('col'),
      title: '',
      weight: 5,
    });
    colsRef.current = nextCols;
    rowsRef.current = rowsRef.current.map((r) => {
      const cells = [...r.cells];
      cells.splice(i + 1, 0, '');
      return { ...r, cells };
    });
    forceRender();
    emit();
  };

  const removeCol = (i: number) => {
    if (colsRef.current.length <= 1) return;
    const nextCols = [...colsRef.current];
    nextCols.splice(i, 1);
    colsRef.current = nextCols;
    rowsRef.current = rowsRef.current.map((r) => {
      const cells = [...r.cells];
      cells.splice(i, 1);
      return { ...r, cells };
    });
    forceRender();
    emit();
  };

  const updateColTitle = (i: number, value: string) => {
    colsRef.current = colsRef.current.map((col, idx) =>
      idx === i ? { ...col, title: value } : col,
    );
    forceRender();
    emit();
  };

  const updateCell = (ri: number, ci: number, value: string) => {
    rowsRef.current = rowsRef.current.map((r, rIdx) => {
      if (rIdx !== ri) return r;
      const cells = [...r.cells];
      cells[ci] = value;
      return { ...r, cells };
    });
    forceRender();
    emit();
  };

  const addRow = () => {
    rowsRef.current = [
      ...rowsRef.current,
      {
        key: makeKey('row'),
        cells: Array<string>(colsRef.current.length).fill(''),
      },
    ];
    forceRender();
    emit();
  };

  const removeRow = (ri: number) => {
    if (rowsRef.current.length <= 1) return;
    const nextRows = [...rowsRef.current];
    nextRows.splice(ri, 1);
    rowsRef.current = nextRows;
    forceRender();
    emit();
  };

  const cols = colsRef.current;
  const rows = rowsRef.current;

  const fixed = NUM_W + ACT_W;
  const minTotal = fixed + cols.length * (MIN_COL + HANDLE);
  const total = boxWidth > minTotal ? boxWidth : minTotal;
  const weightSum = cols.reduce((s, e) => s + e.weight, 0);
  const avail = total - fixed;
  const pxPerWeight = weightSum > 0 ? avail / weightSum : 0;

  /// سحب الحافة بين العمود [i] وجاره [i]+1: يكبر أحدهما بقدر ما يصغر الآخر.
  const startDrag = (
    i: number,
    e: ReactPointerEvent<HTMLDivElement>,
    currentPxPerWeight: number,
  ) => {
    if (currentPxPerWeight <= 0 || i + 1 >= colsRef.current.length) return;
    e.preventDefault();
    const startX = e.clientX;
    const colA = colsRef.current[i];
    const colB = colsRef.current[i + 1];
    const startWeightA = colA.weight;
    const startWeightB = colB.weight;
    const el = containerRef.current;
    const dir =
      el && typeof window !== 'undefined'
        ? window.getComputedStyle(el).direction
        : 'rtl';
    const rtl = dir === 'rtl';

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dw = (rtl ? -dx : dx) / currentPxPerWeight;
      const minW = MIN_COL / currentPxPerWeight;
      const sumW = startWeightA + startWeightB;
      const maxW = Math.max(minW, sumW - minW);
      const na = Math.min(maxW, Math.max(minW, startWeightA + dw));
      const nb = sumW - na;
      colsRef.current = colsRef.current.map((col, idx) => {
        if (idx === i) return { ...col, weight: na };
        if (idx === i + 1) return { ...col, weight: nb };
        return col;
      });
      forceRender();
      emit();
    };

    const onUp = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }
  };

  const overflow = boxWidth > 0 && total > boxWidth;

  return (
    <div
      ref={containerRef}
      className={`w-full ${overflow ? 'overflow-x-auto' : ''} ${className}`.trim()}
    >
      <div className="flex flex-col items-stretch" style={{ width: total }}>
        <div className="flex items-start">
          <div
            className="flex shrink-0 items-center justify-center"
            style={{
              width: NUM_W,
              fontWeight: 700,
              color: c.muted.css,
              paddingTop: 8,
            }}
          >
            م
          </div>

          {cols.map((col, i) => (
            <div
              key={col.key}
              className="flex shrink-0 items-center"
              style={{ width: col.weight * pxPerWeight }}
            >
              <div className="min-w-0 flex-1" style={{ paddingInline: 2 }}>
                <div className="flex flex-col items-stretch">
                  <ImdFld
                    value={col.title}
                    hint="اسم العمود"
                    onChanged={(v) => updateColTitle(i, v)}
                    colors={c}
                  />
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <ImdIconButton
                      icon="plus"
                      tooltip="إضافة عمود بجانب هذا العمود"
                      onPressed={() => addColAfter(i)}
                      colors={c}
                    />
                    {cols.length > 1 && (
                      <ImdIconButton
                        icon="trash"
                        tooltip="حذف العمود"
                        kind={ImdBtnKind.danger}
                        onPressed={() => removeCol(i)}
                        colors={c}
                      />
                    )}
                  </div>
                </div>
              </div>

              {i < cols.length - 1 && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="تغيير عرض العمود"
                  onPointerDown={(e) => startDrag(i, e, pxPerWeight)}
                  className="flex shrink-0 select-none items-center justify-center"
                  style={{
                    width: HANDLE,
                    height: 56,
                    cursor: 'col-resize',
                    touchAction: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 3,
                      height: 40,
                      backgroundColor: c.ring.css,
                      borderRadius: 2,
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="shrink-0" style={{ width: ACT_W }} />
        </div>

        <div style={{ height: 4 }} />

        {rows.map((r, ri) => (
          <div
            key={r.key}
            className="flex items-center"
            style={{
              borderTop: `1px solid ${c.line.css}`,
              paddingBlock: 3,
            }}
          >
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                width: NUM_W,
                fontWeight: 700,
                color: c.muted.css,
              }}
            >
              {ri + 1}
            </div>

            {cols.map((col, i) => (
              <div
                key={col.key}
                className="shrink-0"
                style={{
                  width: col.weight * pxPerWeight,
                  paddingInline: 2,
                }}
              >
                <ImdFld
                  value={r.cells[i] ?? ''}
                  onChanged={(v) => updateCell(ri, i, v)}
                  colors={c}
                />
              </div>
            ))}

            <div
              className="flex shrink-0 items-center justify-center"
              style={{ width: ACT_W }}
            >
              {rows.length > 1 && (
                <ImdIconButton
                  icon="trash"
                  tooltip="حذف الصف"
                  kind={ImdBtnKind.danger}
                  onPressed={() => removeRow(ri)}
                  colors={c}
                />
              )}
            </div>
          </div>
        ))}

        <div style={{ height: 8 }} />

        <div className="flex justify-start">
          <ImdButtonOutline
            label="إضافة صف"
            icon="plus"
            small={true}
            onPressed={addRow}
            colors={c}
          />
        </div>
      </div>
    </div>
  );
}
