import {
  boolColumn,
  Constant,
  currentDateAndTime,
  dateTimeColumn,
  DriftTable,
  intColumn,
  realColumn,
  textColumn,
  type CompanionInput,
  type GeneratedColumn,
} from '../sqlite_driver';

/// v14: الجهات التي يُطلب منها — لا مستودعات ولا موردون.
export interface SupplyAuthority extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly notes: string;
  readonly active: boolean;
  readonly createdAt: Date;
}

export class SupplyAuthoritiesTable extends DriftTable<SupplyAuthority> {
  readonly actualTableName = 'supply_authorities';

  readonly id = textColumn('id');
  readonly name = textColumn('name');
  readonly title = textColumn('title').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly active = boolColumn('active').withDefault(Constant(true));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const SupplyAuthoritiesCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    name: CompanionInput<string>;
    title?: CompanionInput<string>;
    notes?: CompanionInput<string>;
    active?: CompanionInput<boolean>;
    createdAt?: CompanionInput<Date>;
  }) {
    return data;
  },
};

export interface RationOrder extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly requestingWarehouse: string;
  readonly supplyingWarehouse: string;
  readonly date: string;
  readonly requiredDate: string;
  readonly status: string;
  readonly priority: string;
  readonly notes: string;
  readonly rejectReason: string;
  readonly createdBy: string;
  readonly approvedBy: string;
  readonly receivedBy: string;
  readonly receiptRef: string;
  readonly orderKind: string;
  readonly authorityId: string;
  readonly authorityName: string;
  readonly fulfillRef: string;
  readonly fulfillKind: string;
  readonly fulfillDate: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class RationOrdersTable extends DriftTable<RationOrder> {
  readonly actualTableName = 'ration_orders';

  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly requestingWarehouse = textColumn('requestingWarehouse').withDefault(Constant(''));
  readonly supplyingWarehouse = textColumn('supplyingWarehouse').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly requiredDate = textColumn('requiredDate').withDefault(Constant(''));
  /// DRAFT | PENDING | APPROVED | RECEIVED | REJECTED
  readonly status = textColumn('status').withDefault(Constant('DRAFT'));
  readonly priority = textColumn('priority').withDefault(Constant('NORMAL'));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly rejectReason = textColumn('rejectReason').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly approvedBy = textColumn('approvedBy').withDefault(Constant(''));
  readonly receivedBy = textColumn('receivedBy').withDefault(Constant(''));
  readonly receiptRef = textColumn('receiptRef').withDefault(Constant(''));
  /// v14: نوع الطلبية — `MAIN` أو `BRANCH`
  readonly orderKind = textColumn('orderKind').withDefault(Constant('BRANCH'));
  /// v14: الجهة المطلوب منها — لطلبية المخزن الرئيسي وحدها.
  readonly authorityId = textColumn('authorityId').withDefault(Constant(''));
  readonly authorityName = textColumn('authorityName').withDefault(Constant(''));
  /// v14: المستند الذي نُفِّذت به الطلبية
  readonly fulfillRef = textColumn('fulfillRef').withDefault(Constant(''));
  /// `TRANSFER` | `RECEIPT`
  readonly fulfillKind = textColumn('fulfillKind').withDefault(Constant(''));
  readonly fulfillDate = textColumn('fulfillDate').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const RationOrdersCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    refNo?: CompanionInput<string>;
    requestingWarehouse?: CompanionInput<string>;
    supplyingWarehouse?: CompanionInput<string>;
    date?: CompanionInput<string>;
    requiredDate?: CompanionInput<string>;
    status?: CompanionInput<string>;
    priority?: CompanionInput<string>;
    notes?: CompanionInput<string>;
    rejectReason?: CompanionInput<string>;
    createdBy?: CompanionInput<string>;
    approvedBy?: CompanionInput<string>;
    receivedBy?: CompanionInput<string>;
    receiptRef?: CompanionInput<string>;
    orderKind?: CompanionInput<string>;
    authorityId?: CompanionInput<string>;
    authorityName?: CompanionInput<string>;
    fulfillRef?: CompanionInput<string>;
    fulfillKind?: CompanionInput<string>;
    fulfillDate?: CompanionInput<string>;
    createdAt?: CompanionInput<Date>;
    updatedAt?: CompanionInput<Date | null>;
  }) {
    return data;
  },
};

