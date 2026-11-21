import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { AppDatabase } from '../../data/db/app_database';
import { TableUpdateQuery, type TableUpdateSubscription, Value } from '../../data/db/sqlite_driver';
import { UsersCompanion, type User } from '../../data/db/tables/core_tables';
import { AuditRepo } from '../../data/repos/audit_repo';
import { RepoActor, RepoGuard } from '../../data/repos/repo_guard';
import { SettingsRepo } from '../../data/repos/settings_repo';
import { ArgumentError, UsersRepo } from '../../data/repos/users_repo';
import { AccessControl, SysPerm, UserRole, type PermissionMap } from '../../domain/access_control';
import { PasswordPolicy } from '../../domain/password_policy';
import { SectionBlock } from '../../domain/section_block';
import { ErrorLogger } from '../error_log';
import { ValueNotifier } from '../ui/imd_numbers';
import { OwnerPromotion } from './owner_promotion';
import { PasswordHash } from './password_hash';
import { Pbkdf2 } from './pbkdf2';
import { SharedPreferences } from './shared_prefs';
import { parseWarehouseScope } from './warehouse_scope';

/// نتيجة محاولة الدخول
export enum AuthStatus {
  ok = 'ok',
  badCredentials = 'badCredentials',
  locked = 'locked',
  inactive = 'inactive',
  notApproved = 'notApproved',
}

export class AuthResult {
  readonly status: AuthStatus;
  readonly user: User | null;
  readonly attemptsLeft: number;
  readonly lockRemainingMs: number;
  readonly message: string;

  constructor({
    status,
    user = null,
    attemptsLeft = 0,
    lockRemainingMs = 0,
    message = '',
  }: {
    readonly status: AuthStatus;
    readonly user?: User | null;
    readonly attemptsLeft?: number;
    readonly lockRemainingMs?: number;
    readonly message?: string;
  }) {
    this.status = status;
    this.user = user;
    this.attemptsLeft = attemptsLeft;
    this.lockRemainingMs = lockRemainingMs;
    this.message = message;
  }

  get isOk(): boolean {
    return this.status === AuthStatus.ok;
  }
}

class LockState {
  constructor(
    readonly fails: number,
    readonly until: number,
    readonly strikes = 0,
    readonly lastLockAt = 0,
  ) {}

  static fromMap(o: Record<string, unknown>): LockState {
    const toInt = (v: unknown): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0;
    return new LockState(
      toInt(o['fails']),
      toInt(o['until']),
      toInt(o['strikes']),
      toInt(o['lastLockAt']),
    );
  }

  toMap(): Record<string, unknown> {
    const out: Record<string, unknown> = {
      fails: this.fails,
      until: this.until,
    };
    if (this.strikes > 0) out['strikes'] = this.strikes;
    if (this.lastLockAt > 0) out['lastLockAt'] = this.lastLockAt;
    return out;
  }
}

/// المصادقة والجلسة:
/// • PBKDF2-HMAC-SHA256 + salt لكل مستخدم؛ الحسابات القديمة (45,000 دورة) تُعاد
///   تجزئتها بالعدد الحالي تلقائيًا عند أول دخول ناجح.
/// • قفل الدخول بعد 5 محاولات خاطئة لمدة 3 دقائق (لكل اسم مستخدم).
/// • مدة الجلسة 12 ساعة ثم يُطلب الدخول من جديد.
/// • عدّاد المحاولات والجلسة (المعرّف ووقت البدء) محفوظان في قاعدة البيانات
///   لا في `SharedPreferences`. القيم القديمة في `SharedPreferences` تُنقل مرةً واحدة
///   عند أول قراءة ثم تُمسح، فلا تسقط الجلسات القائمة عند الترقية.
export class AuthService {
  readonly db: AppDatabase;
  /// هل هذا جهاز فرع؟ (يصله المالك بالمزامنة فلا يُرقّى فيه ولا يُحدَّد.)
  /// `null` ⇒ ليس فرعًا (جهاز مستقل أو إدارة).
  readonly isBranchDevice: (() => Promise<boolean>) | null;

  constructor(
    db: AppDatabase,
    {
      isBranchDevice = null,
    }: {
      readonly isBranchDevice?: (() => Promise<boolean>) | null;
    } = {},
  ) {
    this.db = db;
    this.isBranchDevice = isBranchDevice;
  }

