import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase, UsersCompanion } from '../../../data/db/app_database';
import { NativeDatabase, Value } from '../../../data/db/sqlite_driver';
import type { User } from '../../../data/db/tables/core_tables';
import { UsersRepo } from '../../../data/repos/users_repo';
import { ErrorLogger, type LoggedError } from '../../error_log';
import { AuthService } from '../auth_service';
import { parseWarehouseScope } from '../warehouse_scope';

/// نطاق المستودعات فشلُه مغلق: التالف ⇒ لا مستودعات، لا «كل المستودعات».
describe('warehouse_scope_test', () => {
  let db: AppDatabase;
  let auth: AuthService;

  beforeEach(() => {
    ErrorLogger.reset();
    db = AppDatabase.forTesting(NativeDatabase.memory());
    auth = new AuthService(db);
  });

  afterEach(async () => {
    ErrorLogger.reset();
    await db.close();
  });

  async function makeUser(
    id: string,
    scope: string,
    role = 'user',
  ): Promise<User> {
    await db.into(db.users).insert(
      UsersCompanion.insert({
        id,
        username: id,
        role: Value.of(role),
        warehouseScope: Value.of(scope),
      }),
    );
    return db
      .select(db.users)
      .where((t) => t.id.equals(id))
      .getSingle();
  }

  describe('قيم صحيحة لا تتأثر', () => {
    it('ALL ⇒ كل المستودعات (null)، بأي حالة أحرف وبفراغات حولها', async () => {
      const variants = ['ALL', 'all', ' ALL '];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const u = await makeUser(`u${i}`, v);
        expect(auth.warehouseScopeOf(u)).toBeNull();
        expect(UsersRepo.scopeOf(u)).toBeNull();
      }
      expect(ErrorLogger.recent).toEqual([]);
    });

    it('قائمة أسماء ⇒ هي نفسها، والقائمة الفارغة المقصودة تبقى فارغة', async () => {
      const u = await makeUser('a', '["المخزن الرئيسي","مخزن ٢"]');
      expect(auth.warehouseScopeOf(u)).toEqual(['المخزن الرئيسي', 'مخزن ٢']);
      expect(UsersRepo.scopeOf(u)).toEqual(['المخزن الرئيسي', 'مخزن ٢']);

      const none = await makeUser('b', '[]');
      expect(auth.warehouseScopeOf(none)).toEqual([]);
      expect(ErrorLogger.recent).toEqual([]);
    });

    it('المدير كل المستودعات حتى لو تلف نطاقه (الدور هو الحاكم)', async () => {
      const admin = await makeUser('adm', '{bad', 'admin');
      expect(auth.warehouseScopeOf(admin)).toBeNull();
    });
  });

  describe('JSON تالف ⇒ فشل مغلق', () => {
    const corrupt = [
      '{bad json',
      '',
      '"ALL-ISH"',
      '{"a":1}',
      'null',
      '[unterminated',
      '42',
    ];

    it('كل قيمة تالفة تُرجع قائمة فارغة لا null، في المسارين', async () => {
      for (let i = 0; i < corrupt.length; i++) {
        const u = await makeUser(`c${i}`, corrupt[i]);
        expect(auth.warehouseScopeOf(u)).not.toBeNull();
        expect(auth.warehouseScopeOf(u)).toEqual([]);
        expect(UsersRepo.scopeOf(u)).not.toBeNull();
        expect(UsersRepo.scopeOf(u)).toEqual([]);
      }
    });

    it('التلف يُسجَّل خطأً حرجًا بمصدره', async () => {
      const persisted: LoggedError[] = [];
      ErrorLogger.sink = async (e) => {
        persisted.push(e);
      };

      auth.warehouseScopeOf(await makeUser('x', '{bad'));
      UsersRepo.scopeOf(await makeUser('y', '{bad'));

      expect(persisted.map((e) => e.source)).toEqual(
        expect.arrayContaining(['auth.warehouseScope', 'users.scopeJson']),
      );
      expect(persisted.every((e) => e.critical)).toBe(true);
    });

    it('نتيجة الفشل تنعكس في وصف النطاق: «بدون مستودعات» لا «كل المستودعات»', async () => {
      const u = await makeUser('z', '{bad');
      expect(UsersRepo.scopeLabel(u)).toBe('بدون مستودعات');
    });
  });

  it('parseWarehouseScope مباشرة', () => {
    expect(parseWarehouseScope('ALL', { source: 't' })).toBeNull();
    expect(parseWarehouseScope('["أ"]', { source: 't' })).toEqual(['أ']);
    expect(parseWarehouseScope('###', { source: 't' })).toEqual([]);
  });
});
