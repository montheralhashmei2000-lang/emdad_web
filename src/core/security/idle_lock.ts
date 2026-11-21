import type { AppDatabase } from '../../data/db/app_database';
import { SettingsRepo } from '../../data/repos/settings_repo';

export enum AppLifecycleState {
  resumed = 'resumed',
  inactive = 'inactive',
  paused = 'paused',
  detached = 'detached',
  hidden = 'hidden',
}

/// القفل التلقائي بعد الخمول.
///
/// بعد [minutes] دقيقة بلا حركة فأرة أو لمسة أو مفتاح يُقفل التطبيق بغطاءٍ يطلب
/// كلمة مرور المستخدم الحالي — **دون تسجيل خروج**: الشاشات المفتوحة ومسوّدات
/// الإدخال تبقى كما هي خلف الغطاء، فلا يضيع عملٌ بسبب قهوة.
///
/// الإعداد محلي للجهاز (`SettingsRepo.localOnlyKeys['security']`)، والافتراضي
/// [defaultMinutes]؛ الصفر يعطّل القفل. المعيار الزمني ساعة الجهاز، فاستئناف
/// التطبيق بعد ساعة في الخلفية يقفل فورًا عند العودة.
export class IdleLock {
  private readonly _db: AppDatabase;
  private readonly _now: () => Date;

  /// دورية فحص الخمول (بالملّي ثانية). المؤقّت لا يُعاد ضبطه مع كل حركة (مكلف)،
  /// بل تُسجَّل آخر حركة ويُقارَن بها كل [tickMs].
  readonly tickMs: number;

  static readonly settingsKey = 'security';
  static readonly defaultMinutes = 15;

  /// الخيارات المعروضة في الإعدادات (دقائق؛ 0 = معطّل).
  static readonly choices: readonly number[] = [0, 5, 10, 15, 30, 60];

  private _minutes: number = IdleLock.defaultMinutes;
  private _locked = false;
  private _active = false;
  private _disposed = false;
  private _lastActivity: Date;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private readonly _listeners = new Set<() => void>();

  private readonly _onKeyDown = (): void => {
    this.touch();
  };

  private readonly _onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.didChangeAppLifecycleState(AppLifecycleState.resumed);
    }
  };

  constructor(
    db: AppDatabase,
    {
      clock,
      tickMs = 10_000,
    }: {
      readonly clock?: () => Date;
      readonly tickMs?: number;
    } = {},
  ) {
    this._db = db;
    this._now = clock ?? (() => new Date());
    this.tickMs = tickMs;
    this._lastActivity = this._now();
  }

  get minutes(): number {
    return this._minutes;
  }

  get enabled(): boolean {
    return this._minutes > 0;
  }

  get locked(): boolean {
    return this._locked;
  }

  addListener(listener: () => void): void {
    if (this._disposed) return;
    this._listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }

  notifyListeners(): void {
    if (this._disposed) return;
    for (const listener of [...this._listeners]) {
      listener();
    }
  }

  /// يقرأ الإعداد المحفوظ. القيم غير المعروفة تُهمَل إلى الافتراضي.
  async load(): Promise<void> {
    const raw = (await new SettingsRepo(this._db).read(IdleLock.settingsKey))[
      'idleLockMinutes'
    ];
    const m =
      typeof raw === 'number' && Number.isFinite(raw)
        ? Math.trunc(raw)
        : IdleLock.defaultMinutes;
    this._minutes = m < 0 ? IdleLock.defaultMinutes : m;
    this.notifyListeners();
  }

  async setMinutes(minutes: number): Promise<void> {
    this._minutes = minutes < 0 ? 0 : Math.trunc(minutes);
    const repo = new SettingsRepo(this._db);
    const map = await repo.read(IdleLock.settingsKey);
    map['idleLockMinutes'] = this._minutes;
    await repo.write(IdleLock.settingsKey, map);
    this._lastActivity = this._now();
    this.notifyListeners();
  }

  /// يبدأ المراقبة عند تسجيل الدخول.
  activate(): void {
    if (this._active) return;
    this._active = true;
    this._lastActivity = this._now();
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown, true);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
    this._timer = setInterval(() => this.checkNow(), this.tickMs);
  }

  /// يوقف المراقبة ويُزيل القفل عند الخروج.
  deactivate(): void {
    if (!this._active && !this._locked) return;
    this._active = false;
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown, true);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
    if (this._locked) {
      this._locked = false;
      this.notifyListeners();
    }
  }

  /// نشاط مستخدم. أثناء القفل لا يفتح شيئًا: الفتح بكلمة المرور وحدها.
  touch(): void {
    if (!this._locked) {
      this._lastActivity = this._now();
    }
  }

  /// يقفل إن انقضت مهلة الخمول. يعيد هل قُفل الآن.
  checkNow(): boolean {
    if (!this._active || this._locked || !this.enabled) return false;
    const elapsedMs = this._now().getTime() - this._lastActivity.getTime();
    if (elapsedMs < this._minutes * 60_000) return false;
    this.lockNow();
    return true;
  }

  /// قفلٌ فوري (زرّ «قفل الشاشة»).
  lockNow(): void {
    if (!this._active || this._locked) return;
    // حقلٌ في الصفحة خلف الغطاء قد يكون ممسكًا باتصال لوحة المفاتيح: يُترك قبل
    // أن يطلب حقلُ كلمة المرور اتصاله، فلا يتجاور اتصالان في حالةٍ واحدة.
    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        active.blur();
      }
    }
    this._locked = true;
    this.notifyListeners();
  }

  /// بعد التحقق من كلمة المرور.
  unlock(): void {
    if (!this._locked) return;
    this._locked = false;
    this._lastActivity = this._now();
    this.notifyListeners();
  }

  didChangeAppLifecycleState(state: AppLifecycleState): void {
    if (state === AppLifecycleState.resumed) {
      this.checkNow();
    }
  }

  dispose(): void {
    this.deactivate();
    this._disposed = true;
    this._listeners.clear();
  }
}
