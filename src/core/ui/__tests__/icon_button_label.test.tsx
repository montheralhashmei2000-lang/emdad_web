import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdColors } from '../imd_tokens';
import { ImdIconButton } from '../widgets/imd_buttons';

/// زرُّ الأيقونة يحمل اسمًا منطوقًا ومرئيًّا.
///
/// `ImdIconButton` يُرسَم بـ`label: ''` — فالأيقونة وحدها، و[tooltip] اسمُه
/// الوحيد. وكان الوسيط يُستقبَل ويُهمَل في البناء: لا تلميحةَ على سطح المكتب،
/// ولا شيءَ ينطقه قارئُ الشاشة، في ١١٤ موضعًا من الشاشات.
describe('icon_button_label_test', () => {
  afterEach(() => {
    cleanup();
  });

  function wrap(child: React.ReactNode) {
    return (
      <div dir="rtl" lang="ar">
        {child}
      </div>
    );
  }

  it('التلميحة تصل إلى الشجرة فتُنطق وتُعرض', () => {
    render(
      wrap(
        <ImdIconButton
          icon="printer"
          tooltip="طباعة"
          onPressed={() => {}}
          colors={ImdColors.light}
        />,
      ),
    );

    const btn = screen.getByRole('button', { name: 'طباعة' });
    expect(btn.getAttribute('title')).toBe('طباعة');
    expect(
      btn.getAttribute('aria-label'),
      'قارئ الشاشة لا يجد اسمًا لزرٍّ بأيقونةٍ وحدها',
    ).toBe('طباعة');
  });

  it('تلميحةٌ غائبة أو فارغة لا تُضيف عقدةً فارغة', () => {
    const first = render(
      wrap(
        <ImdIconButton
          icon="printer"
          onPressed={() => {}}
          colors={ImdColors.light}
        />,
      ),
    );
    const btn1 = first.getByRole('button');
    expect(btn1.getAttribute('title')).toBeNull();
    expect(btn1.getAttribute('aria-label')).toBeNull();
    first.unmount();

    const second = render(
      wrap(
        <ImdIconButton
          icon="printer"
          tooltip="   "
          onPressed={() => {}}
          colors={ImdColors.light}
        />,
      ),
    );
    const btn2 = second.getByRole('button');
    expect(btn2.getAttribute('title'), 'مسافاتٌ ليست اسمًا').toBeNull();
    expect(btn2.getAttribute('aria-label'), 'مسافاتٌ ليست اسمًا').toBeNull();
  });

  it('الزر يبقى عاملًا مع التلميحة', () => {
    let taps = 0;
    render(
      wrap(
        <ImdIconButton
          icon="printer"
          tooltip="طباعة"
          onPressed={() => taps++}
          colors={ImdColors.light}
        />,
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'طباعة' }));
    expect(taps).toBe(1);
  });

  it('التلميحة تظهر عند الوقوف بالمؤشّر', () => {
    render(
      wrap(
        <ImdIconButton
          icon="printer"
          tooltip="طباعة"
          onPressed={() => {}}
          colors={ImdColors.light}
        />,
      ),
    );

    const btn = screen.getByRole('button', { name: 'طباعة' });
    fireEvent.mouseEnter(btn);
    expect(btn.getAttribute('data-hovered')).toBe('true');
    expect(btn.getAttribute('title')).toBe('طباعة');
  });

  // MISSING: lib/features/*_screen.dart (مراحل 5+)
  it.skip('كل زرِّ أيقونةٍ في الشِّفرة يحمل اسمًا', () => {
    // يفحص شاشات lib/features/*_screen.dart عند تحويلها في المراحل 5+.
  });
});
