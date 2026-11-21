import { AccessControl, PermAction, SysPerm, UserRole } from '../../domain/access_control';
import { CableClearance } from '../../domain/cable_clearance';
import { PermCatalog } from '../../domain/perm_catalog';
import { SectionBlock } from '../../domain/section_block';
import { showImdToast } from '../ui/imd_widgets';
import { AuthService, useAuthService } from './auth_service';

/// مساعدات الصلاحيات في الشاشات: فحص إذنٍ واحد، وإدارة صفحة، وحراسة وصول.
export class Perm {
  private readonly _auth: AuthService | null;

  constructor(auth: AuthService | null = null) {
    this._auth = auth;
  }

  /// أسماء الصفحات كما تظهر في رسائل الصلاحية — من [PermCatalog] (المصدر الوحيد)
  /// مضافًا إليها أسماء بنود القائمة التي تتبع صلاحية غيرها.
  static readonly labels: Readonly<Record<string, string>> = {
    ...PermCatalog.aliasLabels,
    ...PermCatalog.labels,
  };

  static of(auth: AuthService | null = null): Perm {
    return new Perm(auth);
  }

  /// مدير أو مالك: كل صلاحيات الصفحات.
  get admin(): boolean {
    return UserRole.isAdmin(this._auth?.currentUser?.role);
  }

  /// المالك وحده: يملك `sys.*`.
  get owner(): boolean {
    return UserRole.isOwner(this._auth?.currentUser?.role);
  }

  /// صلاحية نظامٍ خاصة (`sys.*`) — للمالك وحده.
  sys(_key: string): boolean {
    return this.owner;
  }

  /// حارس `sys.*`: يرفض بإشعارٍ يسمّي الصلاحية.
  guardSys(key: string): boolean {
    if (this.sys(key)) return true;
    showImdToast(
      `✖ هذا الإجراء للمالك وحده — ${SysPerm.labels[key] ?? key}`,
      { error: true },
    );
    return false;
  }

  get email(): string {
    return this._auth?.currentUser?.email ?? '';
  }

  /// اسم المستخدم الحالي للعرض (الاسم، وإلا اسم الدخول).
  get displayName(): string {
    const u = this._auth?.currentUser;
    if (!u) return '';
    return u.name.trim().length > 0 ? u.name.trim() : u.username;
  }

  private static _pageMap(v: unknown): Record<string, unknown> | null {
    return v != null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  }

  has(page: string, action: string = PermAction.view): boolean {
    const u = this._auth?.currentUser;
    if (!u || !this._auth) return false;
    if (SysPerm.isSys(page)) return this.owner;
    if (
      SectionBlock.blocksPage({
        role: u.role,
        blockedJson: u.sectionBlocked,
        page,
      })
    ) {
      return false;
    }
    if (this.admin) return true;
    return AccessControl.allows(
      Perm._pageMap(this._auth.permissionsOf(u)[page]),
      action,
    );
  }

  /// درجات سرية البرقيات التي يطّلع عليها المستخدم الحالي (M-18) — لا يرثها
  /// المدير بدوره كبقية الصفحات، انظر [CableClearance].
  cableClearance(): Set<string> {
    const u = this._auth?.currentUser;
    if (!u || !this._auth || !this.has('cables')) return new Set<string>();
    return CableClearance.allowed({
      role: u.role,
      permissions: this._auth.permissionsOf(u),
    });
  }

  /// هل القسم [section] (من [SectionBlock.all]) محجوبٌ عن المستخدم الحالي؟
  /// المالك لا يُحجب عنه شيء.
  blocked(section: string): boolean {
    const u = this._auth?.currentUser;
    if (!u) return true;
    return SectionBlock.blocksSection({
      role: u.role,
      blockedJson: u.sectionBlocked,
      section,
    });
  }

  manage(page: string): boolean {
    return (
      this.has(page, PermAction.create) ||
      this.has(page, PermAction.edit) ||
      this.has(page, PermAction.delete) ||
      this.has(page, PermAction.approve)
    );
  }

  /// الشرط المتكرر لإظهار أزرار الإدارة.
  ///
  /// **لا يصلح لزرٍّ مدمِّر:** يصدق بأيِّ إجراءٍ من الأربعة، فمن يملك الإضافة
  /// وحدها «قابلٌ للكتابة». استعمل [canDelete] لزرِّ الحذف و[has] لغيره.
  writable(page: string): boolean {
    return this.admin || this.manage(page);
  }

  /// صلاحية الحذف على [page] وحدها — بوابةُ كل زرٍّ يحذف.
  canDelete(page: string): boolean {
    return this.has(page, PermAction.delete);
  }

  /// نطاق المستودعات: `null` ⇒ كل المستودعات.
  get scope(): string[] | null {
    const u = this._auth?.currentUser;
    if (!u || !this._auth) return [];
    return this._auth.warehouseScopeOf(u);
  }

  canWh(warehouse: string): boolean {
    const s = this.scope;
    return s === null || warehouse.length === 0 || s.includes(warehouse);
  }

  canFuelWh(warehouse: string, fuelWarehouses: Iterable<string>): boolean {
    return AccessControl.canUseFuelWarehouse({
      isAdmin: false,
      scope: this.scope,
      fuelWarehouses,
      warehouse,
    });
  }

  fuelScope(all: Iterable<string>): Set<string> | null {
    const names = new Set(all);
    const own = new Set<string>();
    for (const w of names) {
      if (this.canFuelWh(w, names)) own.add(w);
    }
    return own.size === names.size ? null : own;
  }

  static scopeBlock(warehouse: string): string {
    return `✖ المستودع «${warehouse}» خارج نطاق صلاحياتك — تواصل مع مدير النظام`;
  }

  guard(page: string, action: string = PermAction.edit): boolean {
    if (this.has(page, action)) return true;
    showImdToast(`✖ لا تملك صلاحية: ${Perm.labels[page] ?? page} — ${action}`);
    return false;
  }
}

export function usePerm(): Perm {
  const auth = useAuthService();
  return new Perm(auth);
}
