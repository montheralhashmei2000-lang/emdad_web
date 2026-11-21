import { useEffect, useState, type ReactNode } from 'react';
import { ImdDensity } from './imd_density';
import { ImdLabeled } from './imd_form';
import { ImdStyle } from './imd_style';
import { ImdBp, ImdColors } from './imd_tokens';
import { ImdButtonOutline, ImdEmptyBox, ImdIconButton } from './imd_widgets';

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

function useDensityAndViewportTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    ImdDensity.addRebuildListener(bump);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', bump);
    }
    return () => {
      ImdDensity.removeRebuildListener(bump);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', bump);
      }
    };
  }, []);
  return tick;
}

export interface ImdBulkColSpec {
  readonly label: string;
  readonly width?: number;
  readonly flex?: number;
  /// سطرٌ صغير تحت العنوان يشرح ما يُكتب — أرخص من تدريب المستخدم.
  readonly hint?: string;
}

/// عمود في شبكة الإدخال الجماعي.
///
/// [width] يثبّت العرض (للحقول الرقمية والقوائم)، و[flex] يوزّع ما بقي.
export class ImdBulkCol implements ImdBulkColSpec {
  readonly label: string;
  readonly width?: number;
  readonly flex: number;
  readonly hint: string;

  constructor(
    label: string,
    options: {
      readonly width?: number;
      readonly flex?: number;
      readonly hint?: string;
    } = {},
  ) {
    this.label = label;
    this.width = options.width;
    this.flex = options.flex ?? 1;
    this.hint = options.hint ?? '';
  }
}

export interface ImdBulkRowSpec {
  readonly cells: readonly ReactNode[];
  /// خطأ هذا السطر وحده — يُعرض تحته بلا أن يُخفي ما كُتب.
  readonly error?: string;
  /// شارة تُعرض بجوار رقم السطر (حالة، وحدة، تنبيه).
  readonly badge?: ReactNode;
}

/// سطرٌ في الشبكة: خلاياه، وخطؤه إن وُجد.
export class ImdBulkRow implements ImdBulkRowSpec {
  readonly cells: readonly ReactNode[];
  readonly error: string;
  readonly badge?: ReactNode;

  constructor({
    cells,
    error = '',
    badge,
  }: {
    readonly cells: readonly ReactNode[];
    readonly error?: string;
    readonly badge?: ReactNode;
  }) {
    this.cells = cells;
    this.error = error;
    this.badge = badge;
  }
}

