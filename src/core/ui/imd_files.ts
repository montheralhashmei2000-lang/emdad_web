import { showImdToast } from './widgets/imd_dialogs';

export interface ImdPickedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface ImdFilesPickOptions {
  readonly extensions?: readonly string[];
}

/// حفظ الملفات واختيارها: تنزيل عبر المتصفح (Blob + رابط تنزيل مؤقت)
/// واختيار ملف عبر عنصر الإدخال القياسي.
export class ImdFiles {
  private constructor() {}

  /// يحفظ ملفًا باسم مقترح عبر تنزيل المتصفح؛ يُظهر تنبيهًا عند الإخفاق.
  static async saveBytes(
    fileName: string,
    bytes: Uint8Array | readonly number[],
  ): Promise<string | null> {
    try {
      if (
        typeof document === 'undefined' ||
        !document.body ||
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
      ) {
        return null;
      }

      const data = new Uint8Array(bytes);
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }

      return fileName;
    } catch (e) {
      showImdToast(`✖ تعذر حفظ الملف: ${e}`, { error: true });
      return null;
    }
  }

  /// اختيار ملف واحد وإرجاع محتواه (اسم + بايتات)، أو `null` عند الإلغاء.
  static async pick({
    extensions = ['xlsx', 'xls', 'csv'],
  }: ImdFilesPickOptions = {}): Promise<ImdPickedFile | null> {
    if (typeof document === 'undefined' || !document.body) {
      return null;
    }

    return new Promise<ImdPickedFile | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      if (extensions.length > 0) {
        input.accept = extensions
          .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
          .join(',');
      }

      let settled = false;
      let focusTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (focusTimer !== null) {
          clearTimeout(focusTimer);
          focusTimer = null;
        }
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', handleCancel);
        if (typeof window !== 'undefined') {
          window.removeEventListener('focus', handleWindowFocus);
        }
        input.remove();
      };

      const finish = (result: ImdPickedFile | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const handleChange = () => {
        if (focusTimer !== null) {
          clearTimeout(focusTimer);
          focusTimer = null;
        }
        const file = input.files?.[0];
        if (!file) {
          finish(null);
          return;
        }
        void file
          .arrayBuffer()
          .then((buf) => {
            finish({ name: file.name, bytes: new Uint8Array(buf) });
          })
          .catch(() => {
            finish(null);
          });
      };

      const handleCancel = () => {
        finish(null);
      };

      const handleWindowFocus = () => {
        // احتياطٌ للمتصفحات التي لا تُطلق حدث cancel عند إغلاق منتقي الملفات.
        if (focusTimer !== null) clearTimeout(focusTimer);
        focusTimer = setTimeout(() => {
          if (!settled && (!input.files || input.files.length === 0)) {
            finish(null);
          }
        }, 400);
      };

      input.addEventListener('change', handleChange);
      input.addEventListener('cancel', handleCancel);
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', handleWindowFocus);
      }

      document.body.appendChild(input);
      input.click();
    });
  }

  /// تاريخ اليوم بصيغة `YYYY-MM-DD` المحلية — تُستعمل في أسماء الملفات المصدَّرة.
  static today(): string {
    const now = new Date();
    const y = String(now.getFullYear()).padStart(4, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
