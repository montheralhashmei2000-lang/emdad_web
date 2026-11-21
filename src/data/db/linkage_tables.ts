import {
  boolColumn,
  Constant,
  currentDateAndTime,
  dateTimeColumn,
  DriftTable,
  intColumn,
  realColumn,
  textColumn,
  type GeneratedColumn,
} from './sqlite_driver';

/// جداول «الارتباطات» — أُضيفت في إصدار المخطط v22.
///
/// الارتباطات ثلاثة أبوابٍ مترابطة: القوة البشرية للإمداد والتموين،
/// مالية الإمداد، وتسليح الإمداد.

/// فردٌ في القوة البشرية للإمداد والتموين.
export interface LinkPerson extends Record<string, unknown> {
  readonly id: string;
  readonly fullName: string;
  readonly militaryNo: string;
  readonly rank: string;
  readonly phone: string;
  readonly phone2: string;
  readonly photoPath: string;
  readonly subUnit: string;
  readonly camp: string;
  readonly section: string;
  readonly job: string;
  readonly status: string;
  readonly statusFrom: string;
  readonly statusTo: string;
  readonly statusDays: number;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class LinkPersonsTable extends DriftTable<LinkPerson> {
  readonly actualTableName = 'link_persons';

  readonly id = textColumn('id');
  readonly fullName = textColumn('fullName');
  readonly militaryNo = textColumn('militaryNo').withDefault(Constant(''));
  readonly rank = textColumn('rank').withDefault(Constant(''));
  readonly phone = textColumn('phone').withDefault(Constant(''));
  readonly phone2 = textColumn('phone2').withDefault(Constant(''));
  readonly photoPath = textColumn('photoPath').withDefault(Constant(''));
  readonly subUnit = textColumn('subUnit').withDefault(Constant(''));
  readonly camp = textColumn('camp').withDefault(Constant(''));
  readonly section = textColumn('section').withDefault(Constant(''));
  readonly job = textColumn('job').withDefault(Constant(''));
  readonly status = textColumn('status').withDefault(Constant('present'));
  readonly statusFrom = textColumn('statusFrom').withDefault(Constant(''));
  readonly statusTo = textColumn('statusTo').withDefault(Constant(''));
  readonly statusDays = intColumn('statusDays').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// سجل الحالات
export interface LinkStatusLog extends Record<string, unknown> {
  readonly id: string;
  readonly personId: string;
  readonly personName: string;
  readonly status: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly days: number;
  readonly returnAction: string;
  readonly notes: string;
  readonly actor: string;
  readonly createdAt: Date;
}

export class LinkStatusLogsTable extends DriftTable<LinkStatusLog> {
  readonly actualTableName = 'link_status_logs';

  readonly id = textColumn('id');
  readonly personId = textColumn('personId');
  readonly personName = textColumn('personName').withDefault(Constant(''));
  readonly status = textColumn('status');
  readonly fromDate = textColumn('fromDate').withDefault(Constant(''));
  readonly toDate = textColumn('toDate').withDefault(Constant(''));
  readonly days = intColumn('days').withDefault(Constant(0));
  readonly returnAction = textColumn('returnAction').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly actor = textColumn('actor').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// دليل المسميات
export interface LinkTerm extends Record<string, unknown> {
  readonly kind: string;
  readonly name: string;
}

export class LinkTermsTable extends DriftTable<LinkTerm> {
  readonly actualTableName = 'link_terms';

  /// `section` | `job` | `subunit` | `holder`
  readonly kind = textColumn('kind');
  readonly name = textColumn('name');

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.kind, this.name];
  }
}

/// العهد — مالية الإمداد
export interface LinkFinCustody extends Record<string, unknown> {
  readonly id: string;
  readonly custodyNo: string;
  readonly holder: string;
  readonly title: string;
  readonly serialNo: string;
  readonly qty: number;
  readonly unit: string;
  readonly valueAmount: number;
  readonly custodyDate: string;
  readonly dueDate: string;
  readonly kind: string;
  readonly amount: number;
  readonly currency: string;
  readonly exchangeRate: number;
  readonly giverName: string;
  readonly receiverName: string;
  readonly status: string;
  readonly outcome: string;
  readonly outcomeAmount: number;
  readonly sourceDocNo: string;
  readonly costCenter: string;
  readonly attachmentsJson: string;
  readonly cleared: boolean;
  readonly clearedDate: string;
  readonly clearanceNotes: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class LinkFinCustodiesTable extends DriftTable<LinkFinCustody> {
  readonly actualTableName = 'link_fin_custodies';

  readonly id = textColumn('id');
  readonly custodyNo = textColumn('custodyNo').withDefault(Constant(''));
  readonly holder = textColumn('holder').withDefault(Constant(''));
  readonly title = textColumn('title');
  readonly serialNo = textColumn('serialNo').withDefault(Constant(''));
  readonly qty = realColumn('qty').withDefault(Constant(1));
  readonly unit = textColumn('unit').withDefault(Constant(''));
  readonly valueAmount = realColumn('valueAmount').withDefault(Constant(0));
  readonly custodyDate = textColumn('custodyDate').withDefault(Constant(''));
  readonly dueDate = textColumn('dueDate').withDefault(Constant(''));

  /// النموذج المالي الجديد (v24)
  readonly kind = textColumn('kind').withDefault(Constant('received'));
  readonly amount = realColumn('amount').withDefault(Constant(0));
  readonly currency = textColumn('currency').withDefault(Constant('sar'));
  readonly exchangeRate = realColumn('exchangeRate').withDefault(Constant(0));
  readonly giverName = textColumn('giverName').withDefault(Constant(''));
  readonly receiverName = textColumn('receiverName').withDefault(Constant(''));
  readonly status = textColumn('status').withDefault(Constant('open'));
  readonly outcome = textColumn('outcome').withDefault(Constant(''));
  readonly outcomeAmount = realColumn('outcomeAmount').withDefault(Constant(0));
  readonly sourceDocNo = textColumn('sourceDocNo').withDefault(Constant(''));
  readonly costCenter = textColumn('costCenter').withDefault(Constant(''));
  readonly attachmentsJson = textColumn('attachmentsJson').withDefault(Constant('[]'));

  readonly cleared = boolColumn('cleared').withDefault(Constant(false));
  readonly clearedDate = textColumn('clearedDate').withDefault(Constant(''));
  readonly clearanceNotes = textColumn('clearanceNotes').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// الإخلاءات
export interface LinkClearance extends Record<string, unknown> {
  readonly id: string;
  readonly clearanceNo: string;
  readonly kind: string;
  readonly refId: string;
  readonly refTitle: string;
  readonly partyName: string;
  readonly amount: number;
  readonly clearanceDate: string;
  readonly notes: string;
  readonly custodyNo: string;
  readonly currency: string;
  readonly grantedAmount: number;
  readonly spentAmount: number;
  readonly diffType: string;
  readonly surplusAmount: number;
  readonly deficitAmount: number;
  readonly counterpartyName: string;
  readonly workflow: string;
  readonly docNo: string;
  readonly clearerName: string;
  readonly reviewDate: string;
  readonly adminNotes: string;
  readonly attachName: string;
  readonly attachPath: string;
  readonly attachSha256: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class LinkClearancesTable extends DriftTable<LinkClearance> {
  readonly actualTableName = 'link_clearances';

  readonly id = textColumn('id');
  readonly clearanceNo = textColumn('clearanceNo').withDefault(Constant(''));
  readonly kind = textColumn('kind').withDefault(Constant('custody'));
  readonly refId = textColumn('refId').withDefault(Constant(''));
  readonly refTitle = textColumn('refTitle').withDefault(Constant(''));
  readonly partyName = textColumn('partyName').withDefault(Constant(''));
  readonly amount = realColumn('amount').withDefault(Constant(0));
  readonly clearanceDate = textColumn('clearanceDate').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));

  /// إخلاء العهدة المالي (v24)
  readonly custodyNo = textColumn('custodyNo').withDefault(Constant(''));
  readonly currency = textColumn('currency').withDefault(Constant('sar'));
  readonly grantedAmount = realColumn('grantedAmount').withDefault(Constant(0));
  readonly spentAmount = realColumn('spentAmount').withDefault(Constant(0));
  readonly diffType = textColumn('diffType').withDefault(Constant(''));
  readonly surplusAmount = realColumn('surplusAmount').withDefault(Constant(0));
  readonly deficitAmount = realColumn('deficitAmount').withDefault(Constant(0));
  readonly counterpartyName = textColumn('counterpartyName').withDefault(Constant(''));
  readonly workflow = textColumn('workflow').withDefault(Constant('approved'));
  readonly docNo = textColumn('docNo').withDefault(Constant(''));
  readonly clearerName = textColumn('clearerName').withDefault(Constant(''));
  readonly reviewDate = textColumn('reviewDate').withDefault(Constant(''));
  readonly adminNotes = textColumn('adminNotes').withDefault(Constant(''));
  readonly attachName = textColumn('attachName').withDefault(Constant(''));
  readonly attachPath = textColumn('attachPath').withDefault(Constant(''));
  readonly attachSha256 = textColumn('attachSha256').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// عقد شراء — «قائمة الكمية المستهلكة» بفواتير التاجر.
export interface LinkPurchaseContract extends Record<string, unknown> {
  readonly id: string;
  readonly contractNo: string;
  readonly title: string;
  readonly supplier: string;
  readonly currency: string;
  readonly exchangeRate: number;
  readonly listDate: string;
  readonly custodyId: string;
  readonly invoiceNo: string;
  readonly itemsJson: string;
  readonly amount: number;
  readonly endDate: string;
  readonly status: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class LinkPurchaseContractsTable extends DriftTable<LinkPurchaseContract> {
  readonly actualTableName = 'link_purchase_contracts';

  readonly id = textColumn('id');
  readonly contractNo = textColumn('contractNo').withDefault(Constant(''));
  readonly title = textColumn('title');
  readonly supplier = textColumn('supplier').withDefault(Constant(''));
  readonly currency = textColumn('currency').withDefault(Constant('sar'));
  readonly exchangeRate = realColumn('exchangeRate').withDefault(Constant(0));
  readonly listDate = textColumn('listDate').withDefault(Constant(''));
  readonly custodyId = textColumn('custodyId').withDefault(Constant(''));
  readonly invoiceNo = textColumn('invoiceNo').withDefault(Constant(''));
  readonly itemsJson = textColumn('itemsJson').withDefault(Constant('[]'));
  readonly amount = realColumn('amount').withDefault(Constant(0));
  readonly endDate = textColumn('endDate').withDefault(Constant(''));
  readonly status = textColumn('status').withDefault(Constant('open'));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// مسير عهدة
export interface LinkCustodySheet extends Record<string, unknown> {
  readonly id: string;
  readonly sheetNo: string;
  readonly title: string;
  readonly custodyId: string;
  readonly currency: string;
  readonly holderName: string;
  readonly defaultRate: number;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class LinkCustodySheetsTable extends DriftTable<LinkCustodySheet> {
  readonly actualTableName = 'link_custody_sheets';

  readonly id = textColumn('id');
  readonly sheetNo = textColumn('sheetNo').withDefault(Constant(''));
  readonly title = textColumn('title').withDefault(Constant(''));
  readonly custodyId = textColumn('custodyId').withDefault(Constant(''));
  readonly currency = textColumn('currency').withDefault(Constant('sar'));
  readonly holderName = textColumn('holderName').withDefault(Constant(''));
  readonly defaultRate = realColumn('defaultRate').withDefault(Constant(410));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// سطر في مسير العهدة
export interface LinkCustodySheetRow extends Record<string, unknown> {
  readonly id: string;
  readonly sheetId: string;
  readonly seq: number;
  readonly date: string;
  readonly grantSar: number;
  readonly grantYer: number;
  readonly returnSar: number;
  readonly returnYer: number;
  readonly spentSar: number;
  readonly spentYer: number;
  readonly rate: number;
  readonly person: string;
  readonly statement: string;
  readonly category: string;
  readonly entryNo: string;
  readonly invoiceNo: string;
  readonly shop: string;
  readonly notes: string;
}

export class LinkCustodySheetRowsTable extends DriftTable<LinkCustodySheetRow> {
  readonly actualTableName = 'link_custody_sheet_rows';

  readonly id = textColumn('id');
  readonly sheetId = textColumn('sheetId');
  readonly seq = intColumn('seq').withDefault(Constant(0));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly grantSar = realColumn('grantSar').withDefault(Constant(0));
  readonly grantYer = realColumn('grantYer').withDefault(Constant(0));
  readonly returnSar = realColumn('returnSar').withDefault(Constant(0));
  readonly returnYer = realColumn('returnYer').withDefault(Constant(0));
  readonly spentSar = realColumn('spentSar').withDefault(Constant(0));
  readonly spentYer = realColumn('spentYer').withDefault(Constant(0));
  readonly rate = realColumn('rate').withDefault(Constant(410));
  readonly person = textColumn('person').withDefault(Constant(''));
  readonly statement = textColumn('statement').withDefault(Constant(''));
  readonly category = textColumn('category').withDefault(Constant(''));
  readonly entryNo = textColumn('entryNo').withDefault(Constant(''));
  readonly invoiceNo = textColumn('invoiceNo').withDefault(Constant(''));
  readonly shop = textColumn('shop').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// سلاحٌ سُلّم لفردٍ من تسليح الإمداد
export interface LinkArmament extends Record<string, unknown> {
  readonly id: string;
  readonly personId: string;
  readonly personName: string;
  readonly personMilitaryNo: string;
  readonly weaponType: string;
  readonly serialNo: string;
  readonly qty: number;
  readonly magazines: number;
  readonly magazineType: string;
  readonly ammoQty: number;
  readonly assignedDate: string;
  readonly returned: boolean;
  readonly returnedDate: string;
  readonly condition: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class LinkArmamentsTable extends DriftTable<LinkArmament> {
  readonly actualTableName = 'link_armaments';

  readonly id = textColumn('id');
  readonly personId = textColumn('personId').withDefault(Constant(''));
  readonly personName = textColumn('personName').withDefault(Constant(''));
  readonly personMilitaryNo = textColumn('personMilitaryNo').withDefault(Constant(''));
  readonly weaponType = textColumn('weaponType').withDefault(Constant(''));
  readonly serialNo = textColumn('serialNo').withDefault(Constant(''));
  readonly qty = intColumn('qty').withDefault(Constant(1));
  readonly magazines = intColumn('magazines').withDefault(Constant(0));
  readonly magazineType = textColumn('magazineType').withDefault(Constant(''));
  readonly ammoQty = intColumn('ammoQty').withDefault(Constant(0));
  readonly assignedDate = textColumn('assignedDate').withDefault(Constant(''));
  readonly returned = boolColumn('returned').withDefault(Constant(false));
  readonly returnedDate = textColumn('returnedDate').withDefault(Constant(''));
  readonly condition = textColumn('condition').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// «استلام مبلغ مالي»
export interface LinkMoneyReceipt extends Record<string, unknown> {
  readonly id: string;
  readonly receiverName: string;
  readonly capacity: string;
  readonly amount: number;
  readonly currency: string;
  readonly receiptDate: string;
  readonly purpose: string;
  readonly method: string;
  readonly transferNo: string;
  readonly delivererName: string;
  readonly attachments: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class LinkMoneyReceiptsTable extends DriftTable<LinkMoneyReceipt> {
  readonly actualTableName = 'link_money_receipts';

  readonly id = textColumn('id');
  readonly receiverName = textColumn('receiverName').withDefault(Constant(''));
  readonly capacity = textColumn('capacity').withDefault(Constant(''));
  readonly amount = realColumn('amount').withDefault(Constant(0));
  readonly currency = textColumn('currency').withDefault(Constant('sar'));
  readonly receiptDate = textColumn('receiptDate').withDefault(Constant(''));
  readonly purpose = textColumn('purpose').withDefault(Constant(''));
  readonly method = textColumn('method').withDefault(Constant(''));
  readonly transferNo = textColumn('transferNo').withDefault(Constant(''));
  readonly delivererName = textColumn('delivererName').withDefault(Constant(''));
  readonly attachments = textColumn('attachments').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// دفتر «رصيد المالية»
export interface LinkFinanceLedgerRow extends Record<string, unknown> {
  readonly id: string;
  readonly partyName: string;
  readonly custodyId: string;
  readonly clearanceId: string;
  readonly entryKind: string;
  readonly delta: number;
  readonly currency: string;
  readonly entryDate: string;
  readonly note: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly receiptId: string;
}

export class LinkFinanceLedgerTable extends DriftTable<LinkFinanceLedgerRow> {
  readonly actualTableName = 'link_finance_ledger';

  readonly id = textColumn('id');
  readonly partyName = textColumn('partyName');
  readonly custodyId = textColumn('custodyId').withDefault(Constant(''));
  readonly clearanceId = textColumn('clearanceId').withDefault(Constant(''));
  readonly entryKind = textColumn('entryKind');
  readonly delta = realColumn('delta').withDefault(Constant(0));
  readonly currency = textColumn('currency').withDefault(Constant('sar'));
  readonly entryDate = textColumn('entryDate').withDefault(Constant(''));
  readonly note = textColumn('note').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  /// v29: سند الاستلام المالي المربوط بالقيد اليدوي (اختياري — فارغ بلا ربط).
  readonly receiptId = textColumn('receiptId').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
