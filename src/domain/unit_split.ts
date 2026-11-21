/// تفكيك رصيدٍ بوحدة الأساس على وحداتٍ مختارة للطباعة: ٢٠٣٠ كجم بالكيس (٤٠) والكجم
/// ⇒ «٥٠ كيس + ٣٠ كجم». الكبرى تأخذ أعدادًا صحيحة، والصغرى المختارة تأخذ الباقي (وقد
/// يكون كسرًا إن لم تكن الأساس).

/// مستويات الوحدة المختارة في الطباعة.
export enum UnitLevel {
  large = 'large',
  second = 'second',
  base = 'base',
}

export const kUnitLevelValues: readonly UnitLevel[] = [
  UnitLevel.large,
  UnitLevel.second,
  UnitLevel.base,
];

export const kUnitLevelLabels: Readonly<Record<UnitLevel, string>> = {
  [UnitLevel.large]: 'الوحدة الكبرى',
  [UnitLevel.second]: 'الوحدة الثانية',
  [UnitLevel.base]: 'وحدة الأساس',
};

export function unitLevelLabel(level: UnitLevel): string {
  return kUnitLevelLabels[level];
}

/// وحدةٌ بمعاملها إلى الأساس.
export interface SplitUnit {
  readonly name: string;
  readonly factor: number;
}

export type SplitPart = readonly [string, number];

export class UnitSplit {
  private constructor() {}

  /// وحدات المستويات المختارة لصنفٍ من وحداته: الأساس أصغرها (المعامل ١)، والثانية
  /// التي تليها، والكبرى أكبرها. مستويان يقعان على الوحدة نفسها (صنفٌ بوحدتين أو
  /// بوحدةٍ واحدة) يُحسبان لأكبرهما وحده.
  static levels(
    units: readonly SplitUnit[],
    chosen: ReadonlySet<UnitLevel>,
  ): Map<UnitLevel, SplitUnit> {
    if (units.length === 0) return new Map();
    const asc = [...units].sort((a, b) => a.factor - b.factor);
    const at: Record<UnitLevel, SplitUnit> = {
      [UnitLevel.base]: asc[0],
      [UnitLevel.second]: asc.length > 1 ? asc[1] : asc[0],
      [UnitLevel.large]: asc[asc.length - 1],
    };
    const out = new Map<UnitLevel, SplitUnit>();
    for (const l of kUnitLevelValues) {
      if (!chosen.has(l)) continue;
      const u = at[l];
      let dup = false;
      for (const x of out.values()) {
        if (x.name === u.name) {
          dup = true;
          break;
        }
      }
      if (dup) continue;
      out.set(l, u);
    }
    return out;
  }

  /// يفكّك [baseQty] على [units] من الكبرى إلى الصغرى. الكبرى أعدادٌ صحيحة، والأخيرة
  /// الباقي مقرَّبًا إلى ثلاث خانات. السالب يُفكَّك بقيمته المطلقة وتُسلَب أجزاؤه.
  static split(baseQty: number, units: readonly SplitUnit[]): SplitPart[] {
    if (units.length === 0) return [];
    const desc = [...units].sort((a, b) => b.factor - a.factor);
    const sign = baseQty < 0 ? -1.0 : 1.0;
    let rest = Math.abs(baseQty);
    const out: SplitPart[] = [];
    for (let i = 0; i < desc.length; i++) {
      const f = desc[i].factor <= 0 ? 1.0 : desc[i].factor;
      const last = i === desc.length - 1;
      const q = last ? rest / f : Math.floor((rest + 1e-9) / f);
      rest -= q * f;
      if (Math.abs(rest) < 1e-9) rest = 0;
      const rounded = sign * (Math.round(q * 1000) / 1000);
      out.push([desc[i].name, rounded === 0 ? 0 : rounded]);
    }
    return out;
  }

  /// «٥٠ كيس + ٣٠ كجم» — الأجزاء الصفرية تُسقط ما لم يكن الرصيد كله صفرًا.
  static text(
    parts: readonly SplitPart[],
    fmt: (value: number) => string,
  ): string {
    const nz = parts.filter((p) => p[1] !== 0);
    const show = nz.length === 0 ? parts.slice(0, 1) : nz;
    return show.map((p) => `${fmt(p[1])} ${p[0]}`).join(' + ');
  }
}
