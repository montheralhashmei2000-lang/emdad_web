import { ImdDensity } from './imd_density';
import { ImdStyle } from './imd_style';

/// تمثيلٌ رقميّ وبصريّ للون (`0xAARRGGBB`) يطابق `Color` في Flutter
/// (المكوّنات `.r` و`.g` و`.b` و`.a` في المجال `0..1`، و`alphaBlend`، و`lerp`).
export class ImdColor {
  readonly value: number;

  constConstructorMarker?: never;

  private constructor(value: number) {
    this.value = value >>> 0;
  }

  static fromValue(value: number): ImdColor {
    return new ImdColor(value);
  }

  static fromRGBA(r255: number, g255: number, b255: number, a255 = 255): ImdColor {
    const a = Math.min(255, Math.max(0, Math.round(a255))) & 0xff;
    const r = Math.min(255, Math.max(0, Math.round(r255))) & 0xff;
    const g = Math.min(255, Math.max(0, Math.round(g255))) & 0xff;
    const b = Math.min(255, Math.max(0, Math.round(b255))) & 0xff;
    return new ImdColor(((a << 24) | (r << 16) | (g << 8) | b) >>> 0);
  }

  get a255(): number {
    return (this.value >>> 24) & 0xff;
  }
  get r255(): number {
    return (this.value >>> 16) & 0xff;
  }
  get g255(): number {
    return (this.value >>> 8) & 0xff;
  }
  get b255(): number {
    return this.value & 0xff;
  }

  get a(): number {
    return this.a255 / 255;
  }
  get r(): number {
    return this.r255 / 255;
  }
  get g(): number {
    return this.g255 / 255;
  }
  get b(): number {
    return this.b255 / 255;
  }

  withValues({ alpha }: { alpha?: number } = {}): ImdColor {
    if (alpha === undefined) return this;
    return ImdColor.fromRGBA(this.r255, this.g255, this.b255, Math.round(alpha * 255));
  }

  static alphaBlend(foreground: ImdColor, background: ImdColor): ImdColor {
    const alpha = foreground.a;
    if (alpha === 0) return background;
    const invAlpha = 1 - alpha;
    let backAlpha = background.a;
    if (backAlpha === 1) {
      return ImdColor.fromRGBA(
        Math.round(alpha * foreground.r255 + invAlpha * background.r255),
        Math.round(alpha * foreground.g255 + invAlpha * background.g255),
        Math.round(alpha * foreground.b255 + invAlpha * background.b255),
        255,
      );
    }
    backAlpha = backAlpha * invAlpha;
    const outAlpha = alpha + backAlpha;
    if (outAlpha === 0) return ImdColor.fromValue(0x00000000);
    return ImdColor.fromRGBA(
      Math.round((foreground.r255 * alpha + background.r255 * backAlpha) / outAlpha),
      Math.round((foreground.g255 * alpha + background.g255 * backAlpha) / outAlpha),
      Math.round((foreground.b255 * alpha + background.b255 * backAlpha) / outAlpha),
      Math.round(outAlpha * 255),
    );
  }

  static lerp(a: ImdColor, b: ImdColor, t: number): ImdColor {
    const clamped = Math.min(1, Math.max(0, t));
    return ImdColor.fromRGBA(
      a.r255 + (b.r255 - a.r255) * clamped,
      a.g255 + (b.g255 - a.g255) * clamped,
      a.b255 + (b.b255 - a.b255) * clamped,
      a.a255 + (b.a255 - a.a255) * clamped,
    );
  }

  get hex(): string {
    const rr = this.r255.toString(16).padStart(2, '0').toUpperCase();
    const gg = this.g255.toString(16).padStart(2, '0').toUpperCase();
    const bb = this.b255.toString(16).padStart(2, '0').toUpperCase();
    if (this.a255 === 255) return `#${rr}${gg}${bb}`;
    const aa = this.a255.toString(16).padStart(2, '0').toUpperCase();
    return `#${rr}${gg}${bb}${aa}`;
  }

  get css(): string {
    if (this.a255 === 255) return this.hex;
    const alpha = Number(this.a.toFixed(4));
    return `rgba(${this.r255}, ${this.g255}, ${this.b255}, ${alpha})`;
  }

  toString(): string {
    return this.css;
  }

  equals(other: unknown): boolean {
    return other instanceof ImdColor && other.value === this.value;
  }
}

export type Color = ImdColor;
export const Color = (value: number): ImdColor => ImdColor.fromValue(value);

