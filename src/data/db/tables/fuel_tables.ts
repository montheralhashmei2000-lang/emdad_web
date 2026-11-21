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
} from '../sqlite_driver';

/// v18: مستودعات المحروقات — دليلٌ مستقل عن مخازن الإعاشة.
export interface FuelWarehouse extends Record<string, unknown> {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly manager: string;
  readonly location: string;
  readonly capacityLiters: number;
  readonly active: boolean;
  readonly notes: string;
  readonly createdAt: Date;
}

export class FuelWarehousesTable extends DriftTable<FuelWarehouse> {
  readonly actualTableName = 'fuel_warehouses';

  readonly id = textColumn('id');
  readonly code = textColumn('code').withDefault(Constant(''));
  readonly name = textColumn('name');
  readonly manager = textColumn('manager').withDefault(Constant(''));
  readonly location = textColumn('location').withDefault(Constant(''));
  readonly capacityLiters = realColumn('capacityLiters').withDefault(Constant(0));
  readonly active = boolColumn('active').withDefault(Constant(true));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v18: الوحدات المستفيدة من المحروقات — دليلٌ مستقل.
export interface FuelUnit extends Record<string, unknown> {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly commander: string;
  readonly phone: string;
  readonly active: boolean;
  readonly notes: string;
  readonly createdAt: Date;
}

export class FuelUnitsTable extends DriftTable<FuelUnit> {
  readonly actualTableName = 'fuel_units';

  readonly id = textColumn('id');
  readonly code = textColumn('code').withDefault(Constant(''));
  readonly name = textColumn('name');
  readonly commander = textColumn('commander').withDefault(Constant(''));
  readonly phone = textColumn('phone').withDefault(Constant(''));
  readonly active = boolColumn('active').withDefault(Constant(true));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v18: إعدادات قسم المحروقات — سطرٌ واحد بمعرّف ثابت.
export interface FuelSettingsRow extends Record<string, unknown> {
  readonly id: string;
  readonly lowStockPercent: number;
  readonly defaultDailyLiters: number;
  readonly defaultWeeklyLiters: number;
  readonly defaultMonthlyLiters: number;
  readonly parentOrg: string;
  readonly agencyTitle: string;
  readonly commandTitle: string;
  readonly branchTitle: string;
  readonly orgName: string;
  readonly sealLines: string;
  readonly roleOfficer: string;
  readonly roleSupply: string;
  readonly roleChief: string;
  readonly signOfficer: string;
  readonly signSupply: string;
  readonly signChief: string;
  readonly requireChassis: boolean;
  readonly allowExceptional: boolean;
  readonly carryCapPeriods: number;
  readonly notes: string;
  readonly updatedAt: Date | null;
}

export class FuelSettingsRowsTable extends DriftTable<FuelSettingsRow> {
  readonly actualTableName = 'fuel_settings_rows';

  readonly id = textColumn('id');
  readonly lowStockPercent = realColumn('lowStockPercent').withDefault(Constant(20));
  readonly defaultDailyLiters = realColumn('defaultDailyLiters').withDefault(Constant(200));
  readonly defaultWeeklyLiters = realColumn('defaultWeeklyLiters').withDefault(Constant(1000));
  readonly defaultMonthlyLiters = realColumn('defaultMonthlyLiters').withDefault(Constant(4000));

  /// v19: ترويسة البرقية الرسمية
  readonly parentOrg = textColumn('parentOrg').withDefault(Constant('قيادة القوات المشتركة'));
  readonly agencyTitle = textColumn('agencyTitle').withDefault(Constant('هيئة إدارة القوات اليمنية'));
  readonly commandTitle = textColumn('commandTitle').withDefault(Constant('قيادة الفرقة الأولى'));
  readonly branchTitle = textColumn('branchTitle').withDefault(Constant('شعبة الإمداد والتموين'));
  readonly orgName = textColumn('orgName').withDefault(Constant('شعبة الإمداد والتموين'));
  readonly sealLines = textColumn('sealLines').withDefault(Constant('الفرقة،الأولى،طوارئ'));

  /// v20: عملُ كلِّ موقّعٍ ورتبتُه
  readonly roleOfficer = textColumn('roleOfficer').withDefault(Constant('مسؤول محروقات المعسكر'));
  readonly roleSupply = textColumn('roleSupply').withDefault(Constant('ركن إمداد الفرقة الأولى'));
  readonly roleChief = textColumn('roleChief').withDefault(Constant('رئيس شعبة الإمداد والتموين'));

