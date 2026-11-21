import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdKeyScroll } from '../imd_key_scroll';
import { ImdColors } from '../imd_tokens';
import { showImdModal } from '../widgets/imd_dialogs';

function makeScrollable(
  el: HTMLElement,
  { clientHeight, scrollHeight }: { clientHeight: number; scrollHeight: number },
) {
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  el.style.overflowY = 'auto';
}

/// التمرير بلوحة المفاتيح بعد النقر (2026-10-23).
describe('imd_key_scroll_test', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  function app(child: React.ReactNode) {
    return (
      <div dir="rtl">
        <ImdKeyScroll>{child}</ImdKeyScroll>
      </div>
    );
  }

  it('نقرةٌ ثم ↓ و Page Down و End و Home', () => {
    render(
      app(
        <div
          data-testid="list"
          style={{ height: 600, overflowY: 'auto' }}
        >
          {Array.from({ length: 200 }, (_, i) => (
            <div key={i} style={{ height: 40 }}>
              سطر {i}
            </div>
          ))}
        </div>,
      ),
    );

    const list = screen.getByTestId('list');
    const maxExtent = 200 * 40 - 600;
    makeScrollable(list, { clientHeight: 600, scrollHeight: 200 * 40 });

    fireEvent.mouseDown(screen.getByText('سطر 3'));
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(list.scrollTop).toBeCloseTo(ImdKeyScroll.lineStep, 0.5);

    const before = list.scrollTop;
    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(list.scrollTop - before, 'صفحةٌ أكبر من سطر').toBeGreaterThan(300);

    fireEvent.keyDown(window, { key: 'End' });
    expect(list.scrollTop).toBe(maxExtent);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(list.scrollTop).toBeLessThan(maxExtent);

    fireEvent.keyDown(window, { key: 'Home' });
    expect(list.scrollTop).toBe(0);
  });

  it('في حقل كتابة تبقى الأسهم للمؤشر', () => {
    render(
      app(
        <div>
          <input data-testid="input" type="text" />
          <div data-testid="list" style={{ height: 600, overflowY: 'auto' }}>
            {Array.from({ length: 200 }, (_, i) => (
              <div key={i} style={{ height: 40 }}>
                سطر {i}
              </div>
            ))}
          </div>
        </div>,
      ),
    );

    const list = screen.getByTestId('list');
    makeScrollable(list, { clientHeight: 600, scrollHeight: 200 * 40 });
    const input = screen.getByTestId('input') as HTMLInputElement;
    input.focus();
    fireEvent.mouseDown(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'PageDown' });
    expect(list.scrollTop).toBe(0);
  });

  it('المنطقة الأعمق تحت النقرة أولًا، فإذا بلغت حدّها تحرّكت الحاوية', () => {
    render(
      app(
        <div data-testid="outer" style={{ height: 600, overflowY: 'auto' }}>
          <div data-testid="inner" style={{ height: 200, overflowY: 'auto' }}>
            {Array.from({ length: 100 }, (_, i) => (
              <div key={i} style={{ height: 40 }}>
                داخلي {i}
              </div>
            ))}
          </div>
          {Array.from({ length: 60 }, (_, i) => (
            <div key={i} style={{ height: 40 }}>
              خارجي {i}
            </div>
          ))}
        </div>,
      ),
    );

    const outer = screen.getByTestId('outer');
    const inner = screen.getByTestId('inner');
    const innerMax = 100 * 40 - 200;
    makeScrollable(outer, {
      clientHeight: 600,
      scrollHeight: 200 + 60 * 40,
    });
    makeScrollable(inner, { clientHeight: 200, scrollHeight: 100 * 40 });

    fireEvent.mouseDown(screen.getByText('داخلي 1'));
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(inner.scrollTop).toBeGreaterThan(0);
    expect(outer.scrollTop).toBe(0);

    fireEvent.keyDown(window, { key: 'End' });
    expect(inner.scrollTop).toBe(innerMax);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(
      outer.scrollTop,
      'الداخلية بلغت آخرها فتحرّكت الحاوية',
    ).toBeGreaterThan(0);
  });

  it('Ctrl مع الأسهم ليس تمريرًا (اختصارات الشاشة)', () => {
    render(
      app(
        <div data-testid="list" style={{ height: 600, overflowY: 'auto' }}>
          {Array.from({ length: 200 }, (_, i) => (
            <div key={i} style={{ height: 40 }}>
              سطر {i}
            </div>
          ))}
        </div>,
      ),
    );

    const list = screen.getByTestId('list');
    makeScrollable(list, { clientHeight: 600, scrollHeight: 200 * 40 });
    fireEvent.mouseDown(screen.getByText('سطر 3'));
    fireEvent.keyDown(window, { key: 'ArrowDown', ctrlKey: true });
    expect(list.scrollTop).toBe(0);
  });

  it('حوارٌ بجسمٍ لا يُمرَّر (scrollBody: false) لا يلفّ محتواه بتمريرٍ ثانٍ', async () => {
    render(
      app(
        <button
          type="button"
          onClick={() => {
            void showImdModal<void>({
              title: 'معاينة',
              scrollBody: false,
              colors: ImdColors.light,
              builder: () => (
                <div className="flex-1 bg-white">المحتوى</div>
              ),
            });
          }}
        >
          افتح
        </button>,
      ),
    );

    fireEvent.click(screen.getByText('افتح'));
    const dialog = await screen.findByRole('dialog');
    const contentEl = screen.getByText('المحتوى');
    const bodyWrapper = contentEl.parentElement!;

    expect(bodyWrapper.className).not.toContain('overflow-y-auto');
    expect(bodyWrapper.className).toContain('flex-1');
    expect(dialog.style.maxHeight).toBe('90vh');
  });
});
