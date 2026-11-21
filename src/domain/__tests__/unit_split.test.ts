import { describe, expect, it } from 'vitest';
import {
  kUnitLevelValues,
  UnitLevel,
  UnitSplit,
  type SplitUnit,
} from '../unit_split';

describe('unit_split_test', () => {
  const units: readonly SplitUnit[] = [
    { name: 'كجم', factor: 1.0 },
    { name: 'كيس', factor: 40.0 },
    { name: 'شدة', factor: 400.0 },
  ];
  const fmt = (v: number): string =>
    v === Math.round(v) ? `${Math.trunc(v)}` : `${v}`;

  it('٢٠٣٠ كجم بالكيس والكجم ⇒ ٥٠ كيس و٣٠ كجم', () => {
    const lv = UnitSplit.levels(
      units,
      new Set([UnitLevel.second, UnitLevel.base]),
    );
    const parts = UnitSplit.split(2030, Array.from(lv.values()));
    expect(parts).toEqual([
      ['كيس', 50.0],
      ['كجم', 30.0],
    ]);
    expect(UnitSplit.text(parts, fmt)).toBe('50 كيس + 30 كجم');
  });

  it('الكبرى وحدها تأخذ الكسر، وكل الوحدات تفكّك على الثلاث', () => {
    expect(UnitSplit.split(600, [units[2]])).toEqual([['شدة', 1.5]]);
    expect(UnitSplit.split(2030, units)).toEqual([
      ['شدة', 5.0],
      ['كيس', 0.0],
      ['كجم', 30.0],
    ]);
    expect(UnitSplit.text(UnitSplit.split(2030, units), fmt)).toBe(
      '5 شدة + 30 كجم',
    );
  });

  it('السالب يُفكَّك بقيمته المطلقة، والصفر يُكتب', () => {
    expect(UnitSplit.split(-45, units.slice(0, 2))).toEqual([
      ['كيس', -1.0],
      ['كجم', -5.0],
    ]);
    expect(UnitSplit.text(UnitSplit.split(0, units), fmt)).toBe('0 شدة');
  });

  it('صنفٌ بوحدتين: الثانية والكبرى وحدةٌ واحدة تُحسب للكبرى', () => {
    const lv = UnitSplit.levels(
      units.slice(0, 2),
      new Set(kUnitLevelValues),
    );
    expect(Array.from(lv.keys())).toEqual([UnitLevel.large, UnitLevel.base]);
  });
});