export interface ImdColorsInit {
  readonly bg: ImdColor;
  readonly surface: ImdColor;
  readonly subtle: ImdColor;
  readonly hover: ImdColor;
  readonly line: ImdColor;
  readonly lineStrong: ImdColor;
  readonly text: ImdColor;
  readonly text2: ImdColor;
  readonly muted: ImdColor;
  readonly faint: ImdColor;
  readonly accent: ImdColor;
  readonly accentHover: ImdColor;
  readonly accentSoft: ImdColor;
  readonly ring: ImdColor;
  readonly onAccent: ImdColor;
  readonly success: ImdColor;
  readonly successSoft: ImdColor;
  readonly danger: ImdColor;
  readonly dangerSoft: ImdColor;
  readonly warn: ImdColor;
  readonly warnSoft: ImdColor;
  readonly info: ImdColor;
  readonly infoSoft: ImdColor;
  readonly side: ImdColor;
  readonly side2: ImdColor;
  readonly sideHover: ImdColor;
  readonly sideActive: ImdColor;
  readonly sideText: ImdColor;
  readonly sideMuted: ImdColor;
  readonly sideBorder: ImdColor;
  readonly sideLine: ImdColor;
  readonly tableHead: ImdColor;
  readonly tableRowLine: ImdColor;
  readonly noteBg: ImdColor;
  readonly noteBorder: ImdColor;
  readonly noteText: ImdColor;
  readonly isDark: boolean;
}

/// رموز ألوان النظام — المصدر الوحيد لكل لونٍ في الواجهة. تُقرأ من
/// `context.imd`، ولا يُكتب لونٌ صريح في شاشةٍ ولا في مكوّن.
export class ImdColors implements ImdColorsInit {
  readonly bg: ImdColor;
  readonly surface: ImdColor;
  readonly subtle: ImdColor;
  readonly hover: ImdColor;
  readonly line: ImdColor;
  readonly lineStrong: ImdColor;
  readonly text: ImdColor;
  readonly text2: ImdColor;
  readonly muted: ImdColor;
  readonly faint: ImdColor;
  readonly accent: ImdColor;
  readonly accentHover: ImdColor;
  readonly accentSoft: ImdColor;
  readonly ring: ImdColor;
  readonly onAccent: ImdColor;
  readonly success: ImdColor;
  readonly successSoft: ImdColor;
  readonly danger: ImdColor;
  readonly dangerSoft: ImdColor;
  readonly warn: ImdColor;
  readonly warnSoft: ImdColor;
  readonly info: ImdColor;
  readonly infoSoft: ImdColor;
  readonly side: ImdColor;
  readonly side2: ImdColor;
  readonly sideHover: ImdColor;
  readonly sideActive: ImdColor;
  readonly sideText: ImdColor;
  readonly sideMuted: ImdColor;
  readonly sideBorder: ImdColor;
  readonly sideLine: ImdColor;
  readonly tableHead: ImdColor;
  readonly tableRowLine: ImdColor;
  readonly noteBg: ImdColor;
  readonly noteBorder: ImdColor;
  readonly noteText: ImdColor;
  readonly isDark: boolean;

  constructor(init: ImdColorsInit) {
    this.bg = init.bg;
    this.surface = init.surface;
    this.subtle = init.subtle;
    this.hover = init.hover;
    this.line = init.line;
    this.lineStrong = init.lineStrong;
    this.text = init.text;
    this.text2 = init.text2;
    this.muted = init.muted;
    this.faint = init.faint;
    this.accent = init.accent;
    this.accentHover = init.accentHover;
    this.accentSoft = init.accentSoft;
    this.ring = init.ring;
    this.onAccent = init.onAccent;
    this.success = init.success;
    this.successSoft = init.successSoft;
    this.danger = init.danger;
    this.dangerSoft = init.dangerSoft;
    this.warn = init.warn;
    this.warnSoft = init.warnSoft;
    this.info = init.info;
    this.infoSoft = init.infoSoft;
    this.side = init.side;
    this.side2 = init.side2;
    this.sideHover = init.sideHover;
    this.sideActive = init.sideActive;
    this.sideText = init.sideText;
    this.sideMuted = init.sideMuted;
    this.sideBorder = init.sideBorder;
    this.sideLine = init.sideLine;
    this.tableHead = init.tableHead;
    this.tableRowLine = init.tableRowLine;
    this.noteBg = init.noteBg;
    this.noteBorder = init.noteBorder;
    this.noteText = init.noteText;
    this.isDark = init.isDark;
  }

