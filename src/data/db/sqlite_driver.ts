import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';

export type DriftSqlType = 'string' | 'int' | 'bigInt' | 'double' | 'bool' | 'dateTime';

export interface ColumnDefaultCurrentTime {
  readonly kind: 'currentDateAndTime';
}

export interface ColumnDefaultConstant {
  readonly kind: 'constant';
  readonly value: string | number | boolean;
}

export type ColumnDefaultValue = ColumnDefaultCurrentTime | ColumnDefaultConstant | null;

export const currentDateAndTime: ColumnDefaultCurrentTime = {
  kind: 'currentDateAndTime',
};

export function Constant(value: string | number | boolean): ColumnDefaultConstant {
  return { kind: 'constant', value };
}

export function camelToSnake(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export class Value<T> {
  readonly present: boolean;
  readonly value: T | undefined;

  private constructor(present: boolean, value: T | undefined) {
    this.present = present;
    this.value = value;
  }

  static absent<T = never>(): Value<T> {
    return new Value<T>(false, undefined);
  }

  static of<T>(value: T): Value<T> {
    return new Value<T>(true, value);
  }

  static null<T = never>(): Value<T | null> {
    return new Value<T | null>(true, null);
  }
}

export function v<T>(value: T): Value<T> {
  return Value.of(value);
}

export type CompanionInput<T> = T | Value<T>;

export interface WhereNode {
  readonly sql: string;
  readonly params: SqlValue[];
  and(other: WhereNode): WhereNode;
  or(other: WhereNode): WhereNode;
  not(): WhereNode;
}

class ExprNode implements WhereNode {
  constructor(
    readonly sql: string,
    readonly params: SqlValue[] = [],
  ) {}

  and(other: WhereNode): WhereNode {
    return new ExprNode(`(${this.sql}) AND (${other.sql})`, [
      ...this.params,
      ...other.params,
    ]);
  }

  or(other: WhereNode): WhereNode {
    return new ExprNode(`(${this.sql}) OR (${other.sql})`, [
      ...this.params,
      ...other.params,
    ]);
  }

  not(): WhereNode {
    return new ExprNode(`NOT (${this.sql})`, [...this.params]);
  }
}

export function sqlAnd(...nodes: readonly WhereNode[]): WhereNode {
  return nodes.reduce((acc, n) => acc.and(n));
}

export function sqlOr(...nodes: readonly WhereNode[]): WhereNode {
  return nodes.reduce((acc, n) => acc.or(n));
}

export function sqlNot(node: WhereNode): WhereNode {
  return node.not();
}

export class OrderingTerm {
  constructor(
    readonly columnSql: string,
    readonly mode: 'ASC' | 'DESC',
  ) {}

  static asc<T>(col: GeneratedColumn<T>): OrderingTerm {
    return new OrderingTerm(`"${col.name}"`, 'ASC');
  }

  static desc<T>(col: GeneratedColumn<T>): OrderingTerm {
    return new OrderingTerm(`"${col.name}"`, 'DESC');
  }
}

export class Variable<T = SqlValue> {
  constructor(readonly value: T) {}

  static withString(value: string): Variable<string> {
    return new Variable<string>(value);
  }

  static withInt(value: number): Variable<number> {
    return new Variable<number>(Math.trunc(value));
  }

  static withReal(value: number): Variable<number> {
    return new Variable<number>(value);
  }
}

function toSqlParam(raw: unknown, type?: DriftSqlType): SqlValue {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Variable) return toSqlParam(raw.value, type);
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (typeof raw === 'number') {
    if (type === 'int') return Math.trunc(raw);
    return raw;
  }
  if (typeof raw === 'string') return raw;
  if (raw instanceof Uint8Array) return raw;
  return String(raw);
}

function fromSqlValue(raw: SqlValue, type: DriftSqlType, nullable: boolean): unknown {
  if (raw === null || raw === undefined) {
    return nullable ? null : undefined;
  }
  switch (type) {
    case 'string':
      return typeof raw === 'string' ? raw : String(raw);
    case 'int':
    case 'bigInt':
      return typeof raw === 'number' ? Math.trunc(raw) : Number.parseInt(String(raw), 10) || 0;
    case 'double':
      return typeof raw === 'number' ? raw : Number(raw) || 0;
    case 'bool':
      return raw === 1 || raw === '1' || raw === ('true' as unknown);
    case 'dateTime': {
      if (typeof raw === 'number') {
        // قيم التاريخ التي كُتبت بالثواني (< 1e11) تُحوّل إلى ملي ثانية، وما سواها يُؤخذ كما هو.
        const ms = Math.abs(raw) < 1e11 ? raw * 1000 : raw;
        return new Date(ms);
      }
      const parsed = Date.parse(String(raw));
      return Number.isNaN(parsed) ? new Date(0) : new Date(parsed);
    }
  }
}

