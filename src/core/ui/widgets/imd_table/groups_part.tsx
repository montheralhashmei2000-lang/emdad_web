import type { MouseEvent } from 'react';
import { showImdContextMenu, type ImdMenuItem } from '../../imd_context_menu';
import { ImdDensity } from '../../imd_density';
import { nf } from '../../imd_format';
import { ImdIcon } from '../../imd_icon';
import { ImdColor, ImdColors, ImdCursor } from '../../imd_tokens';
import { ImdTap } from '../imd_tap';
import { shownCellValue } from './data_part';
import type { ImdCol, TableItem } from './support_part';

/// لونٌ محايد خفيف جدًّا فوق سطح الجدول — يعمل في كل سمة (فاتحة/داكنة/محروقات)
/// لأنه مشتقٌّ من ألوان السمة الحالية لا لونًا ثابتًا.
export function resolveZebraColor(c: ImdColors): ImdColor {
  return ImdColor.alphaBlend(c.text.withValues({ alpha: 0.035 }), c.surface);
}

export function openTableRowMenu(
  at: { readonly dx: number; readonly dy: number },
  row: number,
  rowMenu: ((index: number) => readonly ImdMenuItem[]) | null | undefined,
  colors: ImdColors,
): void {
  const items = rowMenu?.(row) ?? [];
  if (items.length === 0) return;
  void showImdContextMenu(at, items, { colors });
}

export interface GroupRowProps {
  readonly item: TableItem;
  readonly cols: readonly ImdCol[];
  readonly groupBy: number;
  readonly onToggle: (key: string) => void;
  readonly colors: ImdColors;
}

/// صفّ رأس مجموعة. ارتفاعه ثابتٌ ويمتدّ عنوانه عبر أعمدة الصفّ من بداية الاتجاه.
export function ImdTableGroupRow({
  item,
  cols,
  groupBy,
  onToggle,
  colors: c,
}: GroupRowProps) {
  const h = ImdDensity.isHigh ? 26 : 34;
  const groupKey = item.key ?? '';
  const colLabel = cols[groupBy]?.label ?? '';

  return (
    <tr
      key={`group:${groupKey}`}
      onClick={() => onToggle(groupKey)}
      style={{
        backgroundColor: c.subtle.css,
        borderBottom: `1px solid ${c.tableRowLine.css}`,
        cursor: ImdCursor.click,
      }}
    >
      <td colSpan={Math.max(1, cols.length)} style={{ padding: 0 }}>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(groupKey);
            }
          }}
          className="flex items-center select-none"
          style={{
            height: h,
            paddingInline: 12,
          }}
        >
          <ImdIcon
            name={item.collapsed ? 'chevron-left' : 'chevron-down'}
            size={13}
            color={c.muted}
          />
          <span style={{ width: 6, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: c.text2.css,
            }}
          >
            {`${colLabel}: ${shownCellValue(groupKey)}`}
          </span>
          <span style={{ width: 8, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: c.muted.css }}>
            {`(${nf(item.count)})`}
          </span>
        </div>
      </td>
    </tr>
  );
}

export interface GroupCardProps {
  readonly item: TableItem;
  readonly cols: readonly ImdCol[];
  readonly groupBy: number;
  readonly onToggle: (key: string) => void;
  readonly colors: ImdColors;
}

/// رأس مجموعة في عرض البطاقات.
export function ImdTableGroupCard({
  item,
  cols,
  groupBy,
  onToggle,
  colors: c,
}: GroupCardProps) {
  const groupKey = item.key ?? '';
  const colLabel = cols[groupBy]?.label ?? '';

  return (
    <ImdTap
      radius={8}
      onTap={() => onToggle(groupKey)}
      colors={c}
      className="w-full"
    >
      <div
        className="flex items-center"
        style={{
          padding: '8px 12px',
          backgroundColor: c.subtle.css,
          borderRadius: 8,
        }}
      >
        <ImdIcon
          name={item.collapsed ? 'chevron-left' : 'chevron-down'}
          size={13}
          color={c.muted}
        />
        <span style={{ width: 6, flexShrink: 0 }} />
        <span
          className="min-w-0 flex-1 text-start"
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: c.text2.css,
          }}
        >
          {`${colLabel}: ${shownCellValue(groupKey)}`}
        </span>
        <span style={{ fontSize: 12, color: c.muted.css }}>
          {`(${nf(item.count)})`}
        </span>
      </div>
    </ImdTap>
  );
}

export function eventClientPoint(e: MouseEvent<HTMLElement>): {
  readonly dx: number;
  readonly dy: number;
} {
  return { dx: e.clientX, dy: e.clientY };
}
