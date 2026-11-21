import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { arDigits, nf } from './imd_format';
import { ImdIcon } from './imd_icon';
import { ImdNumbers } from './imd_numbers';
import { ImdStyle } from './imd_style';
import { ImdColors, ImdCursor } from './imd_tokens';

function resolveActiveColors(explicit?: ImdColors): ImdColors {
  if (explicit) return explicit;
  if (typeof document !== 'undefined') {
    const ds = document.documentElement.dataset;
    const isDark = ds.theme === 'dark';
    const isFuel = ds.section === 'fuel';
    if (isFuel) return isDark ? ImdColors.fuelDark : ImdColors.fuelLight;
    if (isDark) return ImdColors.dark;
  }
  return ImdStyle.classic ? ImdColors.classicLight : ImdColors.light;
}

export interface ImdRecordCount {
  readonly shown: number;
  readonly total: number;
}

/// عدّاد السجلات التي تعرضها الصفحة الحالية — يغذّيه كل [ImdTable] ويقرؤه
/// [ImdStatusBar].
///
/// **لماذا مجمَّعٌ لا قيمةٌ واحدة:** الصفحة قد تضمّ أكثر من جدول (مسودّاتٌ
/// وسندات)، وكلٌّ يُبلّغ عن نفسه بمفتاحه. العدد المعروض للجدول **الأكبر** —
/// هو جدول الصفحة الرئيسي عادةً — فلا يقفز الرقم بين جدولين بحسب من أعاد البناء
/// آخرًا.
export class ImdRecordSink {
  private readonly _counts = new Map<unknown, ImdRecordCount>();
  private readonly _listeners = new Set<() => void>();
  private _disposed = false;
  private _pending = false;

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

  /// المعروض بعد التصفية، والإجمالي قبلها — للجدول الأكبر.
  get current(): ImdRecordCount | null {
    let best: ImdRecordCount | null = null;
    for (const v of this._counts.values()) {
      if (best === null || v.total > best.total) best = v;
    }
    return best;
  }

  report(owner: unknown, { shown, total }: ImdRecordCount): void {
    if (this._disposed) return;
    const old = this._counts.get(owner);
    if (old && old.shown === shown && old.total === total) return;
    this._counts.set(owner, { shown, total });
    this.notifyListeners();
  }

  remove(owner: unknown): void {
    if (this._counts.delete(owner)) {
      this._notifyAfterFrame();
    }
  }

  private _notifyAfterFrame(): void {
    if (this._pending || this._disposed) return;
    this._pending = true;
    const flush = () => {
      this._pending = false;
      if (!this._disposed) this.notifyListeners();
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(flush);
    } else {
      queueMicrotask(flush);
    }
  }

  dispose(): void {
    this._disposed = true;
    this._listeners.clear();
  }
}

export const ImdRecordScopeContext = createContext<ImdRecordSink | null>(null);

export interface ImdRecordScopeProps {
  readonly sink: ImdRecordSink;
  readonly children?: ReactNode;
}

/// يربط جداول صفحةٍ بعدّادها. القشرة تلفّ كل صفحةٍ مفتوحة بنطاقٍ خاص بها، فلا
/// تُلوِّث جداولُ صفحةٍ مخفيّةٍ عدّادَ الصفحة الظاهرة.
export function ImdRecordScope({ sink, children }: ImdRecordScopeProps) {
  return (
    <ImdRecordScopeContext.Provider value={sink}>
      {children}
    </ImdRecordScopeContext.Provider>
  );
}

export function useImdRecordScope(): ImdRecordSink | null {
  return useContext(ImdRecordScopeContext);
}

export namespace ImdRecordScope {
  export const Context = ImdRecordScopeContext;

  export function maybeOf(): ImdRecordSink | null {
    return useImdRecordScope();
  }
}