export class GeneratedColumn<T = unknown> {
  readonly propName: string;
  readonly name: string;
  readonly type: DriftSqlType;
  readonly $nullable: boolean;
  readonly defaultValue: ColumnDefaultValue;

  constructor(options: {
    propName: string;
    name?: string;
    type: DriftSqlType;
    nullable?: boolean;
    defaultValue?: ColumnDefaultValue;
  }) {
    this.propName = options.propName;
    this.name = options.name ?? camelToSnake(options.propName);
    this.type = options.type;
    this.$nullable = options.nullable ?? false;
    this.defaultValue = options.defaultValue ?? null;
  }

  withDefault(def: ColumnDefaultValue): GeneratedColumn<T> {
    return new GeneratedColumn<T>({
      propName: this.propName,
      name: this.name,
      type: this.type,
      nullable: this.$nullable,
      defaultValue: def,
    });
  }

  nullable(): GeneratedColumn<T | null> {
    return new GeneratedColumn<T | null>({
      propName: this.propName,
      name: this.name,
      type: this.type,
      nullable: true,
      defaultValue: this.defaultValue,
    });
  }

  sqlType(): string {
    switch (this.type) {
      case 'string':
        return 'TEXT';
      case 'int':
      case 'bigInt':
      case 'bool':
      case 'dateTime':
        return 'INTEGER';
      case 'double':
        return 'REAL';
    }
  }

  sqlDefaultClause(): string {
    if (!this.defaultValue) return '';
    if (this.defaultValue.kind === 'currentDateAndTime') {
      return ` DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)`;
    }
    const val = this.defaultValue.value;
    if (typeof val === 'string') {
      return ` DEFAULT '${val.replace(/'/g, "''")}'`;
    }
    if (typeof val === 'boolean') {
      return ` DEFAULT ${val ? 1 : 0}`;
    }
    return ` DEFAULT ${val}`;
  }

  columnDefinitionSql(): string {
    const nullSql = this.$nullable ? '' : ' NOT NULL';
    return `"${this.name}" ${this.sqlType()}${nullSql}${this.sqlDefaultClause()}`;
  }

  equals(val: T): WhereNode {
    const p = toSqlParam(val, this.type);
    if (p === null) return new ExprNode(`"${this.name}" IS NULL`);
    return new ExprNode(`"${this.name}" = ?`, [p]);
  }

  isIn(values: readonly T[]): WhereNode {
    if (values.length === 0) return new ExprNode('0 = 1');
    const placeholders = values.map(() => '?').join(', ');
    return new ExprNode(
      `"${this.name}" IN (${placeholders})`,
      values.map((v) => toSqlParam(v, this.type)),
    );
  }

  isSmallerThanValue(val: T): WhereNode {
    return new ExprNode(`"${this.name}" < ?`, [toSqlParam(val, this.type)]);
  }

  isSmallerOrEqualValue(val: T): WhereNode {
    return new ExprNode(`"${this.name}" <= ?`, [toSqlParam(val, this.type)]);
  }

  isBiggerThanValue(val: T): WhereNode {
    return new ExprNode(`"${this.name}" > ?`, [toSqlParam(val, this.type)]);
  }

  isBiggerOrEqualValue(val: T): WhereNode {
    return new ExprNode(`"${this.name}" >= ?`, [toSqlParam(val, this.type)]);
  }

  isNull(): WhereNode {
    return new ExprNode(`"${this.name}" IS NULL`);
  }

  isNotNull(): WhereNode {
    return new ExprNode(`"${this.name}" IS NOT NULL`);
  }

  lower(): LowerColumnExpr {
    return new LowerColumnExpr(`"${this.name}"`);
  }
}

export class LowerColumnExpr {
  constructor(private readonly colSql: string) {}

  equals(val: string): WhereNode {
    return new ExprNode(`LOWER(${this.colSql}) = ?`, [val.toLowerCase()]);
  }

  isIn(values: Iterable<string>): WhereNode {
    const arr = Array.from(values);
    if (arr.length === 0) return new ExprNode('0 = 1');
    const placeholders = arr.map(() => '?').join(', ');
    return new ExprNode(
      `LOWER(${this.colSql}) IN (${placeholders})`,
      arr.map((v) => v.toLowerCase()),
    );
  }
}

export function textColumn(propName: string, name?: string): GeneratedColumn<string> {
  return new GeneratedColumn<string>({ propName, name, type: 'string' });
}

export function intColumn(propName: string, name?: string): GeneratedColumn<number> {
  return new GeneratedColumn<number>({ propName, name, type: 'int' });
}

