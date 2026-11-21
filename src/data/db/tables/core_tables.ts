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

export interface User extends Record<string, unknown> {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly roles: string;
  readonly permissions: string;
  readonly warehouseScope: string;
  readonly saltHex: string;
  readonly hashHex: string;
  readonly iterations: number;
  readonly active: boolean;
  readonly approved: boolean;
  readonly failedAttempts: number;
  readonly lockedUntil: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
  readonly sectionBlocked: string;
  readonly ownerSig: string;
}

export class UsersTable extends DriftTable<User> {
  readonly actualTableName = 'users';

  readonly id = textColumn('id');
  readonly username = textColumn('username');
  readonly name = textColumn('name').withDefault(Constant(''));
  readonly email = textColumn('email').withDefault(Constant(''));
  readonly role = textColumn('role').withDefault(Constant('user'));
  readonly roles = textColumn('roles').withDefault(Constant('[]'));
  readonly permissions = textColumn('permissions').withDefault(Constant('{}'));
  readonly warehouseScope = textColumn('warehouseScope').withDefault(Constant('ALL'));
  readonly saltHex = textColumn('saltHex').withDefault(Constant(''));
  readonly hashHex = textColumn('hashHex').withDefault(Constant(''));
  readonly iterations = intColumn('iterations').withDefault(Constant(45000));
  readonly active = boolColumn('active').withDefault(Constant(true));
  readonly approved = boolColumn('approved').withDefault(Constant(true));
  readonly failedAttempts = intColumn('failedAttempts').withDefault(Constant(0));
  readonly lockedUntil = dateTimeColumn('lockedUntil').nullable();
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  /// الأقسام المحجوبة عن المستخدم: JSON بقائمة من `supply` و`fuel` و`admin.*`.
  /// فارغ `[]` = لا حجب. (v25)
  readonly sectionBlocked = textColumn('sectionBlocked').withDefault(Constant('[]'));

  /// توقيع المالك (ECDSA P-256) على منح دور مدير/مالك أو فكّ حجب، يُتحقَّق منه
  /// بالمفتاح العام المدفون في التطبيق. فارغ = غير موقَّع. (v25)
  readonly ownerSig = textColumn('ownerSig').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface UsersCompanionFields extends Record<string, unknown> {
  id?: CompanionInput<string>;
  username?: CompanionInput<string>;
  name?: CompanionInput<string>;
  email?: CompanionInput<string>;
  role?: CompanionInput<string>;
  roles?: CompanionInput<string>;
  permissions?: CompanionInput<string>;
  warehouseScope?: CompanionInput<string>;
  saltHex?: CompanionInput<string>;
  hashHex?: CompanionInput<string>;
  iterations?: CompanionInput<number>;
  active?: CompanionInput<boolean>;
  approved?: CompanionInput<boolean>;
  failedAttempts?: CompanionInput<number>;
  lockedUntil?: CompanionInput<Date | null>;
  createdAt?: CompanionInput<Date>;
  updatedAt?: CompanionInput<Date | null>;
  sectionBlocked?: CompanionInput<string>;
  ownerSig?: CompanionInput<string>;
}

export interface UsersCompanionInsert extends UsersCompanionFields {
  id: CompanionInput<string>;
  username: CompanionInput<string>;
}

export function UsersCompanion(data: UsersCompanionFields): UsersCompanionFields {
  return data;
}

UsersCompanion.insert = function insert(data: UsersCompanionInsert): UsersCompanionInsert {
  return data;
};

export interface Category extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export class CategoriesTable extends DriftTable<Category> {
  readonly actualTableName = 'categories';

  readonly id = textColumn('id');
  readonly name = textColumn('name');
  readonly description = textColumn('description').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface Item extends Record<string, unknown> {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly baseUnit: string;
  readonly units: string;
  readonly qty: number;
  readonly minQty: number;
  readonly barcode: string;
  readonly isRefillable: boolean;
  readonly reportUnit: string;
  readonly createdAt: Date;
  readonly isAsset: boolean;
  readonly assetType: string;
  readonly lifespanMonths: number;
  readonly unitValue: number;
}

export class ItemsTable extends DriftTable<Item> {
  readonly actualTableName = 'items';