export interface ImdStatusBarProps {
  /// نصّ حالة الاتصال/المزامنة.
  readonly connection: string;
  /// `true` أخضر، `false` تنبيه (فشل)، والرمادي لحالة الإيقاف يقرّره [connection].
  readonly connectionOk: boolean | null;
  /// عدّاد الصفحة الظاهرة، أو `null` فلا يُعرض عدد.
  readonly records?: ImdRecordSink | null;
  /// عناصر إضافية في طرف الشريط.
  readonly trailing?: readonly ReactNode[];
  /// نقر حالة الاتصال (يفتح شاشة المزامنة).
  readonly onConnectionTap?: (() => void) | null;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// الشريط السفلي لسطح المكتب: الوقت، حالة الاتصال، وعدد السجلات. الكثافة والنمط
/// الكلاسيكي في الإعدادات ▸ «المظهر والعرض» وحدها.
///
/// عرضٌ فقط — لا منطق مزامنةٍ هنا: [connection] تأتيه جاهزةً من القشرة التي
/// تملك `AutoSyncService`.
export function ImdStatusBar({
  connection,
  connectionOk,
  records = null,
  trailing = [],
  onConnectionTap,
  colors,
  className = '',
}: ImdStatusBarProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [, setSinkTick] = useState(0);
  const [, setNumTick] = useState(0);

  useEffect(() => {
    // دقيقةٌ تكفي: الشريط لا يعرض ثواني، ومؤقّتٌ كل ثانية يُعيد رسمه بلا فائدة.
    const id = setInterval(() => {
      setNow(new Date());
    }, 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!records) return;
    const listener = () => setSinkTick((t) => t + 1);
    records.addListener(listener);
    return () => records.removeListener(listener);
  }, [records]);

  useEffect(() => {
    const listener = () => setNumTick((t) => t + 1);
    ImdNumbers.notifier.addListener(listener);
    return () => ImdNumbers.notifier.removeListener(listener);
  }, []);

  const c = resolveActiveColors(colors);
  const dot =
    connectionOk === null
      ? c.faint
      : connectionOk
        ? c.success
        : c.danger;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const yyyy = String(now.getFullYear()).padStart(4, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  const time = arDigits(`${hh}:${mm}`);
  const date = arDigits(`${yyyy}/${mo}/${dd}`);

  const cur = records?.current ?? null;
  const recordsText =
    cur === null
      ? null
      : cur.shown === cur.total
        ? `السجلات: ${nf(cur.total)}`
        : `السجلات: ${nf(cur.shown)} من ${nf(cur.total)}`;

  const sep = (
    <span
      style={{
        display: 'inline-block',
        width: 1,
        height: 14,
        marginInline: 12,
        backgroundColor: c.line.css,
        flexShrink: 0,
      }}
    />
  );

  const connectionInner = (
    <span className="inline-flex min-w-0 items-center">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 9999,
          backgroundColor: dot.css,
          flexShrink: 0,
        }}
      />
      <span style={{ width: 6, flexShrink: 0 }} />
      <span
        className="min-w-0 truncate"
        style={{ fontSize: 12, color: c.muted.css, lineHeight: 1.2 }}
      >
        {connection}
      </span>
    </span>
  );

  return (
    <footer
      className={`flex w-full items-center ${className}`.trim()}
      style={{
        height: 30,
        paddingInline: 14,
        backgroundColor: c.surface.css,
        borderTop: `1px solid ${c.line.css}`,
      }}
    >
      <span className="inline-flex shrink-0 items-center leading-none">
        <ImdIcon name="clock" size={13} color={c.muted} />
      </span>
      <span style={{ width: 6, flexShrink: 0 }} />
      <span
        className="shrink-0"
        style={{ fontSize: 12, color: c.muted.css, lineHeight: 1.2 }}
      >
        {`${time}  ·  ${date}`}
      </span>

      {sep}

      <div className="min-w-0 flex-initial">
        {onConnectionTap ? (
          <button
            type="button"
            onClick={onConnectionTap}
            className="flex max-w-full items-center rounded-[6px] border-0 bg-transparent px-1 py-1 transition-colors hover:bg-[color:var(--imd-hover)]"
            style={{ cursor: ImdCursor.click }}
          >
            {connectionInner}
          </button>
        ) : (
          <div className="flex max-w-full items-center px-1 py-1">
            {connectionInner}
          </div>
        )}
      </div>

      {recordsText !== null && (
        <div className="inline-flex shrink-0 items-center">
          {sep}
          <span className="inline-flex shrink-0 items-center leading-none">
            <ImdIcon name="clipboard" size={13} color={c.muted} />
          </span>
          <span style={{ width: 6, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12,
              lineHeight: 1.2,
              color: c.text2.css,
              fontWeight: 600,
            }}
          >
            {recordsText}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {trailing.map((item, idx) => (
        <span key={idx} className="inline-flex shrink-0 items-center">
          {item}
        </span>
      ))}
    </footer>
  );
}
