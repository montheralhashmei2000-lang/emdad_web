// MISSING: lib/domain/standard_rations.dart (المرحلة 13/14)
// بديل صوري أدنى لتوقيعات المكوّنات القياسية دون اختراع منطق.

export interface StandardIngredient {
  readonly aliases: readonly string[];
}

export class StandardRations {
  private constructor() {}

  // MISSING: lib/domain/standard_rations.dart
  static of(_key: string): StandardIngredient | null {
    return null;
  }
}