export interface RationOrderLine extends Record<string, unknown> {
  readonly id: string;
  readonly orderId: string;
  readonly itemId: string;
  readonly itemCode: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly factor: number;
  readonly requestedQty: number;
  readonly approvedQty: number;
  readonly receivedQty: number;
  readonly notes: string;
}

export class RationOrderLinesTable extends DriftTable<RationOrderLine> {
  readonly actualTableName = 'ration_order_lines';

  readonly id = textColumn('id');
  readonly orderId = textColumn('orderId');
  readonly itemId = textColumn('itemId').withDefault(Constant(''));
  readonly itemCode = textColumn('itemCode').withDefault(Constant(''));
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly factor = realColumn('factor').withDefault(Constant(1));
  readonly requestedQty = realColumn('requestedQty').withDefault(Constant(0));
  readonly approvedQty = realColumn('approvedQty').withDefault(Constant(0));
  readonly receivedQty = realColumn('receivedQty').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v10: سجل حساب المعسكر — شهرٌ واحد لمعسكر واحد وصنف واحد.
export interface CampLedger extends Record<string, unknown> {
  readonly id: string;
  readonly campId: string;
  readonly campName: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly year: number;
  readonly month: number;
  readonly openingEntitled: number;
  readonly openingStock: number;
  readonly entitlementTotal: number;
  readonly transferredIn: number;
  readonly issuedDirect: number;
  readonly returnedQty: number;
  readonly consumedKitchen: number;
  readonly strengthSum: number;
  readonly strengthDays: number;
  readonly status: string;
  readonly closedBy: string;
  readonly closedAt: Date | null;
  readonly updatedAt: Date;
}

export class CampLedgersTable extends DriftTable<CampLedger> {
  readonly actualTableName = 'camp_ledgers';

