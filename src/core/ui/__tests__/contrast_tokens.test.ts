import { describe, expect, it } from 'vitest';
import { ImdColor, ImdColors } from '../imd_tokens';

/// التباين (WCAG 2.1 AA، 1.4.3): كل زوج «نصٌّ على خلفية» في لوحات الألوان الستّ
/// يبلغ ٤٫٥:١ — كان غير مقيس (CLAUDE.md §9). الألوان الشفافة (الخلفيات «Soft» في
/// الداكن) تُركَّب فوق السطح قبل الحساب، كما تُرسم فعلًا.
function _lum(c: ImdColor): number {
  const ch = (v: number): number =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

function _over(top: ImdColor, base: ImdColor): ImdColor {
  return ImdColor.alphaBlend(top, base);
}

function ratio(fg: ImdColor, bg: ImdColor): number {
  const a = _lum(fg);
  const b = _lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const palettes: Record<string, ImdColors> = {
  light: ImdColors.light,
  dark: ImdColors.dark,
  classicLight: ImdColors.classicLight,
  fuel: ImdColors.fuel,
  fuelLight: ImdColors.fuelLight,
  fuelDark: ImdColors.fuelDark,
};

/// (الاسم، النص، الخلفية) لكل زوجٍ يُرسم في الواجهة نصًّا.
function pairs(c: ImdColors): Array<readonly [string, ImdColor, ImdColor]> {
  const s = (soft: ImdColor): ImdColor => _over(soft, c.surface);
  return [
    ['text/bg', c.text, c.bg],
    ['text/surface', c.text, c.surface],
    ['text/tableHead', c.text, _over(c.tableHead, c.surface)],
    ['text2/surface', c.text2, c.surface],
    ['muted/surface', c.muted, c.surface],
    ['muted/bg', c.muted, c.bg],
    ['muted/subtle', c.muted, _over(c.subtle, c.surface)],
    ['faint/surface', c.faint, c.surface],
    ['faint/bg', c.faint, c.bg],
    ['faint/subtle', c.faint, _over(c.subtle, c.surface)],
    ['orange onAccent/accent', c.orangeAccent.onAccent, c.orangeAccent.accent],
    ['onAccent/accent', c.onAccent, c.accent],
    ['accent/surface', c.accent, c.surface],
    ['accent/accentSoft', c.accent, s(c.accentSoft)],
    ['danger/surface', c.danger, c.surface],
    ['danger/dangerSoft', c.danger, s(c.dangerSoft)],
    ['success/surface', c.success, c.surface],
    ['success/successSoft', c.success, s(c.successSoft)],
    ['warn/surface', c.warn, c.surface],
    ['warn/warnSoft', c.warn, s(c.warnSoft)],
    ['info/surface', c.info, c.surface],
    ['info/infoSoft', c.info, s(c.infoSoft)],
    ['sideText/side', c.sideText, c.side],
    ['sideText/sideActive', c.sideText, c.sideActive],
    ['sideMuted/side', c.sideMuted, c.side],
    ['noteText/noteBg', c.noteText, s(c.noteBg)],
  ];
}

describe('contrast_tokens_test', () => {
  for (const [paletteName, palette] of Object.entries(palettes)) {
    it(`لوحة ${paletteName}: كل نصٍّ ≥ ٤٫٥:١ على خلفيته`, () => {
      const bad: string[] = [];
      for (const [name, fg, bg] of pairs(palette)) {
        const r = ratio(fg, bg);
        if (r < 4.5) {
          bad.push(`${name} = ${r.toFixed(2)}`);
        }
      }
      expect(bad, `تباينٌ دون ٤٫٥:١ في ${paletteName}:\n${bad.join('\n')}`).toEqual([]);
    });
  }
});