  static readonly light = new ImdColors({
    bg: Color(0xfff7f7f8),
    surface: Color(0xffffffff),
    subtle: Color(0xffececf1),
    hover: Color(0xfff2f2f5),
    line: Color(0xffe3e3e8),
    lineStrong: Color(0xffd1d1db),
    text: Color(0xff202123),
    text2: Color(0xff343541),
    muted: Color(0xff5b5e6b),
    faint: Color(0xff68687b), // ≥ ٤٫٦:١ على السطح والخلفية والمظلَّل (WCAG AA)
    accent: Color(0xff047857),
    accentHover: Color(0xff065f46),
    accentSoft: Color(0xffecfdf5),
    ring: Color(0x38047857),
    onAccent: Color(0xffffffff),
    success: Color(0xff067647),
    successSoft: Color(0xffdcfae6),
    danger: Color(0xffb42318),
    dangerSoft: Color(0xfffee4e2),
    warn: Color(0xffb54708),
    warnSoft: Color(0xfffef0c7),
    info: Color(0xff175cd3),
    infoSoft: Color(0xffeff4ff),
    // الشريط الجانبي في السمة الفاتحة: أخضر مزرق داكن من عائلة لون التمييز
    // (047857) بدل الأسود — يبقى النص الأبيض مقروءًا ويتّسق مع أزرار النظام.
    side: Color(0xff0b3d3a),
    side2: Color(0xff104a46),
    sideHover: Color(0xff155a55),
    sideActive: Color(0xff1a6a63),
    sideText: Color(0xfff0fdfa),
    sideMuted: Color(0xff9ccfc7),
    sideBorder: Color(0xff1f665f),
    sideLine: Color(0xff17524d),
    tableHead: Color(0xfffafafb),
    tableRowLine: Color(0xffefeff3),
    noteBg: Color(0xfffffaeb),
    noteBorder: Color(0xfffedf89),
    noteText: Color(0xff7a2e0e),
    isDark: false,
  });

  static readonly dark = new ImdColors({
    bg: Color(0xff171717),
    surface: Color(0xff212121),
    subtle: Color(0xff2f2f33),
    hover: Color(0xff2a2a2e),
    line: Color(0xff303036),
    lineStrong: Color(0xff3f3f46),
    text: Color(0xffececf1),
    text2: Color(0xffd4d4d8),
    muted: Color(0xffa1a1aa),
    faint: Color(0xff9797a1), // ≥ ٤٫٦:١ على السطح والخلفية والمظلَّل (WCAG AA)
    accent: Color(0xff10b981),
    accentHover: Color(0xff34d399),
    accentSoft: Color(0x2410b981),
    ring: Color(0x5210b981),
    onAccent: Color(0xff0b1f1c),
    success: Color(0xff4ade80),
    successSoft: Color(0x244ade80),
    danger: Color(0xfff97066),
    dangerSoft: Color(0x26f97066),
    warn: Color(0xfffdb022),
    warnSoft: Color(0x26fdb022),
    info: Color(0xff84adff),
    infoSoft: Color(0x2684adff),
    side: Color(0xff0f0f10),
    side2: Color(0xff1a1a1c),
    sideHover: Color(0xff26262a),
    sideActive: Color(0xff303036),
    sideText: Color(0xffececf1),
    sideMuted: Color(0xffa1a1aa),
    sideBorder: Color(0xff2f3036),
    sideLine: Color(0xff2a2b32),
    tableHead: Color(0xff1c1c1f),
    tableRowLine: Color(0xff2a2a2e),
    noteBg: Color(0x1afdb022),
    noteBorder: Color(0x59fdb022),
    noteText: Color(0xfffec84b),
    isDark: true,
  });

  /// لوحة قسم المحروقات — داكنة بلمسة زيتونية.
  static readonly fuel = new ImdColors({
    bg: Color(0xff0e100d),
    surface: Color(0xff151814),
    subtle: Color(0xff1c201a),
    hover: Color(0xff212519),
    line: Color(0xff262b24),
    lineStrong: Color(0xff343a31),
    text: Color(0xffe9ece5),
    text2: Color(0xffd2d7cb),
    muted: Color(0xff8c9386),
    faint: Color(0xff828a7b), // ≥ ٤٫٦:١ على السطح والخلفية والمظلَّل (WCAG AA)
    accent: Color(0xffbfd8a4),
    accentHover: Color(0xffd3e6bd),
    accentSoft: Color(0x22bfd8a4),
    ring: Color(0x55bfd8a4),
    onAccent: Color(0xff13210c),
    success: Color(0xff8fd694),
    successSoft: Color(0x248fd694),
    danger: Color(0xffe5806a),
    dangerSoft: Color(0x26e5806a),
    warn: Color(0xffe3b872),
    warnSoft: Color(0x26e3b872),
    info: Color(0xff9dc7d8),
    infoSoft: Color(0x269dc7d8),
    side: Color(0xff111410),
    side2: Color(0xff0e110d),
    sideHover: Color(0xff1d2119),
    sideActive: Color(0xff242a20),
    sideText: Color(0xffe9ece5),
    sideMuted: Color(0xff8c9386),
    sideBorder: Color(0xff272c24),
    sideLine: Color(0xff232821),
    tableHead: Color(0xff191d17),
    tableRowLine: Color(0xff232821),
    noteBg: Color(0x1ae3b872),
    noteBorder: Color(0x59e3b872),
    noteText: Color(0xffe8c88a),
    isDark: true,
  });