  readonly id = textColumn('id');
  readonly code = textColumn('code').withDefault(Constant(''));
  readonly name = textColumn('name');
  readonly categoryId = textColumn('categoryId').withDefault(Constant(''));
  readonly categoryName = textColumn('categoryName').withDefault(Constant(''));
  readonly baseUnit = textColumn('baseUnit').withDefault(Constant(''));
  readonly units = textColumn('units').withDefault(Constant('[]'));
  readonly qty = realColumn('qty').withDefault(Constant(0));
  readonly minQty = realColumn('minQty').withDefault(Constant(0));
  readonly barcode = textColumn('barcode').withDefault(Constant(''));
  readonly isRefillable = boolColumn('isRefillable').withDefault(Constant(false));

  /// v7: وحدة العرض الافتراضية — الرصيد يُخزَّن دائمًا بالوحدة الأساسية، لكن
  /// يُعرض بهذه الوحدة في التقارير وفي رصيد شاشات الإدخال. فارغة = الأساسية.
  readonly reportUnit = textColumn('reportUnit').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  /// v27: أصلٌ ثابت.
  readonly isAsset = boolColumn('isAsset').withDefault(Constant(false));
  readonly assetType = textColumn('assetType').withDefault(Constant(''));
  readonly lifespanMonths = intColumn('lifespanMonths').withDefault(Constant(0));
  readonly unitValue = realColumn('unitValue').withDefault(Constant(0));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface Warehouse extends Record<string, unknown> {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly manager: string;
  readonly location: string;
  readonly feedsAllCamps: boolean;
  readonly fuelCapacityLiters: number;
  readonly isMain: boolean;
  readonly campIds: string;
  readonly notes: string;
}

export class WarehousesTable extends DriftTable<Warehouse> {
  readonly actualTableName = 'warehouses';

  readonly id = textColumn('id');
  readonly code = textColumn('code').withDefault(Constant(''));
  readonly name = textColumn('name');
  readonly manager = textColumn('manager').withDefault(Constant(''));
  readonly location = textColumn('location').withDefault(Constant(''));
  readonly feedsAllCamps = boolColumn('feedsAllCamps').withDefault(Constant(true));
  readonly fuelCapacityLiters = realColumn('fuelCapacityLiters').withDefault(Constant(0));
  readonly isMain = boolColumn('isMain').withDefault(Constant(false));
  readonly campIds = textColumn('campIds').withDefault(Constant('[]'));
  readonly notes = textColumn('notes').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const WarehousesCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    code?: CompanionInput<string>;
    name: CompanionInput<string>;
    manager?: CompanionInput<string>;
    location?: CompanionInput<string>;
    feedsAllCamps?: CompanionInput<boolean>;
    fuelCapacityLiters?: CompanionInput<number>;
    isMain?: CompanionInput<boolean>;
    campIds?: CompanionInput<string>;
    notes?: CompanionInput<string>;
  }) {
    return data;
  },
};

export interface Supplier extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly notes: string;
  readonly contact: string;
  readonly city: string;
}

export class SuppliersTable extends DriftTable<Supplier> {
  readonly actualTableName = 'suppliers';

  readonly id = textColumn('id');
  readonly name = textColumn('name');
  readonly phone = textColumn('phone').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly contact = textColumn('contact').withDefault(Constant(''));
  readonly city = textColumn('city').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// الوحدات المستفيدة والمعسكرات (شجرة: المعسكر أب والوحدات أبناء)
export interface BeneficiaryUnit extends Record<string, unknown> {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: string;
  readonly parentId: string;
  readonly parentName: string;
  readonly isCamp: boolean;
  readonly facilityId: string;
  readonly facilityIds: string;
  readonly category: string;
}

export class BeneficiaryUnitsTable extends DriftTable<BeneficiaryUnit> {
  readonly actualTableName = 'beneficiary_units';

  readonly id = textColumn('id');
  readonly code = textColumn('code').withDefault(Constant(''));
  readonly name = textColumn('name');
  readonly type = textColumn('type').withDefault(Constant('unit'));
  readonly parentId = textColumn('parentId').withDefault(Constant(''));
  readonly parentName = textColumn('parentName').withDefault(Constant(''));
  readonly isCamp = boolColumn('isCamp').withDefault(Constant(false));
  readonly facilityId = textColumn('facilityId').withDefault(Constant(''));
  readonly facilityIds = textColumn('facilityIds').withDefault(Constant('[]'));
  readonly category = textColumn('category').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// المطابخ والأفران
export interface Facility extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly fType: string;
  readonly capacity: number;
  readonly warehouse: string;
  readonly notes: string;
}

export class FacilitiesTable extends DriftTable<Facility> {
  readonly actualTableName = 'facilities';