export function realColumn(propName: string, name?: string): GeneratedColumn<number> {
  return new GeneratedColumn<number>({ propName, name, type: 'double' });
}

export function boolColumn(propName: string, name?: string): GeneratedColumn<boolean> {
  return new GeneratedColumn<boolean>({ propName, name, type: 'bool' });
}

export function dateTimeColumn(propName: string, name?: string): GeneratedColumn<Date> {
  return new GeneratedColumn<Date>({ propName, name, type: 'dateTime' });
}

export interface TableInfo<Row = Record<string, unknown>> {
  readonly actualTableName: string;
  readonly $columns: readonly GeneratedColumn<unknown>[];
  readonly primaryKey: readonly GeneratedColumn<unknown>[];
  fromRow(raw: Record<string, SqlValue>): Row;
}

export type RowOf<TTable> = TTable extends TableInfo<infer TRow> ? TRow : never;

export abstract class DriftTable<
  Row extends Record<string, unknown> = Record<string, unknown>,
> implements TableInfo<Row> {
  abstract readonly actualTableName: string;

  get $columns(): readonly GeneratedColumn<unknown>[] {
    const cols: GeneratedColumn<unknown>[] = [];
    for (const key of Object.keys(this)) {
      const val = (this as Record<string, unknown>)[key];
      if (val instanceof GeneratedColumn) {
        cols.push(val);
      }
    }
    return cols;
  }

  get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [];
  }

  fromRow(raw: Record<string, SqlValue>): Row {
    const out: Record<string, unknown> = {};
    for (const col of this.$columns) {
      out[col.propName] = fromSqlValue(raw[col.name] ?? null, col.type, col.$nullable);
    }
    return out as Row;
  }
}

export type CompanionRecord = Record<string, unknown>;

export function buildCompanionRow(
  table: TableInfo<unknown>,
  data: CompanionRecord,
): { cols: string[]; params: SqlValue[] } {
  const cols: string[] = [];
  const params: SqlValue[] = [];
  for (const col of table.$columns) {
    if (!Object.prototype.hasOwnProperty.call(data, col.propName)) continue;
    const raw = data[col.propName];
    if (raw instanceof Value) {
      if (!raw.present) continue;
      cols.push(col.name);
      params.push(toSqlParam(raw.value, col.type));
    } else if (raw !== undefined) {
      cols.push(col.name);
      params.push(toSqlParam(raw, col.type));
    }
  }
  return { cols, params };
}

export class QueryRow {
  constructor(readonly data: Record<string, SqlValue>) {}

  read<T = SqlValue>(column: string): T {
    return this.data[column] as T;
  }
}

export class CustomSelectStatement {
  constructor(
    private readonly executor: () => Promise<QueryRow[]>,
  ) {}

  get(): Promise<QueryRow[]> {
    return this.executor();
  }

  async getSingle(): Promise<QueryRow> {
    const rows = await this.get();
    if (rows.length !== 1) {
      throw new Error(`Expected single row, got ${rows.length}`);
    }
    return rows[0];
  }

  async getSingleOrNull(): Promise<QueryRow | null> {
    const rows = await this.get();
    if (rows.length === 0) return null;
    if (rows.length > 1) {
      throw new Error(`Expected at most 1 row, got ${rows.length}`);
    }
    return rows[0];
  }
}

export class SelectBuilder<TTable extends TableInfo<TRow>, TRow> {
  private _where: WhereNode | null = null;
  private _orderBy: OrderingTerm[] = [];
  private _limit: number | null = null;

  constructor(
    private readonly db: DriftDatabase,
    private readonly table: TTable,
  ) {}

  where(predicate: (t: TTable) => WhereNode): this {
    const next = predicate(this.table);
    this._where = this._where ? this._where.and(next) : next;
    return this;
  }

  orderBy(terms: readonly ((t: TTable) => OrderingTerm)[]): this {
    for (const fn of terms) {
      this._orderBy.push(fn(this.table));
    }
    return this;
  }

  limit(limit: number): this {
    this._limit = limit;
    return this;
  }

  async get(): Promise<TRow[]> {
    const parts: string[] = [`SELECT * FROM "${this.table.actualTableName}"`];
    const params: SqlValue[] = [];
    if (this._where) {
      parts.push(`WHERE ${this._where.sql}`);
      params.push(...this._where.params);
    }
    if (this._orderBy.length > 0) {
      parts.push(
        `ORDER BY ${this._orderBy.map((o) => `${o.columnSql} ${o.mode}`).join(', ')}`,
      );
    }
    if (this._limit !== null) {
      parts.push(`LIMIT ${Math.max(0, Math.trunc(this._limit))}`);
    }
    const qrows = await this.db
      .customSelect(parts.join(' '), {
        variables: params.map((p) => new Variable(p)),
      })
      .get();
    return qrows.map((r) => this.table.fromRow(r.data));
  }

