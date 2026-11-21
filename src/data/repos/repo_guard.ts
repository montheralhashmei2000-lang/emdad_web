import {
  AccessControl,
  UserRole,
  type PermissionMap,
} from '../../domain/access_control';

/// مَن يكتب الآن — تنشره `AuthService` عند الدخول والخروج واستعادة الجلسة.
export class RepoActor {
  readonly role: string;
  readonly permissions: PermissionMap;
  /// نطاق المستودعات، `null` = الكل.
  readonly scope: readonly string[] | null;
  readonly sectionBlocked?: string | null;

  constructor({
    role,
    permissions,
    scope,
    sectionBlocked = null,
  }: {
    readonly role: string;
    readonly permissions: PermissionMap;
    readonly scope: readonly string[] | null;
    readonly sectionBlocked?: string | null;
  }) {
    this.role = role;
    this.permissions = permissions;
    this.scope = scope;
    this.sectionBlocked = sectionBlocked;
  }

  get isAdmin(): boolean {
    return UserRole.isAdmin(this.role);
  }

  get isOwner(): boolean {
    return UserRole.isOwner(this.role);
  }
}

/// حارس الصلاحيات **في طبقة البيانات**.
export class RepoGuard {
  private constructor() {}

  static current: RepoActor | null = null;

  /// رسالة الرفض، أو `null` إن جاز. [warehouses] مستودعات الإمداد التي تمسّها
  /// الكتابة؛ [fuelWarehouses] خزّانات المحروقات مع دليلها كاملًا.
  static check(
    page: string,
    {
      warehouses = [],
      fuelWarehouses = [],
      fuelDirectory = [],
    }: {
      readonly warehouses?: Iterable<string>;
      readonly fuelWarehouses?: Iterable<string>;
      readonly fuelDirectory?: Iterable<string>;
    } = {},
  ): string | null {
    const a = RepoGuard.current;
    if (a == null || a.isAdmin) return null;

    const allowed =
      AccessControl.can({
        isAdmin: false,
        isOwner: a.isOwner,
        permissions: a.permissions,
        page,
        sectionBlocked: a.sectionBlocked,
      }) &&
      AccessControl.canManage({
        isAdmin: false,
        permissions: a.permissions,
        page,
      });

    if (!allowed) {
      return `✖ لا تملك صلاحية الكتابة على «${page}»`;
    }

    for (const w of warehouses) {
      if (
        !AccessControl.canUseWarehouse({
          isAdmin: false,
          scope: a.scope,
          warehouse: w,
        })
      ) {
        return `✖ المستودع «${w}» خارج نطاق صلاحياتك — تواصل مع مدير النظام`;
      }
    }

    for (const w of fuelWarehouses) {
      if (
        !AccessControl.canUseFuelWarehouse({
          isAdmin: false,
          scope: a.scope,
          fuelWarehouses: fuelDirectory,
          warehouse: w,
        })
      ) {
        return `✖ الخزّان «${w}» خارج نطاق صلاحياتك — تواصل مع مدير النظام`;
      }
    }

    return null;
  }
}

/// رفضٌ من [RepoGuard] لدالةٍ لا تعيد نتيجةً تحمل الخطأ.
export class RepoDenied extends Error {
  readonly message: string;

  constructor(message: string) {
    super(message);
    this.name = 'RepoDenied';
    this.message = message;
  }

  override toString(): string {
    return this.message;
  }
}
