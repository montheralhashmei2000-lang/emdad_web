import {
  boolColumn,
  Constant,
  currentDateAndTime,
  dateTimeColumn,
  DriftTable,
  realColumn,
  textColumn,
  type CompanionInput,
  type GeneratedColumn,
} from '../sqlite_driver';

/// حصر القوة اليومي (التفريدة)
export interface Strength extends Record<string, unknown> {
  readonly id: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly campId: string;
  readonly campName: string;
  readonly strengthDate: string;
  readonly soldierCount: number;
  readonly officerCount: number;
  readonly total: number;
  readonly pct: number;
  readonly mode: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class StrengthsTable extends DriftTable<Strength> {
  readonly actualTableName = 'strengths';

  readonly id = textColumn('id');
  readonly unitId = textColumn('unitId');
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly campId = textColumn('campId').withDefault(Constant(''));
  readonly campName = textColumn('campName').withDefault(Constant(''));
  readonly strengthDate = textColumn('strengthDate'); // yyyy-MM-dd
  readonly soldierCount = realColumn('soldierCount').withDefault(Constant(0));
  readonly officerCount = realColumn('officerCount').withDefault(Constant(0));
  readonly total = realColumn('total').withDefault(Constant(0));
  readonly pct = realColumn('pct').withDefault(Constant(0));
  readonly mode = textColumn('mode').withDefault(Constant('detail')); // camp | detail
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface KitchenLog extends Record<string, unknown> {
  readonly id: string;
  readonly facilityId: string;
  readonly facilityName: string;
  readonly date: string;
  readonly mealType: string;
  readonly strength: number;
  readonly itemId: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly qty: number;
  readonly baseQty: number;
  readonly expectedBase: number;
  readonly varianceBase: number;
  readonly notes: string;
  readonly createdAt: Date;
}

export class KitchenLogsTable extends DriftTable<KitchenLog> {
  readonly actualTableName = 'kitchen_logs';

  readonly id = textColumn('id');
  readonly facilityId = textColumn('facilityId');
  readonly facilityName = textColumn('facilityName').withDefault(Constant(''));
  readonly date = textColumn('date');
  readonly mealType = textColumn('mealType').withDefault(Constant('LUNCH'));
  readonly strength = realColumn('strength').withDefault(Constant(0));
  readonly itemId = textColumn('itemId').withDefault(Constant(''));
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly qty = realColumn('qty').withDefault(Constant(0));
  readonly baseQty = realColumn('baseQty').withDefault(Constant(0));
  readonly expectedBase = realColumn('expectedBase').withDefault(Constant(0));
  readonly varianceBase = realColumn('varianceBase').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// نسب الاستحقاق: كمية شهرية للفرد بوحدة مختارة
export interface Entitlement extends Record<string, unknown> {
  readonly itemId: string;
  readonly itemName: string;
  readonly qtyPerPerson: number;
  readonly measureUnitName: string;
  readonly measureFactor: number;
  readonly notes: string;
  readonly updatedAt: Date | null;
  readonly isCritical: boolean;
  readonly substituteItemId: string;
  readonly substituteItemName: string;
  readonly substituteRatio: number;
}

export class EntitlementsTable extends DriftTable<Entitlement> {
  readonly actualTableName = 'entitlements';

  readonly itemId = textColumn('itemId');
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly qtyPerPerson = realColumn('qtyPerPerson').withDefault(Constant(0)); // للشهر
  readonly measureUnitName = textColumn('measureUnitName').withDefault(Constant(''));
  readonly measureFactor = realColumn('measureFactor').withDefault(Constant(1));
  readonly notes = textColumn('notes').withDefault(Constant('')); // v3: ملاحظة أو شرط المقرر
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  /// v28: أساسيٌّ حرج — نقصه بلا بديل يوقف صرف الوجبة.
  readonly isCritical = boolColumn('isCritical').withDefault(Constant(true));

  /// v28: البديل القياسي ومعامله
  readonly substituteItemId = textColumn('substituteItemId').withDefault(Constant(''));
  readonly substituteItemName = textColumn('substituteItemName').withDefault(Constant(''));
  readonly substituteRatio = realColumn('substituteRatio').withDefault(Constant(0));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.itemId];
  }
}

/// v9: خطة الوجبات — ما يُطبخ في كل يوم ووجبة، وكم لكل فرد.
export interface MealPlan extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly planType: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: string;
  readonly facilityId: string;
  readonly facilityName: string;
  readonly warehouse: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class MealPlansTable extends DriftTable<MealPlan> {
  readonly actualTableName = 'meal_plans';

  readonly id = textColumn('id');
  readonly name = textColumn('name');
  /// WEEKLY | BIWEEKLY | MONTHLY | CUSTOM
  readonly planType = textColumn('planType').withDefault(Constant('WEEKLY'));
  readonly startDate = textColumn('startDate').withDefault(Constant(''));
  readonly endDate = textColumn('endDate').withDefault(Constant(''));
  /// DRAFT | ACTIVE | ARCHIVED
  readonly status = textColumn('status').withDefault(Constant('DRAFT'));
  readonly facilityId = textColumn('facilityId').withDefault(Constant(''));
  readonly facilityName = textColumn('facilityName').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export interface MealPlansCompanionFields extends Record<string, unknown> {
  id?: CompanionInput<string>;
  name?: CompanionInput<string>;
  planType?: CompanionInput<string>;
  startDate?: CompanionInput<string>;
  endDate?: CompanionInput<string>;
  status?: CompanionInput<string>;
  facilityId?: CompanionInput<string>;
  facilityName?: CompanionInput<string>;
  warehouse?: CompanionInput<string>;
  notes?: CompanionInput<string>;
  createdBy?: CompanionInput<string>;
  createdAt?: CompanionInput<Date>;
  updatedAt?: CompanionInput<Date | null>;
}

export interface MealPlansCompanionInsert extends MealPlansCompanionFields {
  id: CompanionInput<string>;
  name: CompanionInput<string>;
}

export function MealPlansCompanion(data: MealPlansCompanionFields): MealPlansCompanionFields {
  return data;
}

MealPlansCompanion.insert = function insert(
  data: MealPlansCompanionInsert,
): MealPlansCompanionInsert {
  return data;
};

/// صنف واحد في وجبة واحدة من يوم واحد.
export interface MealPlanEntry extends Record<string, unknown> {
  readonly id: string;
  readonly planId: string;
  readonly entryDate: string;
  readonly mealType: string;
  readonly itemId: string;
  readonly itemCode: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly factor: number;
  readonly qtyPerPerson: number;
  readonly notes: string;
  readonly isCritical: boolean;
  readonly substituteItemId: string;
  readonly substituteItemName: string;
  readonly substituteUnitName: string;
  readonly substituteFactor: number;
  readonly substituteQtyPerPerson: number;
  readonly stdKey: string;
}

export class MealPlanEntriesTable extends DriftTable<MealPlanEntry> {
  readonly actualTableName = 'meal_plan_entries';

  readonly id = textColumn('id');
  readonly planId = textColumn('planId');
  readonly entryDate = textColumn('entryDate').withDefault(Constant(''));
  /// BREAKFAST | LUNCH | DINNER | SNACK
  readonly mealType = textColumn('mealType').withDefault(Constant('LUNCH'));
  readonly itemId = textColumn('itemId').withDefault(Constant(''));
  readonly itemCode = textColumn('itemCode').withDefault(Constant(''));
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly factor = realColumn('factor').withDefault(Constant(1));
  readonly qtyPerPerson = realColumn('qtyPerPerson').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));

