import { useEffect, useRef, useState } from 'react';
import { arDigits } from '../imd_format';
import { ImdStyle } from '../imd_style';
import { ImdColors, ImdCursor, ImdSizes } from '../imd_tokens';
import { ImdButton, ImdButtonOutline } from './imd_buttons';
import { imdFieldDecoration } from './imd_fields';

function resolveActiveColors(explicit?: ImdColors): ImdColors {
  if (explicit) return explicit;
  if (typeof document !== 'undefined') {
    const ds = document.documentElement.dataset;
    const isDark = ds.theme === 'dark';
    const isFuel = ds.section === 'fuel';
    if (isFuel) return isDark ? ImdColors.fuelDark : ImdColors.fuelLight;
    if (isDark) return ImdColors.dark;
  }
  return ImdStyle.classic ? ImdColors.classicLight : ImdColors.light;
}

export interface ImdColumnFilterBodyProps {
  readonly values: readonly string[];
  /// المسموح حاليًّا، أو `null` فكلها مسموحة.
  readonly selected?: ReadonlySet<string> | null;
  /// نصّ العرض للقيمة (الفارغة «(فارغ)»).
  readonly shown?: (value: string) => string;
  readonly onApply?: (selected: Set<string>) => void;
  readonly onCancel?: () => void;
  readonly colors?: ImdColors;
}

/// محتوى حوار تصفية عمود: بحثٌ وقائمةُ قيمه المميّزة بمربّعات اختيار. يُرجع
/// `Set<string>` بالقيم المسموحة (كل القيم = لا تصفية).
export function ImdColumnFilterBody({
  values,
  selected,
  shown = (v) => (v.length === 0 ? '(فارغ)' : arDigits(v)),
  onApply,
  onCancel,
  colors,
}: ImdColumnFilterBodyProps) {
  const c = resolveActiveColors(colors);
  const [sel, setSel] = useState<Set<string>>(
    () => new Set(selected ?? values),
  );
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const deco = imdFieldDecoration({
    hint: 'بحث في القيم',
    compact: false,
    flush: false,
    colors: c,
  });

  useEffect(() => {
    setSel(new Set(selected ?? values));
  }, [selected, values]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const trimmed = query.trim();
  const trimmedLower = trimmed.toLowerCase();
  const list = values.filter(
    (v) => trimmed.length === 0 || shown(v).toLowerCase().includes(trimmedLower),
  );

  const selectAll = () => {
    setSel((prev) => {
      const next = new Set(prev);
      for (const item of list) next.add(item);
      return next;
    });
  };

  const clearAll = () => {
    setSel((prev) => {
      const next = new Set(prev);
      for (const item of list) next.delete(item);
      return next;
    });
  };

  const toggleItem = (v: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-col items-stretch">
      <div style={deco.containerStyle(searchFocused)}>
        <input
          ref={searchRef}
          type="text"
          autoFocus
          value={query}
          placeholder="بحث في القيم"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent placeholder:text-[color:var(--imd-faint)]"
          style={{
            ...deco.inputStyle,
            fontSize: 13.5,
            color: c.text.css,
          }}
        />
      </div>

      <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={selectAll}
          className="border-0 bg-transparent px-2 py-1 font-medium transition-colors"
          style={{
            fontSize: 12,
            color: c.accent.css,
            cursor: ImdCursor.click,
            borderRadius: ImdSizes.compactRadius,
          }}
        >
          تحديد الكل
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="border-0 bg-transparent px-2 py-1 font-medium transition-colors"
          style={{
            fontSize: 12,
            color: c.accent.css,
            cursor: ImdCursor.click,
            borderRadius: ImdSizes.compactRadius,
          }}
        >
          إلغاء الكل
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
        {list.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ padding: 16, color: c.muted.css, fontSize: 13 }}
          >
            لا قيم مطابقة
          </div>
        ) : (
          <div className="flex flex-col">
            {list.map((v, idx) => {
              const on = sel.has(v);
              const labelText = shown(v);
              return (
                <label
                  key={`${idx}-${v}`}
                  className="flex items-center gap-2 rounded transition-colors hover:bg-[color:var(--imd-hover)]"
                  style={{
                    paddingBlock: 4,
                    paddingInline: 4,
                    cursor: ImdCursor.click,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleItem(v)}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: c.accent.css,
                      cursor: ImdCursor.click,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{
                      fontSize: 13,
                      color: v.length === 0 ? c.muted.css : c.text.css,
                    }}
                  >
                    {labelText}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-end gap-2"
        style={{ marginTop: 12 }}
      >
        <ImdButtonOutline
          label="إلغاء"
          onPressed={onCancel}
          colors={c}
        />
        {/* لا يُسمح بتصفيةٍ فارغة: تُخفي كل الصفوف فلا يعرف المستخدم ما جرى. */}
        <ImdButton
          label="تطبيق"
          onPressed={sel.size === 0 ? null : () => onApply?.(new Set(sel))}
          colors={c}
        />
      </div>
    </div>
  );
}
