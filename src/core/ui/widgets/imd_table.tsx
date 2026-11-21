import type { ReactNode } from 'react';
import { useImdTableBase } from './imd_table/base_part';
import { ImdTableBuildPart } from './imd_table/build_part';
import { useImdTableData } from './imd_table/data_part';
import {
  AUTO_PAGE_SIZE,
  AUTO_PAGE_THRESHOLD,
  ImdCol,
  VIRTUALIZE_ABOVE,
  normalizeImdCol,
  resolveTableColors,
  type ImdColOptions,
  type ImdColSpec,
  type ImdTableColor,
  type ImdTablePadding,
  type ImdTableProps,
} from './imd_table/support_part';
import { ImdDensity } from '../imd_density';
import { ImdColors, ImdSizes } from '../imd_tokens';

export {
  ImdCol,
  type ImdColOptions,
  type ImdColSpec,
  type ImdTableColor,
  type ImdTablePadding,
  type ImdTableProps,
};

/// جدول قراءة بيانات كثيفة: رأس رمادي فاتح، صفوف بخط فاصل، وتظليل عند المرور.
export function ImdTable(props: ImdTableProps) {
  if (props.rowKeys && props.rowKeys.length !== props.rows.length) {
    throw new Error(
      'rowKeys.length يجب أن يساوي rows.length — مفتاحٌ واحدٌ لكل صفّ',
    );
  }
  if (props.values && props.values.length !== props.rows.length) {
    throw new Error(
      'values.length يجب أن يساوي rows.length — صفّ قيمٍ لكل صفّ',
    );
  }

  const colors = resolveTableColors(props.colors);
  const cols = props.columns.map(normalizeImdCol);
  const base = useImdTableBase(props);
  const data = useImdTableData(props, cols, base, colors);

  return <ImdTableBuildPart props={props} base={base} data={data} />;
}

export namespace ImdTable {
  /// عدد الصفوف الذي يُفعَّل بعده الترقيم التلقائي حين لا يُمرَّر [pageSize].
  export const autoPageThreshold = AUTO_PAGE_THRESHOLD;

  /// صفوف الصفحة التي يُمثَّل بعدها الجسم افتراضيًّا (يُبنى الظاهر وحده) حين
  /// يكون للجدول سقف ارتفاع ([maxHeight]).
  export const virtualizeAbove = VIRTUALIZE_ABOVE;

  /// حجم الصفحة في الترقيم التلقائي.
  export const autoPageSize = AUTO_PAGE_SIZE;
}

export interface ImdEmptyBoxProps {
  readonly text?: string;
  readonly message?: string;
  readonly children?: ReactNode;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// صفٌّ فارغ بإطار جدول («لا …») للقوائم الخالية.
export function ImdEmptyBox({
  text,
  message,
  children,
  colors,
  className = '',
}: ImdEmptyBoxProps) {
  const c = resolveTableColors(colors);
  const resolvedText = message ?? text;

  if (
    children !== undefined &&
    children !== null &&
    resolvedText === undefined
  ) {
    return (
      <div
        className={`w-full overflow-hidden ${className}`.trim()}
        style={{
          backgroundColor: c.surface.css,
          border: `1px solid ${c.line.css}`,
          borderRadius: ImdSizes.radius,
          padding: '9px 12px',
          fontSize: ImdDensity.cellFont,
          fontWeight: 500,
          color: c.muted.css,
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <ImdTable
      columns={[]}
      rows={[]}
      empty={resolvedText ?? ''}
      colors={c}
      className={className}
    />
  );
}