  /// v28: درجة المكوّن في الوجبة (BOM) وبديله فيها بكميته للفرد بوحدته.
  readonly isCritical = boolColumn('isCritical').withDefault(Constant(true));
  readonly substituteItemId = textColumn('substituteItemId').withDefault(Constant(''));
  readonly substituteItemName = textColumn('substituteItemName').withDefault(Constant(''));
  readonly substituteUnitName = textColumn('substituteUnitName').withDefault(Constant(''));
  readonly substituteFactor = realColumn('substituteFactor').withDefault(Constant(1));
  readonly substituteQtyPerPerson = realColumn('substituteQtyPerPerson').withDefault(Constant(0));

  /// v28: المكوّن القياسي الذي وُلّد منه السطر (`StandardRations`)، فارغ لما أُدخل يدويًا.
  readonly stdKey = textColumn('stdKey').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v28: قوة الوجبة في مطبخ/فرن ليوم
export interface MealHeadcountRow extends Record<string, unknown> {
  readonly id: string;
  readonly facilityId: string;
  readonly facilityName: string;
  readonly date: string;
  readonly mealType: string;
  readonly headcount: number;
  readonly notes: string;
  readonly createdBy: string;
  readonly updatedAt: Date;
}

export class MealHeadcountsTable extends DriftTable<MealHeadcountRow> {
  readonly actualTableName = 'meal_headcounts';

