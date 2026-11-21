import type { ReactNode } from 'react';
import type { ImdMenuItem } from '../../imd_context_menu';
import { ImdColors, ImdCursor } from '../../imd_tokens';
import { ImdTap } from '../imd_tap';
import { openTableRowMenu, resolveZebraColor } from './groups_part';
import {
  toTableColorCss,
  type ImdCol,
  type ImdTableColor,
} from './support_part';

/// عدد الصفحات لحجمٍ معطًى — صفحة واحدة على الأقل حتى لو كانت القائمة فارغة،
/// فلا يُقسَّم على صفر ولا تُعرض «صفحة صفر من صفر».
export function pageCountFor(totalRows: number, pageSize: number): number {
  return totalRows === 0 ? 1 : Math.ceil(totalRows / pageSize);
}

/// عنوانٌ صغيرٌ فوق خليته — بنفس أسلوب `ImdLabeled` في `imd_form.dart` حرفيًّا
/// (لا استيراد منه: هذا الملف أساسٌ لا يعتمد على ملفاتٍ فوقه).
function LabeledCardCell({
  label,
  cell,
  labelColor,
  colors: c,
}: {
  readonly label: string;
  readonly cell: ReactNode;
  readonly labelColor?: string;
  readonly colors: ImdColors;
}) {
  return (
    <div className="flex flex-col items-stretch">
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: labelColor ?? c.text2.css,
          lineHeight: 1.6,
        }}
      >
        {label}
      </div>
      <div style={{ height: 2 }} />
      <div>{cell}</div>
    </div>
  );
}

export interface ImdTableCardProps {
  readonly rowIndex: number;
  readonly cols: readonly ImdCol[];
  readonly row: readonly ReactNode[];
  readonly hovered: boolean;
  readonly zebra: boolean;
  readonly onHoverChange: (row: number) => void;
  readonly onRowTap?: ((index: number) => void) | null;
  readonly rowMenu?: ((index: number) => readonly ImdMenuItem[]) | null;
  readonly rowColor?: ((index: number) => ImdTableColor | null | undefined) | null;
  readonly colors: ImdColors;
}

/// بطاقة صفٍّ واحد على الشاشات الضيّقة (`cards: true`) — بديل صف الجدول.
/// أعمدة `label` غير الفارغة تُكدَّس معنونةً، وأعمدة `label` الفارغة
/// (أزرار الإجراءات دومًا في الشاشات القائمة) تُجمَع في صفّ أسفل البطاقة.
export function ImdTableCard({
  rowIndex,
  cols,
  row,
  hovered,
  zebra,
  onHoverChange,
  onRowTap,
  rowMenu,
  rowColor,
  colors: c,
}: ImdTableCardProps) {
  const fields: ReactNode[] = [];
  const actions: ReactNode[] = [];

  for (let j = 0; j < cols.length; j++) {
    const cell = j < row.length ? row[j] : null;
    if (cols[j].label.length === 0) {
      actions.push(<span key={`act-${j}`}>{cell}</span>);
    } else {
      fields.push(
        <LabeledCardCell
          key={`fld-${j}`}
          label={cols[j].label}
          cell={cell}
          colors={c}
        />,
      );
    }
  }

  const customColor = toTableColorCss(rowColor?.(rowIndex));
  const bg =
    onRowTap && hovered
      ? c.rowHover.css
      : customColor ??
        (zebra && rowIndex % 2 === 1
          ? resolveZebraColor(c).css
          : c.surface.css);

  const cardBody = (
    <div
      className="flex flex-col items-stretch transition-colors duration-100"
      style={{
        padding: 12,
        backgroundColor: bg,
        border: `1px solid ${c.line.css}`,
        borderRadius: 10,
        fontSize: 13.5,
        color: c.text.css,
        lineHeight: 1.5,
      }}
    >
      {fields.length > 0 && (
        <div className="flex flex-col items-stretch gap-2">{fields}</div>
      )}
      {actions.length > 0 && (
        <>
          <div style={{ height: 10 }} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        </>
      )}
    </div>
  );

  if (!onRowTap && !rowMenu) {
    return cardBody;
  }

  return (
    <ImdTap
      radius={10}
      cursor={onRowTap ? ImdCursor.click : 'default'}
      onHoverChange={(h) => onHoverChange(h ? rowIndex : -1)}
      onTap={onRowTap ? () => onRowTap(rowIndex) : undefined}
      onSecondaryTapDown={
        rowMenu
          ? (d) => openTableRowMenu(d.globalPosition, rowIndex, rowMenu, c)
          : undefined
      }
      onLongPressStart={
        rowMenu
          ? (d) => openTableRowMenu(d.globalPosition, rowIndex, rowMenu, c)
          : undefined
      }
      colors={c}
      className="w-full"
    >
      {cardBody}
    </ImdTap>
  );
}

export interface ImdTableFooterCardProps {
  readonly cols: readonly ImdCol[];
  readonly footer: readonly ReactNode[];
  readonly colors: ImdColors;
}

/// بطاقة الإجماليات — نظير صفّ [ImdTable.footer] في وضع البطاقات، بنفس
/// ألوان صفّه في الجدول (`accentSoft`/`accent`) لتمييزها عن بطاقات البيانات.
export function ImdTableFooterCard({
  cols,
  footer,
  colors: c,
}: ImdTableFooterCardProps) {
  const fields: ReactNode[] = [];
  for (let j = 0; j < cols.length; j++) {
    if (cols[j].label.length === 0) continue;
    const cell = j < footer.length ? footer[j] : null;
    fields.push(
      <LabeledCardCell
        key={`foot-${j}`}
        label={cols[j].label}
        cell={cell}
        labelColor={c.accent.css}
        colors={c}
      />,
    );
  }

  return (
    <div
      className="flex flex-col items-stretch gap-2"
      style={{
        padding: 12,
        backgroundColor: c.accentSoft.css,
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 700,
        color: c.accent.css,
        lineHeight: 1.5,
      }}
    >
      {fields}
    </div>
  );
}
