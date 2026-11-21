import { ErrorLogger } from '../../core/error_log';
import { Ids } from '../../core/ids';
import type { AppDatabase } from '../db/app_database';
import { OrderingTerm, Value } from '../db/sqlite_driver';
import {
  AuditLogsCompanion,
  SensitiveReviewsCompanion,
  type AuditLog,
  type SensitiveReview,
  type User,
} from '../db/tables/core_tables';

/// سجل التدقيق: أثر لا يُحذف للأحداث الحساسة (تعديل سند، إلغاؤه، اعتماد جرد،
/// تغيير صلاحيات، إنشاء مستخدم، محاولات دخول فاشلة).
export class AuditRepo {
  constructor(readonly db: AppDatabase) {}

  static readonly riskNormal = 'normal';
  static readonly riskHigh = 'high';

  /// كل ما سوى [riskNormal] أثرُ مساءلة لا يُقلَّم.
  static readonly protectedRisks: readonly string[] = ['high', 'sensitive', 'critical'];

  /// المدة التي تُحفَظ بها الأحداث **العادية** قبل التقليم (730 يوماً بالملّي ثانية).
  static readonly normalTtlMs = 730 * 24 * 60 * 60 * 1000;

  /// حدّ الحذف في التشغيلة الواحدة.
  static readonly pruneBatch = 2000;

  /// يحذف دفعةً من الأحداث العادية التي تجاوزت [normalTtlMs]، ويعيد عددها.
  async prune(options: { readonly now?: Date } = {}): Promise<number> {
    const cutoff = new Date((options.now ?? new Date()).getTime() - AuditRepo.normalTtlMs);
    const stale = await this.db
      .select(this.db.auditLogs)
      .where((t) =>
        t.risk
          .isIn(AuditRepo.protectedRisks)
          .not()
          .and(t.createdAt.isSmallerThanValue(cutoff)),
      )
      .orderBy([(t) => OrderingTerm.asc(t.createdAt)])
      .limit(AuditRepo.pruneBatch)
      .get();

    if (stale.length === 0) return 0;
    const ids = stale.map((r) => r.id);
    await this.db
      .delete(this.db.auditLogs)
      .where((t) => t.id.isIn(ids))
      .go();
    return ids.length;
  }

  async log({
    action,
    summary,
    entityType = '',
    details = {},
    risk = AuditRepo.riskNormal,
    actorEmail = '',
  }: {
    readonly action: string;
    readonly summary: string;
    readonly entityType?: string;
    readonly details?: Record<string, unknown>;
    readonly risk?: string;
    readonly actorEmail?: string;
  }): Promise<void> {
    const now = new Date();
    await this.db.into(this.db.auditLogs).insert(
      AuditLogsCompanion.insert({
        id: Ids.next('aud'),
        action,
        entityType: Value.of(entityType),
        summary: Value.of(summary),
        details: Value.of(JSON.stringify(details)),
        risk: Value.of(risk),
        actorEmail: Value.of(actorEmail),
        logDate: Value.of(
          `${now.getFullYear().toString().padStart(4, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`,
        ),
      }),
    );
  }

  /// كتابة حدثٍ في سجل التدقيق — الحقول تُستخرج من details.
  async write(
    action: string,
    entityType: string,
    summary: string,
    options: {
      readonly details?: Record<string, unknown>;
      readonly actor?: User | null;
      readonly actorEmail?: string;
    } = {},
  ): Promise<void> {
    const { details = {}, actor = null, actorEmail = '' } = options;
    try {
      const n = (v: unknown): number => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        const parsed = Number(`${v ?? ''}`);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const qty = n(details['totalBaseQty']) !== 0 ? n(details['totalBaseQty']) : n(details['qty']);
      await this.db.into(this.db.auditLogs).insert(
        AuditLogsCompanion.insert({
          id: Ids.next('aud'),
          action,
          entityType: Value.of(entityType),
          summary: Value.of(summary),
          risk: Value.of(`${details['risk'] ?? 'normal'}`),
          refNo: Value.of(`${details['refNo'] ?? ''}`),
          warehouse: Value.of(`${details['warehouse'] ?? ''}`),
          target: Value.of(`${details['target'] ?? ''}`),
          status: Value.of(`${details['status'] ?? ''}`),
          itemCount: Value.of(Math.trunc(n(details['itemCount']))),
          qty: Value.of(qty),
          actorEmail: Value.of(actor?.email ?? actorEmail),
          actorName: Value.of(
            actor != null
              ? actor.name.length > 0
                ? actor.name
                : actor.email
              : actorEmail,
          ),
          actorRole: Value.of(actor?.role ?? 'user'),
          logDate: Value.of(new Date().toISOString().substring(0, 10)),
          details: Value.of(JSON.stringify(details)),
        }),
      );
    } catch (err) {
      ErrorLogger.critical('audit.write', err, {
        stack: err instanceof Error ? err.stack : undefined,
        userMessage: 'تعذّر تسجيل حدثٍ في سجل التدقيق',
      });
    }
  }

  /// كل السجلات بلا تقليم ولا حد — لشاشات التحليل.
  allLogs(): Promise<AuditLog[]> {
    return this.db.select(this.db.auditLogs).get();
  }

  /// سجلات أُنشئت بعد [since] — لنافذة النشاط الأخير.
  logsSince(since: Date): Promise<AuditLog[]> {
    return this.db
      .select(this.db.auditLogs)
      .where((t) => t.createdAt.isBiggerOrEqualValue(since))
      .get();
  }

  /// سجلات مستويات خطورة محددة فقط (بلا حساسية لحالة الأحرف).
  logsByRisk(risks: Iterable<string>): Promise<AuditLog[]> {
    const normalized = Array.from(risks).map((r) => r.toLowerCase());
    return this.db
      .select(this.db.auditLogs)
      .where((t) => t.risk.lower().isIn(normalized))
      .get();
  }

  allSensitiveReviews(): Promise<SensitiveReview[]> {
    return this.db.select(this.db.sensitiveReviews).get();
  }

  /// وسم تغييرٍ حسّاس بأنه روجع (معرّف المراجعة = معرّف السجل).
  markSensitiveReviewed({
    logId,
    reviewedBy,
    note,
  }: {
    readonly logId: string;
    readonly reviewedBy: string;
    readonly note: string;
  }): Promise<void> {
    return this.db.into(this.db.sensitiveReviews).insertOnConflictUpdate(
      SensitiveReviewsCompanion.insert({
        id: logId,
        logId,
        reviewedBy: Value.of(reviewedBy),
        note: Value.of(note),
      }),
    );
  }

  async recent({
    limit = 300,
    risk = '',
    query = '',
  }: {
    readonly limit?: number;
    readonly risk?: string;
    readonly query?: string;
  } = {}): Promise<AuditLog[]> {
    const rows = await this.db
      .select(this.db.auditLogs)
      .orderBy([(t) => OrderingTerm.desc(t.createdAt)])
      .limit(limit)
      .get();
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (risk.length > 0 && r.risk !== risk) return false;
      if (q.length === 0) return true;
      return (
        r.summary.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.actorEmail.toLowerCase().includes(q)
      );
    });
  }
}
