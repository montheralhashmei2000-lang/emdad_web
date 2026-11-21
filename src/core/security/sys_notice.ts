import type { AppDatabase } from '../../data/db/app_database';
import type { User } from '../../data/db/tables/core_tables';
import { SettingsRepo } from '../../data/repos/settings_repo';
import { UserRole } from '../../domain/access_control';

/// تنبيه المرحلة الانتقالية: بعد الترقية انتقلت النسخ الاحتياطي والتفعيل
/// والمزامنة إلى المالك. يُعرض **مرةً واحدة** لكل مديرٍ غير مالك على هذا الجهاز
/// ثم لا يتكرر (حالته محلية فقط ولا تُزامَن).
export class SysTransitionNotice {
  constructor(readonly db: AppDatabase) {}

  static readonly key = 'sysNotice';

  static readonly message =
    'النسخ الاحتياطي والتفعيل والمزامنة انتقلت للمالك. تواصل معه.';

  /// هل يُعرض التنبيه لـ[user] الآن؟ (مدير غير مالك لم يرَه من قبل.)
  async shouldShow(user: User): Promise<boolean> {
    if (!UserRole.isAdmin(user.role) || UserRole.isOwner(user.role)) {
      return false;
    }
    const seen = await new SettingsRepo(this.db).read(SysTransitionNotice.key);
    return seen[user.id] !== true;
  }

  async markSeen(user: User): Promise<void> {
    const repo = new SettingsRepo(this.db);
    const seen = await repo.read(SysTransitionNotice.key);
    seen[user.id] = true;
    await repo.write(SysTransitionNotice.key, seen);
  }
}
