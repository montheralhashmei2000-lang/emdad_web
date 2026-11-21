import { ErrorLogger } from '../../core/error_log';
import { DeviceActivation } from '../../core/security/device_activation';
import { OwnerPromotion } from '../../core/security/owner_promotion';
import { AuditRepo } from '../repos/audit_repo';
import { SignaturesRepo } from '../repos/signatures_repo';
import { SyncMarks } from '../sync/sync_marks';
import { ArchiveFilesTable } from './archive_tables';
import { CablesTable } from './cable_tables';
import {
  LinkArmamentsTable,
  LinkClearancesTable,
  LinkCustodySheetRowsTable,
  LinkCustodySheetsTable,
  LinkFinanceLedgerTable,
  LinkFinCustodiesTable,
  LinkMoneyReceiptsTable,
  LinkPersonsTable,
  LinkPurchaseContractsTable,
  LinkStatusLogsTable,
  LinkTermsTable,
} from './linkage_tables';
import { PreMigrationBackup } from './pre_migration_backup';
import {
  DriftDatabase,
  openConnection,
  Variable,
  type GeneratedColumn,
  type MigrationStrategy,
  type Migrator,
  type SqliteExecutor,
  type TableInfo,
} from './sqlite_driver';
import { AssetAssignmentsTable, AssetsTable } from './tables/asset_tables';
import {
  AppSettingsTable,
  AuditLogsTable,
  BeneficiaryUnitsTable,
  CategoriesTable,
  FacilitiesTable,
  ItemsTable,
  SensitiveReviewsTable,
  SuppliersTable,
  UsersTable,
  WarehousesTable,
} from './tables/core_tables';
import {
  EntitlementsTable,
  KitchenLogsTable,
  MealDispatchesTable,
  MealDispatchLinesTable,
  MealHeadcountsTable,
  MealPlanEntriesTable,
  MealPlansTable,
  StrengthsTable,
} from './tables/daily_tables';
import {
  FuelAllocationsTable,
  FuelIssuesTable,
  FuelOpeningsTable,
  FuelSettingsRowsTable,
  FuelStocktakeLinesTable,
  FuelStocktakesTable,
  FuelSuppliesTable,
  FuelTransfersTable,
  FuelUnitsTable,
  FuelWarehousesTable,
} from './tables/fuel_tables';
import {
  AdjustmentsTable,
  DestructionsTable,
  IssuesTable,
  OpeningBalancesTable,
  ReceiptsTable,
  ReturnsTable,
  TransfersTable,
} from './tables/movement_tables';
import {
  CampLedgersTable,
  CampStockLimitsTable,
  MonthlySettlementsTable,
  RationOrderLinesTable,
  RationOrdersTable,
  SupplyAuthoritiesTable,
  WarehouseStockLimitsTable,
} from './tables/ration_tables';
import { StocktakeLinesTable, StocktakesTable } from './tables/stocktake_tables';

export * from './archive_tables';
export * from './cable_tables';
export * from './linkage_tables';
export * from './tables/asset_tables';
export * from './tables/core_tables';
export * from './tables/daily_tables';
export * from './tables/fuel_tables';
export * from './tables/movement_tables';
export * from './tables/ration_tables';
export * from './tables/stocktake_tables';

/// مخطط قاعدة البيانات المحلية (SQLite عبر sql.js / IndexedDB):
/// 59 جدولًا تشمل النواة، الحركات، الجرد، الأصول، المحروقات، التشغيل اليومي،
/// طلبيات الإعاشة ودفاتر المعسكرات، الأرشيف، الارتباطات، والبرقيات.
export class AppDatabase extends DriftDatabase {
  /// إصدار المخطط الحالي.
  static readonly kSchemaVersion = 31;

  /// الكميات تُخزَّن بثلاث خانات عشرية بالضبط.
  static readonly quantityScale = 3;