  readonly id = textColumn('id');
  readonly facilityId = textColumn('facilityId');
  readonly facilityName = textColumn('facilityName').withDefault(Constant(''));
  readonly date = textColumn('date');
  /// BREAKFAST | LUNCH | DINNER
  readonly mealType = textColumn('mealType');
  readonly headcount = realColumn('headcount').withDefault(Constant(0));
  readonly notes = textColumn('notes').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly updatedAt = dateTimeColumn('updatedAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v28: سجل صرف الوجبات — رأسٌ لكل وجبةٍ صُرفت من الخطة إلى مطبخ.
export interface MealDispatch extends Record<string, unknown> {
  readonly id: string;
  readonly issueRef: string;
  readonly planId: string;
  readonly planName: string;
  readonly facilityId: string;
  readonly facilityName: string;
  readonly warehouse: string;
  readonly date: string;
  readonly mealType: string;
  readonly headcount: number;
  readonly wastePct: number;
  readonly wholePacks: boolean;
  readonly decision: string;
  readonly reason: string;
  readonly warnings: string;
  readonly overrideBy: string;
  readonly overrideToken: string;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export class MealDispatchesTable extends DriftTable<MealDispatch> {
  readonly actualTableName = 'meal_dispatches';

  readonly id = textColumn('id');
  readonly issueRef = textColumn('issueRef').withDefault(Constant(''));
  readonly planId = textColumn('planId').withDefault(Constant(''));
  readonly planName = textColumn('planName').withDefault(Constant(''));
  readonly facilityId = textColumn('facilityId').withDefault(Constant(''));
  readonly facilityName = textColumn('facilityName').withDefault(Constant(''));
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));
  readonly date = textColumn('date').withDefault(Constant(''));
  readonly mealType = textColumn('mealType').withDefault(Constant('LUNCH'));
  readonly headcount = realColumn('headcount').withDefault(Constant(0));
  readonly wastePct = realColumn('wastePct').withDefault(Constant(0));
  readonly wholePacks = boolColumn('wholePacks').withDefault(Constant(false));
  /// `pass` | `soft` | `hard` — درجة قرار المحرّك (`RuleDecision`).
  readonly decision = textColumn('decision').withDefault(Constant('pass'));
  readonly reason = textColumn('reason').withDefault(Constant(''));
  /// تحذيرات المحرّك كما عُرضت (JSON قائمة نصوص).
  readonly warnings = textColumn('warnings').withDefault(Constant('[]'));
  readonly overrideBy = textColumn('overrideBy').withDefault(Constant(''));
  readonly overrideToken = textColumn('overrideToken').withDefault(Constant(''));
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

/// v28: سطر صرف وجبة — صنفٌ واحد بحاجته وما صُرف منه ومرحَّله. الكميات بوحدة الأساس.
export interface MealDispatchLine extends Record<string, unknown> {
  readonly id: string;
  readonly dispatchId: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly requiredBase: number;
  readonly issuedBase: number;
  readonly carryIn: number;
  readonly carryOut: number;
  readonly kind: string;
  readonly isCritical: boolean;
  readonly substituteForId: string;
  readonly substituteForName: string;
  readonly note: string;
}

export class MealDispatchLinesTable extends DriftTable<MealDispatchLine> {
  readonly actualTableName = 'meal_dispatch_lines';

  readonly id = textColumn('id');
  readonly dispatchId = textColumn('dispatchId');
  readonly itemId = textColumn('itemId').withDefault(Constant(''));
  readonly itemName = textColumn('itemName').withDefault(Constant(''));
  readonly unitName = textColumn('unitName').withDefault(Constant(''));
  readonly requiredBase = realColumn('requiredBase').withDefault(Constant(0));
  readonly issuedBase = realColumn('issuedBase').withDefault(Constant(0));
  readonly carryIn = realColumn('carryIn').withDefault(Constant(0));
  readonly carryOut = realColumn('carryOut').withDefault(Constant(0));
  /// `full` | `substitute` | `partial` | `carried` (`DeductionKind`).
  readonly kind = textColumn('kind').withDefault(Constant('full'));
  readonly isCritical = boolColumn('isCritical').withDefault(Constant(true));
  readonly substituteForId = textColumn('substituteForId').withDefault(Constant(''));
  readonly substituteForName = textColumn('substituteForName').withDefault(Constant(''));
  readonly note = textColumn('note').withDefault(Constant(''));

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
