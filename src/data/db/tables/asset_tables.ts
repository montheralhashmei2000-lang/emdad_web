import {
  Constant,
  currentDateAndTime,
  dateTimeColumn,
  DriftTable,
  intColumn,
  realColumn,
  textColumn,
  type GeneratedColumn,
} from '../sqlite_driver';

/// v8: الأصول الثابتة — ما يُقتنى ويُعمَّر ثم يُستهلك، لا ما يُصرف.
export interface Asset extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly assetType: string;
  readonly serialNumber: string;
  readonly facilityId: string;
  readonly facilityName: string;
  readonly beneficiaryUnitId: string;
  readonly beneficiaryUnitName: string;
  readonly warehouse: string;
  readonly status: string;
  readonly acquisitionDate: string;
  readonly value: number;
  readonly lifespanMonths: number;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly invoiceNumber: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
  readonly itemId: string;
}

export class AssetsTable extends DriftTable<Asset> {
  readonly actualTableName = 'assets';

  readonly id = textColumn('id');
  readonly name = textColumn('name');
  /// v16: عدد القطع في هذا السطر.
  readonly quantity = realColumn('quantity').withDefault(Constant(1));
  readonly assetType = textColumn('assetType').withDefault(Constant('equipment'));
  readonly serialNumber = textColumn('serialNumber').withDefault(Constant(''));
  readonly facilityId = textColumn('facilityId').withDefault(Constant(''));
  readonly facilityName = textColumn('facilityName').withDefault(Constant(''));
  readonly beneficiaryUnitId = textColumn('beneficiaryUnitId').withDefault(Constant(''));
  readonly beneficiaryUnitName = textColumn('beneficiaryUnitName').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly status = textColumn('status').withDefault(Constant('NEW'));
  /// yyyy-MM-dd — نصًّا كتواريخ الحركات، فلا يزيحها اختلاف المناطق الزمنية.
  readonly acquisitionDate = textColumn('acquisitionDate').withDefault(Constant(''));
  readonly value = realColumn('value').withDefault(Constant(0));
  readonly lifespanMonths = intColumn('lifespanMonths').withDefault(Constant(0));
  readonly supplierId = textColumn('supplierId').withDefault(Constant(''));
  readonly supplierName = textColumn('supplierName').withDefault(Constant(''));
  readonly invoiceNumber = textColumn('invoiceNumber').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();
  /// v27: الصنف المخزني (أصلٌ ثابت) الذي هذه القطعة منه
  readonly itemId = textColumn('itemId').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// عهدة أصل لدى وحدة مستفيدة. [returnedDate] فارغة ⇒ العهدة قائمة.
export interface AssetAssignment extends Record<string, unknown> {
  readonly id: string;
  readonly assetId: string;
  readonly assetName: string;
  readonly beneficiaryUnitId: string;
  readonly beneficiaryUnitName: string;
  readonly assignedDate: string;
  readonly returnedDate: string;
  readonly assignedTo: string;
  readonly facilityId: string;
  readonly facilityName: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class AssetAssignmentsTable extends DriftTable<AssetAssignment> {
  readonly actualTableName = 'asset_assignments';

  readonly id = textColumn('id');
  readonly assetId = textColumn('assetId');
  readonly assetName = textColumn('assetName').withDefault(Constant(''));
  readonly beneficiaryUnitId = textColumn('beneficiaryUnitId').withDefault(Constant(''));
  readonly beneficiaryUnitName = textColumn('beneficiaryUnitName').withDefault(Constant(''));
  readonly assignedDate = textColumn('assignedDate').withDefault(Constant(''));
  readonly returnedDate = textColumn('returnedDate').withDefault(Constant(''));
  readonly assignedTo = textColumn('assignedTo').withDefault(Constant(''));
  /// v27: عهدةٌ لدى مطبخ أو فرن (منشأة) بدل وحدةٍ مستفيدة.
  readonly facilityId = textColumn('facilityId').withDefault(Constant(''));
  readonly facilityName = textColumn('facilityName').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