  /// النمط الكلاسيكي (فاتح): خلفية رمادية `#F3F4F6` وحدود رمادية رفيعة، وألوانٌ
  /// دلالية بدرجات باهتة، وأخضر الإمداد `#047857` للتمييز. شريطه الجانبي كالفاتح.
  static readonly classicLight = new ImdColors({
    bg: Color(0xfff3f4f6),
    surface: Color(0xffffffff),
    subtle: Color(0xffe5e7eb),
    hover: Color(0xfff3f4f6),
    line: Color(0xffd1d5db),
    lineStrong: Color(0xff9ca3af),
    text: Color(0xff1f2937),
    text2: Color(0xff374151),
    muted: Color(0xff4b5563),
    faint: Color(0xff606773), // ≥ ٤٫٦:١ على السطح والخلفية والمظلَّل (WCAG AA)
    accent: Color(0xff047857),
    accentHover: Color(0xff065f46),
    accentSoft: Color(0xffecfdf5),
    ring: Color(0x38047857),
    onAccent: Color(0xffffffff),
    success: Color(0xff0b7a55), // ≥ ٤٫٦:١ على السطح وعلى خلفيته الفاتحة
    successSoft: Color(0xffd1fae5),
    danger: Color(0xffcd1212), // ≥ ٤٫٦:١ على السطح وعلى خلفيته الفاتحة
    dangerSoft: Color(0xfffee2e2),
    warn: Color(0xff966106), // ≥ ٤٫٦:١ على السطح وعلى خلفيته الفاتحة
    warnSoft: Color(0xfffef3c7),
    info: Color(0xff0a5de4), // ≥ ٤٫٦:١ على السطح وعلى خلفيته الفاتحة
    infoSoft: Color(0xffdbeafe),
    side: Color(0xff0b3d3a),
    side2: Color(0xff104a46),
    sideHover: Color(0xff155a55),
    sideActive: Color(0xff1a6a63),
    sideText: Color(0xfff0fdfa),
    sideMuted: Color(0xff9ccfc7),
    sideBorder: Color(0xff1f665f),
    sideLine: Color(0xff17524d),
    tableHead: Color(0xffe5e7eb),
    tableRowLine: Color(0xffe5e7eb),
    noteBg: Color(0xfffffaeb),
    noteBorder: Color(0xfffedf89),
    noteText: Color(0xff7a2e0e),
    isDark: false,
  });

  /// هوية قسم المحروقات (فاتح): برتقالي محروق مع شريط جانبي بنّي داكن.
  static readonly fuelLight = new ImdColors({
    bg: Color(0xfff7f6f4),
    surface: Color(0xffffffff),
    subtle: Color(0xffefedea),
    hover: Color(0xfff4f2ef),
    line: Color(0xffe6e2dc),
    lineStrong: Color(0xffd4cec5),
    text: Color(0xff211d19),
    text2: Color(0xff3a342e),
    muted: Color(0xff625a51),
    faint: Color(0xff70695f), // ≥ ٤٫٦:١ على السطح والخلفية والمظلَّل (WCAG AA)
    accent: Color(0xffc2410c),
    accentHover: Color(0xff9a3412),
    accentSoft: Color(0xfffff1e8),
    ring: Color(0x38c2410c),
    onAccent: Color(0xffffffff),
    success: Color(0xff067647),
    successSoft: Color(0xffdcfae6),
    danger: Color(0xffb42318),
    dangerSoft: Color(0xfffee4e2),
    warn: Color(0xffb54708),
    warnSoft: Color(0xfffef0c7),
    info: Color(0xff175cd3),
    infoSoft: Color(0xffeff4ff),
    side: Color(0xff3b1d0e),
    side2: Color(0xff4a2512),
    sideHover: Color(0xff5c2f18),
    sideActive: Color(0xff6e3a1e),
    sideText: Color(0xfffff4ec),
    sideMuted: Color(0xffd9ae91),
    sideBorder: Color(0xff6a3a20),
    sideLine: Color(0xff522b16),
    tableHead: Color(0xfffaf9f7),
    tableRowLine: Color(0xfff0ede8),
    noteBg: Color(0xfffffaeb),
    noteBorder: Color(0xfffedf89),
    noteText: Color(0xff7a2e0e),
    isDark: false,
  });

