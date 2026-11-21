/// محوّل آمن لواجهة `SharedPreferences` فوق `localStorage` داخل `try/catch`
/// مع مخزن ذاكرة بديل لبيئة اختبارات Vitest أو عند تعذّر التخزين المحلي.
export class SharedPreferences {
  private static _mockStore: Map<string, string | number> | null = null;
  private static readonly _fallbackStore = new Map<string, string | number>();

  private constructor() {}

  static async getInstance(): Promise<SharedPreferences> {
    return new SharedPreferences();
  }

  /// يضبط قيماً ابتدائية في الذاكرة للاختبارات (مكافئ `SharedPreferences.setMockInitialValues`).
  static setMockInitialValues(values: Record<string, unknown>): void {
    const next = new Map<string, string | number>();
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === 'string') {
        next.set(k, v);
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        next.set(k, Math.trunc(v));
      }
    }
    SharedPreferences._mockStore = next;
  }

  /// يعيد المزوّد إلى التخزين الطبيعي (للاستخدام في اختبارات التنظيف عند الحاجة).
  static clearMock(): void {
    SharedPreferences._mockStore = null;
  }

  getString(key: string): string | null {
    if (SharedPreferences._mockStore !== null) {
      const v = SharedPreferences._mockStore.get(key);
      return typeof v === 'string' ? v : null;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {
      // تعذّر القراءة من localStorage — الرجوع لمخزن الذاكرة.
    }
    const v = SharedPreferences._fallbackStore.get(key);
    return typeof v === 'string' ? v : null;
  }

  getInt(key: string): number | null {
    if (SharedPreferences._mockStore !== null) {
      const v = SharedPreferences._mockStore.get(key);
      return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        if (/^-?\d+$/.test(raw.trim())) {
          return Number.parseInt(raw.trim(), 10);
        }
        return null;
      }
    } catch {
      // تعذّر القراءة من localStorage — الرجوع لمخزن الذاكرة.
    }
    const v = SharedPreferences._fallbackStore.get(key);
    return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;
  }

  async setString(key: string, value: string): Promise<boolean> {
    if (SharedPreferences._mockStore !== null) {
      SharedPreferences._mockStore.set(key, value);
      return true;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return true;
      }
    } catch {
      // تعذّر الكتابة إلى localStorage — الحفظ في مخزن الذاكرة البديل.
    }
    SharedPreferences._fallbackStore.set(key, value);
    return true;
  }

  async setInt(key: string, value: number): Promise<boolean> {
    const intVal = Math.trunc(value);
    if (SharedPreferences._mockStore !== null) {
      SharedPreferences._mockStore.set(key, intVal);
      return true;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, String(intVal));
        return true;
      }
    } catch {
      // تعذّر الكتابة إلى localStorage — الحفظ في مخزن الذاكرة البديل.
    }
    SharedPreferences._fallbackStore.set(key, intVal);
    return true;
  }

  async remove(key: string): Promise<boolean> {
    if (SharedPreferences._mockStore !== null) {
      SharedPreferences._mockStore.delete(key);
      return true;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // تجاهل
    }
    SharedPreferences._fallbackStore.delete(key);
    return true;
  }

  async clear(): Promise<boolean> {
    if (SharedPreferences._mockStore !== null) {
      SharedPreferences._mockStore.clear();
      return true;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {
      // تجاهل
    }
    SharedPreferences._fallbackStore.clear();
    return true;
  }

  getKeys(): Set<string> {
    if (SharedPreferences._mockStore !== null) {
      return new Set(SharedPreferences._mockStore.keys());
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const keys = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k !== null) keys.add(k);
        }
        return keys;
      }
    } catch {
      // تجاهل — الرجوع لمخزن الذاكرة
    }
    return new Set(SharedPreferences._fallbackStore.keys());
  }
}