  readonly id = textColumn('id');
  readonly name = textColumn('name');
  readonly fType = textColumn('fType').withDefault(Constant('kitchen'));
  readonly capacity = intColumn('capacity').withDefault(Constant(0));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v5: مراجعة الأحداث الحساسة/الحرجة
export interface SensitiveReview extends Record<string, unknown> {
  readonly id: string;
  readonly logId: string;
  readonly reviewedBy: string;
  readonly note: string;
  readonly reviewedAt: Date;
}

export class SensitiveReviewsTable extends DriftTable<SensitiveReview> {
  readonly actualTableName = 'sensitive_reviews';

  readonly id = textColumn('id');
  readonly logId = textColumn('logId');
  readonly reviewedBy = textColumn('reviewedBy').withDefault(Constant(''));
  readonly note = textColumn('note').withDefault(Constant(''));
  readonly reviewedAt = dateTimeColumn('reviewedAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const SensitiveReviewsCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    logId: CompanionInput<string>;
    reviewedBy?: CompanionInput<string>;
    note?: CompanionInput<string>;
    reviewedAt?: CompanionInput<Date>;
  }) {
    return data;
  },
};

export interface AuditLog extends Record<string, unknown> {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly summary: string;
  readonly details: string;
  readonly risk: string;
  readonly actorEmail: string;
  readonly logDate: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly refNo: string;
  readonly warehouse: string;
  readonly target: string;
  readonly status: string;
  readonly itemCount: number;
  readonly qty: number;
  readonly createdAt: Date;
}

export class AuditLogsTable extends DriftTable<AuditLog> {
  readonly actualTableName = 'audit_logs';

  readonly id = textColumn('id');
  readonly action = textColumn('action');
  readonly entityType = textColumn('entityType').withDefault(Constant(''));
  readonly summary = textColumn('summary').withDefault(Constant(''));
  readonly details = textColumn('details').withDefault(Constant('{}'));
  readonly risk = textColumn('risk').withDefault(Constant('normal'));
  readonly actorEmail = textColumn('actorEmail').withDefault(Constant(''));
  readonly logDate = textColumn('logDate').withDefault(Constant(''));
  readonly actorName = textColumn('actorName').withDefault(Constant(''));
  readonly actorRole = textColumn('actorRole').withDefault(Constant('user'));
  readonly refNo = textColumn('refNo').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly target = textColumn('target').withDefault(Constant(''));
  readonly status = textColumn('status').withDefault(Constant(''));
  readonly itemCount = intColumn('itemCount').withDefault(Constant(0));
  readonly qty = realColumn('qty').withDefault(Constant(0));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const AuditLogsCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    action: CompanionInput<string>;
    entityType?: CompanionInput<string>;
    summary?: CompanionInput<string>;
    details?: CompanionInput<string>;
    risk?: CompanionInput<string>;
    actorEmail?: CompanionInput<string>;
    logDate?: CompanionInput<string>;
    actorName?: CompanionInput<string>;
    actorRole?: CompanionInput<string>;
    refNo?: CompanionInput<string>;
    warehouse?: CompanionInput<string>;
    target?: CompanionInput<string>;
    status?: CompanionInput<string>;
    itemCount?: CompanionInput<number>;
    qty?: CompanionInput<number>;
    createdAt?: CompanionInput<Date>;
  }) {
    return data;
  },
};

/// إعدادات عامة (هوية الجهة، تخطيط الطباعة، إعدادات النماذج) بصيغة JSON
export interface AppSetting extends Record<string, unknown> {
  readonly key: string;
  readonly value: string;
  readonly updatedAt: Date | null;
}

export class AppSettingsTable extends DriftTable<AppSetting> {
  readonly actualTableName = 'app_settings';

  readonly key = textColumn('key');
  readonly value = textColumn('value').withDefault(Constant('{}'));
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.key];
  }
}

export const AppSettingsCompanion = {
  insert(data: {
    key: CompanionInput<string>;
    value?: CompanionInput<string>;
    updatedAt?: CompanionInput<Date | null>;
  }) {
    return data;
  },
};
