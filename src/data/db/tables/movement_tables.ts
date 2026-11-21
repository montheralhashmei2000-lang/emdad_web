import {
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

export interface MovementRowFields extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly date: string;
  readonly warehouse: string;
  readonly itemId: string;
  readonly itemCode: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly factor: number;
  readonly qty: number;
  readonly baseQty: number;
  readonly status: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly editCount: number;
  readonly editLog: string;
  readonly editedBy: string;
  readonly cancelReason: string;
  readonly cancelledBy: string;
  readonly prevStatus: string;
}

/// أعمدة مشتركة لكل سطور الحركات
export abstract class MovementColumnsTable<
  Row extends Record<string, unknown> = MovementRowFields,
> extends DriftTable<Row> {
  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant('')); // yyyy-MM-dd
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly itemId = textColumn('itemId').withDefault(Constant(''));
  readonly itemCode = textColumn('itemCode').withDefault(Constant(''));
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly factor = realColumn('factor').withDefault(Constant(1));
  readonly qty = realColumn('qty').withDefault(Constant(0));
  readonly baseQty = realColumn('baseQty').withDefault(Constant(0));
  readonly status = textColumn('status').withDefault(Constant('COMPLETED'));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly editCount = intColumn('editCount').withDefault(Constant(0));
  readonly editLog = textColumn('editLog').withDefault(Constant('[]')); // JSON
  // v2: تعديل وإلغاء المستندات من سجل المستندات
  readonly editedBy = textColumn('editedBy').withDefault(Constant(''));
  readonly cancelReason = textColumn('cancelReason').withDefault(Constant(''));
  readonly cancelledBy = textColumn('cancelledBy').withDefault(Constant(''));
  readonly prevStatus = textColumn('prevStatus').withDefault(Constant(''));
}

export interface Receipt extends MovementRowFields {
  readonly supplier: string;
  readonly invoiceNo: string;
  readonly committee: string;
  readonly supervision: string;
  readonly audit: string;
  readonly expiryDate: string;
  readonly cylinderAction: string;
}

export class ReceiptsTable extends MovementColumnsTable<Receipt> {
  readonly actualTableName = 'receipts';

  readonly supplier = textColumn('supplier').withDefault(Constant(''));
  readonly invoiceNo = textColumn('invoiceNo').withDefault(Constant(''));
  readonly committee = textColumn('committee').withDefault(Constant(''));
  readonly supervision = textColumn('supervision').withDefault(Constant(''));
  readonly audit = textColumn('audit').withDefault(Constant(''));
  // v12: تاريخ انتهاء صلاحية دفعة هذا السطر (yyyy-MM-dd)، فارغ للأصناف بلا صلاحية.
  readonly expiryDate = textColumn('expiryDate').withDefault(Constant(''));
  readonly cylinderAction = textColumn('cylinderAction').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const ReceiptsCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    refNo?: CompanionInput<string>;
    date?: CompanionInput<string>;
    warehouse?: CompanionInput<string>;
    itemId?: CompanionInput<string>;
    itemCode?: CompanionInput<string>;
    itemName?: CompanionInput<string>;
    unitName?: CompanionInput<string>;
    factor?: CompanionInput<number>;
    qty?: CompanionInput<number>;
    baseQty?: CompanionInput<number>;
    status?: CompanionInput<string>;
    notes?: CompanionInput<string>;
    createdBy?: CompanionInput<string>;
    createdAt?: CompanionInput<Date>;
    editCount?: CompanionInput<number>;
    editLog?: CompanionInput<string>;
    editedBy?: CompanionInput<string>;
    cancelReason?: CompanionInput<string>;
    cancelledBy?: CompanionInput<string>;
    prevStatus?: CompanionInput<string>;
    supplier?: CompanionInput<string>;
    invoiceNo?: CompanionInput<string>;
    committee?: CompanionInput<string>;
    supervision?: CompanionInput<string>;
    audit?: CompanionInput<string>;
    expiryDate?: CompanionInput<string>;
    cylinderAction?: CompanionInput<string>;
  }) {
    return data;
  },
};

export interface Issue extends MovementRowFields {
  readonly targetType: number;
  readonly recipientDisplay: string;
  readonly unitId: string;
  readonly facilityId: string;
  readonly beneficiaryUnitId: string;
  readonly beneficiaryUnitName: string;
  readonly soldierCount: number;
  readonly durationDays: number;
  readonly approvedBy: string;
  readonly rejectReason: string;
  readonly rejectedBy: string;
  readonly cylinderAction: string;
  readonly officerCount: number;
  readonly receiverName: string;
}

export class IssuesTable extends MovementColumnsTable<Issue> {
  readonly actualTableName = 'issues';