  readonly id = textColumn('id');
  readonly campId = textColumn('campId');
  readonly campName = textColumn('campName').withDefault(Constant(''));
  readonly itemId = textColumn('itemId');
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly year = intColumn('year');
  readonly month = intColumn('month');
  readonly openingEntitled = realColumn('openingEntitled').withDefault(Constant(0));
  readonly openingStock = realColumn('openingStock').withDefault(Constant(0));
  readonly entitlementTotal = realColumn('entitlementTotal').withDefault(Constant(0));
  readonly transferredIn = realColumn('transferredIn').withDefault(Constant(0));
  readonly issuedDirect = realColumn('issuedDirect').withDefault(Constant(0));
  readonly returnedQty = realColumn('returnedQty').withDefault(Constant(0));
  readonly consumedKitchen = realColumn('consumedKitchen').withDefault(Constant(0));
  readonly strengthSum = realColumn('strengthSum').withDefault(Constant(0));
  readonly strengthDays = intColumn('strengthDays').withDefault(Constant(0));
  /// OPEN | CLOSED
  readonly status = textColumn('status').withDefault(Constant('OPEN'));
  readonly closedBy = textColumn('closedBy').withDefault(Constant(''));
  readonly closedAt = dateTimeColumn('closedAt').nullable();
  readonly updatedAt = dateTimeColumn('updatedAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v16: حدود مخزون الصنف في **مستودع**.
export interface WarehouseStockLimit extends Record<string, unknown> {
  readonly id: string;
  readonly warehouseId: string;
  readonly warehouseName: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly factor: number;
  readonly minStock: number;
  readonly maxStock: number;
  readonly notes: string;
  readonly updatedAt: Date;
}

export class WarehouseStockLimitsTable extends DriftTable<WarehouseStockLimit> {
  readonly actualTableName = 'warehouse_stock_limits';

  readonly id = textColumn('id');
  readonly warehouseId = textColumn('warehouseId');
  readonly warehouseName = textColumn('warehouseName').withDefault(Constant(''));
  readonly itemId = textColumn('itemId');
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly factor = realColumn('factor').withDefault(Constant(1));
  readonly minStock = realColumn('minStock').withDefault(Constant(0));
  readonly maxStock = realColumn('maxStock').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly updatedAt = dateTimeColumn('updatedAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface WarehouseStockLimitsCompanionFields extends Record<string, unknown> {
  id?: CompanionInput<string>;
  warehouseId?: CompanionInput<string>;
  warehouseName?: CompanionInput<string>;
  itemId?: CompanionInput<string>;
  itemName?: CompanionInput<string>;
  unitName?: CompanionInput<string>;
  factor?: CompanionInput<number>;
  minStock?: CompanionInput<number>;
  maxStock?: CompanionInput<number>;
  notes?: CompanionInput<string>;
  updatedAt?: CompanionInput<Date>;
}

export interface WarehouseStockLimitsCompanionInsert extends WarehouseStockLimitsCompanionFields {
  id: CompanionInput<string>;
  warehouseId: CompanionInput<string>;
  itemId: CompanionInput<string>;
}

export function WarehouseStockLimitsCompanion(
  data: WarehouseStockLimitsCompanionFields,
): WarehouseStockLimitsCompanionFields {
  return data;
}

WarehouseStockLimitsCompanion.insert = function insert(
  data: WarehouseStockLimitsCompanionInsert,
): WarehouseStockLimitsCompanionInsert {
  return data;
};

export interface CampStockLimit extends Record<string, unknown> {
  readonly id: string;
  readonly campId: string;
  readonly campName: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly minStock: number;
  readonly maxStock: number;
  readonly alertDaysBefore: number;
  readonly updatedAt: Date;
}

export class CampStockLimitsTable extends DriftTable<CampStockLimit> {
  readonly actualTableName = 'camp_stock_limits';

  readonly id = textColumn('id');
  readonly campId = textColumn('campId');
  readonly campName = textColumn('campName').withDefault(Constant(''));
  readonly itemId = textColumn('itemId');
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly minStock = realColumn('minStock').withDefault(Constant(0));
  readonly maxStock = realColumn('maxStock').withDefault(Constant(0));
  readonly alertDaysBefore = intColumn('alertDaysBefore').withDefault(Constant(2));
  readonly updatedAt = dateTimeColumn('updatedAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// أرشيف تصفيات الشهر — سطر لكل شهر أُغلق.
export interface MonthlySettlement extends Record<string, unknown> {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly settledBy: string;
  readonly notes: string;
  readonly campsCount: number;
  readonly itemsCount: number;
  readonly totalCredit: number;
  readonly totalDebit: number;
  readonly settledAt: Date;
  readonly scopeKey: string;
  readonly scopeLabel: string;
}

export class MonthlySettlementsTable extends DriftTable<MonthlySettlement> {
  readonly actualTableName = 'monthly_settlements';

  readonly id = textColumn('id');
  readonly year = intColumn('year');
  readonly month = intColumn('month');
  readonly settledBy = textColumn('settledBy').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly campsCount = intColumn('campsCount').withDefault(Constant(0));
  readonly itemsCount = intColumn('itemsCount').withDefault(Constant(0));
  readonly totalCredit = realColumn('totalCredit').withDefault(Constant(0));
  readonly totalDebit = realColumn('totalDebit').withDefault(Constant(0));
  readonly settledAt = dateTimeColumn('settledAt').withDefault(currentDateAndTime);
  /// v29: النطاق المُصفّى (`LedgerScope.settlementKey`)
  readonly scopeKey = textColumn('scopeKey').withDefault(Constant(''));
  readonly scopeLabel = textColumn('scopeLabel').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
