import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AppDatabase } from '../../data/db/app_database';
import { ImdFonts } from '../ui/imd_fonts';
import { ImdStyle } from '../ui/imd_style';
import { ImdColors } from '../ui/imd_tokens';
import { AppTheme, type Brightness, type ImdThemeData } from './app_theme';

export enum ThemeMode {
  system = 'system',
  light = 'light',
  dark = 'dark',
}

/// تفضيل السمة المحفوظ في شاشة الهوية — يطبَّق على التطبيق كله
/// عبر `MaterialApp.themeMode`.
export class ImdTheme {
  private _mode: ThemeMode;
  private _font: string;
  private readonly _listeners = new Set<() => void>();
  private _disposed = false;

  constructor(mode: ThemeMode, font: string = ImdFonts.defaultFamily) {
    this._mode = mode;
    this._font = ImdFonts.normalize(font);
  }

  get mode(): ThemeMode {
    return this._mode;
  }

  /// خط الواجهة المختار — يسري على التطبيق كله فور حفظه، بلا إعادة تشغيل.
  get font(): string {
    return this._font;
  }

  addListener(listener: () => void): void {
    if (!this._disposed) {
      this._listeners.add(listener);
    }
  }

  removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }

  protected notifyListeners(): void {
    if (this._disposed) return;
    for (const listener of [...this._listeners]) {
      try {
        listener();
      } catch {
        // لا يُسقط مستمعٌ بقية المستمعين.
      }
    }
  }

  applyFont(family: string): void {
    const next = ImdFonts.normalize(family);
    if (next === this._font) return;
    this._font = next;
    this.notifyListeners();
  }

  static parse(pref: string): ThemeMode {
    switch (pref) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  apply(pref: string): void {
    const next = ImdTheme.parse(pref);
    if (next === this._mode) return;
    this._mode = next;
    this.notifyListeners();
  }

  /// السطوع الفعلي المطبَّق وفق [mode] وتفضيل النظام.
  resolvedBrightness(): Brightness {
    if (this._mode === ThemeMode.dark) return 'dark';
    if (this._mode === ThemeMode.light) return 'light';
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  }

  /// كائن السمة الفعلي المطابق للوضع والخط والنمط الكلاسيكي.
  resolvedTheme(): ImdThemeData {
    const brightness = this.resolvedBrightness();
    if (brightness === 'dark') {
      return AppTheme.dark({ font: this._font });
    }
    return ImdStyle.classic
      ? AppTheme.classic({ font: this._font })
      : AppTheme.light({ font: this._font });
  }

  dispose(): void {
    this._disposed = true;
    this._listeners.clear();
  }
}

export const ImdThemeContext = createContext<ImdTheme | null>(null);

export interface ImdThemeProviderProps {
  readonly theme: ImdTheme;
  readonly children?: ReactNode;
}

export function ImdThemeProvider({ theme, children }: ImdThemeProviderProps) {
  return createElement(ImdThemeContext.Provider, { value: theme }, children);
}

export function useImdTheme(): ImdTheme | null {
  const theme = useContext(ImdThemeContext);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!theme) return;
    const l = () => setTick((t) => t + 1);
    theme.addListener(l);
    return () => theme.removeListener(l);
  }, [theme]);

  return theme;
}

export const ImdThemeDataContext = createContext<ImdThemeData | null>(null);

export interface ImdThemeDataProviderProps {
  readonly data: ImdThemeData;
  readonly children?: ReactNode;
}

export function ImdThemeDataProvider({ data, children }: ImdThemeDataProviderProps) {
  return createElement(ImdThemeDataContext.Provider, { value: data }, children);
}

export function useImdThemeData(): ImdThemeData | null {
  return useContext(ImdThemeDataContext);
}

export function useImdColors(explicit?: ImdColors): ImdColors {
  const themeData = useContext(ImdThemeDataContext);
  const imdTheme = useImdTheme();
  if (explicit) return explicit;
  if (themeData) return themeData.tokens;
  if (imdTheme) return imdTheme.resolvedTheme().tokens;
  if (typeof document !== 'undefined') {
    const ds = document.documentElement.dataset;
    const isDark = ds.theme === 'dark';
    const isFuel = ds.section === 'fuel';
    if (isFuel) return isDark ? ImdColors.fuelDark : ImdColors.fuelLight;
    if (isDark) return ImdColors.dark;
  }
  return ImdStyle.classic ? ImdColors.classicLight : ImdColors.light;
}

export const AppDatabaseContext = createContext<AppDatabase | null>(null);

export interface AppDatabaseProviderProps {
  readonly db: AppDatabase;
  readonly children?: ReactNode;
}

export function AppDatabaseProvider({ db, children }: AppDatabaseProviderProps) {
  return createElement(AppDatabaseContext.Provider, { value: db }, children);
}

export function useAppDatabase(): AppDatabase | null {
  return useContext(AppDatabaseContext);
}