  readonly fuelWarehouses = new FuelWarehousesTable();
  readonly fuelUnits = new FuelUnitsTable();
  readonly fuelSettingsRows = new FuelSettingsRowsTable();
  readonly fuelAllocations = new FuelAllocationsTable();
  readonly fuelIssues = new FuelIssuesTable();
  readonly fuelSupplies = new FuelSuppliesTable();
  readonly fuelOpenings = new FuelOpeningsTable();
  readonly fuelTransfers = new FuelTransfersTable();
  readonly fuelStocktakes = new FuelStocktakesTable();
  readonly fuelStocktakeLines = new FuelStocktakeLinesTable();
  readonly supplyAuthorities = new SupplyAuthoritiesTable();
  readonly warehouseStockLimits = new WarehouseStockLimitsTable();
  readonly users = new UsersTable();
  readonly categories = new CategoriesTable();
  readonly items = new ItemsTable();
  readonly warehouses = new WarehousesTable();
  readonly suppliers = new SuppliersTable();
  readonly beneficiaryUnits = new BeneficiaryUnitsTable();
  readonly facilities = new FacilitiesTable();
  readonly receipts = new ReceiptsTable();
  readonly issues = new IssuesTable();
  readonly transfers = new TransfersTable();
  readonly returns = new ReturnsTable();
  readonly openingBalances = new OpeningBalancesTable();
  readonly strengths = new StrengthsTable();
  readonly kitchenLogs = new KitchenLogsTable();
  readonly entitlements = new EntitlementsTable();
  readonly stocktakes = new StocktakesTable();
  readonly stocktakeLines = new StocktakeLinesTable();
  readonly adjustments = new AdjustmentsTable();
  readonly destructions = new DestructionsTable();
  readonly auditLogs = new AuditLogsTable();
  readonly sensitiveReviews = new SensitiveReviewsTable();
  readonly assets = new AssetsTable();
  readonly assetAssignments = new AssetAssignmentsTable();
  readonly rationOrders = new RationOrdersTable();
  readonly rationOrderLines = new RationOrderLinesTable();
  readonly mealPlans = new MealPlansTable();
  readonly mealPlanEntries = new MealPlanEntriesTable();
  readonly mealHeadcounts = new MealHeadcountsTable();
  readonly mealDispatches = new MealDispatchesTable();
  readonly mealDispatchLines = new MealDispatchLinesTable();
  readonly campLedgers = new CampLedgersTable();
  readonly campStockLimits = new CampStockLimitsTable();
  readonly monthlySettlements = new MonthlySettlementsTable();
  readonly appSettings = new AppSettingsTable();
  readonly archiveFiles = new ArchiveFilesTable();
  readonly linkPersons = new LinkPersonsTable();
  readonly linkStatusLogs = new LinkStatusLogsTable();
  readonly linkTerms = new LinkTermsTable();
  readonly linkFinCustodies = new LinkFinCustodiesTable();
  readonly linkClearances = new LinkClearancesTable();
  readonly linkPurchaseContracts = new LinkPurchaseContractsTable();
  readonly linkCustodySheets = new LinkCustodySheetsTable();
  readonly linkCustodySheetRows = new LinkCustodySheetRowsTable();
  readonly linkArmaments = new LinkArmamentsTable();
  readonly linkMoneyReceipts = new LinkMoneyReceiptsTable();
  readonly linkFinanceLedger = new LinkFinanceLedgerTable();
  readonly cables = new CablesTable();

  constructor(executor?: SqliteExecutor) {
    super(executor ?? openConnection());
  }

  static forTesting(executor: SqliteExecutor): AppDatabase {
    return new AppDatabase(executor);
  }

  override get schemaVersion(): number {
    return AppDatabase.kSchemaVersion;
  }

  override get allTables(): readonly TableInfo<unknown>[] {
    return [
      this.fuelWarehouses,
      this.fuelUnits,
      this.fuelSettingsRows,
      this.fuelAllocations,
      this.fuelIssues,
      this.fuelSupplies,
      this.fuelOpenings,
      this.fuelTransfers,
      this.fuelStocktakes,
      this.fuelStocktakeLines,
      this.supplyAuthorities,
      this.warehouseStockLimits,
      this.users,
      this.categories,
      this.items,
      this.warehouses,
      this.suppliers,
      this.beneficiaryUnits,
      this.facilities,
      this.receipts,
      this.issues,
      this.transfers,
      this.returns,
      this.openingBalances,
      this.strengths,
      this.kitchenLogs,
      this.entitlements,
      this.stocktakes,
      this.stocktakeLines,
      this.adjustments,
      this.destructions,
      this.auditLogs,
      this.sensitiveReviews,
      this.assets,
      this.assetAssignments,
      this.rationOrders,
      this.rationOrderLines,
      this.mealPlans,
      this.mealPlanEntries,
      this.mealHeadcounts,
      this.mealDispatches,
      this.mealDispatchLines,
      this.campLedgers,
      this.campStockLimits,
      this.monthlySettlements,
      this.appSettings,
      this.archiveFiles,
      this.linkPersons,
      this.linkStatusLogs,
      this.linkTerms,
      this.linkFinCustodies,
      this.linkClearances,
      this.linkPurchaseContracts,
      this.linkCustodySheets,
      this.linkCustodySheetRows,
      this.linkArmaments,
      this.linkMoneyReceipts,
      this.linkFinanceLedger,
      this.cables,
    ];
  }

