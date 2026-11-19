import { DomainDiagnostics } from '../domain/diagnostics';

/// خطأٌ مسجَّل.
export class LoggedError {
  /// موضع الحدوث بصيغة `مجال.عملية` (مثل `archive.cable`).
  readonly source: string;
  readonly message: string;
  readonly type: string;
  readonly critical: boolean;
  readonly at: Date;
  readonly stack?: string | null;

  /// كم مرةً تكرر الخطأ نفسه داخل نافذة التكرار فلم يُسجَّل ثانيةً.
  suppressed = 0;

  constructor({
    source,
    message,
    type,
    critical,
    at,
    stack,
  }: {
    source: string;
    message: string;
    type: string;
    critical: boolean;
    at: Date;
    stack?: string | null;
  }) {
    this.source = source;
    this.message = message;
    this.type = type;
    this.critical = critical;
    this.at = at;
    this.stack = stack;
  }

  toString(): string {
    return `[${this.source}] ${this.type}: ${this.message}`;
  }
}

/// سجلّ الأخطاء المبتلعة.
///
/// **لماذا ليس [AuditRepo] وحده:** كثيرٌ من المواضع أدنى من قاعدة البيانات
/// (فتح الملف المشفّر قبل وجود القاعدة، وكتابة سجل التدقيق نفسه)، أو بلا
/// قاعدة في متناولها (نماذج الطباعة، مجال النطاق). فالمسجِّل بلا تبعية:
/// يكتب في سجل المنصة ويحفظ آخر [capacity] خطأً في الذاكرة للتشخيص، وتُحقن
/// له عند الإقلاع قناتان: [sink] لحفظ الحرجة في سجل التدقيق، و[userNotifier]
/// لإبلاغ المستخدم.
///
/// **تصنيف الأخطاء:**
/// - [critical]: ما يُفقد به عملٌ أو أثر مساءلة (فشل الأرشفة بعد الطباعة، تعذّر
///   كتابة سجل التدقيق، نطاق مستودعات تالف). تُحفظ في سجل التدقيق، ويُبلَّغ
///   المستخدم إن مُرِّرت [userMessage].
/// - [log]: الثانوية (ملف مؤقت لم يُحذف، شعار لم يُحمَّل). سجل المنصة والذاكرة فقط.
/// - **المتوقعة** (مقبس أغلقه الطرف الآخر، حزمة اكتشاف مشوّهة من الشبكة) لا
///   تُسجَّل: يكفي تعليقٌ عند موضعها يشرح لماذا هي متوقعة.
export class ErrorLogger {
  private constructor() {}

  /// أقصى ما يحتفظ به المسجِّل في الذاكرة.
  static readonly capacity = 200;

  /// الخطأ نفسه (الموضع + النوع) لا يُسجَّل إلا مرةً في هذه المدة — تحصينًا من
  /// طوفانٍ حين يتكرر عطلٌ في مسارٍ يُستدعى مع كل رسم للشاشة.
  static readonly dedupeWindow = 60_000;

  private static readonly _recent: LoggedError[] = [];
  private static readonly _lastByKey = new Map<string, LoggedError>();
  private static _handlersInstalled = false;
  private static _prevOnError: OnErrorEventHandler | null = null;
  private static _rejectionListener: ((event: PromiseRejectionEvent) => void) | null = null;

  /// آخر الأخطاء، الأحدث أولًا.
  static get recent(): readonly LoggedError[] {
    return Object.freeze([...ErrorLogger._recent].reverse());
  }

  /// يحفظ الخطأ الحرج في سجل التدقيق. يُحقن من `main` (وهو يتجاوز مصدر `audit.*`
  /// فلا يُستدعى المسجِّل من داخل كتابة سجل التدقيق نفسها).
  static sink: ((error: LoggedError) => Promise<void>) | null = null;

  /// يُبلغ المستخدم برسالة عربية (SnackBar). يُحقن من `main`.
  static userNotifier: ((message: string) => void) | null = null;