  readonly targetType = intColumn('targetType').withDefault(Constant(0));
  readonly recipientDisplay = textColumn('recipientDisplay').withDefault(Constant(''));
  readonly unitId = textColumn('unitId').withDefault(Constant(''));
  readonly facilityId = textColumn('facilityId').withDefault(Constant(''));
  readonly beneficiaryUnitId = textColumn('beneficiaryUnitId').withDefault(Constant(''));
  readonly beneficiaryUnitName = textColumn('beneficiaryUnitName').withDefault(Constant(''));
  readonly soldierCount = realColumn('soldierCount').withDefault(Constant(0));
  readonly durationDays = intColumn('durationDays').withDefault(Constant(1));
  readonly approvedBy = textColumn('approvedBy').withDefault(Constant(''));
  readonly rejectReason = textColumn('rejectReason').withDefault(Constant(''));
  readonly rejectedBy = textColumn('rejectedBy').withDefault(Constant(''));
  readonly cylinderAction = textColumn('cylinderAction').withDefault(Constant(''));
  readonly officerCount = realColumn('officerCount').withDefault(Constant(0));
  readonly receiverName = textColumn('receiverName').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface Transfer extends MovementRowFields {
  readonly destWarehouse: string;
  readonly campId: string;
  readonly campName: string;
  readonly strength: number;
  readonly durationDays: number;
  readonly rejectReason: string;
  readonly cylinderAction: string;
}

export class TransfersTable extends MovementColumnsTable<Transfer> {
  readonly actualTableName = 'transfers';

  readonly destWarehouse = textColumn('destWarehouse').withDefault(Constant(''));
  readonly campId = textColumn('campId').withDefault(Constant(''));
  readonly campName = textColumn('campName').withDefault(Constant(''));
  readonly strength = realColumn('strength').withDefault(Constant(0));
  readonly durationDays = intColumn('durationDays').withDefault(Constant(1));
  readonly rejectReason = textColumn('rejectReason').withDefault(Constant(''));
  readonly cylinderAction = textColumn('cylinderAction').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface ReturnRow extends MovementRowFields {
  readonly party: string;
  readonly beneficiaryUnitId: string;
  readonly beneficiaryUnitName: string;
  readonly type: string;
  readonly condition: string;
  readonly origRef: string;
  readonly cylinderAction: string;
}

export class ReturnsTable extends MovementColumnsTable<ReturnRow> {
  readonly actualTableName = 'returns';

  readonly party = textColumn('party').withDefault(Constant(''));
  readonly beneficiaryUnitId = textColumn('beneficiaryUnitId').withDefault(Constant(''));
  readonly beneficiaryUnitName = textColumn('beneficiaryUnitName').withDefault(Constant(''));
  readonly type = textColumn('type').withDefault(Constant('FROM_UNIT'));
  readonly condition = textColumn('condition').withDefault(Constant('صالحة'));
  readonly origRef = textColumn('origRef').withDefault(Constant(''));
  readonly cylinderAction = textColumn('cylinderAction').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface OpeningBalance extends Record<string, unknown> {
  readonly id: string;
  readonly itemId: string;
  readonly itemCode: string;
  readonly itemName: string;
  readonly warehouse: string;
  readonly qty: number;
  readonly date: string;
  readonly setBy: string;
  readonly createdAt: Date;
  readonly breakdown: string;
}

export class OpeningBalancesTable extends DriftTable<OpeningBalance> {
  readonly actualTableName = 'opening_balances';

  readonly id = textColumn('id');
  readonly itemId = textColumn('itemId');
  readonly itemCode = textColumn('itemCode').withDefault(Constant(''));
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly qty = realColumn('qty').withDefault(Constant(0));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly setBy = textColumn('setBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly breakdown = textColumn('breakdown').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v27: محضر إتلاف
export interface Destruction extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly date: string;
  readonly warehouse: string;
  readonly reason: string;
  readonly method: string;
  readonly place: string;
  readonly committee: string;
  readonly orderRef: string;
  readonly status: string;
  readonly notes: string;
  readonly approvedBy: string;
  readonly cancelReason: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class DestructionsTable extends DriftTable<Destruction> {
  readonly actualTableName = 'destructions';

  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly reason = textColumn('reason').withDefault(Constant(''));
  readonly method = textColumn('method').withDefault(Constant(''));
  readonly place = textColumn('place').withDefault(Constant(''));
  readonly committee = textColumn('committee').withDefault(Constant('[]'));
  readonly orderRef = textColumn('orderRef').withDefault(Constant(''));
  readonly status = textColumn('status').withDefault(Constant('DRAFT'));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly approvedBy = textColumn('approvedBy').withDefault(Constant(''));
  readonly cancelReason = textColumn('cancelReason').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// تسويات الجرد
export interface Adjustment extends MovementRowFields {
  readonly sessionId: string;
  readonly reason: string;
  readonly approvedBy: string;
}

export class AdjustmentsTable extends MovementColumnsTable<Adjustment> {
  readonly actualTableName = 'adjustments';

  readonly sessionId = textColumn('sessionId').withDefault(Constant(''));
  readonly reason = textColumn('reason').withDefault(Constant(''));
  readonly approvedBy = textColumn('approvedBy').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
