/// تصنيف أصناف المخزن إلى مجموعات استحقاق من أسمائها.
///
/// لكل سطرٍ من المعيار ([RationStandard]) كلماتٌ دالة (أسماء مكوّناته القياسية وما
/// يضاف إليها): الأصناف التي تحوي اسمها إحداها تُجمع في مجموعةٍ **متى بلغت صنفين**
/// — صنفٌ وحيد لا يحتاج مجموعة. وصنفٌ يطابق أكثر من سطرٍ يذهب إلى الأول بترتيب
/// الجدول، فلا يكون في مجموعتين. الناتج **اقتراح** يُراجَع ولا يُحفظ من تلقاء نفسه.

// MISSING: lib/domain/entitlement_groups.dart (المرحلة 13/14)
import {
  EntitlementGroup,
  GroupMember,
  GroupUnitGuess,
} from './entitlement_groups';
// MISSING: lib/domain/official_rations.dart (المرحلة 14)
import {
  OfficialMerge,
  RationCycle,
  RationStandard,
  RationVariant,
  type OfficialRationItemSpec,
} from './official_rations';
// MISSING: lib/domain/standard_rations.dart (المرحلة 13/14)
import { StandardRations } from './standard_rations';

/// صنفٌ من الكتالوج كما يحتاجه التصنيف.
export class ClassifierItem {
  readonly id: string;
  readonly name: string;
  readonly baseUnit: string;
  readonly isAsset: boolean;

  constructor({
    id,
    name,
    baseUnit,
    isAsset = false,
  }: {
    readonly id: string;
    readonly name: string;
    readonly baseUnit: string;
    readonly isAsset?: boolean;
  }) {
    this.id = id;
    this.name = name;
    this.baseUnit = baseUnit;
    this.isAsset = isAsset;
  }
}

export class GroupClassifier {
  private constructor() {}

  /// كلماتٌ إضافية لأسطر تضمّ أصنافًا كثيرة الأسماء.
  static readonly extraWords: Readonly<Record<string, readonly string[]>> = {
    spices: [
      'كمون',
      'كركم',
      'هيل',
      'قرفة',
      'كزبرة',
      'زنجبيل',
      'قرنفل',
      'حبهان',
      'فلفل أسود',
      'بهار',
      'بهارات',
      'كبسة',
      'مندي',
      'برياني',
    ],
    legumes: [
      'فول',
      'فاصوليا',
      'فاصولياء',
      'عدس',
      'حمص',
      'بقوليات',
      'لوبيا',
      'بازلاء',
      'بزالياء',
    ],
    oil: ['زيت', 'سمن'],
    tea: ['شاي', 'شاهي'],
    sugar: ['سكر'],
    rice: ['أرز', 'ارز', 'رز'],
    flour: ['دقيق', 'طحين'],
    milk: ['حليب', 'لبن مجفف'],
    tuna: ['تونة', 'تونه'],
    paste: ['صلصة', 'صلصه', 'معجون طماطم'],
  };

  private static _norm(s: string): string {
    return s
      .replace(/[ً-ْـ]/g, '')
      .replace(/أ/g, 'ا')
      .replace(/إ/g, 'ا')
      .replace(/آ/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase();
  }

  /// مطابقة كلمة: كلمةٌ كاملة (أو بـ«ال») في اسم الصنف، لا جزءٌ من كلمة أخرى —
  /// «بيض» لا تلتقط «دقيق أبيض». والكلمة من أربعة أحرف فأكثر تلتقط تصريفاتها.
  private static _matches(name: string, w: string): boolean {
    if (w.includes(' ')) return name.includes(w);
    for (const t of name.split(/[\s\-_/،,()]+/)) {
      if (t === w || t === `ال${w}` || (w.length >= 4 && t.startsWith(w))) {
        return true;
      }
    }
    return false;
  }

  private static _wordsOf(spec: OfficialRationItemSpec): string[] {
    const out = new Set<string>(GroupClassifier.extraWords[spec.itemCode] ?? []);
    for (const k of spec.allKeys) {
      const ing = StandardRations.of(k);
      if (ing !== null) {
        for (const a of ing.aliases) out.add(a);
      }
    }
    return Array.from(out, (w) => GroupClassifier._norm(w)).filter(
      (w) => w.length > 0,
    );
  }

  /// يقترح مجموعاتٍ لأصناف [items] من [standard]، بمقررها لدورة [cycle].
  ///
  /// [taken] أصنافٌ في مجموعاتٍ قائمة فلا تدخل في أخرى، و[existingCodes] أسطرٌ لها
  /// مجموعةٌ بالفعل فلا تُقترح ثانيةً.
  static propose(
    items: readonly ClassifierItem[],
    {
      standard = RationStandard.detailed32,
      cycle = RationCycle.month30,
      variant = RationVariant.primary,
      taken = new Set<string>(),
      existingCodes = new Set<string>(),
      newId,
    }: {
      readonly standard?: RationStandard;
      readonly cycle?: RationCycle;
      readonly variant?: RationVariant;
      readonly taken?: ReadonlySet<string>;
      readonly existingCodes?: ReadonlySet<string>;
      readonly newId: () => string;
    },
  ): EntitlementGroup[] {
    const byCode = new Map<string, ClassifierItem[]>();
    const claimed = new Set<string>(taken);
    for (const spec of standard.specs) {
      if (!spec.hasQuantity || existingCodes.has(spec.itemCode)) continue;
      const words = GroupClassifier._wordsOf(spec);
      const hits = items.filter(
        (it) =>
          !it.isAsset &&
          !claimed.has(it.id) &&
          words.some((w) =>
            GroupClassifier._matches(GroupClassifier._norm(it.name), w),
          ),
      );
      // سطرٌ يطابقه صنفٌ واحد لا يحتاج مجموعة، وأصنافه تبقى متاحةً لسطرٍ بعده.
      if (hits.length < 2) continue;
      byCode.set(spec.itemCode, hits);
      for (const h of hits) claimed.add(h.id);
    }
    const v =
      standard === RationStandard.compact27 ? variant : RationVariant.primary;
    const result: EntitlementGroup[] = [];
    for (const [code, hits] of byCode.entries()) {
      const spec = standard.specOf(code)!;
      result.push(
        new EntitlementGroup({
          id: newId(),
          name: spec.itemName,
          unitName: spec.unitName,
          monthlyPerPerson:
            Math.round(OfficialMerge.per30(spec, cycle, { variant: v }) * 1000) /
            1000,
          isCritical: spec.isCritical,
          stdCode: spec.itemCode,
          members: hits.map(
            (it) =>
              new GroupMember({
                itemId: it.id,
                itemName: it.name,
                perBase:
                  GroupUnitGuess.perBase(spec.unitName, it.baseUnit, it.name) ??
                  1,
              }),
          ),
        }),
      );
    }
    return result;
  }
}
