import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdCol, ImdTable } from '../imd_widgets';

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('imd_table_cards_test', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    cleanup();
    setViewportWidth(originalWidth);
  });

  const cols = () => [new ImdCol('الاسم'), new ImdCol('')];
  const rowsOf = (n: number) =>
    Array.from({ length: n }, (_, i) => [
      <span key="name">{`عنصر ${i}`}</span>,
      <button key="btn" type="button" onClick={() => {}}>
        {`حذف ${i}`}
      </button>,
    ]);

  it('cards: false ⇒ جدولٌ كما هو دومًا، حتى على شاشةٍ ضيّقة', () => {
    setViewportWidth(400);
    const { container } = render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(3)} cards={false} />
      </div>,
    );
    expect(container.querySelectorAll('table').length).toBe(1);
    expect(screen.getByText('عنصر 0')).toBeTruthy();
  });

  it('الافتراضي جدول: بلا `cards` يبقى جدولًا على شاشةٍ ضيّقة (400)', () => {
    setViewportWidth(400);
    const { container } = render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(3)} />
      </div>,
    );
    expect(
      container.querySelectorAll('table').length,
      'الجوال لا يحوّل الجدول بطاقات افتراضيًّا',
    ).toBe(1);
    expect(screen.getByText('عنصر 0')).toBeTruthy();
  });

  it('cards: true وعرضٌ ضيّق ⇒ بطاقاتٌ بدل الجدول', () => {
    setViewportWidth(400);
    const { container } = render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(3)} cards={true} />
      </div>,
    );
    expect(container.querySelectorAll('table').length).toBe(0);
    expect(screen.getByText('عنصر 0')).toBeTruthy();
    expect(screen.getByText('عنصر 1')).toBeTruthy();
    expect(screen.getByText('عنصر 2')).toBeTruthy();
  });

  it('cards: true لكن عرضٌ واسع (≥900) ⇒ يبقى جدولًا', () => {
    setViewportWidth(1200);
    const { container } = render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(3)} cards={true} />
      </div>,
    );
    expect(container.querySelectorAll('table').length).toBe(1);
  });

  it('عمود العنوان الفارغ يظهر في صفّ إجراءات لا معنوَنًا', () => {
    setViewportWidth(400);
    render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(2)} cards={true} />
      </div>,
    );
    expect(screen.getAllByText('الاسم').length).toBe(2);
    expect(screen.getByText('حذف 0')).toBeTruthy();
    expect(screen.getByText('حذف 1')).toBeTruthy();
  });

  it('onRowTap يلفّ البطاقة كاملةً', () => {
    setViewportWidth(400);
    const tapped: number[] = [];
    render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(3)}
          cards={true}
          onRowTap={(i) => tapped.push(i)}
        />
      </div>,
    );
    fireEvent.click(screen.getByText('عنصر 1'));
    expect(tapped).toEqual([1]);
  });

  it('صف الإجماليات يظهر كبطاقة إجماليات منفصلة مع cards: true', () => {
    setViewportWidth(400);
    render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(2)}
          cards={true}
          footer={[<span key="f">الإجمالي: ٢</span>, null]}
        />
      </div>,
    );
    expect(screen.getByText('الإجمالي: ٢')).toBeTruthy();
  });

  it('cards مع pageSize معًا: البطاقات تُقتصر على الصفحة، وشريط الترقيم يظهر', () => {
    setViewportWidth(400);
    const rows = Array.from({ length: 25 }, (_, i) => [
      <span key="n">{`عنصر ${i}`}</span>,
      null,
    ]);
    render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rows} cards={true} pageSize={10} />
      </div>,
    );
    expect(screen.getByText('عنصر 0')).toBeTruthy();
    expect(screen.getByText('عنصر 9')).toBeTruthy();
    expect(screen.queryByText('عنصر 10')).toBeNull();
    expect(screen.getByText('صفحة ١ من ٣')).toBeTruthy();
  });

  it('rowColor يُستخدم خلفيةً للبطاقة ويبقى بلا انهيار', () => {
    setViewportWidth(400);
    render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(3)}
          cards={true}
          rowColor={(i) => (i === 1 ? 'rgba(255, 0, 0, 0.1)' : null)}
        />
      </div>,
    );
    expect(screen.getByText('عنصر 1')).toBeTruthy();
  });
});
