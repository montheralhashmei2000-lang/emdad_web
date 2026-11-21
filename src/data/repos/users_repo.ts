import { ErrorLogger } from '../../core/error_log';
import { DeviceActivation } from '../../core/security/device_activation';
import { OwnerSignature } from '../../core/security/owner_signature';
import { PasswordHash } from '../../core/security/password_hash';
import { parseWarehouseScope } from '../../core/security/warehouse_scope';
import { AccessControl, UserRole, type PermissionMap } from '../../domain/access_control';
import { PasswordPolicy } from '../../domain/password_policy';
import { SectionBlock } from '../../domain/section_block';
import type { AppDatabase } from '../db/app_database';
import { Value } from '../db/sqlite_driver';
import { UsersCompanion, type User } from '../db/tables/core_tables';
import { AuditRepo } from './audit_repo';

export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentError';
  }
}

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

/// نتيجة `UsersRepo.setSectionBlocked`.
export class SectionBlockResult {
  readonly changed: boolean;
  readonly added: ReadonlySet<string>;
  readonly removed: ReadonlySet<string>;
  /// وُقِّع فكُّ الحجب بمفتاح المالك (فينتشر بالمزامنة).
  readonly signed: boolean;
  /// فُكّ حجبٌ **محليًّا** بلا توقيع: لن ينتشر للأجهزة الأخرى حتى يُوقَّع من جهاز الإدارة.
  readonly unsignedUnblock: boolean;

  constructor({
    changed = false,
    added = new Set<string>(),
    removed = new Set<string>(),
    signed = false,
    unsignedUnblock = false,
  }: {
    readonly changed?: boolean;
    readonly added?: ReadonlySet<string>;
    readonly removed?: ReadonlySet<string>;
    readonly signed?: boolean;
    readonly unsignedUnblock?: boolean;
  } = {}) {
    this.changed = changed;
    this.added = added;
    this.removed = removed;
    this.signed = signed;
    this.unsignedUnblock = unsignedUnblock;
  }
}

/// إدارة المستخدمين والأدوار ونطاق المستودعات.
/// كل عمليات هذه الفئة مقصورة على من يملك صلاحية إدارة المستخدمين —
/// الشاشة هي التي تفرض ذلك قبل استدعائها، ولا تُعرض لغيرهم أصلًا.
export class UsersRepo {
  constructor(readonly db: AppDatabase) {}

  /// كل الحسابات بلا فرز — لشاشات التحليل.
  allUsers(): Promise<User[]> {
    return this.db.select(this.db.users).get();
  }

  byId(id: string): Promise<User | null> {
    return this.db
      .select(this.db.users)
      .where((t) => t.id.equals(id))
      .getSingleOrNull();
  }

  /// يعتمد حسابًا معلَّقًا (التوقيع/التدقيق على المستدعي كما كان في الشاشة).
  async markApproved(id: string): Promise<void> {
    await this.db
      .update(this.db.users)
      .where((t) => t.id.equals(id))
      .write(UsersCompanion({ approved: Value.of(true) }));
  }

  async users(): Promise<User[]> {
    const rows = await this.db.select(this.db.users).get();
    rows.sort((a, b) => (a.username < b.username ? -1 : a.username > b.username ? 1 : 0));
    return rows;
  }

  static rolesOf(user: User): string[] {
    try {
      const v: unknown = JSON.parse(user.roles);
      if (Array.isArray(v)) {
        return v.map((e) => String(e));
      }
    } catch (err) {
      ErrorLogger.log('users.rolesJson', err, err instanceof Error ? err.stack : undefined);
    }
    return [];
  }

  /// نطاق المستودعات: `null` ⇒ كل المستودعات. التالف يُرجع قائمةً فارغة
  /// (فشل مغلق) — انظر `parseWarehouseScope`.
  static scopeOf(user: User): string[] | null {
    return parseWarehouseScope(user.warehouseScope, { source: 'users.scopeJson' });
  }

