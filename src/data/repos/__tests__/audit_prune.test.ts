import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Ids } from '../../../core/ids';
import { AppDatabase, AuditLogsCompanion } from '../../db/app_database';
import { NativeDatabase, Value } from '../../db/sqlite_driver';
import { AuditRepo } from '../audit_repo';

/// تقليم سجل التدقيق.
///
/// الخط الفاصل: العادي يُقلَّم، وعاليُ الخطورة **لا يُمسّ مهما طال عمره** —
/// هو أثرُ المساءلة وسببُ وجود الجدول.
describe('audit_prune_test', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  afterEach(async () => {
    await db.close();
  });

  const entry = (risk: string, at: Date): Promise<void> =>
    db.into(db.auditLogs).insert(
      AuditLogsCompanion.insert({
        id: Ids.next('aud'),
        action: 'test',
        risk: Value.of(risk),
        createdAt: Value.of(at),
      }),
    );

  const now = new Date(2026, 8, 25); // 2026-09-25
  const ago = (days: number): Date => new Date(now.getTime() - days * 86_400_000);

  const count = async (): Promise<number> => (await db.select(db.auditLogs).get()).length;

  it('الحدث العادي القديم يُقلَّم', async () => {
    await entry(AuditRepo.riskNormal, ago(800));
    expect(await new AuditRepo(db).prune({ now })).toBe(1);
    expect(await count()).toBe(0);
  });

  it('الحدث العادي الحديث يبقى', async () => {
    await entry(AuditRepo.riskNormal, ago(400));
    expect(await new AuditRepo(db).prune({ now })).toBe(0);
    expect(await count()).toBe(1);
  });

  it('الحدث عالي الخطورة لا يُحذف مهما قدُم', async () => {
    await entry(AuditRepo.riskHigh, ago(5000));
    expect(
      await new AuditRepo(db).prune({ now }),
      'تغيير الصلاحيات وإلغاء السندات أثرٌ دائم',
    ).toBe(0);
    expect(await count()).toBe(1);
  });

  it('sensitive و critical لا يُقلَّمان كذلك (سندات الصرف المعتمدة)', async () => {
    await entry('sensitive', ago(5000));
    await entry('critical', ago(5000));
    expect(await new AuditRepo(db).prune({ now })).toBe(0);
    expect(await count()).toBe(2);
  });

  it('التقليم يقف عند حدّ الدفعة فيتوزّع على إقلاعات', async () => {
    await db.batch((b) => {
      for (let i = 0; i < AuditRepo.pruneBatch + 50; i++) {
        b.insert(
          db.auditLogs,
          AuditLogsCompanion.insert({
            id: Ids.next('aud'),
            action: 'test',
            createdAt: Value.of(ago(900 + i)),
          }),
        );
      }
    });
    expect(await new AuditRepo(db).prune({ now })).toBe(AuditRepo.pruneBatch);
    expect(await count()).toBe(50);
    expect(await new AuditRepo(db).prune({ now })).toBe(50);
    expect(await count()).toBe(0);
  });

  it('الأقدم يُحذف أولًا', async () => {
    await entry(AuditRepo.riskNormal, ago(2000));
    await entry(AuditRepo.riskNormal, ago(750));
    const repo = new AuditRepo(db);
    // دفعةٌ بحجم واحد عبر تقليمين متتاليين: الأقدم يخرج في الأول.
    await repo.prune({ now });
    expect(await count(), 'كلاهما تجاوز المدة').toBe(0);

    await entry(AuditRepo.riskNormal, ago(2000));
    await entry(AuditRepo.riskNormal, ago(100));
    await repo.prune({ now });
    const left = await db.select(db.auditLogs).get();
    expect(left).toHaveLength(1);
    expect(
      left[0].createdAt.getTime() > ago(200).getTime(),
      'الباقي هو الحديث',
    ).toBe(true);
  });

  // MISSING: lib/data/sync/sync_marks.dart
  it.skip('الحذف يترك شاهدًا فينتقل إلى النظراء', () => {
    // يعتمد على جدول sync_marks ومشغّلات المزامنة (المرحلة 16).
  });
});