  private async _isBranch(): Promise<boolean> {
    try {
      return (await this.isBranchDevice?.()) ?? false;
    } catch (err) {
      ErrorLogger.log('auth.isBranch', err, err instanceof Error ? err.stack : null);
      return true; // فشلٌ مغلق: لا ترقية إن لم نعرف
    }
  }

  /// يرقّي المدير المحلي الوحيد إلى مالك إن انطبقت الشروط ([OwnerPromotion.run]).
  /// لا يُفشل الدخول أبدًا: عطبٌ هنا يُسجَّل ويُترك.
  private async _promoteOwnerIfDue(): Promise<void> {
    try {
      await OwnerPromotion.run(this.db, { isBranchDevice: await this._isBranch() });
    } catch (err) {
      ErrorLogger.log('auth.ownerPromotion', err, err instanceof Error ? err.stack : null);
    }
  }

  /// لا مالك وأكثر من مدير ⇒ يُنبَّه المديرون ليحدّدوا المالك. (لا في الفروع.)
  async ownerSelectionNeeded(): Promise<boolean> {
    if (await this._isBranch()) return false;
    return OwnerPromotion.needsSelection(this.db);
  }

  /// يؤكّد كلمة مرور المستخدم الحالي دون فتح جلسة ولا عدّ محاولات — لتأكيد
  /// إجراءٍ حسّاس (تحديد المالك).
  async confirmCurrentPassword(password: string): Promise<boolean> {
    const u = this._current;
    if (u === null || password.length === 0) return false;
    const fresh = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(u.id))
      .getSingleOrNull();
    if (fresh === null) return false;
    return PasswordHash.verify(password, fresh.saltHex, fresh.hashHex, fresh.iterations);
  }

  /// يحدّد [userId] مالكًا: مديرٌ حالي، وكلمة مروره تأكيدٌ، وليس جهاز فرع.
  async assignOwner({
    userId,
    confirmPassword,
  }: {
    readonly userId: string;
    readonly confirmPassword: string;
  }): Promise<boolean> {
    const me = this._current;
    if (me === null || !UserRole.isAdmin(me.role)) return false;
    if (await this._isBranch()) return false;
    if (!(await this.confirmCurrentPassword(confirmPassword))) return false;
    const ok = await OwnerPromotion.assign(this.db, {
      userId,
      actorEmail: me.email,
    });
    if (ok && userId === me.id) {
      this._current =
        (await this.db
          .select(this.db.users)
          .where((t) => t.id.equals(me.id))
          .getSingleOrNull()) ?? this._current;
    }
    return ok;
  }

  /// الحد الأدنى لطول كلمة المرور عند إنشاء الحساب أو تغييرها.
  static readonly minPasswordLength = 8;

  /// هل يُنبَّه هذا المستخدم لتغيير كلمة مروره بعد الدخول؟ كلمته أقصر من الحد
  /// الحالي ([minPasswordLength]) أو لا تحقق [PasswordPolicy] — **أيًّا كان دوره**.
  static shouldSuggestPasswordChange({
    role: _role,
    password,
    username = '',
  }: {
    readonly role: string;
    readonly password: string;
    readonly username?: string;
  }): boolean {
    return !PasswordPolicy.ok(password, { username });
  }

  /// بصمة وهمية لمسار «اسم غير موجود» — قيمٌ ثابتة لا سرّ فيها.
  private static readonly _dummySaltHex = '5b1f0c6e9a2d47e38c0b7f14d6a92e53';
  private static readonly _dummyHashHex =
    '3e7a91c4d05b28f6a1c9e4073bd852f6c0a7e19d4b63f58a2d0e91c7b4a6f385';

  /// عدد مرّات الاشتقاق الوهمي — يقرؤه الاختبار ليثبت أن المسارين يشغّلان PBKDF2.
  static dummyVerifications = 0;

  /// دورات الاشتقاق الوهمي: أقلُّ ما تحمله حسابات هذا الجهاز، فيُشبه زمنُ الردّ
  /// على اسمٍ مجهول أسرعَ ردٍّ ممكن على اسمٍ موجود.
  private async _dummyRounds(): Promise<number> {
    const row = await this.db
      .customSelect('SELECT MIN(iterations) AS m FROM users WHERE iterations > 0')
      .getSingleOrNull();
    const rawMin = row?.data['m'];
    const min =
      typeof rawMin === 'number' && Number.isFinite(rawMin) ? Math.trunc(rawMin) : 0;
    if (min < 1) return Pbkdf2.iterations;
    return Math.min(Pbkdf2.iterations, Math.max(Pbkdf2.legacyIterations, min));
  }

  static readonly maxAttempts = 5;
  static readonly lockDurationMs = 3 * 60 * 1000; // AUTHCORE.LOCK_MS = 180000

  /// مدة القفل بحسب مرّاته المتتالية (ملّي ثانية): ٣ ثم ١٥ ثم ٦٠ دقيقة.
  static lockDurationFor(level: number): number {
    if (level <= 1) return AuthService.lockDurationMs;
    if (level === 2) return 15 * 60 * 1000;
    return 60 * 60 * 1000;
  }

  /// مدةٌ بلا قفلٍ جديد تُنسى بعدها المرّات السابقة (24 ساعة).
  static readonly strikeDecayMs = 24 * 60 * 60 * 1000;
  static readonly sessionDurationMs = 12 * 60 * 60 * 1000;

  // مفاتيح التخزين القديم في SharedPreferences — للترحيل والمسح فقط.
  private static readonly _kSessionUser = 'imdad.session.userId';
  private static readonly _kSessionStart = 'imdad.session.startedAt';
  private static readonly _kLockPrefix = 'imdad.auth.lock.';

  // مفاتيح قاعدة البيانات (جدول الإعدادات، محلية فقط: SettingsRepo.localOnlyKeys).
  private static readonly _sessionKey = 'authSession';
  private static readonly _locksKey = 'authLocks';

  /// علامة «الجلسة مفتوحة» داخل صفّ الجلسة.
  static readonly sessionOpenKey = 'open';
  private static readonly _sessionOpen = AuthService.sessionOpenKey;

  private _cur: User | null = null;
  get currentUser(): User | null {
    return this._cur;
  }

  /// المستخدم الحالي — كل تغييرٍ له يُنشر إلى حارس طبقة البيانات ([RepoGuard]).
  private get _current(): User | null {
    return this._cur;
  }
  private set _current(u: User | null) {
    this._cur = u;
    if (u === null) {
      RepoGuard.current = null;
      return;
    }
    const rawPerms = this.permissionsOf(u);
    const normalized: Record<string, Record<string, boolean>> = {};
    for (const [k, val] of Object.entries(rawPerms)) {
      if (val != null && typeof val === 'object' && !Array.isArray(val)) {
        const inner: Record<string, boolean> = {};
        for (const [ak, av] of Object.entries(val as Record<string, unknown>)) {
          inner[ak] = av === true;
        }
        normalized[k] = inner;
      }
    }
    RepoGuard.current = new RepoActor({
      role: u.role,
      permissions: normalized as PermissionMap,
      scope: this.warehouseScopeOf(u),
      sectionBlocked: u.sectionBlocked,
    });
  }

  /// يرتفع كلما تغيّر **دور** المستخدم الحالي أو **حجب أقسامه** في القاعدة.
  readonly userVersion = new ValueNotifier<number>(0);
  private _userWatch: TableUpdateSubscription | null = null;

  private _watchCurrent(): void {
    this._userWatch?.cancel();
    this._userWatch = this.db
      .tableUpdates(TableUpdateQuery.onTable(this.db.users))
      .listen(() => {
        void this._refreshCurrent();
      });
  }

  private async _refreshCurrent(): Promise<void> {
    const me = this._current;
    if (me === null) return;
    const fresh = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(me.id))
      .getSingleOrNull();
    if (fresh === null || this._current?.id !== me.id) return;
    if (fresh.role === me.role && fresh.sectionBlocked === me.sectionBlocked) return;
    this._current = fresh;
    this.userVersion.value++;
  }

  /// يظهر قسم التهيئة ما دام لا يوجد حساب مدير مُهيّأ محليًا.
  async needsBootstrap(): Promise<boolean> {
    const count = await this.db
      .customSelect("SELECT COUNT(*) AS c FROM users WHERE id LIKE 'local-%'")
      .getSingle();
    return Number(count.data['c'] ?? 0) === 0;
  }

  /// هل على هذا الجهاز أي حساب يُدخل به؟
  async hasAnyUser(): Promise<boolean> {
    const count = await this.db
      .customSelect('SELECT COUNT(*) AS c FROM users')
      .getSingle();
    return Number(count.data['c'] ?? 0) > 0;
  }

  async createAdmin({
    username,
    password,
    name = '',
  }: {
    readonly username: string;
    readonly password: string;
    readonly name?: string;
  }): Promise<User> {
    const u = AuthService._normalizeUsername(username);
    AuthService._validateUsername(u);
    AuthService._validatePassword(password, u);
    const q = u.toLowerCase();
    const all = await this.db.select(this.db.users).get();
    const clash = all.some((x) => x.username.toLowerCase() === q);
    if (clash) {
      throw new ArgumentError(`✖ اسم المستخدم «${u}» مستعمل على هذا الجهاز`);
    }
    const ph = await PasswordHash.create(password);
    const id = `local-${u}`;
    const row = UsersCompanion.insert({
      id,
      username: u,
      name: Value.of(name.length === 0 ? u : name),
      email: Value.of(`${u}@imdad.local`),
      role: Value.of('admin'),
      saltHex: Value.of(ph.saltHex),
      hashHex: Value.of(ph.hashHex),
      iterations: Value.of(ph.iterations),
      warehouseScope: Value.of('ALL'),
    });
    await this.db.into(this.db.users).insert(row);
    const user = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(id))
      .getSingle();
    await this._startSession(user);
    return user;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const u = username.trim();
    if (u.length === 0 || password.length === 0) {
      return new AuthResult({
        status: AuthStatus.badCredentials,
        message: '✖ أدخل اسم المستخدم وكلمة المرور',
      });
    }
    const user = u.includes('@') ? u.split('@')[0] : u;
    const lockKey = user.toLowerCase();
    const st = await this._lockRead(lockKey);
    const now = Date.now();
    if (st.until > now) {
      const remaining = st.until - now;
      return new AuthResult({
        status: AuthStatus.locked,
        lockRemainingMs: remaining,
        message: `⏳ تم قفل الدخول مؤقتًا بسبب محاولات كثيرة. حاول بعد ${AuthService._fmt(remaining)}`,
      });
    }

    const found = await this._findAccount(u, user);
    let ok: boolean;
    if (found !== null) {
      ok = await PasswordHash.verify(password, found.saltHex, found.hashHex, found.iterations);
    } else {
      AuthService.dummyVerifications++;
      await PasswordHash.verify(
        password,
        AuthService._dummySaltHex,
        AuthService._dummyHashHex,
        await this._dummyRounds(),
      );
      ok = false;
    }

    if (!ok) {
      return this._failed(lockKey, st, now, { action: 'auth.login_failed' });
    }

    if (found === null) {
      return new AuthResult({ status: AuthStatus.badCredentials });
    }
    if (!found.active || !found.approved) {
      await this._audit(
        'auth.login_denied',
        `رُفض دخول «${found.username}» — الحساب ${found.active ? 'غير معتمد' : 'موقوف'}`,
        {
          details: { username: found.username },
          actorEmail: found.email,
        },
      );
    }
    if (!found.active) {
      return new AuthResult({
        status: AuthStatus.inactive,
        message: '✖ الحساب غير مفعّل — اطلب من مدير النظام تفعيل حسابك',
      });
    }
    if (!found.approved) {
      return new AuthResult({
        status: AuthStatus.notApproved,
        message: '✖ الحساب غير معتمد بعد — انتظر اعتماد المدير',
      });
    }

    await this._lockStore(lockKey, new LockState(0, 0));
    await this._promoteOwnerIfDue();
    const fresh =
      (await this.db
        .select(this.db.users)
        .where((t) => t.id.equals(found.id))
        .getSingleOrNull()) ?? found;
    const account = await this._upgradeHash(fresh, password);
    await this._startSession(account);
    await this._audit('auth.login', `دخول «${account.username}»`, {
      details: { username: account.username, method: 'password' },
      actorEmail: account.email,
    });
    return new AuthResult({
      status: AuthStatus.ok,
      user: account,
      message: '🌐 تم الدخول محليًا (بدون إنترنت)',
    });
  }

  /// يتحقّق من بيانات دخول **مستخدمٍ آخر** دون أن يبدّل الجلسة — لتفويض الآمر
  /// على جلسة أمين المخزن (رقابة مزدوجة: من ينفّذ غير من يجيز).
  async verifySigner(
    username: string,
    password: string,
    { purpose = '' }: { readonly purpose?: string } = {},
  ): Promise<AuthResult> {
    const u = username.trim();
    if (u.length === 0 || password.length === 0) {
      return new AuthResult({
        status: AuthStatus.badCredentials,
        message: '✖ أدخل اسم الآمر وكلمة مروره',
      });
    }
    const user = u.includes('@') ? u.split('@')[0] : u;
    const lockKey = user.toLowerCase();
    const st = await this._lockRead(lockKey);
    const now = Date.now();
    if (st.until > now) {
      const remaining = st.until - now;
      return new AuthResult({
        status: AuthStatus.locked,
        lockRemainingMs: remaining,
        message: `⏳ قُفل هذا الحساب مؤقتًا بسبب محاولات كثيرة. حاول بعد ${AuthService._fmt(remaining)}`,
      });
    }
    const found = await this._findAccount(u, user);
    let ok: boolean;
    if (found !== null) {
      ok = await PasswordHash.verify(password, found.saltHex, found.hashHex, found.iterations);
    } else {
      AuthService.dummyVerifications++;
      await PasswordHash.verify(
        password,
        AuthService._dummySaltHex,
        AuthService._dummyHashHex,
        await this._dummyRounds(),
      );
      ok = false;
    }
    if (!ok || found === null) {
      return this._failed(lockKey, st, now, { action: 'auth.signer_failed' });
    }
    if (!found.active || !found.approved) {
      return new AuthResult({
        status: AuthStatus.inactive,
        message: '✖ حساب الآمر موقوف أو غير معتمد',
      });
    }
    await this._lockStore(lockKey, new LockState(0, 0));
    await this._audit(
      'auth.signer_verified',
      `أجاز «${found.username}» ${purpose.length === 0 ? 'إجراءً' : purpose} على جلسة «${this._current?.username ?? ''}»`,
      {
        details: {
          signer: found.username,
          session: this._current?.username ?? '',
          purpose,
        },
        risk: AuditRepo.riskHigh,
        actorEmail: found.email,
      },
    );
    return new AuthResult({
      status: AuthStatus.ok,
      user: found,
      message: '✔ تحقّق الآمر',
    });
  }

  /// الحساب الذي يُصادَق باسم [user] (أو بريد [raw]) — ترتيب [login] نفسه.
  private async _findAccount(raw: string, user: string): Promise<User | null> {
    let matches = await this.db
      .select(this.db.users)
      .where((t) => t.username.equals(user))
      .get();
    if (matches.length === 0) {
      const all = await this.db.select(this.db.users).get();
      const q = user.toLowerCase();
      const rawLower = raw.toLowerCase();
      matches = all.filter(
        (x) => x.username.toLowerCase() === q || x.email.toLowerCase() === rawLower,
      );
    }
    if (matches.length > 1) {
      matches.sort((a, b) => {
        const local =
          (b.id.startsWith('local-') ? 1 : 0) - (a.id.startsWith('local-') ? 1 : 0);
        if (local !== 0) return local;
        const bAt = (b.updatedAt ?? b.createdAt).getTime();
        const aAt = (a.updatedAt ?? a.createdAt).getTime();
        if (bAt !== aAt) return bAt - aAt;
        return a.id.localeCompare(b.id);
      });
    }
    return matches.length === 0 ? null : matches[0];
  }

  private async _failed(
    lockKey: string,
    st: LockState,
    now: number,
    { action }: { readonly action: string },
  ): Promise<AuthResult> {
    const decayed = st.lastLockAt > 0 && now - st.lastLockAt > AuthService.strikeDecayMs;
    const strikes = decayed ? 0 : st.strikes;
    const lastLockAt = decayed ? 0 : st.lastLockAt;
    let ns: LockState;
    let durationMs = 0;
    if (st.fails + 1 >= AuthService.maxAttempts) {
      durationMs = AuthService.lockDurationFor(strikes + 1);
      ns = new LockState(0, now + durationMs, strikes + 1, now);
    } else {
      ns = new LockState(st.fails + 1, 0, strikes, lastLockAt);
    }
    await this._lockStore(lockKey, ns);
    if (ns.until > now) {
      const durationMinutes = Math.floor(durationMs / 60_000);
      const decayHours = Math.floor(AuthService.strikeDecayMs / (60 * 60 * 1000));
      await this._audit(
        'auth.locked',
        `قُفل الدخول باسم «${lockKey}» ${durationMinutes} دقيقة بعد ${AuthService.maxAttempts} محاولات فاشلة` +
          (ns.strikes > 1 ? ` (القفل رقم ${ns.strikes} خلال ${decayHours} ساعة)` : ''),
        {
          details: { username: lockKey, level: ns.strikes, minutes: durationMinutes },
          risk: AuditRepo.riskHigh,
        },
      );
      return new AuthResult({
        status: AuthStatus.locked,
        lockRemainingMs: durationMs,
        message: `⛔ كثير جدًا من المحاولات — قُفل الدخول لهذا المستخدم ${AuthService._fmt(durationMs)}.`,
      });
    }
    await this._audit(
      action,
      `محاولة دخول فاشلة باسم «${lockKey}» (${ns.fails}/${AuthService.maxAttempts})`,
      {
        details: { username: lockKey, attempt: ns.fails },
      },
    );
    return new AuthResult({
      status: AuthStatus.badCredentials,
      attemptsLeft: AuthService.maxAttempts - ns.fails,
      message: `✖ اسم المستخدم أو كلمة المرور غير صحيحة (${ns.fails}/${AuthService.maxAttempts})`,
    });
  }

  private async _audit(
    action: string,
    summary: string,
    {
      details = {},
      risk = AuditRepo.riskNormal,
      actorEmail = '',
    }: {
      readonly details?: Record<string, unknown>;
      readonly risk?: string;
      readonly actorEmail?: string;
    } = {},
  ): Promise<void> {
    try {
      await new AuditRepo(this.db).log({
        action,
        entityType: 'جلسة',
        summary,
        details,
        risk,
        actorEmail,
      });
    } catch (err) {
      ErrorLogger.log('auth.audit', err, err instanceof Error ? err.stack : null);
    }
  }

  /// فكّ قفل الخمول لصاحب الجلسة الحالية **بمعرّفه** (M-13).
  async unlock(password: string): Promise<AuthResult> {
    const me = this._current;
    if (me === null) {
      return new AuthResult({
        status: AuthStatus.badCredentials,
        message: '✖ لا جلسة مفتوحة',
      });
    }
    if (password.length === 0) {
      return new AuthResult({
        status: AuthStatus.badCredentials,
        message: '✖ أدخل كلمة المرور',
      });
    }
    const lockKey = me.username.toLowerCase();
    const st = await this._lockRead(lockKey);
    const now = Date.now();
    if (st.until > now) {
      const remaining = st.until - now;
      return new AuthResult({
        status: AuthStatus.locked,
        lockRemainingMs: remaining,
        message: `⏳ تم قفل الدخول مؤقتًا بسبب محاولات كثيرة. حاول بعد ${AuthService._fmt(remaining)}`,
      });
    }
    const fresh = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(me.id))
      .getSingleOrNull();
    if (fresh === null || !fresh.active) {
      return new AuthResult({
        status: AuthStatus.inactive,
        message: '✖ الحساب غير مفعّل أو حُذف — سجّل الدخول من جديد',
      });
    }
    const ok = await PasswordHash.verify(password, fresh.saltHex, fresh.hashHex, fresh.iterations);
    if (!ok) {
      return this._failed(lockKey, st, now, { action: 'auth.unlock_failed' });
    }
    await this._lockStore(lockKey, new LockState(0, 0));
    this._current = fresh;
    await this._audit('auth.unlock', `فكّ «${fresh.username}» قفل الخمول`, {
      details: { username: fresh.username },
      actorEmail: fresh.email,
    });
    return new AuthResult({
      status: AuthStatus.ok,
      user: fresh,
      message: '✔ فُتح القفل',
    });
  }

  /// يفتح جلسةً لمستخدمٍ تحقّق منه مسارٌ آخر غير كلمة المرور (البصمة).
  async startSessionFor(user: User): Promise<AuthResult> {
    if (!user.active) {
      return new AuthResult({
        status: AuthStatus.inactive,
        message: '✖ الحساب غير مفعّل — اطلب من مدير النظام تفعيل حسابك',
      });
    }
    if (!user.approved) {
      return new AuthResult({
        status: AuthStatus.notApproved,
        message: '✖ الحساب غير معتمد بعد — انتظر اعتماد المدير',
      });
    }
    await this._startSession(user);
    await this._audit('auth.login', `دخول «${user.username}» بالبصمة`, {
      details: { username: user.username, method: 'biometric' },
      actorEmail: user.email,
    });
    return new AuthResult({
      status: AuthStatus.ok,
      user,
      message: '🌐 تم الدخول بالبصمة',
    });
  }

  private async _upgradeHash(user: User, password: string): Promise<User> {
    if (!PasswordHash.needsUpgrade(user.iterations)) return user;
    try {
      const ph = await PasswordHash.create(password);
      await this.db
        .update(this.db.users)
        .where((t) => t.id.equals(user.id).and(t.hashHex.equals(user.hashHex)))
        .write(
          UsersCompanion({
            saltHex: Value.of(ph.saltHex),
            hashHex: Value.of(ph.hashHex),
            iterations: Value.of(ph.iterations),
            updatedAt: Value.of(new Date()),
          }),
        );
      await new UsersRepo(this.db).resign(user.id);
      return (
        (await this.db
          .select(this.db.users)
          .where((t) => t.id.equals(user.id))
          .getSingleOrNull()) ?? user
      );
    } catch (err) {
      ErrorLogger.log('auth.hashUpgrade', err, err instanceof Error ? err.stack : null);
      return user;
    }
  }

  private async _lockRead(user: string): Promise<LockState> {
    const repo = new SettingsRepo(this.db);
    const locks = await repo.read(AuthService._locksKey);
    const inDb = locks[user];
    if (inDb != null && typeof inDb === 'object' && !Array.isArray(inDb)) {
      return LockState.fromMap(inDb as Record<string, unknown>);
    }

    const prefs = await SharedPreferences.getInstance();
    const legacyRaw = prefs.getString(`${AuthService._kLockPrefix}${user}`);
    if (legacyRaw === null) return new LockState(0, 0);
    let legacy = new LockState(0, 0);
    try {
      const decoded: unknown = JSON.parse(legacyRaw);
      if (decoded != null && typeof decoded === 'object' && !Array.isArray(decoded)) {
        legacy = LockState.fromMap(decoded as Record<string, unknown>);
      }
    } catch (err) {
      ErrorLogger.log('auth.legacyLock', err, err instanceof Error ? err.stack : null);
    }
    locks[user] = legacy.toMap();
    await repo.write(AuthService._locksKey, locks);
    await prefs.remove(`${AuthService._kLockPrefix}${user}`);
    return legacy;
  }

  private async _lockStore(user: string, s: LockState): Promise<void> {
    const repo = new SettingsRepo(this.db);
    const locks = await repo.read(AuthService._locksKey);
    if (s.fails === 0 && s.until === 0 && s.strikes === 0) {
      delete locks[user];
    } else {
      locks[user] = s.toMap();
    }
    await repo.write(AuthService._locksKey, locks);
    const prefs = await SharedPreferences.getInstance();
    await prefs.remove(`${AuthService._kLockPrefix}${user}`);
  }

  private async _readSession(): Promise<{
    readonly id: string;
    readonly startedAt: number;
    readonly open: boolean;
  } | null> {
    const repo = new SettingsRepo(this.db);
    const map = await repo.read(AuthService._sessionKey);
    const id = map['userId'];
    const at = map['startedAt'];
    if (
      typeof id === 'string' &&
      id.length > 0 &&
      typeof at === 'number' &&
      Number.isFinite(at)
    ) {
      return {
        id,
        startedAt: Math.trunc(at),
        open: map[AuthService._sessionOpen] === true,
      };
    }

    const prefs = await SharedPreferences.getInstance();
    const legacyId = prefs.getString(AuthService._kSessionUser);
    const legacyAt = prefs.getInt(AuthService._kSessionStart);
    if (legacyId === null || legacyAt === null) return null;
    await repo.write(AuthService._sessionKey, {
      userId: legacyId,
      startedAt: legacyAt,
    });
    await this._clearLegacySession(prefs);
    return { id: legacyId, startedAt: legacyAt, open: false };
  }

  private async _clearLegacySession(prefs: SharedPreferences): Promise<void> {
    await prefs.remove(AuthService._kSessionUser);
    await prefs.remove(AuthService._kSessionStart);
  }

  /// هل انتهت مدة الجلسة (12 ساعة) أو أُوقف الحساب؟ تُستدعى دوريًا والتطبيق مفتوح.
  async sessionExpired(): Promise<boolean> {
    const cur = this._current;
    if (cur === null) return true;
    const session = await this._readSession();
    if (session === null) return true;
    if (Date.now() - session.startedAt >= AuthService.sessionDurationMs) return true;
    const rows = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(cur.id))
      .get();
    return rows.length === 0 || !rows[0].active;
  }

  /// يستعيد جلسةً سارية، أو `null` فتُطلب كلمة المرور.
  async restoreSession(): Promise<User | null> {
    await this._promoteOwnerIfDue();
    const session = await this._readSession();
    if (session === null) return null;
    const id = session.id;
    const started = new Date(session.startedAt);
    if (session.open) {
      await this.logout();
      await this._auditUncleanExit(id, started);
      return null;
    }
    if (Date.now() - session.startedAt >= AuthService.sessionDurationMs) {
      await this.logout();
      return null;
    }
    const rows = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(id))
      .get();
    if (rows.length === 0 || !rows[0].active) {
      await this.logout();
      return null;
    }
    this._current = rows[0];
    this._watchCurrent();
    return this._current;
  }

  async logout(): Promise<void> {
    const leaving = this._current;
    if (leaving !== null) {
      await this._audit('auth.logout', `خروج «${leaving.username}»`, {
        details: { username: leaving.username },
        actorEmail: leaving.email,
      });
    }
    this._userWatch?.cancel();
    this._userWatch = null;
    this._current = null;
    await new SettingsRepo(this.db).write(AuthService._sessionKey, {});
    await this._clearLegacySession(await SharedPreferences.getInstance());
  }

  private async _auditUncleanExit(userId: string, startedAt: Date): Promise<void> {
    try {
      const row = await this.db
        .select(this.db.users)
        .where((t) => t.id.equals(userId))
        .getSingleOrNull();
      await new AuditRepo(this.db).log({
        action: 'auth.session.unclean',
        entityType: 'جلسة',
        summary: `أُسقطت جلسة «${row?.username ?? userId}» لأن التطبيق أُنهي بلا إغلاق نظيف — تُطلب كلمة المرور`,
        details: { userId, startedAt: startedAt.toISOString() },
        actorEmail: row?.email ?? '',
      });
    } catch (err) {
      ErrorLogger.log(
        'auth.uncleanExitAudit',
        err,
        err instanceof Error ? err.stack : null,
      );
    }
  }

  private async _startSession(user: User): Promise<void> {
    this._current = user;
    this._watchCurrent();
    await new SettingsRepo(this.db).write(AuthService._sessionKey, {
      userId: user.id,
      startedAt: Date.now(),
      [AuthService._sessionOpen]: true,
    });
    await this._clearLegacySession(await SharedPreferences.getInstance());
  }

  /// صلاحيات المستخدم الحالي، مخزَّنةً JSON.
  permissionsOf(user: User): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(user.permissions);
      return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  can(user: User, page: string, action = 'view'): boolean {
    if (SysPerm.isSys(page)) return UserRole.isOwner(user.role);
    if (
      SectionBlock.blocksPage({
        role: user.role,
        blockedJson: user.sectionBlocked,
        page,
      })
    ) {
      return false;
    }
    if (UserRole.isAdmin(user.role)) return true;
    const perms = this.permissionsOf(user);
    const pageMap =
      perms[page] != null && typeof perms[page] === 'object' && !Array.isArray(perms[page])
        ? (perms[page] as Record<string, unknown>)
        : null;
    return AccessControl.allows(pageMap, action);
  }

  /// نطاق المستودعات: `null` ⇒ كل المستودعات (المدير أو `ALL`)، وإلا قائمة أسماء.
  /// التالف يُرجع قائمةً فارغة (فشل مغلق) — انظر [parseWarehouseScope].
  warehouseScopeOf(user: User): string[] | null {
    if (UserRole.isAdmin(user.role)) return null;
    return parseWarehouseScope(user.warehouseScope, { source: 'auth.warehouseScope' });
  }

  private static _normalizeUsername(v: string): string {
    return v.trim();
  }

  private static _validateUsername(v: string): void {
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(v)) {
      throw new ArgumentError(
        '✖ اسم المستخدم: 3-20 حرفًا إنجليزيًا/أرقام/نقطة/شرطة سفلية',
      );
    }
  }

  private static _validatePassword(v: string, username = ''): void {
    const why = PasswordPolicy.problem(v, { username });
    if (why !== null) throw new ArgumentError(`✖ ${why}`);
  }

  private static _fmt(ms: number): string {
    const s = Math.ceil(ms / 1000);
    return s < 60 ? `${s} ثانية` : `${Math.ceil(s / 60)} دقيقة`;
  }
}

export const AuthServiceContext = createContext<AuthService | null>(null);

export function AuthServiceProvider({
  value,
  children,
}: {
  readonly value: AuthService | null;
  readonly children?: ReactNode;
}) {
  return createElement(AuthServiceContext.Provider, { value }, children);
}

export function useAuthService(): AuthService | null {
  return useContext(AuthServiceContext);
}