  static scopeLabel(user: User): string {
    const scope = UsersRepo.scopeOf(user);
    if (UserRole.isAdmin(user.role)) return `كل المستودعات (${UserRole.label(user.role)})`;
    if (scope === null) return 'كل المستودعات';
    return scope.length === 0 ? 'بدون مستودعات' : scope.join('، ');
  }

  /// صلاحيات مشتقة من قوالب الأدوار المختارة.
  static permissionsForRoles(roleIds: readonly string[]): PermissionMap {
    const list: PermissionMap[] = [];
    for (const id of roleIds) {
      const role = AccessControl.roles[id];
      if (role) list.push(role.permissions);
    }
    return AccessControl.merge(list);
  }

  private static _requireActor(
    actorRole: string | null | undefined,
    { owner = false, why = '' }: { readonly owner?: boolean; readonly why?: string } = {},
  ): void {
    if (actorRole == null) return;
    const ok = owner ? UserRole.isOwner(actorRole) : UserRole.isAdmin(actorRole);
    if (!ok) {
      throw new ArgumentError(
        owner
          ? `✖ هذا الإجراء للمالك وحده${why.length === 0 ? '' : ` — ${why}`}`
          : '✖ لا تملك صلاحية إدارة الحسابات',
      );
    }
  }

  async createUser({
    username,
    password,
    name,
    roleIds = [],
    permissions = null,
    warehouseScope = null,
    isAdmin = false,
    actorEmail = '',
    actorRole = null,
    activation = null,
  }: {
    readonly username: string;
    readonly password: string;
    readonly name: string;
    readonly roleIds?: readonly string[];
    readonly permissions?: PermissionMap | null;
    readonly warehouseScope?: readonly string[] | null;
    readonly isAdmin?: boolean;
    readonly actorEmail?: string;
    readonly actorRole?: string | null;
    readonly activation?: DeviceActivation | null;
  }): Promise<string> {
    UsersRepo._requireActor(actorRole);
    if (actorRole != null && !UserRole.isOwner(actorRole)) {
      if (isAdmin) {
        UsersRepo._requireActor(actorRole, { owner: true, why: 'منح دور مدير النظام' });
      }
      if (permissions != null) {
        UsersRepo._requireActor(actorRole, { owner: true, why: 'تخصيص الصلاحيات' });
      }
      if (warehouseScope != null) {
        UsersRepo._requireActor(actorRole, { owner: true, why: 'تحديد نطاق المستودعات' });
      }
      if (roleIds.some((r) => !Object.prototype.hasOwnProperty.call(AccessControl.roles, r))) {
        throw new ArgumentError('✖ قالب صلاحيات غير معروف');
      }
    }

    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(u)) {
      throw new ArgumentError('اسم المستخدم بالإنجليزية أو الأرقام أو النقاط، 3 أحرف فأكثر');
    }
    const weak = PasswordPolicy.problem(password, { username: u });
    if (weak !== null) throw new ArgumentError(weak);

    const exists = await this.db
      .select(this.db.users)
      .where((t) => t.username.equals(u))
      .get();
    if (exists.length > 0) throw new ArgumentError('اسم المستخدم مستخدم بالفعل');

    const ph = await PasswordHash.create(password);
    const id = `local-${u}`;
    await this.db.into(this.db.users).insert(
      UsersCompanion.insert({
        id,
        username: u,
        name: Value.of(name.trim().length === 0 ? u : name.trim()),
        email: Value.of(`${u}@imdad.local`),
        role: Value.of(isAdmin ? 'admin' : 'user'),
        roles: Value.of(JSON.stringify(roleIds)),
        permissions: Value.of(JSON.stringify(permissions ?? UsersRepo.permissionsForRoles(roleIds))),
        warehouseScope: Value.of(warehouseScope == null ? 'ALL' : JSON.stringify(warehouseScope)),
        saltHex: Value.of(ph.saltHex),
        hashHex: Value.of(ph.hashHex),
        iterations: Value.of(ph.iterations),
        // مديرٌ جديد يُختم بثوانٍ كاملة ليُوقَّع دورُه (بصمة التوقيع تضمّ `updatedAt`).
        updatedAt: isAdmin
          ? Value.of(new Date(OwnerSignature.seconds(new Date()) * 1000))
          : Value.absent(),
      }),
    );