  /// هوية قسم المحروقات (داكن): برتقالي دافئ على رمادي فحمي بحرارةٍ خفيفة.
  static readonly fuelDark = new ImdColors({
    bg: Color(0xff171513),
    surface: Color(0xff211e1b),
    subtle: Color(0xff2f2b27),
    hover: Color(0xff2a2623),
    line: Color(0xff34302b),
    lineStrong: Color(0xff433e38),
    text: Color(0xffefebe6),
    text2: Color(0xffd8d2cb),
    muted: Color(0xffa8a097),
    faint: Color(0xff9a938a), // ≥ ٤٫٦:١ على السطح والخلفية والمظلَّل (WCAG AA)
    accent: Color(0xfffb923c),
    accentHover: Color(0xfffdba74),
    accentSoft: Color(0x24fb923c),
    ring: Color(0x52fb923c),
    onAccent: Color(0xff2b1204),
    success: Color(0xff4ade80),
    successSoft: Color(0x244ade80),
    danger: Color(0xfff97066),
    dangerSoft: Color(0x26f97066),
    warn: Color(0xfffdb022),
    warnSoft: Color(0x26fdb022),
    info: Color(0xff84adff),
    infoSoft: Color(0x2684adff),
    side: Color(0xff120f0c),
    side2: Color(0xff1c1814),
    sideHover: Color(0xff29231d),
    sideActive: Color(0xff3a2f25),
    sideText: Color(0xffefebe6),
    sideMuted: Color(0xffa8a097),
    sideBorder: Color(0xff332c25),
    sideLine: Color(0xff2b251f),
    tableHead: Color(0xff1c1a17),
    tableRowLine: Color(0xff2b2824),
    noteBg: Color(0x1afdb022),
    noteBorder: Color(0x59fdb022),
    noteText: Color(0xfffec84b),
    isDark: true,
  });

  /// شبكة الرسوم ونصوص محاورها في الوضع الفاتح (الداكن يشتقّها من `line`/`muted`).
  static readonly chartGridLight = Color(0xffe7eee9);
  static readonly chartTickLight = Color(0xff66756c);

  copyWith(): ImdColors {
    return this;
  }

  lerp(other: ImdColors | null | undefined, t: number): ImdColors {
    return other instanceof ImdColors && t >= 0.5 ? other : this;
  }

  // ───── حالات المرور والتحديد (ImdColorsDerived)
  /// خلفية رأس عمودٍ قابلٍ للفرز عند المرور.
  get headerHover(): ImdColor {
    return this.isDark ? Color(0xff26262a) : this.hover;
  }

  /// خلفية صفّ/بطاقة عند المرور.
  get rowHover(): ImdColor {
    return this.isDark ? Color(0xff26262a) : this.tableHead;
  }

  /// حدّ زرٍّ ثانويٍّ عند المرور.
  get lineHover(): ImdColor {
    return this.isDark ? Color(0xff52525b) : Color(0xffb9b9c6);
  }

  /// خلفية زرٍّ هدّامٍ ناعمٍ عند المرور.
  get dangerHover(): ImdColor {
    return this.isDark ? Color(0x40f97066) : Color(0xfffdd5d1);
  }

  // ───── أسطحٌ معكوسة (داكنةٌ في الفاتح، رماديةٌ داكنةٌ في الداكن)
  get inverse(): ImdColor {
    return this.isDark ? Color(0xff303036) : this.text;
  }
  get inverseLine(): ImdColor {
    return this.isDark ? Color(0xff3f3f46) : this.text;
  }
  get onInverse(): ImdColor {
    return Color(0xffffffff);
  }
  get onInverseSoft(): ImdColor {
    return Color(0x1affffff);
  }
  get onInverseSoft2(): ImdColor {
    return Color(0x1fffffff);
  }
  get onInverseText(): ImdColor {
    return Color(0xffe4e4e7);
  }
  get onInverseMuted(): ImdColor {
    return Color(0xff9db3a6);
  }

  /// نصٌّ فوق زرٍّ خلفيّته [text] نفسه (أبيض في الفاتح، داكنٌ في الداكن).
  get onText(): ImdColor {
    return this.isDark ? Color(0xff171717) : Color(0xffffffff);
  }

  /// أبيض ثابت للنص فوق شارةٍ ملوّنة (عدّاد التنبيهات).
  get onBadge(): ImdColor {
    return Color(0xffffffff);
  }

  // ───── حقولٌ ولوحات
  get fieldFill(): ImdColor {
    return this.isDark ? this.bg : Color(0xffeef1ee);
  }
  get panelFill(): ImdColor {
    return this.isDark ? this.bg : Color(0xfff7faf8);
  }
  get toolbarFill(): ImdColor {
    return this.isDark ? this.surface : Color(0xfff2f7f5);
  }
  get toolbarLine(): ImdColor {
    return this.isDark ? this.line : Color(0xffdfe9e4);
  }
  get popupLine(): ImdColor {
    return this.isDark ? Color(0xff2c3b35) : Color(0xffcfdcd6);
  }

  /// بطاقة معلوماتٍ زرقاء (حدٌّ ونصّ).
  get infoLine(): ImdColor {
    return this.isDark ? Color(0x5984adff) : Color(0xffb2ccff);
  }
  get infoStrong(): ImdColor {
    return this.isDark ? Color(0xffb2ccff) : Color(0xff1849a9);
  }