  async getSingle(): Promise<TRow> {
    const rows = await this.get();
    if (rows.length !== 1) {
      throw new Error(`Expected single row in ${this.table.actualTableName}, got ${rows.length}`);
    }
    return rows[0];
  }

  async getSingleOrNull(): Promise<TRow | null> {
    const rows = await this.get();
    if (rows.length === 0) return null;
    if (rows.length > 1) {
      throw new Error(`Expected at most 1 row in ${this.table.actualTableName}, got ${rows.length}`);
    }
    return rows[0];
  }
}

export class InsertBuilder<TTable extends TableInfo<unknown>> {
  constructor(
    private readonly db: DriftDatabase,
    private readonly table: TTable,
  ) {}

  async insert(data: CompanionRecord, mode: 'abort' | 'ignore' | 'replace' = 'abort'): Promise<void> {
    const { cols, params } = buildCompanionRow(this.table, data);
    const orClause =
      mode === 'ignore'
        ? 'OR IGNORE '
        : mode === 'replace'
          ? 'OR REPLACE '
          : '';
    if (cols.length === 0) {
      await this.db.customStatement(
        `INSERT ${orClause}INTO "${this.table.actualTableName}" DEFAULT VALUES`,
      );
      this.db.notifyTableChanged(this.table.actualTableName);
      return;
    }
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    await this.db.customStatement(
      `INSERT ${orClause}INTO "${this.table.actualTableName}" (${colList}) VALUES (${placeholders})`,
      params,
    );
    this.db.notifyTableChanged(this.table.actualTableName);
  }

  async insertOnConflictUpdate(data: CompanionRecord): Promise<void> {
    const { cols, params } = buildCompanionRow(this.table, data);
    if (cols.length === 0) return;
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const pkNames = this.table.primaryKey.map((c) => c.name);
    if (pkNames.length === 0) {
      await this.insert(data, 'replace');
      return;
    }
    const updateCols = cols.filter((c) => !pkNames.includes(c));
    if (updateCols.length === 0) {
      await this.db.customStatement(
        `INSERT OR IGNORE INTO "${this.table.actualTableName}" (${colList}) VALUES (${placeholders})`,
        params,
      );
      this.db.notifyTableChanged(this.table.actualTableName);
      return;
    }
    const conflictTarget = pkNames.map((n) => `"${n}"`).join(', ');
    const updateClause = updateCols
      .map((c) => `"${c}" = excluded."${c}"`)
      .join(', ');
    await this.db.customStatement(
      `INSERT INTO "${this.table.actualTableName}" (${colList}) VALUES (${placeholders}) ` +
        `ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateClause}`,
      params,
    );
    this.db.notifyTableChanged(this.table.actualTableName);
  }
}

export class UpdateBuilder<TTable extends TableInfo<unknown>> {
  private _where: WhereNode | null = null;

  constructor(
    private readonly db: DriftDatabase,
    private readonly table: TTable,
  ) {}

  where(predicate: (t: TTable) => WhereNode): this {
    const next = predicate(this.table);
    this._where = this._where ? this._where.and(next) : next;
    return this;
  }

  async write(data: CompanionRecord): Promise<number> {
    const { cols, params } = buildCompanionRow(this.table, data);
    if (cols.length === 0) return 0;
    const setClause = cols.map((c) => `"${c}" = ?`).join(', ');
    const sql = this._where
      ? `UPDATE "${this.table.actualTableName}" SET ${setClause} WHERE ${this._where.sql}`
      : `UPDATE "${this.table.actualTableName}" SET ${setClause}`;
    const allParams = this._where ? [...params, ...this._where.params] : params;
    let changed = 0;
    await this.db.runWithRawChanges(sql, allParams, (c) => {
      changed = c;
    });
    this.db.notifyTableChanged(this.table.actualTableName);
    return changed;
  }
}

export class DeleteBuilder<TTable extends TableInfo<unknown>> {
  private _where: WhereNode | null = null;

  constructor(
    private readonly db: DriftDatabase,
    private readonly table: TTable,
  ) {}

  where(predicate: (t: TTable) => WhereNode): this {
    const next = predicate(this.table);
    this._where = this._where ? this._where.and(next) : next;
    return this;
  }

  async go(): Promise<number> {
    const sql = this._where
      ? `DELETE FROM "${this.table.actualTableName}" WHERE ${this._where.sql}`
      : `DELETE FROM "${this.table.actualTableName}"`;
    let changed = 0;
    await this.db.runWithRawChanges(sql, this._where?.params ?? [], (c) => {
      changed = c;
    });
    this.db.notifyTableChanged(this.table.actualTableName);
    return changed;
  }
}

