import { ErrorLogger } from '../core/error_log';
import { PermAction, UserRole } from '../domain/access_control';
import type { User } from './db/tables/core_tables';

/// بند في تقرير الأثر: مجموعةُ مستخدمين وما يتغيّر عليهم.
export class ImpactItem {
  constructor(
    readonly id: string,
    readonly title: string,
    /// ماذا يحدث لهؤلاء المستخدمين بعد نقل الصلاحيات الخاصة إلى المالك.
    readonly effect: string,
    readonly users: readonly User[],
  ) {}
}

/// تقرير أثر نقل الصلاحيات الخاصة (`sys.*`) إلى المالك — **قراءةٌ فقط**.
///
/// يجيب قبل أي ترحيل نهائي: من سيفقد ماذا؟ لا يغيّر شيئًا في أي حساب، وقرار
/// ما يُفعل بكل مجموعة (إبقاء، ترقية، سحب) للمالك.
export class PermissionImpact {
  private constructor() {}

  private static _perms(u: User): Record<string, unknown> {
    try {
      const v: unknown = JSON.parse(u.permissions);
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        return v as Record<string, unknown>;
      }
    } catch (e) {
      // مصفوفةُ صلاحياتٍ تالفة تُعامل «بلا صلاحيات» في التقرير؛ يُسجَّل العطب لا يُبتلع.
      ErrorLogger.log('permission_impact', e, e instanceof Error ? e.stack : undefined);
    }
    return {};
  }

  private static _has(u: User, page: string, action: string): boolean {
    const p = PermissionImpact._perms(u)[page];
    return p !== null && typeof p === 'object' && !Array.isArray(p) && (p as Record<string, unknown>)[action] === true;
  }

  private static _isUser(u: User): boolean {
    return !UserRole.isAdmin(u.role);
  }

  /// يبني التقرير من قائمة المستخدمين.
  static build(all: readonly User[]): ImpactItem[] {
    const nonAdmins = all.filter(PermissionImpact._isUser);
    return [
      new ImpactItem(
        'admins',
        'مديرو النظام الحاليون',
        'يفقدون النسخ الاحتياطي والاستعادة، وتفعيل الأجهزة، والمزامنة والاقتران، ' +
          'والإعدادات الحساسة (قواعد المحرك ومفتاح التوقيع والأرشفة التلقائية)، ' +
          'ومنح دور المدير وتعطيل الحسابات وتعديل الصلاحيات — فتصير للمالك وحده.',
        all.filter((u) => u.role === UserRole.admin),
      ),
      new ImpactItem(
        'settingsEditors',
        'مستخدمون عاديون يملكون «الإعدادات: تعديل»',
        'كانوا يستعيدون النسخ ويحفظون قواعد المحرك ويديرون مفتاح التوقيع ويقترنون ' +
          'بالمزامنة. يفقدون هذه الإجراءات؛ ويبقى لهم الهوية والنماذج والطباعة واستيراد Excel.',
        nonAdmins.filter((u) => PermissionImpact._has(u, 'settings', PermAction.edit)),
      ),
      new ImpactItem(
        'usersAccess',
        'مستخدمون عاديون يملكون «المستخدمون والصلاحيات»',
        'لا تُفتح لهم شاشة المستخدمين أصلًا (للمديرين)، لكن صلاحيتهم المخزَّنة لا أثر لها ' +
          'بعد الآن: تعديل الصلاحيات وإدارة الحسابات للمالك والمدير فقط.',
        nonAdmins.filter(
          (u) =>
            PermissionImpact._has(u, 'usersAccess', PermAction.view) ||
            PermissionImpact._has(u, 'usersAccess', PermAction.edit) ||
            PermissionImpact._has(u, 'usersAccess', PermAction.approve),
        ),
      ),
      new ImpactItem(
        'suppliersCreateOnly',
        'مستخدمون يملكون «الموردون: إضافة» بلا «تعديل»',
        'صارت الحراسة بصلاحية الموردين نفسها (بدل المدير وحده). لا رفعٌ تلقائي: يضيفون ' +
          'موردين جددًا ولا يعدّلون القائم — راجع إن كان ذلك مقصودًا.',
        nonAdmins.filter(
          (u) =>
            PermissionImpact._has(u, 'suppliers', PermAction.create) &&
            !PermissionImpact._has(u, 'suppliers', PermAction.edit),
        ),
      ),
      new ImpactItem(
        'storesCreateOnly',
        'مستخدمون يملكون «المستودعات: إضافة» بلا «تعديل»',
        'كما في الموردين: الحراسة بصلاحية المستودعات نفسها، بلا رفعٍ تلقائي.',
        nonAdmins.filter(
          (u) =>
            PermissionImpact._has(u, 'stores', PermAction.create) &&
            !PermissionImpact._has(u, 'stores', PermAction.edit),
        ),
      ),
      new ImpactItem(
        'importInherit',
        'مستخدمون يرثون «استيراد» من «إضافة»',
        'لم يُحدَّد لهم `import` صراحةً، فيرثون «إضافة» على الأصناف والارتباطات ' +
          '(توافقٌ لئلا يفقدوا ما كان لهم). حدّد لكلٍّ منهم `import` صراحةً إن أردت التمييز.',
        nonAdmins.filter((u) =>
          ['items', 'linkages'].some((p) => {
            const m = PermissionImpact._perms(u)[p];
            return (
              m !== null &&
              typeof m === 'object' &&
              !Array.isArray(m) &&
              (m as Record<string, unknown>)['create'] === true &&
              !Object.prototype.hasOwnProperty.call(m, PermAction.import)
            );
          }),
        ),
      ),
    ];
  }
}
