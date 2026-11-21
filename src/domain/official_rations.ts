// MISSING: lib/domain/official_rations.dart (المرحلة 14)
// بديل صوري أدنى لتوقيعات المقررات الرسمية دون اختراع منطق.

export interface OfficialRationItemSpec {
  readonly itemCode: string;
  readonly itemName: string;
  readonly unitName: string;
  readonly hasQuantity: boolean;
  readonly isCritical: boolean;
  readonly allKeys: readonly string[];
}

export class RationStandard {
  readonly id: string;
  readonly specs: readonly OfficialRationItemSpec[];

  private constructor(id: string, specs: readonly OfficialRationItemSpec[] = []) {
    this.id = id;
    this.specs = specs;
  }

  static readonly detailed32 = new RationStandard('detailed32');
  static readonly compact27 = new RationStandard('compact27');

  // MISSING: lib/domain/official_rations.dart
  specOf(code: string): OfficialRationItemSpec | null {
    return this.specs.find((s) => s.itemCode === code) ?? null;
  }
}

export enum RationCycle {
  month30 = 'month30',
}

export enum RationVariant {
  primary = 'primary',
}

export class OfficialMerge {
  private constructor() {}

  // MISSING: lib/domain/official_rations.dart
  static per30(
    _spec: OfficialRationItemSpec,
    _cycle: RationCycle,
    _options?: { readonly variant?: RationVariant },
  ): number {
    return 0;
  }
}