export interface ImdBulkGridProps {
  readonly columns: readonly ImdBulkColSpec[];
  readonly rows: readonly ImdBulkRowSpec[];
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
  /// تكرار السطر بكل قيمه — يُخفى إن لم يُمرَّر.
  readonly onDuplicate?: (index: number) => void;
  readonly addLabel?: string;
  readonly empty?: string;
  /// رقائق الملخّص أسفل الشبكة (عدد السطور، الإجمالي، التحذيرات).
  readonly summary?: readonly ReactNode[];
  /// أزرار إضافية بجوار «إضافة سطر».
  readonly actions?: readonly ReactNode[];
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// شبكة إدخال جماعي: سطورٌ متكررة بأعمدة ثابتة، مع ترقيم وتكرار وحذف.
export function ImdBulkGrid({
  columns,
  rows,
  onAdd,
  onRemove,
  onDuplicate,
  addLabel = 'إضافة سطر',
  empty = 'لم يُضف سطر بعد',
  summary = [],
  actions = [],
  colors,
  className = '',
}: ImdBulkGridProps) {
  useDensityAndViewportTick();
  const c = resolveActiveColors(colors);
  const narrow = ImdBp.of().tablet;

  /// عرض عمود الترقيم: الرقم وحده 34، ومعه شارةٌ (كود الصنف مثلًا) 34 + فاصل + 72.
  const leadWidth = rows.some((r) => r.badge !== undefined && r.badge !== null)
    ? 34 + 6 + 72
    : 34;

  /// عرض عمود الإجراءات: زرّان (تكرار + حذف) أو زرٌّ واحد، كلٌّ بنحو 40.
  const actionsWidth = onDuplicate ? 92 : 48;

  const renderIndex = (i: number, badge?: ReactNode) => (
    <div className="inline-flex min-w-0 items-center">
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 24,
          height: 24,
          backgroundColor: c.subtle.css,
          border: `1px solid ${c.line.css}`,
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          color: c.text2.css,
        }}
      >
        {i + 1}
      </div>
      {badge !== undefined && badge !== null && (
        <div className="min-w-0 truncate" style={{ marginInlineStart: 6 }}>
          {badge}
        </div>
      )}
    </div>
  );

  const renderRowActions = (i: number) => (
    <div className="flex shrink-0 items-center justify-end gap-1">
      {onDuplicate && (
        <ImdIconButton
          icon="plus"
          tooltip="تكرار السطر"
          onPressed={() => onDuplicate(i)}
          colors={c}
        />
      )}
      <ImdIconButton
        icon="trash"
        tooltip="حذف السطر"
        onPressed={() => onRemove(i)}
        colors={c}
      />
    </div>
  );

  const renderHeadCell = (col: ImdBulkColSpec) => {
    const body = (
      <div className="flex flex-col items-start">
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 0.2,
            color: c.text2.css,
          }}
        >
          {col.label}
        </span>
        {col.hint && col.hint.length > 0 && (
          <span
            className="max-w-full truncate"
            style={{
              fontSize: 10.5,
              color: c.muted.css,
              lineHeight: 1.4,
            }}
          >
            {col.hint}
          </span>
        )}
      </div>
    );
    return (
      <div
        style={{
          paddingInline: 4,
          width: col.width,
        }}
      >
        {body}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-stretch ${className}`.trim()}>
      {rows.length === 0 ? (
        <ImdEmptyBox message={empty} colors={c} />
      ) : narrow ? (
        <div>
          {rows.map((row, i) => {
            const err = row.error ?? '';
            const bad = err.length > 0;
            return (
              <div
                key={i}
                className="flex flex-col items-stretch"
                style={{
                  marginBottom: 10,
                  padding: 12,
                  backgroundColor: c.surface.css,
                  border: `1px solid ${(bad ? c.danger : c.line).css}`,
                  borderRadius: 10,
                }}
              >
                <div className="flex items-center">
                  {renderIndex(i, row.badge)}
                  <div className="flex-1" />
                  {renderRowActions(i)}
                </div>
                <div style={{ height: 8 }} />
                {columns.map((col, k) =>
                  k < row.cells.length ? (
                    <div key={k} style={{ paddingBottom: 8 }}>
                      <ImdLabeled label={col.label} size={11} colors={c}>
                        {row.cells[k]}
                      </ImdLabeled>
                    </div>
                  ) : null,
                )}
                {bad && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: c.danger.css,
                      fontWeight: 600,
                    }}
                  >
                    ✖ {err}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div
            className="flex items-center"
            style={{
              padding: '8px 10px',
              backgroundColor: c.tableHead.css,
              borderBottom: `1px solid ${c.lineStrong.css}`,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
            }}
          >
            <div style={{ width: leadWidth, flexShrink: 0 }} />
            {columns.map((col, k) => (
              <div
                key={k}
                className="min-w-0"
                style={{ flex: col.flex ?? 1 }}
              >
                {renderHeadCell(col)}
              </div>
            ))}
            <div style={{ width: actionsWidth, flexShrink: 0 }} />
          </div>

          {rows.map((row, i) => {
            const err = row.error ?? '';
            const bad = err.length > 0;
            return (
              <div
                key={i}
                className="flex flex-col items-stretch"
                style={{
                  padding: '7px 10px',
                  borderBottom: `1px solid ${c.line.css}`,
                  borderInlineStart: `3px solid ${
                    bad ? c.danger.css : 'transparent'
                  }`,
                  backgroundColor: bad
                    ? c.dangerSoft.withValues({ alpha: 0.35 }).css
                    : i % 2 === 1
                      ? c.subtle.css
                      : undefined,
                }}
              >
                <div className="flex items-center">
                  <div style={{ width: leadWidth, flexShrink: 0 }}>
                    {renderIndex(i, row.badge)}
                  </div>
                  {columns.map((col, k) => (
                    <div
                      key={k}
                      className="min-w-0"
                      style={{
                        flex: col.flex ?? 1,
                        paddingInline: 4,
                      }}
                    >
                      {k < row.cells.length ? row.cells[k] : null}
                    </div>
                  ))}
                  <div style={{ width: actionsWidth, flexShrink: 0 }}>
                    {renderRowActions(i)}
                  </div>
                </div>
                {bad && (
                  <div
                    style={{
                      paddingTop: 6,
                      paddingInlineStart: leadWidth + 4,
                      fontSize: 11.5,
                      color: c.danger.css,
                      fontWeight: 600,
                    }}
                  >
                    ✖ {err}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 10 }} />
      <div className="flex flex-wrap items-center gap-[10px]">
        <ImdButtonOutline
          label={addLabel}
          icon="plus-square"
          small={true}
          onPressed={onAdd}
          colors={c}
        />
        {actions}
        {summary.length > 0 && (
          <>
            <div
              style={{
                width: 1,
                height: 22,
                backgroundColor: c.line.css,
              }}
            />
            {summary}
          </>
        )}
      </div>
    </div>
  );
}
