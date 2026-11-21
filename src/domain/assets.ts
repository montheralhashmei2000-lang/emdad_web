// MISSING: lib/domain/assets.dart (المرحلة 8)
// بديل صوري أدنى لتعريف أنواع الأصول الثابتة دون اختراع منطق.

export class AssetType {
  private constructor() {}

  // MISSING: lib/domain/assets.dart
  static readonly equipment = 'equipment';

  // MISSING: lib/domain/assets.dart
  static readonly all: readonly string[] = [AssetType.equipment];

  // MISSING: lib/domain/assets.dart
  static label(type: string): string {
    return type;
  }
}
