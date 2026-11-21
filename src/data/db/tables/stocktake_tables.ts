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

export interface Stocktake extends Record<string, unknown> {
  readonly id: string;
  readonly orderNo: string;
  readonly type: string;
  readonly date: string;
  readonly warehouse: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly committee: string;
  readonly freeze: boolean;
  readonly status: string;
  readonly itemsCount: number;
  readonly notes: string;
  readonly closedDate: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly cancelReason: string;
  readonly cancelledBy: string;
  readonly closedBy: string;
  readonly countedCount: number;
  readonly varianceCount: number;
  readonly adjustedCount: number;
}

export class StocktakesTable extends DriftTable<Stocktake> {
  readonly actualTableName = 'stocktakes';

  readonly id = textColumn('id');
  readonly orderNo = textColumn('orderNo').withDefault(Constant(''));
  readonly type = textColumn('type').withDefault(Constant('FULL'));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly categoryId = textColumn('categoryId').withDefault(Constant(''));
  readonly categoryName = textColumn('categoryName').withDefault(Constant('')); // v4
  readonly committee = textColumn('committee').withDefault(Constant(''));
  readonly freeze = boolColumn('freeze').withDefault(Constant(true));
  readonly status = textColumn('status').withDefault(Constant('COUNTING'));
  readonly itemsCount = intColumn('itemsCount').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly closedDate = textColumn('closedDate').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  // v4: إلغاء أمر الجرد وإحصاءات الإغلاق
  readonly cancelReason = textColumn('cancelReason').withDefault(Constant(''));
  readonly cancelledBy = textColumn('cancelledBy').withDefault(Constant(''));
  readonly closedBy = textColumn('closedBy').withDefault(Constant(''));
  readonly countedCount = intColumn('countedCount').withDefault(Constant(0));
  readonly varianceCount = intColumn('varianceCount').withDefault(Constant(0));
  readonly adjustedCount = intColumn('adjustedCount').withDefault(Constant(0));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const StocktakesCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    orderNo?: CompanionInput<string>;
    type?: CompanionInput<string>;
    date?: CompanionInput<string>;
    warehouse?: CompanionInput<string>;
    categoryId?: CompanionInput<string>;
    categoryName?: CompanionInput<string>;
    committee?: CompanionInput<string>;
    freeze?: CompanionInput<boolean>;
    status?: CompanionInput<string>;
    itemsCount?: CompanionInput<number>;
    notes?: CompanionInput<string>;
    closedDate?: CompanionInput<string>;
    createdBy?: CompanionInput<string>;
    createdAt?: CompanionInput<Date>;
    cancelReason?: CompanionInput<string>;
    cancelledBy?: CompanionInput<string>;
    closedBy?: CompanionInput<string>;
    countedCount?: CompanionInput<number>;
    varianceCount?: CompanionInput<number>;
    adjustedCount?: CompanionInput<number>;
  }) {
    return data;
  },
};

export interface StocktakeLine extends Record<string, unknown> {
  readonly id: string;
  readonly sessionId: string;
  readonly itemId: string;
  readonly itemCode: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly systemQty: number;
  readonly countedQty: number | null;
  readonly counts: string;
  readonly variance: number | null;
  readonly reason: string;
  readonly decision: string;
  readonly status: string;
  readonly discovered: boolean;
}

export class StocktakeLinesTable extends DriftTable<StocktakeLine> {
  readonly actualTableName = 'stocktake_lines';

  readonly id = textColumn('id');
  readonly sessionId = textColumn('sessionId');
  readonly itemId = textColumn('itemId');
  readonly itemCode = textColumn('itemCode').withDefault(Constant(''));
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly systemQty = realColumn('systemQty').withDefault(Constant(0));
  readonly countedQty = realColumn('countedQty').nullable();
  readonly counts = textColumn('counts').withDefault(Constant('{}')); // JSON بالوحدات
  readonly variance = realColumn('variance').nullable();
  readonly reason = textColumn('reason').withDefault(Constant(''));
  readonly decision = textColumn('decision').withDefault(Constant('ADJUST'));
  readonly status = textColumn('status').withDefault(Constant('PENDING'));
  readonly discovered = boolColumn('discovered').withDefault(Constant(false));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
