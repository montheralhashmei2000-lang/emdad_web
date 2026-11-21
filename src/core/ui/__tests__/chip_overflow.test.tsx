import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdColors } from '../imd_tokens';
import { ImdChip } from '../widgets/imd_chips';

/// الشارة لا ترسم نفسها خارج أبيها.
///
/// [ImdChip] يلفّ نصه بحيث لا يضغطه عمودُ جدولٍ إلى ما دون عرض نصه. لكن حين
/// يضيق أبوه فعلًا — شارةٌ طويلة في صندوقٍ ثابت العرض — كان الصفّ الداخلي يفيض
/// بفارق العرض بالضبط، فيُرسم النص فوق ما بجواره.
describe('chip_overflow_test', () => {
  afterEach(() => {
    cleanup();
  });

  function host(child: React.ReactNode) {
    return (
      <div dir="rtl" lang="ar">
        {child}
      </div>
    );
  }

  it('شارة أطول من أبيها تُقصّ ولا تفيض', () => {
    const label = 'نصٌّ طويل جدًّا لا يتّسع له هذا الصندوق الضيّق أبدًا';
    render(
      host(
        <div style={{ width: 120 }} data-testid="narrow-host">
          <ImdChip label={label} colors={ImdColors.light} />
        </div>,
      ),
    );

    const narrowHost = screen.getByTestId('narrow-host');
    const chipRoot = narrowHost.firstElementChild as HTMLElement;
    expect(chipRoot).not.toBeNull();
    expect(chipRoot.className).toContain('max-w-full');
    expect(chipRoot.className).toContain('min-w-0');
    expect(chipRoot.className).toContain('overflow-hidden');

    const textClipWrap = chipRoot.querySelector('span.min-w-0') as HTMLElement;
    expect(textClipWrap).not.toBeNull();
    expect(textClipWrap.className).toContain('overflow-hidden');
    expect(textClipWrap.className).toContain('text-ellipsis');
    expect(textClipWrap.className).toContain('whitespace-nowrap');
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('شارة تتّسع تبقى بعرض نصها كاملًا', () => {
    render(
      host(
        <div style={{ width: 400 }} data-testid="wide-host">
          <div className="flex justify-start">
            <ImdChip label="قصير" colors={ImdColors.light} />
          </div>
        </div>,
      ),
    );

    const chipRoot = screen
      .getByTestId('wide-host')
      .querySelector('[data-tone]') as HTMLElement;
    expect(chipRoot).not.toBeNull();
    // الشارة القصيرة تحتفظ بعرض محتواها (w-fit / inline-flex) ولا تتمدّد لعرض أبيها.
    expect(chipRoot.classList.contains('w-fit')).toBe(true);
    expect(chipRoot.classList.contains('inline-flex')).toBe(true);
    expect(chipRoot.classList.contains('w-full')).toBe(false);
    expect(screen.getByText('قصير')).toBeTruthy();
  });

  it('شارة بأيقونة ونص طويل تُقصّ ولا تفيض', () => {
    const label = 'تحذير طويل يحتاج مساحة أكبر بكثير';
    render(
      host(
        <div style={{ width: 100 }} data-testid="icon-host">
          <ImdChip label={label} icon="alert" colors={ImdColors.light} />
        </div>,
      ),
    );

    const chipRoot = screen
      .getByTestId('icon-host')
      .querySelector('[data-tone]') as HTMLElement;
    expect(chipRoot).not.toBeNull();
    expect(chipRoot.className).toContain('max-w-full');
    expect(chipRoot.className).toContain('overflow-hidden');
    expect(chipRoot.querySelector('svg')).not.toBeNull();

    const textClipWrap = chipRoot.querySelector('span.flex-1') as HTMLElement;
    expect(textClipWrap).not.toBeNull();
    expect(textClipWrap.className).toContain('text-ellipsis');
    expect(textClipWrap.className).toContain('overflow-hidden');
  });
});
