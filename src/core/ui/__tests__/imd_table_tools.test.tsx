import { useEffect, useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTheme } from '../../theme/app_theme';
import { ImdDensity } from '../imd_density';
import { ImdKpi } from '../imd_layout';
import { ImdPageHost } from '../imd_page_tabs';
import { ImdRecordScope, ImdRecordSink } from '../imd_status_bar';
import { ImdStyle } from '../imd_style';
import {
  ImdColors,
  ImdSizes,
  imdShadow,
  imdShadowOverlay,
} from '../imd_tokens';
import { ImdCol, ImdSelect, ImdTable } from '../imd_widgets';

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

const names = ['أرز', 'سكر', 'زيت', 'دقيق', 'ملح'] as const;
const cats = ['حبوب', 'حلويات', 'زيوت', 'حبوب', ''] as const;

describe('imd_table_tools_test', () => {
  const originalWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // تجاهل
    }
    ImdDensity.notifier.value = false;
    ImdStyle.notifier.value = false;
    setViewportWidth(1200);
  });

  afterEach(() => {
    cleanup();
    ImdDensity.notifier.value = false;
    ImdStyle.notifier.value = false;
    setViewportWidth(originalWidth);
    window.matchMedia = originalMatchMedia;
  });

  const buildTable = ({
    tapped,
    withValues = true,
  }: {
    readonly tapped?: number[];
    readonly withValues?: boolean;
  } = {}) => (
    <ImdTable
      columns={[new ImdCol('الصنف'), new ImdCol('الفئة')]}
      rows={names.map((name, i) => [
        <span key="n">{name}</span>,
        <span key="c">{cats[i]}</span>,
      ])}
      values={withValues ? names.map((name, i) => [name, cats[i]]) : null}
      onRowTap={tapped ? (i) => tapped.push(i) : undefined}
    />
  );

  it('بلا values لا شريط أدوات ولا أيقونات تصفية', () => {
    render(<div dir="rtl">{buildTable({ withValues: false })}</div>);
    expect(screen.queryByText('تصفية')).toBeNull();
    expect(screen.queryByText('تجميع حسب')).toBeNull();
    expect(screen.queryAllByTitle('تصفية العمود').length).toBe(0);
  });

  it('مع values: شريط أدوات وأيقونة تصفية لكل عمود', () => {
    render(<div dir="rtl">{buildTable()}</div>);
    expect(screen.getByPlaceholderText('بحث فوري…')).toBeTruthy();
    expect(screen.getByText('اسحب رأس العمود هنا للتجميع')).toBeTruthy();
    expect(screen.getAllByTitle('تصفية العمود').length).toBe(2);
    expect(screen.queryByText('تصفية')).toBeNull();
    expect(screen.queryByText('تجميع حسب')).toBeNull();
  });

  it('تصفية عمودٍ تُخفي الصفوف غير المختارة وتُبقي الفهرس المطلق', async () => {
    const tapped: number[] = [];
    render(<div dir="rtl">{buildTable({ tapped })}</div>);

    const filterBtns = screen.getAllByTitle('تصفية العمود');
    fireEvent.click(filterBtns[filterBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('(فارغ)')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('إلغاء الكل'));
    const dialog = screen.getByRole('dialog');
    const grainCheckbox = dialog.querySelectorAll('label');
    const targetLabel = Array.from(grainCheckbox).find((l) =>
      l.textContent?.includes('حبوب'),
    )!;
    fireEvent.click(targetLabel.querySelector('input[type="checkbox"]')!);
    fireEvent.click(screen.getByText('تطبيق'));

    await waitFor(() => {
      expect(screen.getByText('أرز')).toBeTruthy();
      expect(screen.getByText('دقيق')).toBeTruthy();
      expect(screen.queryByText('سكر')).toBeNull();
      expect(screen.queryByText('ملح')).toBeNull();
    });

    fireEvent.click(screen.getByText('دقيق'));
    expect(
      tapped,
      'onRowTap يتلقى فهرس الصف في القائمة الأصلية لا بعد التصفية',
    ).toEqual([3]);

    fireEvent.click(screen.getByText('مسح الفلاتر'));
    expect(screen.getByText('سكر')).toBeTruthy();
  });

  it('التجميع (قائمة الجوال) يضع رأسًا لكل قيمة ويطوي المجموعة بالنقر', () => {
    setViewportWidth(400);
    render(<div dir="rtl">{buildTable()}</div>);

    fireEvent.click(screen.getByText('تجميع حسب'));
    const menuItems = screen.getAllByRole('menuitem');
    const catOption = menuItems.find((el) => el.textContent === 'الفئة')!;
    fireEvent.click(catOption);

    expect(screen.getByText(/الفئة: حبوب/)).toBeTruthy();
    expect(screen.getByText(/الفئة: \(فارغ\)/)).toBeTruthy();
    expect(screen.getByText('أرز')).toBeTruthy();

    fireEvent.click(screen.getByText(/الفئة: حبوب/));
    expect(screen.queryByText('أرز')).toBeNull();
    expect(screen.getByText('سكر')).toBeTruthy();
  });

  it('الجدول يُبلّغ عدّاد السجلات بالمعروض والإجمالي', async () => {
    const sink = new ImdRecordSink();
    render(
      <div dir="rtl">
        <ImdRecordScope sink={sink}>{buildTable()}</ImdRecordScope>
      </div>,
    );

    await waitFor(() => {
      expect(sink.current).toEqual({ shown: 5, total: 5 });
    });

    fireEvent.click(screen.getAllByTitle('تصفية العمود')[0]);
    await waitFor(() => {
      expect(screen.getByText('إلغاء الكل')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('إلغاء الكل'));
    const dialog = screen.getByRole('dialog');
    const riceLabel = Array.from(dialog.querySelectorAll('label')).find((l) =>
      l.textContent?.includes('أرز'),
    )!;
    fireEvent.click(riceLabel.querySelector('input[type="checkbox"]')!);
    fireEvent.click(screen.getByText('تطبيق'));

    await waitFor(() => {
      expect(sink.current).toEqual({ shown: 1, total: 5 });
    });
  });

  it('العدّاد يعرض أكبر جدولٍ في الصفحة ويتخلّى عن المُزال', () => {
    const sink = new ImdRecordSink();
    const a = {};
    const b = {};
    sink.report(a, { shown: 3, total: 3 });
    sink.report(b, { shown: 40, total: 120 });
    expect(sink.current).toEqual({ shown: 40, total: 120 });
    sink.remove(b);
    expect(sink.current).toEqual({ shown: 3, total: 3 });
  });

  it('الكثافة العالية تُنقص ارتفاع الصفوف', () => {
    const { container, rerender } = render(
      <div dir="rtl">{buildTable({ withValues: false })}</div>,
    );
    const normalPad = parseFloat(
      (container.querySelector('tbody td') as HTMLElement).style.paddingTop,
    );

    act(() => {
      ImdDensity.notifier.value = true;
    });
    rerender(<div dir="rtl">{buildTable({ withValues: false })}</div>);

    const densePad = parseFloat(
      (container.querySelector('tbody td') as HTMLElement).style.paddingTop,
    );
    expect(densePad).toBeLessThan(normalPad);
  });

  it('الكثافة العالية لا تُضيّق أهداف اللمس على الجوال', () => {
    ImdDensity.notifier.value = true;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    expect(ImdDensity.compactTargets).toBe(true);

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    expect(ImdDensity.compactTargets).toBe(false);
  });

  it('البحث الفوري يفلتر الصفوف فورًا ويبلّغ العدّاد', async () => {
    const sink = new ImdRecordSink();
    render(
      <div dir="rtl">
        <ImdRecordScope sink={sink}>{buildTable()}</ImdRecordScope>
      </div>,
    );

    const searchInput = screen.getByPlaceholderText('بحث فوري…');
    fireEvent.change(searchInput, { target: { value: 'سك' } });

    expect(screen.getByText('سكر')).toBeTruthy();
    expect(screen.queryByText('أرز')).toBeNull();
    await waitFor(() => {
      expect(sink.current).toEqual({ shown: 1, total: 5 });
    });

    fireEvent.change(searchInput, { target: { value: 'زيوت' } });
    expect(screen.getByText('زيت')).toBeTruthy();
    expect(screen.queryByText('سكر')).toBeNull();
  });

  it('لوحة التجميع: نصّ إرشادي وإسقاط رأس العمود عليها يجمّع', () => {
    render(<div dir="rtl">{buildTable()}</div>);
    expect(screen.getByText('اسحب رأس العمود هنا للتجميع')).toBeTruthy();

    const headerEl = screen.getAllByText('الفئة')[0].closest('[draggable="true"]')!;
    const dropPanel = screen.getByTestId('imd-table-group-panel');

    fireEvent.dragStart(headerEl);
    fireEvent.dragOver(dropPanel);
    fireEvent.drop(dropPanel);

    expect(screen.getByText(/الفئة: حبوب/)).toBeTruthy();
    expect(screen.queryByText('اسحب رأس العمود هنا للتجميع')).toBeNull();
  });

  it('الجدول الفارغ يُبقي رأسه ويعرض سطحًا رماديًّا صغيرًا', () => {
    render(
      <div dir="rtl">
        <ImdTable
          columns={[new ImdCol('الصنف'), new ImdCol('الفئة')]}
          rows={[]}
          empty="لا توجد بيانات"
        />
      </div>,
    );
    expect(screen.getByText('الصنف')).toBeTruthy();
    expect(screen.getByText('لا توجد بيانات')).toBeTruthy();
  });

  it('الجوال: جدول بتمرير أفقي لا بطاقات، والعمود الأول مثبَّت', () => {
    setViewportWidth(400);
    const { container } = render(
      <div dir="rtl">
        <ImdTable
          freezeFirst={true}
          columns={[
            new ImdCol('الكود', { width: 90 }),
            new ImdCol('الصنف', { width: 200 }),
            new ImdCol('الفئة', { width: 200 }),
            new ImdCol('الرصيد', { width: 200 }),
          ]}
          rows={Array.from({ length: 3 }, (_, i) => [
            <span key="1">{`ك${i}`}</span>,
            <span key="2">{`صنف ${i}`}</span>,
            <span key="3">فئة</span>,
            <span key="4">{`${i * 10}`}</span>,
          ])}
        />
      </div>,
    );

    expect(container.querySelectorAll('table').length).toBe(1);

    const hScroller = container.querySelector('.overflow-x-auto') as HTMLElement;
    Object.defineProperty(hScroller, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 150,
    });
    fireEvent.scroll(hScroller);

    expect(container.querySelectorAll('table').length).toBe(2);
    expect(screen.getAllByText('ك0').length).toBeGreaterThanOrEqual(2);
  });

  it('ترقيم تلقائي بعد 300 صفٍّ حين لا يُمرَّر pageSize', () => {
    setViewportWidth(1200);
    render(
      <div dir="rtl">
        <ImdTable
          columns={[new ImdCol('م')]}
          rows={Array.from({ length: 350 }, (_, i) => [
            <span key="r">{`صف${i}`}</span>,
          ])}
        />
      </div>,
    );
    expect(screen.getByText('صف0')).toBeTruthy();
    expect(screen.getByText('صف99')).toBeTruthy();
    expect(screen.queryByText('صف100')).toBeNull();
    expect(screen.getByText(/من ٣٥٠/)).toBeTruthy();
  });

  it('جدولٌ بـ300 صفٍّ فأقل لا يُرقَّم تلقائيًّا', () => {
    setViewportWidth(1200);
    render(
      <div dir="rtl">
        <ImdTable
          columns={[new ImdCol('م')]}
          rows={Array.from({ length: 300 }, (_, i) => [
            <span key="r">{`صف${i}`}</span>,
          ])}
        />
      </div>,
    );
    expect(screen.getByText('صف299')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'الصفحة التالية' })).toBeNull();
  });

  it('ImdSelect يفتح نافذةً كبيرة ببحثٍ ويختار منها', () => {
    function SelectHarness() {
      const [picked, setPicked] = useState<string | null>('b');
      return (
        <div dir="rtl">
          <ImdSelect<string>
            hint="الصنف"
            items={['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(
              (e) => [e, `خيار ${e}`] as const,
            )}
            value={picked}
            onChanged={setPicked}
          />
        </div>
      );
    }

    render(<SelectHarness />);
    expect(screen.getByText('خيار b')).toBeTruthy();

    fireEvent.click(screen.getByText('خيار b'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('خيار h')).toBeTruthy();

    const searchBox = screen.getByPlaceholderText('بحث…');
    fireEvent.change(searchBox, { target: { value: 'خيار h' } });
    expect(screen.queryByText('خيار a')).toBeNull();

    fireEvent.click(screen.getByText('خيار h'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('خيار h')).toBeTruthy();
  });

  it('ImdSelect معطَّل بلا onChanged لا يفتح شيئًا', () => {
    render(
      <div dir="rtl">
        <ImdSelect<string> items={[['a', 'أ']]} value="a" onChanged={null} />
      </div>,
    );
    fireEvent.click(screen.getByText('أ'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ImdKpi: sparkline اختياريّ — يُرسم بنقطتين فأكثر ولا يغيّر البطاقة بدونه', () => {
    const { container } = render(
      <div dir="rtl">
        <ImdKpi label="أ" value="١" />
        <ImdKpi label="ب" value="٢" spark={[1, 4, 2, 8]} />
        <ImdKpi label="ج" value="٣" spark={[5]} />
      </div>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
  });

  it('النمط الكلاسيكي: زوايا 2 وبلا ظلال وخط 12، ويعود الحديث بإيقافه', () => {
    expect(ImdSizes.radius).toBe(12);
    expect(imdShadow(ImdColors.light).length).toBeGreaterThan(0);

    ImdStyle.notifier.value = true;
    expect(ImdSizes.radius).toBe(2);
    expect(ImdSizes.compactRadius).toBe(2);
    expect(imdShadow(ImdColors.light)).toEqual([]);
    expect(imdShadowOverlay(ImdColors.light)).toEqual([]);
    expect(ImdDensity.cellFont).toBe(12);

    const theme = AppTheme.classic();
    expect(theme.tokens.bg.value).toBe(0xfff3f4f6);
    expect(theme.tokens.accent.value).toBe(0xff047857);

    ImdStyle.notifier.value = false;
    expect(ImdSizes.radius).toBe(12);
    expect(ImdDensity.cellFont).toBe(13.5);
  });

  it('إزالة جدولٍ من الشجرة لا تُعيد بناء شريط الحالة أثناء التفكيك', async () => {
    const sink = new ImdRecordSink();

    function SinkCount() {
      const [total, setTotal] = useState(sink.current?.total ?? 0);
      useEffect(() => {
        const l = () => setTotal(sink.current?.total ?? 0);
        sink.addListener(l);
        return () => sink.removeListener(l);
      }, []);
      return <span>{`عدد: ${total}`}</span>;
    }

    function Harness({ withTable }: { readonly withTable: boolean }) {
      return (
        <div dir="rtl">
          <ImdRecordScope sink={sink}>
            <SinkCount />
            {withTable && buildTable()}
          </ImdRecordScope>
        </div>
      );
    }

    const { rerender } = render(<Harness withTable={true} />);
    await waitFor(() => {
      expect(screen.getByText('عدد: 5')).toBeTruthy();
    });

    rerender(<Harness withTable={false} />);
    await waitFor(() => {
      expect(screen.getByText('عدد: 0')).toBeTruthy();
    });
  });

  it('عدّاد مُتخلَّص منه لا يرمي عند إبلاغٍ متأخر', () => {
    const sink = new ImdRecordSink();
    sink.dispose();
    expect(() => {
      sink.report({}, { shown: 1, total: 1 });
      sink.remove({});
    }).not.toThrow();
  });

  it('الصفحة المخفيّة تحتفظ بحالتها', () => {
    const sinkA = new ImdRecordSink();
    const sinkB = new ImdRecordSink();

    function Counter() {
      const [n, setN] = useState(0);
      return (
        <div>
          <span>{`العدّ: ${n}`}</span>
          <button
            type="button"
            data-testid="inc"
            onClick={() => setN((v) => v + 1)}
          >
            +
          </button>
        </div>
      );
    }

    function Pages({ active }: { readonly active: 'a' | 'b' }) {
      return (
        <div dir="rtl">
          <ImdPageHost key="a" active={active === 'a'} sink={sinkA}>
            <Counter />
          </ImdPageHost>
          <ImdPageHost key="b" active={active === 'b'} sink={sinkB}>
            <span>صفحة ب</span>
          </ImdPageHost>
        </div>
      );
    }

    const { rerender } = render(<Pages active="a" />);
    fireEvent.click(screen.getByTestId('inc'));
    expect(screen.getByText('العدّ: 1')).toBeTruthy();

    rerender(<Pages active="b" />);
    const hiddenCounter = screen.getByText('العدّ: 1');
    expect(
      (hiddenCounter.closest('[aria-hidden="true"]') as HTMLElement).style
        .display,
    ).toBe('none');
    expect(screen.getByText('صفحة ب')).toBeTruthy();

    rerender(<Pages active="a" />);
    expect(screen.getByText('العدّ: 1')).toBeTruthy();
    expect(
      screen.getByText('العدّ: 1').closest('[aria-hidden="false"]'),
    ).toBeTruthy();
  });
});