  readonly signOfficer = textColumn('signOfficer').withDefault(Constant(''));
  readonly signSupply = textColumn('signSupply').withDefault(Constant(''));
  readonly signChief = textColumn('signChief').withDefault(Constant(''));

  readonly requireChassis = boolColumn('requireChassis').withDefault(Constant(false));
  readonly allowExceptional = boolColumn('allowExceptional').withDefault(Constant(true));

  /// v26: سقف تراكم الاستحقاق بعدد الفترات
  readonly carryCapPeriods = intColumn('carryCapPeriods').withDefault(Constant(3));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v17: تفريدة المحروقات — استحقاق وحدةٍ من الوقود في كل فترة.
export interface FuelAllocation extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly fuelType: string;
  readonly periodType: string;
  readonly quantityPerPeriod: number;
  readonly totalQuantity: number;
  readonly weeklyLiters: number;
  readonly monthlyLiters: number;
  readonly issueLocation: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly active: boolean;
  readonly disbursable: boolean;
  readonly writtenOffLiters: number;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class FuelAllocationsTable extends DriftTable<FuelAllocation> {
  readonly actualTableName = 'fuel_allocations';

  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly unitId = textColumn('unitId').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  /// petrol | diesel
  readonly fuelType = textColumn('fuelType').withDefault(Constant('diesel'));
  /// daily | weekly | monthly | custom
  readonly periodType = textColumn('periodType').withDefault(Constant('monthly'));
  readonly quantityPerPeriod = realColumn('quantityPerPeriod').withDefault(Constant(0));
  readonly totalQuantity = realColumn('totalQuantity').withDefault(Constant(0));
  readonly weeklyLiters = realColumn('weeklyLiters').withDefault(Constant(0));
  readonly monthlyLiters = realColumn('monthlyLiters').withDefault(Constant(0));
  readonly issueLocation = textColumn('issueLocation').withDefault(Constant(''));
  readonly startDate = textColumn('startDate').withDefault(Constant(''));
  readonly endDate = textColumn('endDate').withDefault(Constant(''));
  readonly active = boolColumn('active').withDefault(Constant(true));
  readonly disbursable = boolColumn('disbursable').withDefault(Constant(true));
  /// v26: ما شُطب من الاستحقاق المتراكم بـ«تصفير الرصيد»
  readonly writtenOffLiters = realColumn('writtenOffLiters').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v17: صرف محروقات — لمركبةٍ بسائقها ورقم شاصيها.
export interface FuelIssue extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly date: string;
  readonly fuelType: string;
  readonly warehouse: string;
  readonly source: string;
  readonly quantityLiters: number;
  readonly driverName: string;
  readonly vehicleType: string;
  readonly chassisNo: string;
  readonly allocationId: string;
  readonly beneficiaryUnitId: string;
  readonly beneficiaryName: string;
  readonly entitledLiters: number;
  readonly periodType: string;
  readonly customFrom: string;
  readonly customTo: string;
  readonly justification: string;
  readonly orderAuthority: string;
  readonly purpose: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class FuelIssuesTable extends DriftTable<FuelIssue> {
  readonly actualTableName = 'fuel_issues';

  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly fuelType = textColumn('fuelType').withDefault(Constant('diesel'));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  /// allocation | exceptional
  readonly source = textColumn('source').withDefault(Constant('allocation'));
  readonly quantityLiters = realColumn('quantityLiters').withDefault(Constant(0));
  readonly driverName = textColumn('driverName').withDefault(Constant(''));
  readonly vehicleType = textColumn('vehicleType').withDefault(Constant(''));
  readonly chassisNo = textColumn('chassisNo').withDefault(Constant(''));
  readonly allocationId = textColumn('allocationId').withDefault(Constant(''));
  readonly beneficiaryUnitId = textColumn('beneficiaryUnitId').withDefault(Constant(''));
  readonly beneficiaryName = textColumn('beneficiaryName').withDefault(Constant(''));
  readonly entitledLiters = realColumn('entitledLiters').withDefault(Constant(0));
  readonly periodType = textColumn('periodType').withDefault(Constant(''));
  readonly customFrom = textColumn('customFrom').withDefault(Constant(''));
  readonly customTo = textColumn('customTo').withDefault(Constant(''));
  readonly justification = textColumn('justification').withDefault(Constant(''));
  readonly orderAuthority = textColumn('orderAuthority').withDefault(Constant(''));
  readonly purpose = textColumn('purpose').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v17: توريد محروقات إلى مستودع.
export interface FuelSupply extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly date: string;
  readonly fuelType: string;
  readonly quantityLiters: number;
  readonly supplierName: string;
  readonly warehouse: string;
  readonly transportVehicleType: string;
  readonly driverName: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class FuelSuppliesTable extends DriftTable<FuelSupply> {
  readonly actualTableName = 'fuel_supplies';

  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly fuelType = textColumn('fuelType').withDefault(Constant('diesel'));
  readonly quantityLiters = realColumn('quantityLiters').withDefault(Constant(0));
  readonly supplierName = textColumn('supplierName').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly transportVehicleType = textColumn('transportVehicleType').withDefault(Constant(''));
  readonly driverName = textColumn('driverName').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v17: رصيد محروقات افتتاحي لمستودع.
export interface FuelOpening extends Record<string, unknown> {
  readonly id: string;
  readonly warehouse: string;
  readonly fuelType: string;
  readonly liters: number;
  readonly asOfDate: string;
  readonly note: string;
  readonly createdAt: Date;
}

export class FuelOpeningsTable extends DriftTable<FuelOpening> {
  readonly actualTableName = 'fuel_openings';

  readonly id = textColumn('id');
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly fuelType = textColumn('fuelType').withDefault(Constant('diesel'));
  readonly liters = realColumn('liters').withDefault(Constant(0));
  readonly asOfDate = textColumn('asOfDate').withDefault(Constant(''));
  readonly note = textColumn('note').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v17: تحويل محروقات بين مستودعين.
export interface FuelTransfer extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly date: string;
  readonly fuelType: string;
  readonly quantityLiters: number;
  readonly fromWarehouse: string;
  readonly toWarehouse: string;
  readonly driverName: string;
  readonly transportVehicleType: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class FuelTransfersTable extends DriftTable<FuelTransfer> {
  readonly actualTableName = 'fuel_transfers';

  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly fuelType = textColumn('fuelType').withDefault(Constant('diesel'));
  readonly quantityLiters = realColumn('quantityLiters').withDefault(Constant(0));
  readonly fromWarehouse = textColumn('fromWarehouse').withDefault(Constant(''));
  readonly toWarehouse = textColumn('toWarehouse').withDefault(Constant(''));
  readonly driverName = textColumn('driverName').withDefault(Constant(''));
  readonly transportVehicleType = textColumn('transportVehicleType').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v17: جرد محروقات — أمرٌ يمرّ بأربع مراحل قبل أن يمسّ الرصيد.
export interface FuelStocktake extends Record<string, unknown> {
  readonly id: string;
  readonly refNo: string;
  readonly date: string;
  readonly warehouse: string;
  readonly kind: string;
  readonly fuelFilter: string;
  readonly committee: string;
  readonly status: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class FuelStocktakesTable extends DriftTable<FuelStocktake> {
  readonly actualTableName = 'fuel_stocktakes';

  readonly id = textColumn('id');
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  /// full | partial
  readonly kind = textColumn('kind').withDefault(Constant('full'));
  /// all | petrol | diesel
  readonly fuelFilter = textColumn('fuelFilter').withDefault(Constant('all'));
  readonly committee = textColumn('committee').withDefault(Constant(''));
  /// open | counting | analysis | posted
  readonly status = textColumn('status').withDefault(Constant('open'));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// سطر جرد: الرصيد الدفتري وقت الفتح، والمعدود فعلًا.
export interface FuelStocktakeLine extends Record<string, unknown> {
  readonly id: string;
  readonly stocktakeId: string;
  readonly fuelType: string;
  readonly bookLiters: number;
  readonly counted: boolean;
  readonly countedLiters: number;
}

export class FuelStocktakeLinesTable extends DriftTable<FuelStocktakeLine> {
  readonly actualTableName = 'fuel_stocktake_lines';

  readonly id = textColumn('id');
  readonly stocktakeId = textColumn('stocktakeId');
  readonly fuelType = textColumn('fuelType').withDefault(Constant('diesel'));
  readonly bookLiters = realColumn('bookLiters').withDefault(Constant(0));
  readonly counted = boolColumn('counted').withDefault(Constant(false));
  readonly countedLiters = realColumn('countedLiters').withDefault(Constant(0));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
