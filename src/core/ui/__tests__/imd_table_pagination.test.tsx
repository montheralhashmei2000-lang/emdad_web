import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdCol, ImdTable } from '../imd_widgets';

describe('imd_table_pagination_test', () => {
  afterEach(() => {
    cleanup();
  });

  const cols = () => [new ImdCol('الرقم')];
  const rowsOf = (n: number) =>
    Array.from({ length: n }, (_, i) => [<span key="r">{`صف ${i}`}</span>]);

  const pagerBtn = (tooltip: string) =>
    screen.getByRole('button', { name: tooltip });

  it('pageSize null ⇒ كل الصفوف كما كانت، بلا شريط ترقيم', () => {
    render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(120)} />
      </div>,
    );
    expect(screen.getByText('صف 0')).toBeTruthy();
    expect(screen.getByText('صف 119')).toBeTruthy();
    expect(screen.queryByText(/صفحة/)).toBeNull();
  });

  it('pageSize مفعَّل ⇒ صفحة واحدة فقط تُعرض، وشريطٌ يصف الإجمالي', () => {
    render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(120)} pageSize={50} />
      </div>,
    );
    expect(screen.getByText('صف 0')).toBeTruthy();
    expect(screen.getByText('صف 49')).toBeTruthy();
    expect(screen.queryByText('صف 50')).toBeNull();
    expect(screen.getAllByText(/١/).length).toBeGreaterThan(0);
    expect(screen.getByText('صفحة ١ من ٣')).toBeTruthy();

    fireEvent.click(pagerBtn('الصفحة السابقة'));
    expect(screen.getByText('صفحة ١ من ٣')).toBeTruthy();
  });

  it('«التالي» ينتقل للصفحة التالية بفهرسٍ مطلق لا محلي', () => {
    render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(120)} pageSize={50} />
      </div>,
    );

    fireEvent.click(pagerBtn('الصفحة التالية'));
    expect(screen.getByText('صف 50')).toBeTruthy();
    expect(screen.getByText('صف 99')).toBeTruthy();
    expect(screen.queryByText('صف 0')).toBeNull();
    expect(screen.getByText('صفحة ٢ من ٣')).toBeTruthy();

    fireEvent.click(pagerBtn('الصفحة التالية'));
    expect(screen.getByText('صف 100')).toBeTruthy();
    expect(screen.getByText('صف 119')).toBeTruthy();
    expect(screen.getByText('صفحة ٣ من ٣')).toBeTruthy();
  });

  it('onRowTap يبلَّغ بالفهرس المطلق حتى في صفحاتٍ لاحقة', () => {
    const tapped: number[] = [];
    render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(120)}
          pageSize={50}
          onRowTap={(i) => tapped.push(i)}
        />
      </div>,
    );
    fireEvent.click(pagerBtn('الصفحة التالية'));
    fireEvent.click(screen.getByText('صف 55'));
    expect(tapped).toEqual([55]);
  });

  it('صف الإجماليات يظهر مرةً واحدة بصرف النظر عن الصفحة', () => {
    render(
      <div dir="rtl">
        <ImdTable
          columns={cols()}
          rows={rowsOf(120)}
          pageSize={50}
          footer={[<span key="f">الإجمالي: ١٢٠</span>]}
        />
      </div>,
    );
    expect(screen.getByText('الإجمالي: ١٢٠')).toBeTruthy();
    fireEvent.click(pagerBtn('الصفحة التالية'));
    expect(screen.getByText('الإجمالي: ١٢٠')).toBeTruthy();
  });

  it('قائمة فارغة مع pageSize: تبقى رسالة الفراغ، بلا شريط ترقيم', () => {
    render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={[]} pageSize={50} />
      </div>,
    );
    expect(screen.getByText('لا توجد بيانات')).toBeTruthy();
    expect(screen.queryByText(/صفحة/)).toBeNull();
  });

  it('عدد الصفوف أقل من حجم الصفحة: صفحة واحدة، والزرّان معطَّلان', () => {
    render(
      <div dir="rtl">
        <ImdTable columns={cols()} rows={rowsOf(5)} pageSize={50} />
      </div>,
    );
    expect(screen.getByText('صفحة ١ من ١')).toBeTruthy();
    expect(screen.getByText('صف 4')).toBeTruthy();
    expect(pagerBtn('الصفحة السابقة').getAttribute('aria-disabled')).toBe('true');
    expect(pagerBtn('الصفحة التالية').getAttribute('aria-disabled')).toBe('true');
  });
});