  /// الجداول التي تحمل كميات الأصناف، وأعمدة الكمية في كل منها.
  private static readonly _quantityColumns: Readonly<Record<string, readonly string[]>> = {
    receipts: ['qty', 'base_qty'],
    issues: ['qty', 'base_qty'],
    transfers: ['qty', 'base_qty'],
    returns: ['qty', 'base_qty'],
    adjustments: ['qty', 'base_qty'],
    opening_balances: ['qty'],
  };

  /// جداول الحركات التي يُمنع فيها السالب (التسويات مستثناة: فرق الجرد سالب بطبيعته).
  private static readonly _nonNegativeTables: readonly string[] = [
    'receipts',
    'issues',
    'transfers',
    'returns',
    'opening_balances',
  ];

  /// شرط SQL: للصنف [itemIdSql] أي حركة مسجَّلة (يصلح بعد `WHERE`).
  static itemHasMovementsSql(itemIdSql: string): string {
    return Object.keys(AppDatabase._quantityColumns)
      .map((t) => `EXISTS (SELECT 1 FROM "${t}" WHERE item_id = ${itemIdSql})`)
      .join(' OR ');
  }

  private async _createIndexes(): Promise<void> {
    const movementTables = ['receipts', 'issues', 'transfers', 'returns', 'adjustments'];
    const statements: string[] = [
      ...movementTables.flatMap((t) => [
        `CREATE INDEX IF NOT EXISTS ix_${t}_ref ON ${t} (ref_no)`,
        `CREATE INDEX IF NOT EXISTS ix_${t}_status ON ${t} (status)`,
        `CREATE INDEX IF NOT EXISTS ix_${t}_wh_item ON ${t} (warehouse, item_id)`,
        `CREATE INDEX IF NOT EXISTS ix_${t}_date ON ${t} (date)`,
      ]),
      'CREATE INDEX IF NOT EXISTS ix_opening_wh_item ON opening_balances (warehouse, item_id)',
      'CREATE INDEX IF NOT EXISTS ix_transfers_dest ON transfers (dest_warehouse)',
      'CREATE INDEX IF NOT EXISTS ix_items_code ON items (code)',
      'CREATE INDEX IF NOT EXISTS ix_items_barcode ON items (barcode)',
      'CREATE INDEX IF NOT EXISTS ix_items_category ON items (category_id)',
      'CREATE INDEX IF NOT EXISTS ix_audit_date ON audit_logs (log_date)',
      'CREATE INDEX IF NOT EXISTS ix_audit_created ON audit_logs (created_at)',
      'CREATE INDEX IF NOT EXISTS ix_stocktake_lines_session ON stocktake_lines (session_id)',
      'CREATE INDEX IF NOT EXISTS ix_stocktakes_wh ON stocktakes (warehouse, status)',
      'CREATE INDEX IF NOT EXISTS ix_strengths_date ON strengths (strength_date)',
      'CREATE INDEX IF NOT EXISTS ix_kitchen_logs_date ON kitchen_logs (date)',
      'CREATE INDEX IF NOT EXISTS ix_assets_type_status ON assets (asset_type, status)',
      'CREATE INDEX IF NOT EXISTS ix_assets_wh ON assets (warehouse)',
      'CREATE INDEX IF NOT EXISTS ix_asset_assign_asset ON asset_assignments (asset_id)',
      'CREATE INDEX IF NOT EXISTS ix_ration_status ON ration_orders (status)',
      'CREATE INDEX IF NOT EXISTS ix_ration_wh ON ration_orders (requesting_warehouse)',
      'CREATE INDEX IF NOT EXISTS ix_ration_lines_order ON ration_order_lines (order_id)',
      'CREATE INDEX IF NOT EXISTS ix_meal_plans_status ON meal_plans (status)',
      'CREATE INDEX IF NOT EXISTS ix_meal_entries_plan ON meal_plan_entries (plan_id, entry_date)',
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_camp_ledger ON camp_ledgers (camp_id, item_id, year, month)',
      'CREATE INDEX IF NOT EXISTS ix_camp_ledger_month ON camp_ledgers (year, month, status)',
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_camp_limit ON camp_stock_limits (camp_id, item_id)',
      'DROP INDEX IF EXISTS ux_settlement_month',
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_settlement_scope ON monthly_settlements (year, month, scope_key)',
      'CREATE INDEX IF NOT EXISTS ix_returns_unit ON returns (beneficiary_unit_id)',
      'CREATE INDEX IF NOT EXISTS ix_ration_kind ON ration_orders (order_kind, status)',
      'CREATE INDEX IF NOT EXISTS ix_ration_supply ON ration_orders (supplying_warehouse, status)',
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_wh_limit ON warehouse_stock_limits (warehouse_id, item_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_fuel_wh_name ON fuel_warehouses (name)',
      'CREATE UNIQUE INDEX IF NOT EXISTS ux_fuel_unit_name ON fuel_units (name)',
      'CREATE INDEX IF NOT EXISTS ix_fuel_issue_date ON fuel_issues (date)',
      'CREATE INDEX IF NOT EXISTS ix_fuel_issue_alloc ON fuel_issues (allocation_id)',
      'CREATE INDEX IF NOT EXISTS ix_fuel_issue_chassis ON fuel_issues (chassis_no)',
      'CREATE INDEX IF NOT EXISTS ix_fuel_supply_date ON fuel_supplies (date)',
      'CREATE INDEX IF NOT EXISTS ix_fuel_transfer_date ON fuel_transfers (date)',
      'CREATE INDEX IF NOT EXISTS ix_fuel_alloc_unit ON fuel_allocations (unit_id, active)',
      'CREATE INDEX IF NOT EXISTS ix_fuel_stline_doc ON fuel_stocktake_lines (stocktake_id)',
      'CREATE INDEX IF NOT EXISTS ix_link_persons_status ON link_persons (status)',
      'CREATE INDEX IF NOT EXISTS ix_link_status_person ON link_status_logs (person_id)',
      'CREATE INDEX IF NOT EXISTS ix_link_custody_cleared ON link_fin_custodies (cleared)',
      'CREATE INDEX IF NOT EXISTS ix_link_clear_ref ON link_clearances (kind, ref_id)',
      'CREATE INDEX IF NOT EXISTS ix_link_contract_custody ON link_purchase_contracts (custody_id)',
      'CREATE INDEX IF NOT EXISTS ix_link_sheet_custody ON link_custody_sheets (custody_id)',
      'CREATE INDEX IF NOT EXISTS ix_link_ledger_party ON link_finance_ledger (party_name)',
      'CREATE INDEX IF NOT EXISTS ix_link_contracts_status ON link_purchase_contracts (status)',
      'CREATE INDEX IF NOT EXISTS ix_link_sheet_rows ON link_custody_sheet_rows (sheet_id, seq)',
      'CREATE INDEX IF NOT EXISTS ix_link_arm_person ON link_armaments (person_id)',
      'CREATE INDEX IF NOT EXISTS ix_archive_cat ON archive_files (category)',
      'CREATE INDEX IF NOT EXISTS ix_archive_date ON archive_files (doc_date)',
      'CREATE INDEX IF NOT EXISTS ix_archive_ref ON archive_files (doc_ref)',
      'CREATE INDEX IF NOT EXISTS ix_archive_wh ON archive_files (warehouse)',
      'CREATE INDEX IF NOT EXISTS ix_archive_op_ref ON archive_files (op_type, doc_ref)',
      'CREATE INDEX IF NOT EXISTS ix_cables_date ON cables (cable_date)',
      'CREATE INDEX IF NOT EXISTS ix_cables_dir ON cables (direction)',
      'CREATE INDEX IF NOT EXISTS ix_cables_status ON cables (status)',
      'CREATE INDEX IF NOT EXISTS ix_cables_class ON cables (classification)',
      'CREATE INDEX IF NOT EXISTS ix_meal_dispatch_fac_date ON meal_dispatches (facility_id, date)',
      'CREATE INDEX IF NOT EXISTS ix_meal_dispatch_lines_head ON meal_dispatch_lines (dispatch_id)',
      'CREATE INDEX IF NOT EXISTS ix_meal_headcounts_fac_date ON meal_headcounts (facility_id, date)',
    ];
    for (const sql of statements) {
      await this.customStatement(sql);
    }
  }

  private async _createQuantityGuards(): Promise<void> {
    for (const t of AppDatabase._nonNegativeTables) {
      const cols = AppDatabase._quantityColumns[t];
      const negParts = cols.map((c) => `NEW.${c} < 0`);
      if (t !== 'opening_balances') {
        negParts.push('NEW.factor < 0');
      }
      const negative = negParts.join(' OR ');
      for (const event of ['INSERT', 'UPDATE'] as const) {
        await this.customStatement(`
          CREATE TRIGGER IF NOT EXISTS tg_${t}_${event.toLowerCase()}_qty_guard
          BEFORE ${event} ON "${t}"
          WHEN ${negative}
          BEGIN
            SELECT RAISE(ABORT, 'كمية أو معامل تحويل سالب في ${t}');
          END
        `);
      }
    }

    for (const [t, cols] of Object.entries(AppDatabase._quantityColumns)) {
      const needs = cols
        .map((c) => `NEW.${c} <> ROUND(NEW.${c}, ${AppDatabase.quantityScale})`)
        .join(' OR ');
      const set = cols
        .map((c) => `${c} = ROUND(${c}, ${AppDatabase.quantityScale})`)
        .join(', ');
      for (const event of ['INSERT', 'UPDATE'] as const) {
        await this.customStatement(`
          CREATE TRIGGER IF NOT EXISTS tg_${t}_${event.toLowerCase()}_qty_round
          AFTER ${event} ON "${t}"
          WHEN ${needs}
          BEGIN
            UPDATE "${t}" SET ${set} WHERE rowid = NEW.rowid;
          END
        `);
      }
    }

    await this.customStatement(`
      CREATE TRIGGER IF NOT EXISTS tg_items_delete_guard
      BEFORE DELETE ON items
      WHEN ${AppDatabase.itemHasMovementsSql('OLD.id')}
      BEGIN
        SELECT RAISE(ABORT, 'لا يُحذف صنف له حركات');
      END
    `);
  }

  /// أسماء أعمدة جدول قائم.
  private async _columnsOf(table: string): Promise<Set<string>> {
    const rows = await this.customSelect(`PRAGMA table_info("${table}")`).get();
    return new Set(rows.map((r) => String(r.data['name'])));
  }

  /// يضيف العمود إن لم يكن موجودًا.
  private async _addCol(
    m: Migrator,
    t: TableInfo<unknown>,
    c: GeneratedColumn<unknown>,
  ): Promise<void> {
    const cols = await this._columnsOf(t.actualTableName);
    if (cols.has(c.name)) return;
    await m.addColumn(t, c);
  }

  /// ينشئ الجدول إن لم يكن موجودًا.
  private async _createIfMissing(m: Migrator, t: TableInfo<unknown>): Promise<void> {
    const rows = await this.customSelect(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      { variables: [Variable.withString(t.actualTableName)] },
    ).get();
    if (rows.length > 0) return;
    await m.createTable(t);
  }

  /// يضمن أن كل جدول وعمود يصفه المخطط موجودٌ فعلًا في القاعدة.
  private async _ensureSchema(): Promise<number> {
    const m = this.createMigrator();
    let added = 0;
    for (const table of this.allTables) {
      await this._createIfMissing(m, table);
      const present = await this._columnsOf(table.actualTableName);
      for (const col of table.$columns) {
        if (present.has(col.name)) continue;
        if (col.defaultValue == null && !col.$nullable) continue;
        await m.addColumn(table, col);
        added++;
      }
    }
    return added;
  }

  private async _promoteOwnerAfterUpgrade(): Promise<void> {
    try {
      const branch = await new DeviceActivation(this).isBranch();
      await OwnerPromotion.run(this, { isBranchDevice: branch });
    } catch (err) {
      ErrorLogger.log(
        'migration.v25.ownerPromotion',
        err,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  /// ترحيل العهد القديمة إلى النموذج المالي الجديد دون حذف شيء
  async backfillFinance(): Promise<void> {
    await this.customStatement(
      "UPDATE link_fin_custodies SET status = 'cleared' WHERE cleared = 1",
    );
    await this.customStatement(
      'UPDATE link_fin_custodies SET amount = value_amount WHERE amount = 0 AND value_amount > 0',
    );
    await this.customStatement(
      "UPDATE link_fin_custodies SET kind = 'delivered', receiver_name = holder WHERE holder <> '' AND receiver_name = ''",
    );
  }

  /// يملأ القيم الفارغة في أعمدةٍ لا تقبل الفراغ.
  private async _repairNulls(): Promise<number> {
    let fixed = 0;
    for (const table of this.allTables) {
      const name = table.actualTableName;
      const present = await this._columnsOf(name);
      for (const col of table.$columns) {
        if (col.$nullable || !present.has(col.name)) continue;
        const fallback = (() => {
          switch (col.type) {
            case 'string':
              return "''";
            case 'bool':
              return '0';
            case 'int':
            case 'bigInt':
            case 'double':
              return '0';
            default:
              return null;
          }
        })();
        if (fallback == null) continue;
        await this.customStatement(
          `UPDATE "${name}" SET "${col.name}" = ${fallback} WHERE "${col.name}" IS NULL`,
        );
        const res = await this.customSelect('SELECT changes() AS c').getSingle();
        fixed += Number(res.data['c'] ?? 0);
      }
    }
    return fixed;
  }

  override get migration(): MigrationStrategy {
    return {
      onCreate: (m) => m.createAll(),
      onUpgrade: async (m, from, _to) => {
        // v2: حقول الموردين وسجل التدقيق.
        if (from < 2) {
          await this._addCol(m, this.suppliers, this.suppliers.contact);
          await this._addCol(m, this.suppliers, this.suppliers.city);
          await this._addCol(m, this.beneficiaryUnits, this.beneficiaryUnits.category);
          await this._addCol(m, this.issues, this.issues.approvedBy);
          await this._addCol(m, this.issues, this.issues.rejectReason);
          await this._addCol(m, this.issues, this.issues.rejectedBy);
          await this._addCol(m, this.issues, this.issues.cylinderAction);
          await this._addCol(m, this.issues, this.issues.officerCount);
          await this._addCol(m, this.receipts, this.receipts.supervision);
          await this._addCol(m, this.receipts, this.receipts.audit);
          await this._addCol(m, this.receipts, this.receipts.cylinderAction);
          for (const col of [
            this.receipts.editedBy,
            this.receipts.cancelReason,
            this.receipts.cancelledBy,
            this.receipts.prevStatus,
          ]) {
            await this._addCol(m, this.receipts, col);
          }
          for (const col of [
            this.issues.editedBy,
            this.issues.cancelReason,
            this.issues.cancelledBy,
            this.issues.prevStatus,
          ]) {
            await this._addCol(m, this.issues, col);
          }
          for (const col of [
            this.transfers.editedBy,
            this.transfers.cancelReason,
            this.transfers.cancelledBy,
            this.transfers.prevStatus,
          ]) {
            await this._addCol(m, this.transfers, col);
          }
          for (const col of [
            this.returns.editedBy,
            this.returns.cancelReason,
            this.returns.cancelledBy,
            this.returns.prevStatus,
          ]) {
            await this._addCol(m, this.returns, col);
          }
          for (const col of [
            this.adjustments.editedBy,
            this.adjustments.cancelReason,
            this.adjustments.cancelledBy,
            this.adjustments.prevStatus,
          ]) {
            await this._addCol(m, this.adjustments, col);
          }
          for (const col of [
            this.auditLogs.actorName,
            this.auditLogs.actorRole,
            this.auditLogs.refNo,
            this.auditLogs.warehouse,
            this.auditLogs.target,
            this.auditLogs.status,
            this.auditLogs.itemCount,
            this.auditLogs.qty,
          ]) {
            await this._addCol(m, this.auditLogs, col);
          }
        }
        // v3: ملاحظة المقرر في شاشة نسب الاستهلاك.
        if (from < 3) {
          await this._addCol(m, this.entitlements, this.entitlements.notes);
        }
        // v5: جدول مراجعة الأحداث الحساسة.
        if (from < 5) {
          await this._createIfMissing(m, this.sensitiveReviews);
        }
        // v7: وحدة العرض الافتراضية في بطاقة الصنف.
        if (from < 7) {
          await this._addCol(m, this.items, this.items.reportUnit);
        }
        // v6: ربط الوحدة بأكثر من منشأة (مطبخ وفرن معًا).
        if (from < 6) {
          await this._addCol(m, this.beneficiaryUnits, this.beneficiaryUnits.facilityIds);
          await this.customStatement(
            'UPDATE beneficiary_units SET facility_ids = \'["\' || facility_id || \'"]\' ' +
              "WHERE facility_id <> '' AND (facility_ids = '[]' OR facility_ids IS NULL)",
          );
        }
        // v4: حقول إلغاء أمر الجرد وإحصاءات إغلاقه.
        if (from < 4) {
          for (const col of [
            this.stocktakes.categoryName,
            this.stocktakes.cancelReason,
            this.stocktakes.cancelledBy,
            this.stocktakes.closedBy,
            this.stocktakes.countedCount,
            this.stocktakes.varianceCount,
            this.stocktakes.adjustedCount,
          ]) {
            await this._addCol(m, this.stocktakes, col);
          }
        }
        // v8: الأصول الثابتة وعهدها، وطلبيات الإعاشة وسطورها.
        if (from < 8) {
          await this._createIfMissing(m, this.assets);
          await this._createIfMissing(m, this.assetAssignments);
          await this._createIfMissing(m, this.rationOrders);
          await this._createIfMissing(m, this.rationOrderLines);
        }
        // v9: خطط الوجبات ومدخلاتها.
        if (from < 9) {
          await this._createIfMissing(m, this.mealPlans);
          await this._createIfMissing(m, this.mealPlanEntries);
        }
        // v10: سجل حساب المعسكرات وحدود مخزونها وأرشيف التصفيات.
        if (from < 10) {
          await this._addCol(m, this.warehouses, this.warehouses.isMain);
          await this._createIfMissing(m, this.campLedgers);
          await this._createIfMissing(m, this.campStockLimits);
          await this._createIfMissing(m, this.monthlySettlements);
        }
        // v11: ربط المرتجع بوحدته بالمعرّف لا بالاسم.
        if (from < 11) {
          await this._addCol(m, this.returns, this.returns.beneficiaryUnitId);
          await this._addCol(m, this.returns, this.returns.beneficiaryUnitName);
        }
        // v12: صلاحية دفعات الوارد لتنبيهات قرب الانتهاء.
        if (from < 12) {
          await this._addCol(m, this.receipts, this.receipts.expiryDate);
        }
        // v13: حالة الأسطوانات (ممتلئة/فارغة) في التحويلات والمرتجعات.
        if (from < 13) {
          await this._addCol(m, this.transfers, this.transfers.cylinderAction);
          await this._addCol(m, this.returns, this.returns.cylinderAction);
        }
        // v14: نوع الطلبية وجهتها ومستند تنفيذها.
        if (from < 14) {
          await this._createIfMissing(m, this.supplyAuthorities);
          await this._addCol(m, this.rationOrders, this.rationOrders.orderKind);
          await this._addCol(m, this.rationOrders, this.rationOrders.authorityId);
          await this._addCol(m, this.rationOrders, this.rationOrders.authorityName);
          await this._addCol(m, this.rationOrders, this.rationOrders.fulfillRef);
          await this._addCol(m, this.rationOrders, this.rationOrders.fulfillKind);
          await this._addCol(m, this.rationOrders, this.rationOrders.fulfillDate);
          await this.customStatement(
            'UPDATE ration_orders SET fulfill_ref = receipt_ref, ' +
              "fulfill_kind = 'RECEIPT' WHERE receipt_ref <> ''",
          );
        }
        // v16: كمية الأصل، وحدود المخزون بالمستودع لا بالمعسكر.
        if (from < 16) {
          await this._addCol(m, this.assets, this.assets.quantity);
          await this._createIfMissing(m, this.warehouseStockLimits);
        }
        // v17: قسم المحروقات — جداوله وسعة المستودع منها.
        if (from < 17) {
          await this._addCol(m, this.warehouses, this.warehouses.fuelCapacityLiters);
          for (const t of [
            this.fuelAllocations,
            this.fuelIssues,
            this.fuelSupplies,
            this.fuelOpenings,
            this.fuelTransfers,
            this.fuelStocktakes,
            this.fuelStocktakeLines,
          ]) {
            await this._createIfMissing(m, t);
          }
        }
        // v18: فصل قسم المحروقات — دليلا مستودعاته ووحداته وإعداداته.
        if (from < 18) {
          for (const t of [
            this.fuelWarehouses,
            this.fuelUnits,
            this.fuelSettingsRows,
          ]) {
            await this._createIfMissing(m, t);
          }
          await this.customStatement(
            'INSERT OR IGNORE INTO fuel_warehouses ' +
              '(id, code, name, manager, location, capacity_liters, active, notes) ' +
              'SELECT id, code, name, manager, location, fuel_capacity_liters, 1, notes ' +
              'FROM warehouses WHERE fuel_capacity_liters > 0 ' +
              'OR name IN (SELECT warehouse FROM fuel_issues) ' +
              'OR name IN (SELECT warehouse FROM fuel_supplies) ' +
              'OR name IN (SELECT warehouse FROM fuel_openings) ' +
              'OR name IN (SELECT from_warehouse FROM fuel_transfers) ' +
              'OR name IN (SELECT to_warehouse FROM fuel_transfers) ' +
              'OR name IN (SELECT warehouse FROM fuel_stocktakes)',
          );
          await this.customStatement(
            'INSERT OR IGNORE INTO fuel_units (id, code, name, active) ' +
              'SELECT id, code, name, 1 FROM beneficiary_units ' +
              'WHERE id IN (SELECT unit_id FROM fuel_allocations)',
          );
        }
        // v19: ترويسة البرقية الرسمية في الإعدادات لا في الكود.
        if (from < 19) {
          for (const c of [
            this.fuelSettingsRows.parentOrg,
            this.fuelSettingsRows.agencyTitle,
            this.fuelSettingsRows.commandTitle,
            this.fuelSettingsRows.branchTitle,
            this.fuelSettingsRows.orgName,
            this.fuelSettingsRows.sealLines,
          ]) {
            await this._addCol(m, this.fuelSettingsRows, c);
          }
        }
        // v20: عمل كل موقّعٍ في الإعدادات لا في الكود.
        if (from < 20) {
          for (const c of [
            this.fuelSettingsRows.roleOfficer,
            this.fuelSettingsRows.roleSupply,
            this.fuelSettingsRows.roleChief,
          ]) {
            await this._addCol(m, this.fuelSettingsRows, c);
          }
        }
        // v21: الأرشيف الإلكتروني — جدول ملفاته الوصفية.
        if (from < 21) {
          await this._createIfMissing(m, this.archiveFiles);
        }
        // v22: الارتباطات — القوة البشرية والمالية والتسليح.
        if (from < 22) {
          await this._createIfMissing(m, this.linkPersons);
          await this._createIfMissing(m, this.linkStatusLogs);
          await this._createIfMissing(m, this.linkTerms);
          await this._createIfMissing(m, this.linkFinCustodies);
          await this._createIfMissing(m, this.linkClearances);
          await this._createIfMissing(m, this.linkPurchaseContracts);
          await this._createIfMissing(m, this.linkCustodySheets);
          await this._createIfMissing(m, this.linkCustodySheetRows);
          await this._createIfMissing(m, this.linkArmaments);
        }
        // v23: البرقيات.
        if (from < 23) {
          await this._createIfMissing(m, this.cables);
        }
        // v24: النموذج المالي المتكامل — دفتر رصيد المالية.
        if (from < 24) {
          await this._createIfMissing(m, this.linkFinanceLedger);
        }
        // v25: حجب الأقسام وتوقيع المالك على حساب المستخدم.
        if (from < 25) {
          const userCols = await this._columnsOf('users');
          if (!userCols.has('section_blocked')) {
            await m.addColumn(this.users, this.users.sectionBlocked);
          }
          if (!userCols.has('owner_sig')) {
            await m.addColumn(this.users, this.users.ownerSig);
          }
        }
        // v26: سقف تراكم استحقاق المحروقات وما شُطب منه بالتصفير.
        if (from < 26) {
          await this._addCol(m, this.fuelSettingsRows, this.fuelSettingsRows.carryCapPeriods);
          await this._addCol(m, this.fuelAllocations, this.fuelAllocations.writtenOffLiters);
        }
        // v27: الأصول الثابتة أصنافٌ مخزنية، وعهدها لدى المطابخ والأفران، ومحضر الإتلاف.
        if (from < 27) {
          await this._addCol(m, this.issues, this.issues.receiverName);
          await this._addCol(m, this.items, this.items.isAsset);
          await this._addCol(m, this.items, this.items.assetType);
          await this._addCol(m, this.items, this.items.lifespanMonths);
          await this._addCol(m, this.items, this.items.unitValue);
          await this._addCol(m, this.assets, this.assets.itemId);
          await this._addCol(m, this.assetAssignments, this.assetAssignments.facilityId);
          await this._addCol(m, this.assetAssignments, this.assetAssignments.facilityName);
          await this._createIfMissing(m, this.destructions);
        }
        // v28: صرف الوجبات الذكي.
        if (from < 28) {
          for (const col of [
            this.entitlements.isCritical,
            this.entitlements.substituteItemId,
            this.entitlements.substituteItemName,
            this.entitlements.substituteRatio,
          ]) {
            await this._addCol(m, this.entitlements, col);
          }
          for (const col of [
            this.mealPlanEntries.isCritical,
            this.mealPlanEntries.substituteItemId,
            this.mealPlanEntries.substituteItemName,
            this.mealPlanEntries.substituteUnitName,
            this.mealPlanEntries.substituteFactor,
            this.mealPlanEntries.substituteQtyPerPerson,
            this.mealPlanEntries.stdKey,
          ]) {
            await this._addCol(m, this.mealPlanEntries, col);
          }
          await this._createIfMissing(m, this.mealHeadcounts);
          await this._createIfMissing(m, this.mealDispatches);
          await this._createIfMissing(m, this.mealDispatchLines);
        }
        if (from < 29) {
          await this._addCol(m, this.monthlySettlements, this.monthlySettlements.scopeKey);
          await this._addCol(m, this.monthlySettlements, this.monthlySettlements.scopeLabel);
          await this._addCol(m, this.linkFinanceLedger, this.linkFinanceLedger.receiptId);
        }
        if (from < 30) {
          await this._addCol(m, this.cables, this.cables.branch);
        }
        if (from < 31) {
          await this._addCol(m, this.openingBalances, this.openingBalances.breakdown);
        }
        // v15+: إصلاح ما خلّفه تنقّل القاعدة بين نسختين مختلفتي المخطط.
        await this._repairNulls();
      },
      beforeOpen: async (details) => {
        await this.customStatement('PRAGMA foreign_keys = ON');
        await this.customStatement('PRAGMA journal_mode = WAL');
        const custodyColsBefore = await this._columnsOf('link_fin_custodies');
        const needFinanceBackfill =
          custodyColsBefore.size > 0 && !custodyColsBefore.has('status');
        const healed = await this._ensureSchema();
        if (needFinanceBackfill) await this.backfillFinance();
        if (healed > 0) await this._repairNulls();
        await this._createIndexes();
        await this._createQuantityGuards();
        await SyncMarks.install(this);
        await SignaturesRepo.install(this);
        await new SyncMarks(this).pruneTombstones();
        await new AuditRepo(this).prune();
        await PreMigrationBackup.settle(this, { schemaVersion: this.schemaVersion });
        const before = details.versionBefore;
        if (details.hadUpgrade && before != null && before < 25) {
          await this._promoteOwnerAfterUpgrade();
        }
      },
    };
  }
}