  // ───── ظلال وحجب
  get shadowXs(): ImdColor {
    return this.isDark ? Color(0x66000000) : Color(0x0a101828);
  }
  get shadowSm(): ImdColor {
    return this.isDark ? Color(0x80000000) : Color(0x14101828);
  }
  get shadowMd(): ImdColor {
    return this.isDark ? Color(0x99000000) : Color(0x26101828);
  }
  get shadowHairline(): ImdColor {
    return Color(0x1a101828);
  }
  get shadowPopup(): ImdColor {
    return Color(0x2e0f281e);
  }
  get shadowBase(): ImdColor {
    return this.isDark ? Color(0xff000000) : Color(0xff101828);
  }
  get scrim(): ImdColor {
    return Color(0x73111111);
  }

  // ───── الشريط العلوي والجانبي
  /// خلفية الشريط العلوي: شفّافةٌ أكثر مع Mica.
  topbar({ mica }: { mica: boolean }): ImdColor {
    if (this.isDark) return mica ? Color(0x99171717) : Color(0xeb171717);
    return mica ? Color(0x99ffffff) : Color(0xebffffff);
  }

  /// نصٌّ ناصعٌ على الشريط الجانبي (الشريط داكنٌ في كل السمات).
  get sideBright(): ImdColor {
    return Color(0xffffffff);
  }

  /// أسفل تدرّج الشريط الجانبي: أغمق من [side].
  get sideDeep(): ImdColor {
    return ImdColor.lerp(this.side, Color(0xff000000), 0.22);
  }

  /// نسخةٌ من السمة بلون تمييزٍ آخر (يُستعمل لتلوين زر حفظٍ بلونٍ مختلف).
  withAccent({
    requiredAccent,
    accent,
    accentHover,
    onAccent,
  }: {
    requiredAccent?: never;
    accent: ImdColor;
    accentHover: ImdColor;
    onAccent: ImdColor;
  }): ImdColors {
    return new ImdColors({
      bg: this.bg,
      surface: this.surface,
      subtle: this.subtle,
      hover: this.hover,
      line: this.line,
      lineStrong: this.lineStrong,
      text: this.text,
      text2: this.text2,
      muted: this.muted,
      faint: this.faint,
      accent,
      accentHover,
      accentSoft: this.accentSoft,
      ring: this.ring,
      onAccent,
      success: this.success,
      successSoft: this.successSoft,
      danger: this.danger,
      dangerSoft: this.dangerSoft,
      warn: this.warn,
      warnSoft: this.warnSoft,
      info: this.info,
      infoSoft: this.infoSoft,
      side: this.side,
      side2: this.side2,
      sideHover: this.sideHover,
      sideActive: this.sideActive,
      sideText: this.sideText,
      sideMuted: this.sideMuted,
      sideBorder: this.sideBorder,
      sideLine: this.sideLine,
      tableHead: this.tableHead,
      tableRowLine: this.tableRowLine,
      noteBg: this.noteBg,
      noteBorder: this.noteBorder,
      noteText: this.noteText,
      isDark: this.isDark,
    });
  }

  /// لون التمييز البرتقالي لأزرار الاستلام.
  get orangeAccent(): ImdColors {
    return this.withAccent({
      accent: Color(0xfff39c12),
      accentHover: Color(0xffe08e0b),
      // نصٌّ داكن على البرتقالي: الأبيض عليه ٢٫٢:١ فقط (WCAG AA يطلب ٤٫٥).
      onAccent: Color(0xff2b1a00),
    });
  }
}

export interface ImdEdgeInsets {
  readonly horizontal: number;
  readonly vertical: number;
}

export interface ImdBoxShadow {
  readonly color: ImdColor;
  readonly blurRadius: number;
  readonly offset: { readonly x: number; readonly y: number };
  readonly css: string;
}

/// مقاسات النظام الثابتة: نصف القطر، وعرض الشريط الجانبي، وارتفاع الشريط
/// العلوي، وحشوات المحتوى حسب العرض، وأهداف اللمس.
export class ImdSizes {
  private constructor() {}

  static get radius(): number {
    return ImdStyle.classic ? 2 : 12; // --ui-radius
  }

  static readonly sideWidth = 290; // .side