  /// يربط مصائد الأخطاء العامة: أخطاء المتصفح (`window.onerror`) والاستثناءات
  /// غير المعالَجة في المهام غير المتزامنة (`unhandledrejection`) ومنفذ
  /// `DomainDiagnostics.sink`. يمنع تكرار تسجيل المستمعات عند الاستدعاء المتكرر.
  static installGlobalHandlers(): void {
    DomainDiagnostics.sink = (source, error, stack) => {
      ErrorLogger.critical(source, error, { stack });
    };

    if (ErrorLogger._handlersInstalled) return;
    ErrorLogger._handlersInstalled = true;

    if (typeof window !== 'undefined') {
      const prevOnError = window.onerror;
      ErrorLogger._prevOnError = prevOnError;
      window.onerror = (message, source, lineno, colno, error) => {
        ErrorLogger.critical('window.onerror', error ?? message, {
          stack: error instanceof Error ? error.stack : undefined,
        });
        if (typeof prevOnError === 'function') {
          return prevOnError.call(window, message, source, lineno, colno, error);
        }
        return false;
      };

      const onUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        ErrorLogger.critical('platform.uncaught', reason, {
          stack: reason instanceof Error ? reason.stack : undefined,
        });
      };
      ErrorLogger._rejectionListener = onUnhandledRejection;
      window.addEventListener('unhandledrejection', onUnhandledRejection);
    }
  }

  /// خطأ ثانوي: سجل المنصة والذاكرة.
  static log(source: string, error: unknown, stack?: string | null): void {
    ErrorLogger._record(source, error, stack, { critical: false, userMessage: null });
  }

  /// خطأ حرج: يُحفظ في سجل التدقيق، ويُبلَّغ المستخدم إن وُجدت [userMessage].
  static critical(
    source: string,
    error: unknown,
    options: { stack?: string | null; userMessage?: string | null } = {},
  ): void {
    ErrorLogger._record(source, error, options.stack, {
      critical: true,
      userMessage: options.userMessage ?? null,
    });
  }

  private static _record(
    source: string,
    error: unknown,
    stack: string | null | undefined,
    options: { critical: boolean; userMessage: string | null },
  ): void {
    const { critical, userMessage } = options;
    const now = new Date();
    const type =
      error instanceof Error
        ? error.constructor.name || 'Error'
        : error === null
          ? 'Null'
          : typeof error;
    const message = error instanceof Error ? error.message || String(error) : String(error);
    const key = `${source}|${type}|${critical}`;
    const prev = ErrorLogger._lastByKey.get(key);
    if (prev !== undefined && now.getTime() - prev.at.getTime() < ErrorLogger.dedupeWindow) {
      prev.suppressed++;
      return;
    }

    const resolvedStack = stack ?? (error instanceof Error ? error.stack : undefined);
    const entry = new LoggedError({
      source,
      message,
      type,
      critical,
      at: now,
      stack: resolvedStack,
    });
    ErrorLogger._lastByKey.set(key, entry);
    ErrorLogger._recent.push(entry);
    if (ErrorLogger._recent.length > ErrorLogger.capacity) {
      ErrorLogger._recent.splice(0, ErrorLogger._recent.length - ErrorLogger.capacity);
    }

    try {
      if (critical) {
        console.error(`✖ خطأ حرج ${entry}`);
      } else {
        console.warn(`⚠ خطأ ${entry}`);
      }
    } catch {
      // المسجِّل نفسه لا يرمي.
    }
    if (!critical) return;

    // الحفظ والإبلاغ لا يُسقطان المسار الأصلي أبدًا: المسجِّل نفسه لا يرمي.
    const persist = ErrorLogger.sink;
    if (persist != null && !source.startsWith('audit.')) {
      try {
        Promise.resolve(persist(entry)).catch((e) => {
          try {
            console.error('ErrorLogger.sink:', e);
          } catch {
            // تجاهل
          }
        });
      } catch (e) {
        try {
          console.error('ErrorLogger.sink:', e);
        } catch {
          // تجاهل
        }
      }
    }
    if (userMessage != null) {
      try {
        ErrorLogger.userNotifier?.(userMessage);
      } catch (e) {
        try {
          console.error('ErrorLogger.userNotifier:', e);
        } catch {
          // تجاهل
        }
      }
    }
  }

  /// للاختبارات: يصفّر الذاكرة والتكرار والقنوات والمستمعات.
  static reset(): void {
    ErrorLogger._recent.length = 0;
    ErrorLogger._lastByKey.clear();
    ErrorLogger.sink = null;
    ErrorLogger.userNotifier = null;
    DomainDiagnostics.sink = null;
    if (typeof window !== 'undefined' && ErrorLogger._handlersInstalled) {
      window.onerror = ErrorLogger._prevOnError;
      if (ErrorLogger._rejectionListener !== null) {
        window.removeEventListener('unhandledrejection', ErrorLogger._rejectionListener);
      }
    }
    ErrorLogger._prevOnError = null;
    ErrorLogger._rejectionListener = null;
    ErrorLogger._handlersInstalled = false;
  }
}
