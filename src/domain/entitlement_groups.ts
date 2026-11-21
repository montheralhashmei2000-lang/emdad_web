// MISSING: lib/domain/entitlement_groups.dart (المرحلة 13/14)
// بديل صوري أدنى لتوقيعات مجموعات الاستحقاق دون اختراع منطق.

export class GroupMember {
  readonly itemId: string;
  readonly itemName: string;
  readonly perBase: number;

  constructor({
    itemId,
    itemName,
    perBase,
  }: {
    readonly itemId: string;
    readonly itemName: string;
    readonly perBase: number;
  }) {
    this.itemId = itemId;
    this.itemName = itemName;
    this.perBase = perBase;
  }
}

export class EntitlementGroup {
  readonly id: string;
  readonly name: string;
  readonly unitName: string;
  readonly monthlyPerPerson: number;
  readonly isCritical: boolean;
  readonly stdCode: string;
  readonly members: readonly GroupMember[];

  constructor({
    id,
    name,
    unitName,
    monthlyPerPerson,
    isCritical,
    stdCode,
    members,
  }: {
    readonly id: string;
    readonly name: string;
    readonly unitName: string;
    readonly monthlyPerPerson: number;
    readonly isCritical: boolean;
    readonly stdCode: string;
    readonly members: readonly GroupMember[];
  }) {
    this.id = id;
    this.name = name;
    this.unitName = unitName;
    this.monthlyPerPerson = monthlyPerPerson;
    this.isCritical = isCritical;
    this.stdCode = stdCode;
    this.members = members;
  }
}

export class GroupUnitGuess {
  private constructor() {}

  // MISSING: lib/domain/entitlement_groups.dart
  static perBase(
    _groupUnit: string,
    _itemBaseUnit: string,
    _itemName: string,
  ): number | null {
    return null;
  }
}
