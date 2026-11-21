import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdCol, ImdTable } from '../imd_widgets';

function InitProbe({ onInit }: { readonly onInit: () => void }) {
  useEffect(() => {
    onInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('imd_table_sticky_test', () => {
  afterEach(() => {
    cleanup();
  });

  const cols = () => [new ImdCol('الكود'), new ImdCol('الصنف')];
  const rowsOf = (n: number) =>
    Array.from({ length: n }, (_, i) => [
      <span key="c">{`كود ${i}`}</span>,
      <span key="n">{`صنف ${i}`}</span>,
    ]);

  it('بلا maxHeight: جدولٌ واحد كما كان', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(40)} cards={false} />
      </div>,
    );
    expect(container.querySelectorAll('table').length).toBe(1);
    expect(screen.getByText('الكود')).toBeTruthy();
  });

  it('مع maxHeight: جدولان — رأسٌ وجسم', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(40)}
          cards={false}
          maxHeight={300}
        />
      </div>,
    );
    expect(container.querySelectorAll('table').length).toBe(2);
    expect(screen.getByText('الكود')).toBeTruthy();
  });

  it('الرأس يبقى ظاهرًا بعد تمرير الجسم', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(60)}
          cards={false}
          maxHeight={300}
        />
      </div>,
    );

    const tables = container.querySelectorAll('table');
    const headerTable = tables[0];
    const bodyTable = tables[1];
    const bodyScroller = bodyTable.closest('.overflow-y-auto') as HTMLElement;

    expect(bodyScroller).toBeTruthy();
    expect(headerTable.closest('.overflow-y-auto')).toBeNull();

    bodyScroller.scrollTop = 400;
    fireEvent.scroll(bodyScroller);

    expect(screen.getByText('الكود')).toBeTruthy();
    expect(bodyScroller.scrollTop).toBe(400);
  });

  it('أعمدة الرأس تحاذي أعمدة الجسم تمامًا', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(30)}
          cards={false}
          maxHeight={300}
        />
      </div>,
    );

    const tables = container.querySelectorAll('table');
    const headerTable = tables[0];
    const bodyTable = tables[1];

    expect(headerTable.style.tableLayout).toBe('fixed');
    expect(bodyTable.style.tableLayout).toBe('fixed');

    const headerCols = Array.from(headerTable.querySelectorAll('colgroup col')).map(
      (c) => (c as HTMLElement).style.width,
    );
    const bodyCols = Array.from(bodyTable.querySelectorAll('colgroup col')).map(
      (c) => (c as HTMLElement).style.width,
    );
    expect(headerCols).toEqual(bodyCols);
  });

  it('maxHeight مع pageSize: الترقيم تحت الإطار لا داخل تمريره', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(120)}
          cards={false}
          maxHeight={300}
          pageSize={50}
        />
      </div>,
    );
    const pagerText = screen.getByText('صفحة ١ من ٣');
    expect(pagerText).toBeTruthy();
    expect(pagerText.closest('.overflow-y-auto')).toBeNull();
    expect(container.querySelector('.overflow-y-auto')).toBeTruthy();
    expect(screen.queryByText('كود 50')).toBeNull();
  });

  it('جدول فارغ مع maxHeight: الرأس يبقى مع سطح «لا بيانات» بلا جسمٍ يُمرَّر', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={[]}
          cards={false}
          maxHeight={300}
          empty="لا بيانات"
        />
      </div>,
    );
    expect(screen.getByText('لا بيانات')).toBeTruthy();
    expect(container.querySelectorAll('table').length).toBe(1);
    expect(container.querySelector('.overflow-y-auto')).toBeNull();
  });

  it('headerBackground/headerForeground: يُطليان صفّ الرأس ونصّه معًا', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(5)}
          cards={false}
          headerBackground="#047857"
          headerForeground="#ffffff"
        />
      </div>,
    );

    const headerRow = container.querySelector('thead tr') as HTMLElement;
    expect(headerRow.style.backgroundColor).toBe('rgb(4, 120, 87)');

    const label = screen.getByText('الكود') as HTMLElement;
    expect(label.style.color).toBe('rgb(255, 255, 255)');
  });

  it('rowKeys يحافظ على هوية عنصر الصفّ عند إدراج صفٍّ قبله', () => {
    let initCount = 0;

    function Harness() {
      const [inserted, setInserted] = useState(false);
      const currentRows = inserted
        ? [
            [<span key="new">كود جديد</span>, null],
            [<span key="c0">كود 0</span>, <InitProbe key="p" onInit={() => { initCount += 1; }} />],
          ]
        : [[<span key="c0">كود 0</span>, <InitProbe key="p" onInit={() => { initCount += 1; }} />]];
      const currentKeys = inserted ? ['key-new', 'key-probe'] : ['key-probe'];

      return (
        <div dir="rtl">
          <button type="button" onClick={() => setInserted(true)}>
            إدراج
          </button>
          <ImdTable
            columns={cols()}
            rows={currentRows}
            rowKeys={currentKeys}
            cards={false}
          />
        </div>
      );
    }

    render(<Harness />);
    expect(initCount).toBe(1);

    fireEvent.click(screen.getByText('إدراج'));
    expect(
      initCount,
      'rowKeys يحافظ على العنصر فلا يُعاد initState',
    ).toBe(1);
  });

  it('cellPadding مُخصَّصة تُستبدل بها حشوة الجسم الافتراضية', () => {
    render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(2)}
          cards={false}
          cellPadding={{ horizontal: 6, vertical: 4 }}
        />
      </div>,
    );
    const cellTd = screen.getByText('صنف 0').closest('td')!;
    expect(cellTd.style.paddingTop).toBe('4px');
    expect(cellTd.style.paddingBottom).toBe('4px');
    expect(cellTd.style.paddingLeft).toBe('6px');
    expect(cellTd.style.paddingRight).toBe('6px');
  });
});