  /// عرض درج الجوال.
  static drawerWidth(viewportWidth?: number): number {
    const width =
      viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : ImdSizes.sideWidth);
    const w = width * 0.76;
    return w < ImdSizes.sideWidth ? w : ImdSizes.sideWidth;
  }

  static readonly topbarHeight = 59; // .topbar (الجوال)

  /// الشريط الواحد على سطح المكتب: عنوان النافذة والتبويبات والأدوات في صفٍّ واحد.
  static readonly desktopBarHeight = 40;

  static readonly mainPadding: ImdEdgeInsets = { horizontal: 36, vertical: 28 }; // ≥1200px
  static readonly mainPaddingMid: ImdEdgeInsets = { horizontal: 28, vertical: 24 }; // 901–1199px
  static readonly mainPaddingTablet: ImdEdgeInsets = { horizontal: 14, vertical: 16 }; // لا تُستعمل فعليًّا
  static readonly mainPaddingMobile: ImdEdgeInsets = { horizontal: 10, vertical: 12 }; // ≤900px

  static get touchMin(): number {
    return ImdBp.touch ? 46 : 44; // --touch-min
  }

  /// سقفٌ مريح لجدولٍ طويل يُمرَّر تحت رأسٍ ثابت ([ImdTable.maxHeight]).
  static tableMaxHeight(viewportHeight?: number): number {
    const height =
      viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
    return Math.min(640, Math.max(320, height * 0.55));
  }

  /// ارتفاع كل عناصر أشرطة الأعلى (تبويبات الصفحة وأزرار الإجراءات بجوارها).
  static get barControl(): number {
    return ImdDensity.compactTargets ? 36 : ImdSizes.touchMin;
  }

  /// ارتفاع الحقل المدمج (بدل [touchMin]).
  static get compactField(): number {
    return ImdBp.touch ? 40 : ImdDensity.isHigh ? 28 : 34;
  }

  static readonly compactGap = 4;
  static readonly compactRowGap = 2;
  static readonly compactPadV = 6;
  static readonly compactPadH = 8;

  static get compactRadius(): number {
    return ImdStyle.classic ? 2 : 6;
  }

  static readonly font = 'IBMPlexSansArabic';
}

/// نقاط التكيّف: ≥1200 واسع، 901–1199 متوسط (لا جوال ولا واسع)، ≤900 جوال، ≤420 جوال صغير.
///
/// 900 نقطة التحوّل الوحيدة بين نمط الجوال (Drawer/بطاقات) ونمط سطح المكتب.
export class ImdBp {
  static readonly mobileMax = 900;

  readonly width: number;

  constructor(width: number) {
    this.width = width;
  }

  static of(width?: number): ImdBp {
    const w = width ?? (typeof window !== 'undefined' ? window.innerWidth : 1200);
    return new ImdBp(w);
  }

  get wide(): boolean {
    return this.width >= 1200;
  }

  get mobile(): boolean {
    return this.width <= ImdBp.mobileMax;
  }

  /// اسمٌ بديل لـ[mobile] للتوافق الرجعي: اللوحي والجوال نمطٌ واحد.
  get tablet(): boolean {
    return this.mobile;
  }

  get tiny(): boolean {
    return this.width <= 420;
  }

  /// `@media (hover:none) and (pointer:coarse)` ⇒ أهداف لمس 46.
  static get touch(): boolean {
    return ImdDensity.isTouchDevice();
  }
}

/// مؤشر الفأرة على العناصر القابلة للنقر.
export class ImdCursor {
  private constructor() {}

  /// لعنصر قابل للنقر (زر، صف، بطاقة).
  static get click(): string {
    return 'default';
  }

  /// لرابط نصّي حقيقي وحده.
  static get link(): string {
    return 'pointer';
  }
}

/// ظل البطاقات `--ui-shadow`.
export function imdShadow(c: ImdColors): readonly ImdBoxShadow[] {
  if (ImdStyle.classic) return [];
  const color = c.isDark ? Color(0x66000000) : Color(0x0d101828);
  return [
    {
      color,
      blurRadius: 2,
      offset: { x: 0, y: 1 },
      css: `0 1px 2px ${color.css}`,
    },
  ];
}

/// ظل القوائم المنسدلة والنوافذ الطافية فوق الصفحة.
export function imdShadowOverlay(c: ImdColors): readonly ImdBoxShadow[] {
  if (ImdStyle.classic) return [];
  const color = c.isDark ? Color(0x8a000000) : Color(0x24101828);
  return [
    {
      color,
      blurRadius: 28,
      offset: { x: 0, y: 12 },
      css: `0 12px 28px ${color.css}`,
    },
  ];
}

/// ألوانٌ **لا تتبع السمة عمدًا**: وظيفتها التباين الثابت، لا المظهر.
export class ImdFixedColors {
  private constructor() {}

  /// خلفية الباركود/QR وورق الطباعة.
  static readonly paper = Color(0xffffffff);

  /// وحدات الباركود/QR ونصها.
  static readonly ink = Color(0xff000000);

  /// خلفية شاشة الماسح فوق الكاميرا.
  static readonly cameraBackdrop = ImdFixedColors.ink;

  /// نصوص وأيقونات الماسح فوق الكاميرا.
  static readonly cameraForeground = ImdFixedColors.paper;
}

