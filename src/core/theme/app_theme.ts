import { ImdFonts } from '../ui/imd_fonts';
import { ImdBp, ImdColor, ImdColors, imdCssVars } from '../ui/imd_tokens';

export type Brightness = 'light' | 'dark';

export interface ImdColorScheme {
  readonly brightness: Brightness;
  readonly primary: ImdColor;
  readonly surface: ImdColor;
  readonly outline: ImdColor;
  readonly onSurface: ImdColor;
}

export interface ImdThemeData {
  readonly useMaterial3: boolean;
  readonly brightness: Brightness;
  readonly colorScheme: ImdColorScheme;
  readonly scaffoldBackgroundColor: ImdColor;
  readonly fontFamily: string;
  readonly tokens: ImdColors;
  readonly cssVars: Readonly<Record<string, string>>;
  readonly inputDecorationTheme: {
    readonly filled: boolean;
    readonly fillColor: ImdColor;
    readonly contentPadding: { readonly horizontal: number; readonly vertical: number };
    readonly borderRadius: number;
    readonly borderColor: ImdColor;
    readonly focusedBorderColor: ImdColor;
    readonly focusedBorderWidth: number;
    readonly labelColor: ImdColor;
    readonly labelFontWeight: number;
  };
  readonly filledButtonTheme: {
    readonly backgroundColor: ImdColor;
    readonly foregroundColor: ImdColor;
    readonly minHeight: number;
    readonly borderRadius: number;
    readonly fontWeight: number;
    readonly fontSize: number;
  };
  readonly cardTheme: {
    readonly color: ImdColor;
    readonly elevation: number;
    readonly borderRadius: number;
    readonly borderColor: ImdColor;
  };
  readonly dividerTheme: {
    readonly color: ImdColor;
    readonly thickness: number;
  };
  readonly snackBarTheme: {
    readonly backgroundColor: ImdColor;
    readonly textColor: ImdColor;
    readonly fontWeight: number;
    readonly borderRadius: number;
  };
  readonly useFadeTransitions: boolean;
  readonly disableSplash: boolean;
}

/// سمة التطبيق — أخضر مؤسسي على خلفية محايدة فاتحة،
/// ونسخةٌ داكنة مقابلة لها.
export class AppTheme {
  private constructor() {}

  // لا ألوان هنا: كل سمةٍ تُبنى من لوحتها في [ImdColors] — المصدر الوحيد.
  static light({ font = ImdFonts.defaultFamily }: { font?: string } = {}): ImdThemeData {
    return AppTheme._base({
      font,
      brightness: 'light',
      tokens: ImdColors.light,
    });
  }

  static dark({ font = ImdFonts.defaultFamily }: { font?: string } = {}): ImdThemeData {
    return AppTheme._base({
      font,
      brightness: 'dark',
      tokens: ImdColors.dark,
    });
  }

  /// سمة قسم المحروقات — داكنة بلمسة زيتونية، بلوحة [ImdColors.fuel].
  static fuel({ font = ImdFonts.defaultFamily }: { font?: string } = {}): ImdThemeData {
    return AppTheme._base({
      font,
      brightness: 'dark',
      tokens: ImdColors.fuel,
    });
  }

  /// النمط الكلاسيكي الفاتح: لوحة [ImdColors.classicLight] وخط الواجهة المختار [font].
  static classic({ font = ImdFonts.defaultFamily }: { font?: string } = {}): ImdThemeData {
    return AppTheme._base({
      font,
      brightness: 'light',
      tokens: ImdColors.classicLight,
    });
  }

  /// قسم المحروقات بهويّته: برتقالي محروق، فاتحًا أو داكنًا بحسب [dark].
  static fuelSection({
    dark,
    font = ImdFonts.defaultFamily,
  }: {
    dark: boolean;
    font?: string;
  }): ImdThemeData {
    return AppTheme._base({
      font,
      brightness: dark ? 'dark' : 'light',
      tokens: dark ? ImdColors.fuelDark : ImdColors.fuelLight,
    });
  }

  /// تطبيق متغيرات السمة على وثيقة المتصفح (`document.documentElement`).
  static applyToDocument(theme: ImdThemeData): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = theme.brightness;
    for (const [k, v] of Object.entries(theme.cssVars)) {
      root.style.setProperty(k, v);
    }
    root.style.fontFamily = `'${theme.fontFamily}', sans-serif`;
  }

  private static _base({
    font,
    brightness,
    tokens,
  }: {
    font: string;
    brightness: Brightness;
    tokens: ImdColors;
  }): ImdThemeData {
    const primary = tokens.accent;
    const background = tokens.bg;
    const surface = tokens.surface;
    const outline = tokens.line;
    const onSurface = tokens.text;
    const muted = tokens.muted;
    const normalizedFont = ImdFonts.normalize(font);

    return {
      useMaterial3: true,
      brightness,
      colorScheme: {
        brightness,
        primary,
        surface,
        outline,
        onSurface,
      },
      scaffoldBackgroundColor: background,
      fontFamily: normalizedFont,
      tokens,
      cssVars: imdCssVars(tokens, { fontFamily: normalizedFont }),
      inputDecorationTheme: {
        filled: true,
        fillColor: surface,
        contentPadding: { horizontal: 14, vertical: 14 },
        borderRadius: 12,
        borderColor: outline,
        focusedBorderColor: primary,
        focusedBorderWidth: 1.6,
        labelColor: muted,
        labelFontWeight: 600,
      },
      filledButtonTheme: {
        backgroundColor: primary,
        foregroundColor: tokens.onAccent,
        minHeight: 48,
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 15,
      },
      cardTheme: {
        color: surface,
        elevation: 0,
        borderRadius: 16,
        borderColor: outline,
      },
      dividerTheme: {
        color: outline,
        thickness: 1,
      },
      snackBarTheme: {
        backgroundColor: onSurface,
        textColor: tokens.onText,
        fontWeight: 600,
        borderRadius: 12,
      },
      useFadeTransitions: !ImdBp.touch,
      disableSplash: !ImdBp.touch,
    };
  }
}