export class TableUpdateQuery {
  private constructor(readonly tables: ReadonlySet<string>) {}

  static onTable(table: TableInfo<unknown>): TableUpdateQuery {
    return new TableUpdateQuery(new Set([table.actualTableName]));
  }

  static onAllTables(tables: Iterable<TableInfo<unknown>>): TableUpdateQuery {
    return new TableUpdateQuery(new Set(Array.from(tables, (t) => t.actualTableName)));
  }
}

export interface TableUpdateSubscription {
  cancel(): void;
}

export class BatchRunner {
  constructor(
    private readonly db: DriftDatabase,
    private readonly ops: (() => Promise<void>)[] = [],
  ) {}

  insert<TTable extends TableInfo<unknown>>(table: TTable, data: CompanionRecord): void {
    this.ops.push(() => this.db.intoRaw(table).insert(data));
  }

  insertAll<TTable extends TableInfo<unknown>>(
    table: TTable,
    rows: readonly CompanionRecord[],
  ): void {
    for (const r of rows) {
      this.insert(table, r);
    }
  }

  async execute(): Promise<void> {
    for (const op of this.ops) {
      await op();
    }
  }
}

export class Migrator {
  constructor(
    private readonly db: DriftDatabase,
    private readonly tables: readonly TableInfo<unknown>[],
  ) {}

  async createAll(): Promise<void> {
    for (const t of this.tables) {
      await this.createTable(t);
    }
  }

  async createTable(table: TableInfo<unknown>): Promise<void> {
    const colDefs = table.$columns.map((c) => c.columnDefinitionSql());
    const pks = table.primaryKey.map((c) => `"${c.name}"`);
    if (pks.length > 0) {
      colDefs.push(`PRIMARY KEY (${pks.join(', ')})`);
    }
    const sql = `CREATE TABLE IF NOT EXISTS "${table.actualTableName}" (${colDefs.join(', ')})`;
    await this.db.customStatementRaw(sql);
  }

  async addColumn(table: TableInfo<unknown>, column: GeneratedColumn<unknown>): Promise<void> {
    const sql = `ALTER TABLE "${table.actualTableName}" ADD COLUMN ${column.columnDefinitionSql()}`;
    await this.db.customStatementRaw(sql);
  }
}

export interface MigratorDetails {
  readonly versionBefore: number | null;
  readonly versionNow: number;
  readonly hadUpgrade: boolean;
  readonly wasCreated: boolean;
}

export interface MigrationStrategy {
  readonly onCreate: (m: Migrator) => Promise<void>;
  readonly onUpgrade?: (m: Migrator, from: number, to: number) => Promise<void>;
  readonly beforeOpen?: (details: MigratorDetails) => Promise<void>;
}

// مخازن افتراضية/مؤقتة بالذاكرة لمحاكاة File في بيئة الاختبارات دون قرص حقيقي عند تعذّر fs،
// بالإضافة إلى دعم IndexedDB في المتصفح وnode:fs في Vitest/Node.
const memoryFileRegistry = new Map<string, Uint8Array>();

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function isNodeLikeRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.versions?.node);
}

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsPromise) return sqlJsPromise;
  sqlJsPromise = (async () => {
    if (isNodeLikeRuntime()) {
      const fsMod = 'node:' + 'fs';
      const pathMod = 'node:' + 'path';
      const fs = (await import(/* @vite-ignore */ fsMod)) as typeof import('node:fs');
      const path = (await import(/* @vite-ignore */ pathMod)) as typeof import('node:path');
      const candidates = [
        path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
        path.resolve(process.cwd(), 'public/sql-wasm.wasm'),
        path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm-browser.wasm'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          const buf = fs.readFileSync(candidate);
          return initSqlJs({
            wasmBinary: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
            useOldExtensionFunctions: false,
          });
        }
      }
    }
    return initSqlJs({
      locateFile: (file: string) => `/${file}`,
      useOldExtensionFunctions: false,
    });
  })();
  return sqlJsPromise;
}

const IDB_DB_NAME = 'imdad_sqlite_storage';
const IDB_STORE_NAME = 'databases';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

async function idbLoad(key: string): Promise<Uint8Array | null> {
  if (!hasIndexedDb()) return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const getReq = tx.objectStore(IDB_STORE_NAME).get(key);
      getReq.onerror = () => {
        db.close();
        reject(getReq.error);
      };
      getReq.onsuccess = () => {
        const res = getReq.result;
        db.close();
        if (res instanceof Uint8Array) resolve(res);
        else if (res instanceof ArrayBuffer) resolve(new Uint8Array(res));
        else resolve(null);
      };
    };
  });
}