/// توليد قاموس متغيرات CSS للوحة ألوان والمقاسات المشتقة من الرموز نفسها دون أي قيمة خارجية.
export function imdCssVars(
  c: ImdColors,
  options: { mica?: boolean; fontFamily?: string } = {},
): Record<string, string> {
  const { mica = false, fontFamily = ImdSizes.font } = options;
  const shadowList = imdShadow(c);
  const overlayList = imdShadowOverlay(c);
  return {
    '--imd-bg': c.bg.css,
    '--imd-surface': c.surface.css,
    '--imd-subtle': c.subtle.css,
    '--imd-hover': c.hover.css,
    '--imd-line': c.line.css,
    '--imd-line-strong': c.lineStrong.css,
    '--imd-text': c.text.css,
    '--imd-text2': c.text2.css,
    '--imd-muted': c.muted.css,
    '--imd-faint': c.faint.css,
    '--imd-accent': c.accent.css,
    '--imd-accent-hover': c.accentHover.css,
    '--imd-accent-soft': c.accentSoft.css,
    '--imd-ring': c.ring.css,
    '--imd-on-accent': c.onAccent.css,
    '--imd-success': c.success.css,
    '--imd-success-soft': c.successSoft.css,
    '--imd-danger': c.danger.css,
    '--imd-danger-soft': c.dangerSoft.css,
    '--imd-warn': c.warn.css,
    '--imd-warn-soft': c.warnSoft.css,
    '--imd-info': c.info.css,
    '--imd-info-soft': c.infoSoft.css,
    '--imd-side': c.side.css,
    '--imd-side2': c.side2.css,
    '--imd-side-hover': c.sideHover.css,
    '--imd-side-active': c.sideActive.css,
    '--imd-side-text': c.sideText.css,
    '--imd-side-muted': c.sideMuted.css,
    '--imd-side-border': c.sideBorder.css,
    '--imd-side-line': c.sideLine.css,
    '--imd-side-deep': c.sideDeep.css,
    '--imd-side-bright': c.sideBright.css,
    '--imd-table-head': c.tableHead.css,
    '--imd-table-row-line': c.tableRowLine.css,
    '--imd-note-bg': c.noteBg.css,
    '--imd-note-border': c.noteBorder.css,
    '--imd-note-text': c.noteText.css,
    '--imd-header-hover': c.headerHover.css,
    '--imd-row-hover': c.rowHover.css,
    '--imd-line-hover': c.lineHover.css,
    '--imd-danger-hover': c.dangerHover.css,
    '--imd-inverse': c.inverse.css,
    '--imd-inverse-line': c.inverseLine.css,
    '--imd-on-inverse': c.onInverse.css,
    '--imd-on-inverse-soft': c.onInverseSoft.css,
    '--imd-on-inverse-soft2': c.onInverseSoft2.css,
    '--imd-on-inverse-text': c.onInverseText.css,
    '--imd-on-inverse-muted': c.onInverseMuted.css,
    '--imd-on-text': c.onText.css,
    '--imd-on-badge': c.onBadge.css,
    '--imd-field-fill': c.fieldFill.css,
    '--imd-panel-fill': c.panelFill.css,
    '--imd-toolbar-fill': c.toolbarFill.css,
    '--imd-toolbar-line': c.toolbarLine.css,
    '--imd-popup-line': c.popupLine.css,
    '--imd-info-line': c.infoLine.css,
    '--imd-info-strong': c.infoStrong.css,
    '--imd-shadow-xs': c.shadowXs.css,
    '--imd-shadow-sm': c.shadowSm.css,
    '--imd-shadow-md': c.shadowMd.css,
    '--imd-shadow-hairline': c.shadowHairline.css,
    '--imd-shadow-popup': c.shadowPopup.css,
    '--imd-shadow-base': c.shadowBase.css,
    '--imd-scrim': c.scrim.css,
    '--imd-topbar': c.topbar({ mica }).css,
    '--ui-shadow': shadowList.length === 0 ? 'none' : shadowList.map((s) => s.css).join(', '),
    '--ui-shadow-overlay':
      overlayList.length === 0 ? 'none' : overlayList.map((s) => s.css).join(', '),
    '--ui-radius': `${ImdSizes.radius}px`,
    '--touch-min': `${ImdSizes.touchMin}px`,
    '--imd-side-width': `${ImdSizes.sideWidth}px`,
    '--imd-topbar-height': `${ImdSizes.topbarHeight}px`,
    '--imd-desktop-bar-height': `${ImdSizes.desktopBarHeight}px`,
    '--imd-bar-control': `${ImdSizes.barControl}px`,
    '--imd-compact-field': `${ImdSizes.compactField}px`,
    '--imd-compact-gap': `${ImdSizes.compactGap}px`,
    '--imd-compact-row-gap': `${ImdSizes.compactRowGap}px`,
    '--imd-compact-pad-v': `${ImdSizes.compactPadV}px`,
    '--imd-compact-pad-h': `${ImdSizes.compactPadH}px`,
    '--imd-compact-radius': `${ImdSizes.compactRadius}px`,
    '--imd-font-family': fontFamily,
  };
}
