import { cleanup, render, screen } from '@testing-library/react';
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

const longNote =
  'ملاحظة طويلة جدًّا عن صرف إعاشة المعسكر لمدة خمسة عشر يومًا مع مراجعة الاستحقاق';

describe('imd_table_nowrap_test', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    cleanup();
    setViewportWidth(originalWidth);
  });

  it('أعمدةٌ أعرض من الشاشة: تمريرٌ أفقي وكل خليةٍ سطرٌ واحد', () => {
    setViewportWidth(700);
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={[
            new ImdCol('الصنف'),
            new ImdCol('المستودع'),
            new ImdCol('الملاحظات'),
            new ImdCol('الجهة'),
          ]}
          rows={Array.from({ length: 3 }, (_, i) => [
            <span key="1">{`صنف رقم ${i} دقيق أبيض فاخر`}</span>,
            <span key="2">المخزن الرئيسي للفرقة</span>,
            <span key="3">{longNote}</span>,
            <span key="4">مطبخ معسكر الثنية (مطبخ)</span>,
          ])}
        />
      </div>,
    );

    const noteEl = screen.getAllByText(longNote)[0];
    const td = noteEl.closest('td')!;
    expect(getComputedStyle(td).whiteSpace).toBe('nowrap');

    const cellWrap = noteEl.closest('.whitespace-nowrap');
    expect(cellWrap).toBeTruthy();

    const hScroller = container.querySelector('.overflow-x-auto');
    expect(hScroller).toBeTruthy();
  });

  it('جدولٌ قصير يملأ عرض الشاشة كما كان', () => {
    setViewportWidth(700);
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          columns={[new ImdCol('الصنف'), new ImdCol('الرصيد')]}
          rows={[[<span key="a">أرز</span>, <span key="b">12</span>]]}
        />
      </div>,
    );

    const table = container.querySelector('table')!;
    expect(table).toBeTruthy();
    expect(table.style.width).toBe('100%');
  });

  it('نصٌّ أطول من أقصى عرض العمود يُختصر بـ«…» ولا يلتفّ', () => {
    setViewportWidth(1200);
    const huge = Array.from({ length: 40 }, () => 'كلمة').join(' ');
    render(
      <div dir="rtl">
        <ImdTable
          columns={[new ImdCol('الملاحظات')]}
          rows={[[<span key="h">{huge}</span>]]}
        />
      </div>,
    );

    const textEl = screen.getByText(huge);
    const td = textEl.closest('td')!;
    expect(getComputedStyle(td).whiteSpace).toBe('nowrap');
    expect(parseFloat(td.style.maxWidth)).toBe(560);
    expect(textEl.closest('.truncate')).toBeTruthy();
  });

  it('جداول الإدخال (flushCells) لا تُمسّ', () => {
    setViewportWidth(700);
    render(
      <div dir="rtl">
        <ImdTable
          flushCells={true}
          columns={[new ImdCol('الصنف')]}
          rows={[[<span key="n">{longNote}</span>]]}
        />
      </div>,
    );

    const textEl = screen.getByText(longNote);
    const td = textEl.closest('td')!;
    expect(getComputedStyle(td).whiteSpace).not.toBe('nowrap');
    expect(textEl.closest('.truncate')).toBeNull();
  });
});