async function idbSave(key: string, bytes: Uint8Array): Promise<void> {
  if (!hasIndexedDb()) return;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      tx.objectStore(IDB_STORE_NAME).put(new Uint8Array(bytes), key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

export interface SqliteExecutorOptions {
  readonly inMemory?: boolean;
  readonly dbName?: string;
  readonly filePath?: string;
  readonly initialBytes?: Uint8Array;
  readonly setup?: (rawDb: Database) => Promise<void> | void;
}

export class SqliteExecutor {
  readonly inMemory: boolean;
  readonly dbName: string;
  readonly filePath?: string;
  private readonly initialBytes?: Uint8Array;
  private readonly setupHook?: (rawDb: Database) => Promise<void> | void;
  private raw: Database | null = null;
  private closed = false;

  constructor(options: SqliteExecutorOptions = {}) {
    this.inMemory = options.inMemory ?? false;
    this.dbName = options.dbName ?? 'imdad.sqlite';
    this.filePath = options.filePath;
    this.initialBytes = options.initialBytes;
    this.setupHook = options.setup;
  }

  async open(): Promise<Database> {
    if (this.closed) {
      throw new Error('SqliteExecutor is already closed');
    }
    if (this.raw) return this.raw;

    const SQL = await loadSqlJs();
    let bytes: Uint8Array | null = this.initialBytes ?? null;

    if (!bytes && !this.inMemory) {
      if (this.filePath) {
        bytes = await this.readFileBytes(this.filePath);
      } else {
        bytes = await idbLoad(this.dbName);
      }
    }

    this.raw = bytes && bytes.byteLength > 0 ? new SQL.Database(bytes) : new SQL.Database();
    this.raw.run('PRAGMA foreign_keys = ON');
    if (this.setupHook) {
      await this.setupHook(this.raw);
    }
    return this.raw;
  }

  get rawDatabase(): Database {
    if (!this.raw) {
      throw new Error('SqliteExecutor has not been opened yet');
    }
    return this.raw;
  }

  async persist(): Promise<void> {
    if (this.inMemory || !this.raw || this.closed) return;
    const bytes = this.raw.export();
    if (this.filePath) {
      await this.writeFileBytes(this.filePath, bytes);
    } else {
      await idbSave(this.dbName, bytes);
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    if (this.raw) {
      await this.persist();
      this.raw.close();
      this.raw = null;
    }
    this.closed = true;
  }

  private async readFileBytes(filePath: string): Promise<Uint8Array | null> {
    if (isNodeLikeRuntime()) {
      const fsMod = 'node:' + 'fs';
      const fs = (await import(/* @vite-ignore */ fsMod)) as typeof import('node:fs');
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      }
      return null;
    }
    return memoryFileRegistry.get(filePath) ?? null;
  }

  private async writeFileBytes(filePath: string, bytes: Uint8Array): Promise<void> {
    if (isNodeLikeRuntime()) {
      const fsMod = 'node:' + 'fs';
      const pathMod = 'node:' + 'path';
      const fs = (await import(/* @vite-ignore */ fsMod)) as typeof import('node:fs');
      const path = (await import(/* @vite-ignore */ pathMod)) as typeof import('node:path');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, bytes);
      return;
    }
    memoryFileRegistry.set(filePath, new Uint8Array(bytes));
  }
}

export const NativeDatabase = {
  memory(options: { setup?: (rawDb: Database) => Promise<void> | void } = {}): SqliteExecutor {
    return new SqliteExecutor({ inMemory: true, setup: options.setup });
  },
  file(
    filePath: string,
    options: { setup?: (rawDb: Database) => Promise<void> | void } = {},
  ): SqliteExecutor {
    return new SqliteExecutor({ inMemory: false, filePath, setup: options.setup });
  },
  browser(dbName = 'imdad.sqlite'): SqliteExecutor {
    return new SqliteExecutor({ inMemory: false, dbName });
  },
};

export function openConnection(): SqliteExecutor {
  // في بيئة المتصفح يُستخدم التخزين الدائم في IndexedDB، وفي بيئة الاختبارات بالذاكرة
  if (typeof indexedDB !== 'undefined' && !isNodeLikeRuntime()) {
    return NativeDatabase.browser('imdad.sqlite');
  }
  return NativeDatabase.memory();
}

export abstract class DriftDatabase {
  protected readonly executor: SqliteExecutor;
  private initPromise: Promise<void> | null = null;
  private initialized = false;
  private txDepth = 0;
  private queue: Promise<void> = Promise.resolve();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private opening = false;
  private readonly tableWatchers = new Map<string, Set<(tables: ReadonlySet<string>) => void>>();
  private pendingTxTables = new Set<string>();

  constructor(executor: SqliteExecutor) {
    this.executor = executor;
  }

  abstract get schemaVersion(): number;
  abstract get allTables(): readonly TableInfo<unknown>[];
  abstract get migration(): MigrationStrategy;

  createMigrator(): Migrator {
    return new Migrator(this, this.allTables);
  }

  private runSerialized<T>(fn: () => Promise<T>): Promise<T> {
    if (this.txDepth > 0 || this.opening) {
      return fn();
    }
    const next = this.queue.then(fn, fn);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async ensureOpen(): Promise<void> {
    if (this.initialized || this.opening) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.opening = true;
      try {
        const raw = await this.executor.open();
        const res = raw.exec('PRAGMA user_version');
        const currentVersion =
          res.length > 0 && res[0].values.length > 0
            ? Number(res[0].values[0][0] ?? 0)
            : 0;
        const target = this.schemaVersion;
        const m = this.createMigrator();
        const strat = this.migration;

        const wasCreated = currentVersion === 0;
        const hadUpgrade = !wasCreated && currentVersion < target;

        if (wasCreated) {
          await strat.onCreate(m);
          raw.run(`PRAGMA user_version = ${target}`);
        } else if (hadUpgrade && strat.onUpgrade) {
          raw.run('BEGIN');
          try {
            await strat.onUpgrade(m, currentVersion, target);
            raw.run(`PRAGMA user_version = ${target}`);
            raw.run('COMMIT');
          } catch (err) {
            try {
              raw.run('ROLLBACK');
            } catch {
              // تجاهل خطأ التراجع إذا لم تبدأ المعاملة
            }
            throw err;
          }
        }

        if (strat.beforeOpen) {
          await strat.beforeOpen({
            versionBefore: wasCreated ? null : currentVersion,
            versionNow: target,
            hadUpgrade,
            wasCreated,
          });
        }

        await this.executor.persist();
        this.initialized = true;
      } finally {
        this.opening = false;
      }
    })();

    try {
      await this.initPromise;
    } catch (err) {
      this.initPromise = null;
      throw err;
    }
  }

  private schedulePersist(): void {
    if (this.executor.inMemory || this.txDepth > 0 || this.opening) return;
    if (this.persistTimer !== null) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.executor.persist();
    }, 50);
  }

  async customStatement(sql: string, args: readonly unknown[] = []): Promise<void> {
    await this.ensureOpen();
    let mutatedTable: string | null = null;
    await this.runSerialized(async () => {
      await this.customStatementRaw(sql, args);
      mutatedTable = detectDmlTable(sql);
      if (this.txDepth === 0) {
        this.schedulePersist();
      }
    });
    if (mutatedTable) {
      this.notifyTableChanged(mutatedTable);
    }
  }

  async runWithRawChanges(
    sql: string,
    args: readonly unknown[],
    onChanges: (count: number) => void,
  ): Promise<void> {
    await this.ensureOpen();
    return this.runSerialized(async () => {
      await this.customStatementRaw(sql, args);
      const raw = this.executor.rawDatabase;
      onChanges(raw.getRowsModified());
      if (this.txDepth === 0) {
        this.schedulePersist();
      }
    });
  }

  notifyTableChanged(tableName: string): void {
    if (this.txDepth > 0) {
      this.pendingTxTables.add(tableName);
      return;
    }
    this.emitTableChanges(new Set([tableName]));
  }

  private emitTableChanges(tables: ReadonlySet<string>): void {
    if (tables.size === 0 || this.tableWatchers.size === 0) return;
    const called = new Set<(tables: ReadonlySet<string>) => void>();
    for (const table of tables) {
      const watchers = this.tableWatchers.get(table);
      if (!watchers) continue;
      for (const cb of watchers) {
        if (!called.has(cb)) {
          called.add(cb);
          queueMicrotask(() => cb(tables));
        }
      }
    }
  }

  tableUpdates(query: TableUpdateQuery): {
    listen(onData: (updates: ReadonlySet<string>) => void): TableUpdateSubscription;
  } {
    return {
      listen: (onData: (updates: ReadonlySet<string>) => void): TableUpdateSubscription => {
        for (const table of query.tables) {
          let set = this.tableWatchers.get(table);
          if (!set) {
            set = new Set();
            this.tableWatchers.set(table, set);
          }
          set.add(onData);
        }
        return {
          cancel: () => {
            for (const table of query.tables) {
              const set = this.tableWatchers.get(table);
              if (!set) continue;
              set.delete(onData);
              if (set.size === 0) {
                this.tableWatchers.delete(table);
              }
            }
          },
        };
      },
    };
  }

  async customStatementRaw(sql: string, args: readonly unknown[] = []): Promise<void> {
    const raw = this.executor.rawDatabase;
    if (args.length === 0) {
      raw.run(sql);
      return;
    }
    const stmt = raw.prepare(sql);
    try {
      stmt.bind(args.map((a) => toSqlParam(a)));
      while (stmt.step()) {
        // استهلاك التنفيذ
      }
    } finally {
      stmt.free();
    }
  }

  customSelect(
    sql: string,
    options: { readonly variables?: readonly Variable<unknown>[] } = {},
  ): CustomSelectStatement {
    return new CustomSelectStatement(async () => {
      await this.ensureOpen();
      return this.runSerialized(async () => {
        return this.customSelectRaw(sql, options.variables ?? []);
      });
    });
  }

  customSelectRaw(
    sql: string,
    variables: readonly Variable<unknown>[] = [],
  ): QueryRow[] {
    const raw = this.executor.rawDatabase;
    const stmt = raw.prepare(sql);
    const out: QueryRow[] = [];
    try {
      if (variables.length > 0) {
        stmt.bind(variables.map((v) => toSqlParam(v.value)));
      }
      const cols = stmt.getColumnNames();
      while (stmt.step()) {
        const vals = stmt.get();
        const rowData: Record<string, SqlValue> = {};
        for (let i = 0; i < cols.length; i++) {
          rowData[cols[i]] = vals[i] ?? null;
        }
        out.push(new QueryRow(rowData));
      }
    } finally {
      stmt.free();
    }
    return out;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select<TTable extends TableInfo<any>>(table: TTable): SelectBuilder<TTable, RowOf<TTable>> {
    return new SelectBuilder<TTable, RowOf<TTable>>(this, table);
  }

  into<TTable extends TableInfo<unknown>>(table: TTable): InsertBuilder<TTable> {
    return new InsertBuilder<TTable>(this, table);
  }

  update<TTable extends TableInfo<unknown>>(table: TTable): UpdateBuilder<TTable> {
    return new UpdateBuilder<TTable>(this, table);
  }

  intoRaw<TTable extends TableInfo<unknown>>(table: TTable): {
    insert: (data: CompanionRecord) => Promise<void>;
  } {
    return {
      insert: async (data: CompanionRecord) => {
        const { cols, params } = buildCompanionRow(table, data);
        if (cols.length === 0) {
          await this.customStatementRaw(
            `INSERT INTO "${table.actualTableName}" DEFAULT VALUES`,
          );
          this.notifyTableChanged(table.actualTableName);
          return;
        }
        const colList = cols.map((c) => `"${c}"`).join(', ');
        const placeholders = cols.map(() => '?').join(', ');
        await this.customStatementRaw(
          `INSERT INTO "${table.actualTableName}" (${colList}) VALUES (${placeholders})`,
          params,
        );
        this.notifyTableChanged(table.actualTableName);
      },
    };
  }

  delete<TTable extends TableInfo<unknown>>(table: TTable): DeleteBuilder<TTable> {
    return new DeleteBuilder<TTable>(this, table);
  }

  async batch(fn: (b: BatchRunner) => void): Promise<void> {
    await this.transaction(async () => {
      const runner = new BatchRunner(this);
      fn(runner);
      await runner.execute();
    });
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureOpen();
    let committedTables: Set<string> | null = null;
    const result = await this.runSerialized(async () => {
      const raw = this.executor.rawDatabase;
      const isOuter = this.txDepth === 0;
      const savepoint = `sp_${this.txDepth}`;
      this.txDepth++;
      raw.run(isOuter ? 'BEGIN' : `SAVEPOINT ${savepoint}`);
      try {
        const res = await fn();
        raw.run(isOuter ? 'COMMIT' : `RELEASE SAVEPOINT ${savepoint}`);
        if (isOuter) {
          await this.executor.persist();
          if (this.pendingTxTables.size > 0) {
            committedTables = new Set(this.pendingTxTables);
            this.pendingTxTables.clear();
          }
        }
        return res;
      } catch (err) {
        if (isOuter) {
          this.pendingTxTables.clear();
        }
        try {
          raw.run(
            isOuter
              ? 'ROLLBACK'
              : `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}`,
          );
        } catch {
          // تجاهل خطأ التراجع
        }
        throw err;
      } finally {
        this.txDepth--;
      }
    });
    if (committedTables) {
      this.emitTableChanges(committedTables);
    }
    return result;
  }

  async close(): Promise<void> {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.tableWatchers.clear();
    this.pendingTxTables.clear();
    await this.executor.close();
  }
}

function detectDmlTable(sql: string): string | null {
  const m = /^\s*(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM)\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i.exec(
    sql,
  );
  return m ? m[1] : null;
}
