import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdFld, ImdTextController } from '../imd_form';
import { ImdColors } from '../imd_tokens';
import { ImdSelect } from '../widgets/imd_fields';

/// حقل النص والمنتقي في صفٍّ واحد بارتفاعٍ واحد — كان المنتقي يقصر عن الحقل
/// بكسلين في كل مقاس خط (حقل النص يفرض «دعامة» الخط على سطره ونص المنتقي لا)،
/// فيعلو أحدهما الآخر في صفوف مصمم النماذج والإعدادات.
describe('field_row_height_test', () => {
  afterEach(() => {
    cleanup();
  });

  function effectiveBoxHeight(
    boxEl: HTMLElement,
    textEl: HTMLElement,
    scale: number,
  ): number {
    const bs = getComputedStyle(boxEl);
    const ts = getComputedStyle(textEl);
    const fixedH =
      bs.height && bs.height !== 'auto' ? parseFloat(bs.height) : NaN;
    if (Number.isFinite(fixedH) && fixedH > 0) return fixedH;

    const minH = parseFloat(bs.minHeight) || 0;
    const padV =
      (parseFloat(bs.paddingTop) || 0) + (parseFloat(bs.paddingBottom) || 0);
    const borderV =
      (parseFloat(bs.borderTopWidth) || 0) +
      (parseFloat(bs.borderBottomWidth) || 0);
    const fontSize = (parseFloat(ts.fontSize) || 14) * scale;
    const rawLh = ts.lineHeight;
    const lineH =
      rawLh && rawLh !== 'normal'
        ? rawLh.endsWith('px')
          ? parseFloat(rawLh) * scale
          : fontSize * parseFloat(rawLh)
        : fontSize * 1.4;

    return Number(Math.max(minH, padV + borderV + lineH).toFixed(4));
  }

  for (const scale of [1.0, 1.3, 2.0]) {
    it(`الحقل والمنتقي بارتفاعٍ واحد عند تكبير الخط ×${scale}`, () => {
      const ctl = new ImdTextController('الجمهورية اليمنية');

      render(
        <div
          dir="rtl"
          style={{
            fontFamily: 'IBMPlexSansArabic, sans-serif',
            fontSize: `${scale * 100}%`,
          }}
        >
          <div style={{ width: 300 }}>
            <ImdFld
              data-testid="field"
              controller={ctl}
              colors={ImdColors.light}
            />
          </div>
          <div style={{ width: 300 }}>
            <ImdSelect<number>
              data-testid="select"
              items={[[1, 'يمين']]}
              value={1}
              onChanged={() => {}}
              colors={ImdColors.light}
            />
          </div>
          <div style={{ width: 300 }}>
            <ImdSelect<number>
              data-testid="empty"
              hint="اختر"
              items={[[1, 'يمين']]}
              value={null}
              onChanged={() => {}}
              colors={ImdColors.light}
            />
          </div>
        </div>,
      );

      const fieldBox = screen.getByTestId('field');
      const selectBox = screen.getByTestId('select');
      const emptyBox = screen.getByTestId('empty');

      const fieldInput = fieldBox.querySelector('input')!;
      const selectText = selectBox.querySelector('span')!;
      const emptyText = emptyBox.querySelector('span')!;

      const fieldHeight = effectiveBoxHeight(fieldBox, fieldInput, scale);
      const selectHeight = effectiveBoxHeight(selectBox, selectText, scale);
      const emptyHeight = effectiveBoxHeight(emptyBox, emptyText, scale);

      expect(selectHeight).toBe(fieldHeight);
      expect(emptyHeight, 'المنتقي الفارغ بتلميحه').toBe(fieldHeight);
    });
  }
});