    if (isAdmin) {
      await this.resign(id, { activation, actorEmail });
    }

    await new AuditRepo(this.db).log({
      action: 'user.create',
      entityType: 'مستخدم',
      summary: `إنشاء حساب «${u}»${isAdmin ? ' بصلاحيات مدير نظام' : ''}`,
      details: { username: u, roles: roleIds, admin: isAdmin, scope: warehouseScope },
      risk: isAdmin ? AuditRepo.riskHigh : AuditRepo.riskNormal,
      actorEmail,
    });
    return id;
  }

  async updateUser({
    id,
    name = null,
    roleIds = null,
    permissions = null,
    warehouseScope = null,
    allWarehouses = null,
    isAdmin = null,
    active = null,
    actorEmail = '',
    actorRole = null,
  }: {
    readonly id: string;
    readonly name?: string | null;
    readonly roleIds?: readonly string[] | null;
    readonly permissions?: PermissionMap | null;
    readonly warehouseScope?: readonly string[] | null;
    readonly allWarehouses?: boolean | null;
    readonly isAdmin?: boolean | null;
    readonly active?: boolean | null;
    readonly actorEmail?: string;
    readonly actorRole?: string | null;
  }): Promise<void> {
    UsersRepo._requireActor(actorRole);
    const target = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(id))
      .getSingleOrNull();
    if (target !== null && UserRole.isOwner(target.role)) {
      if (isAdmin !== null) throw new ArgumentError('✖ حساب المالك لا يتغيّر دوره');
      if (active === false) throw new ArgumentError('✖ حساب المالك لا يُعطَّل');
    }
    if (actorRole != null && !UserRole.isOwner(actorRole)) {
      if (target !== null && UserRole.isAdmin(target.role)) {
        throw new ArgumentError('✖ لا يعدّل حسابَ مديرٍ أو مالكٍ إلا المالك');
      }
      if (isAdmin !== null) {
        UsersRepo._requireActor(actorRole, { owner: true, why: 'تغيير دور الحساب' });
      }
      if (permissions !== null) {
        UsersRepo._requireActor(actorRole, { owner: true, why: 'تعديل مصفوفة الصلاحيات' });
      }
      if (allWarehouses !== null || warehouseScope !== null) {
        UsersRepo._requireActor(actorRole, { owner: true, why: 'تعديل نطاق المستودعات' });
      }
      if (active === false) {
        UsersRepo._requireActor(actorRole, { owner: true, why: 'تعطيل الحسابات' });
      }
    }

    await this.db
      .update(this.db.users)
      .where((t) => t.id.equals(id))
      .write(
        UsersCompanion({
          name: name == null ? Value.absent() : Value.of(name),
          roles: roleIds == null ? Value.absent() : Value.of(JSON.stringify(roleIds)),
          permissions: permissions == null ? Value.absent() : Value.of(JSON.stringify(permissions)),
          warehouseScope:
            allWarehouses === true
              ? Value.of('ALL')
              : warehouseScope == null
                ? Value.absent()
                : Value.of(JSON.stringify(warehouseScope)),
          role: isAdmin == null ? Value.absent() : Value.of(isAdmin ? 'admin' : 'user'),
          active: active == null ? Value.absent() : Value.of(active),
          updatedAt: Value.of(new Date()),
        }),
      );

    await this.resign(id, { actorEmail });

    await new AuditRepo(this.db).log({
      action: 'user.update',
      entityType: 'مستخدم',
      summary: `تعديل صلاحيات أو نطاق الحساب ${id}`,
      details: {
        roles: roleIds,
        admin: isAdmin,
        allWarehouses,
        scope: warehouseScope,
        active,
      },
      risk: isAdmin === true ? AuditRepo.riskHigh : AuditRepo.riskNormal,
      actorEmail,
    });
  }

  /// تعيين كلمة مرور الحساب `id` — **بفحص المنفِّذ** (M-12).
  async resetPassword({
    id,
    password,
    actorId,
    actorRole,
    actorEmail = '',
  }: {
    readonly id: string;
    readonly password: string;
    readonly actorId: string;
    readonly actorRole: string;
    readonly actorEmail?: string;
  }): Promise<void> {
    const target = await this.byId(id);
    if (target === null) throw new StateError('الحساب غير موجود');
    const weak = PasswordPolicy.problem(password, { username: target.username });
    if (weak !== null) throw new ArgumentError(weak);

    const self = actorId === id;
    if (!self) {
      if (!UserRole.isAdmin(actorRole)) {
        throw new StateError('إعادة تعيين كلمة مرور غيرك للمدير وحده');
      }
      if (UserRole.isAdmin(target.role) && !UserRole.isOwner(actorRole)) {
        throw new StateError('كلمة مرور مديرٍ أو مالك لا يعيد تعيينها إلا المالك');
      }
    }

    const ph = await PasswordHash.create(password);
    await this.db
      .update(this.db.users)
      .where((t) => t.id.equals(id))
      .write(
        UsersCompanion({
          saltHex: Value.of(ph.saltHex),
          hashHex: Value.of(ph.hashHex),
          iterations: Value.of(ph.iterations),
          failedAttempts: Value.of(0),
          lockedUntil: Value.of<Date | null>(null),
          updatedAt: Value.of(new Date()),
        }),
      );

    await this.resign(id);
    if (!self) {
      await new AuditRepo(this.db).log({
        action: 'user.password_reset',
        entityType: 'مستخدم',
        summary: `أُعيد تعيين كلمة مرور «${target.username}»`,
        details: { userId: id, username: target.username },
        risk: AuditRepo.riskHigh,
        actorEmail,
      });
    }
  }

  /// يجدّد توقيعات المالك على حسابٍ بعد أن تغيّر `updatedAt`.
  async resign(
    id: string,
    {
      activation = null,
      actorEmail = '',
    }: { readonly activation?: DeviceActivation | null; readonly actorEmail?: string } = {},
  ): Promise<boolean> {
    const act = activation ?? new DeviceActivation(this.db);
    if (!(await act.canIssue())) return false;
    const row = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(id))
      .getSingleOrNull();
    const stamp = row?.updatedAt ?? null;
    if (row === null || stamp === null) return false;

    const sec = OwnerSignature.seconds(stamp);
    const sigs: Record<string, string> = { ...OwnerSignature.parse(row.ownerSig) };
    const purposes: string[] = [];

    const vouched =
      OwnerSignature.rank(row.role) > 0 ||
      Object.prototype.hasOwnProperty.call(sigs, OwnerSignature.roleKey);

    if (vouched) {
      const r = await OwnerSignature.signRole(act, {
        userId: id,
        role: row.role,
        updatedAtSec: sec,
      });
      if (r !== null) {
        sigs[OwnerSignature.roleKey] = r;
        purposes.push('role');
      }
    }
    if (vouched) {
      const c = await OwnerSignature.signCreds(act, {
        userId: id,
        role: row.role,
        saltHex: row.saltHex,
        hashHex: row.hashHex,
        permissions: row.permissions,
        warehouseScope: row.warehouseScope,
        active: row.active,
        approved: row.approved,
        updatedAtSec: sec,
      });
      if (c !== null) {
        sigs[OwnerSignature.credsKey] = c;
        purposes.push('creds');
      }
    }
    if (Object.prototype.hasOwnProperty.call(sigs, OwnerSignature.sectionsKey)) {
      const s = await OwnerSignature.signSections(act, {
        userId: id,
        blockedJson: row.sectionBlocked,
        updatedAtSec: sec,
      });
      if (s !== null) {
        sigs[OwnerSignature.sectionsKey] = s;
        purposes.push('sections');
      }
    }

    const encoded = OwnerSignature.encode(sigs);
    if (encoded === row.ownerSig) return false;

    await this.db
      .update(this.db.users)
      .where((t) => t.id.equals(id))
      .write(UsersCompanion({ ownerSig: Value.of(encoded) }));

    if (purposes.length > 0) {
      await new AuditRepo(this.db).log({
        action: 'sys.sign.used',
        entityType: 'مستخدم',
        summary: `استُعمل مفتاح المالك الخاص لتجديد توقيع «${row.username}» (${purposes.join('، ')})`,
        details: { purpose: purposes, userId: id },
        risk: AuditRepo.riskHigh,
        actorEmail,
      });
    }
    return true;
  }

  /// يوقّع كل المديرين والمالكين الحاليين بمفتاح المالك.
  async signPrivilegedUsers({
    actorRole = null,
    actorEmail = '',
    activation = null,
  }: {
    readonly actorRole?: string | null;
    readonly actorEmail?: string;
    readonly activation?: DeviceActivation | null;
  } = {}): Promise<number> {
    UsersRepo._requireActor(actorRole, { owner: true, why: 'توقيع المديرين' });
    let n = 0;
    for (const u of await this.db.select(this.db.users).get()) {
      if (OwnerSignature.rank(u.role) === 0) continue;
      if (u.updatedAt === null) {
        await this.db
          .update(this.db.users)
          .where((t) => t.id.equals(u.id))
          .write(
            UsersCompanion({
              updatedAt: Value.of(new Date(OwnerSignature.seconds(new Date()) * 1000)),
            }),
          );
      }
      if (await this.resign(u.id, { activation, actorEmail })) n++;
    }
    return n;
  }

  /// يضبط الأقسام المحجوبة عن مستخدم — **للمالك وحده**، ولا يُحجب عن المالك شيء.
  async setSectionBlocked({
    id,
    blocked,
    actorRole = null,
    actorEmail = '',
    activation = null,
  }: {
    readonly id: string;
    readonly blocked: ReadonlySet<string> | Iterable<string>;
    readonly actorRole?: string | null;
    readonly actorEmail?: string;
    readonly activation?: DeviceActivation | null;
  }): Promise<SectionBlockResult> {
    UsersRepo._requireActor(actorRole, { owner: true, why: 'حجب الأقسام' });
    const target = await this.db
      .select(this.db.users)
      .where((t) => t.id.equals(id))
      .getSingleOrNull();
    if (target === null) throw new ArgumentError('✖ المستخدم غير موجود');
    if (UserRole.isOwner(target.role)) throw new ArgumentError('✖ لا يُحجب عن المالك أي قسم');

    const before = SectionBlock.parse(target.sectionBlocked);
    const next = new Set<string>();
    for (const s of blocked) {
      if (SectionBlock.all.includes(s)) next.add(s);
    }

    const added = new Set<string>();
    for (const s of next) {
      if (!before.has(s)) added.add(s);
    }
    const removed = new Set<string>();
    for (const s of before) {
      if (!next.has(s)) removed.add(s);
    }
    if (added.size === 0 && removed.size === 0) {
      return new SectionBlockResult();
    }

    const nextJson = SectionBlock.encode(next);
    const stamp = new Date(OwnerSignature.seconds(new Date()) * 1000);

    const sigs: Record<string, string> = { ...OwnerSignature.parse(target.ownerSig) };
    delete sigs[OwnerSignature.sectionsKey];
    let signed = false;
    if (removed.size > 0) {
      const sig = await OwnerSignature.signSections(activation ?? new DeviceActivation(this.db), {
        userId: id,
        blockedJson: nextJson,
        updatedAtSec: OwnerSignature.seconds(stamp),
      });
      if (sig !== null) {
        sigs[OwnerSignature.sectionsKey] = sig;
        signed = true;
      }
    }

    await this.db
      .update(this.db.users)
      .where((t) => t.id.equals(id))
      .write(
        UsersCompanion({
          sectionBlocked: Value.of(nextJson),
          ownerSig: Value.of(OwnerSignature.encode(sigs)),
          updatedAt: Value.of(stamp),
        }),
      );

    const audit = new AuditRepo(this.db);
    const addedList = [...added].sort();
    const removedList = [...removed].sort();
    if (signed) {
      await audit.log({
        action: 'sys.sign.used',
        entityType: 'مستخدم',
        summary: `استُعمل مفتاح المالك الخاص لتوقيع فكّ حجب أقسام «${target.username}»`,
        details: { purpose: 'sections', userId: id, removed: removedList },
        risk: AuditRepo.riskHigh,
        actorEmail,
      });
    }
    await audit.log({
      action: 'user.section_blocked.changed',
      entityType: 'مستخدم',
      summary:
        `تغيير الأقسام المحجوبة عن «${target.username}»` +
        `${added.size === 0 ? '' : ` — حُجب: ${[...added].map((s) => SectionBlock.labels[s] ?? s).join('، ')}`}` +
        `${removed.size === 0 ? '' : ` — فُكّ: ${[...removed].map((s) => SectionBlock.labels[s] ?? s).join('، ')}`}`,
      details: {
        userId: id,
        added: addedList,
        removed: removedList,
        signed,
        unsignedUnblock: removed.size > 0 && !signed,
      },
      risk: AuditRepo.riskHigh,
      actorEmail,
    });

    if (!signed) {
      await this.resign(id, { activation, actorEmail });
    }
    return new SectionBlockResult({
      changed: true,
      added,
      removed,
      signed,
      unsignedUnblock: removed.size > 0 && !signed,
    });
  }

  /// فك القفل بعد تجاوز محاولات الدخول.
  async unlock(id: string): Promise<void> {
    await this.db
      .update(this.db.users)
      .where((t) => t.id.equals(id))
      .write(
        UsersCompanion({
          failedAttempts: Value.of(0),
          lockedUntil: Value.of<Date | null>(null),
        }),
      );
  }

  /// لا يجوز حذف آخر مدير نظام حتى لا يُغلق النظام على نفسه.
  async deleteUser(
    id: string,
    { actorRole = null, actorEmail = '' }: { readonly actorRole?: string | null; readonly actorEmail?: string } = {},
  ): Promise<boolean> {
    UsersRepo._requireActor(actorRole, { owner: true, why: 'حذف المستخدمين' });
    const rows = await this.db.select(this.db.users).get();
    const target = rows.filter((u) => u.id === id);
    if (target.length === 0) return false;
    if (UserRole.isOwner(target[0].role)) return false;
    if (
      UserRole.isAdmin(target[0].role) &&
      rows.filter((u) => UserRole.isAdmin(u.role)).length <= 1
    ) {
      return false;
    }
    if (UserRole.isAdmin(target[0].role)) {
      await this.db
        .update(this.db.users)
        .where((t) => t.id.equals(id))
        .write(
          UsersCompanion({
            role: Value.of(UserRole.user),
            active: Value.of(false),
            updatedAt: Value.of(new Date()),
          }),
        );
      const signed = await this.resign(id, { actorEmail });
      await new AuditRepo(this.db).log({
        action: 'USER_RETIRED',
        entityType: 'مستخدم',
        summary:
          `تقاعد حساب المدير «${target[0].username}»: عُطِّل وخُفض${signed ? '' : ' (هنا وحده — لا مفتاح مالك على الجهاز)'}؛ ` +
          'يُحذف نهائيًّا بحذفه مرة ثانية بعد المزامنة',
        details: { userId: id, username: target[0].username, signed },
        risk: AuditRepo.riskHigh,
        actorEmail,
      });
      return true;
    }
    await this.db.delete(this.db.users).where((t) => t.id.equals(id)).go();
    return true;
  }
}
