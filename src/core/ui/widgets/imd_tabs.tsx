import { useState } from 'react';
import { ImdIcon } from '../imd_icon';
import { ImdStyle } from '../imd_style';
import { ImdColors, ImdSizes } from '../imd_tokens';
import { ImdTap } from './imd_tap';

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

export interface ImdTabItem<T> {
  readonly value: T;
  readonly label: string;
  readonly icon?: string | null;
}

export class ImdTab<T> implements ImdTabItem<T> {
  readonly value: T;
  readonly label: string;
  readonly icon?: string | null;

  constructor(value: T, label: string, options: { icon?: string | null } = {}) {
    this.value = value;
    this.label = label;
    this.icon = options.icon ?? null;
  }
}

export interface ImdPillTabsProps<T> {
  readonly tabs: readonly ImdTabItem<T>[];
  readonly value: T;
  readonly onChanged: (value: T) => void;
  /// false ⇒ صف واحد بفجوة 6 قابل للتمرير أفقيًا.
  readonly wrap?: boolean;
  readonly gap?: number;
  readonly colors?: ImdColors;
  readonly className?: string;
}

interface PillTabProps<T> {
  readonly tab: ImdTabItem<T>;
  readonly on: boolean;
  readonly onTap: () => void;
  readonly colors: ImdColors;
}

function PillTab<T>({ tab, on, onTap, colors: c }: PillTabProps<T>) {
  const [hover, setHover] = useState(false);
  const fg = on ? c.onText : c.text2;

  return (
    <div role="tab" aria-selected={on} className="inline-flex shrink-0">
      <ImdTap
        onTap={onTap}
        onHoverChange={setHover}
        selected={on}
        radius={999}
        colors={c}
      >
        <div
          className="inline-flex items-center justify-center rounded-full px-[14px] whitespace-nowrap transition-colors duration-150"
          style={{
            height: ImdSizes.barControl,
            backgroundColor: on
              ? c.text.css
              : hover
                ? c.hover.css
                : c.surface.css,
            border: `1px solid ${(on ? c.text : c.line).css}`,
          }}
        >
          {tab.icon !== undefined && tab.icon !== null && (
            <span
              className="inline-flex shrink-0 items-center"
              style={{ marginInlineEnd: 6 }}
            >
              <ImdIcon name={tab.icon} size={13 * 1.1} color={fg} />
            </span>
          )}
          <span
            className="text-[13px]"
            style={{
              fontWeight: on ? 600 : 500,
              color: fg.css,
            }}
          >
            {tab.label}
          </span>
        </div>
      </ImdTap>
    </div>
  );
}

/// تبويبات كبسولية؛ النشط أسود.
export function ImdPillTabs<T>({
  tabs,
  value,
  onChanged,
  wrap = true,
  gap = 8,
  colors,
  className = '',
}: ImdPillTabsProps<T>) {
  const c = resolveActiveColors(colors);

  if (!wrap) {
    return (
      <div
        role="tablist"
        className={`flex max-w-full min-w-0 flex-nowrap items-center overflow-x-auto gap-[6px] ${className}`.trim()}
      >
        {tabs.map((t, idx) => (
          <PillTab
            key={idx}
            tab={t}
            on={t.value === value}
            onTap={() => onChanged(t.value)}
            colors={c}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={`mb-4 flex flex-wrap items-center ${className}`.trim()}
      style={{ gap }}
    >
      {tabs.map((t, idx) => (
        <PillTab
          key={idx}
          tab={t}
          on={t.value === value}
          onTap={() => onChanged(t.value)}
          colors={c}
        />
      ))}
    </div>
  );
}

export interface ImdSegmentedProps<T> {
  readonly tabs: readonly ImdTabItem<T>[];
  readonly value: T;
  readonly onChanged: (value: T) => void;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// مجموعة مقاطع بخلفية رمادية والنشط أبيض (مثل «وحدة مستفيدة / مطبخ / جهة»).
export function ImdSegmented<T>({
  tabs,
  value,
  onChanged,
  colors,
  className = '',
}: ImdSegmentedProps<T>) {
  const c = resolveActiveColors(colors);

  // المقاطع الكثيرة تُمرَّر أفقيًّا في الشاشة الضيّقة بدل أن تفيض.
  return (
    <div
      className={`flex w-full min-w-0 justify-start overflow-x-auto ${className}`.trim()}
    >
      <div
        role="tablist"
        className="inline-flex shrink-0 items-center rounded-[10px] p-1"
        style={{ backgroundColor: c.subtle.css }}
      >
        {tabs.map((t, idx) => {
          const active = t.value === value;
          return (
            <div key={idx} role="tab" aria-selected={active} className="inline-flex shrink-0">
              <ImdTap
                onTap={() => onChanged(t.value)}
                selected={active}
                radius={8}
                colors={c}
              >
                <div
                  className="inline-flex items-center rounded-[8px] px-[14px] py-[7px] whitespace-nowrap"
                  style={{
                    backgroundColor: active ? c.surface.css : 'transparent',
                    boxShadow: active
                      ? `0 1px 3px ${c.shadowHairline.css}`
                      : undefined,
                  }}
                >
                  {t.icon !== undefined && t.icon !== null && (
                    <span
                      className="inline-flex shrink-0 items-center"
                      style={{ marginInlineEnd: 6 }}
                    >
                      <ImdIcon
                        name={t.icon}
                        size={14}
                        color={active ? c.text : c.text2}
                      />
                    </span>
                  )}
                  <span
                    className="text-[13px] font-medium"
                    style={{
                      color: (active ? c.text : c.text2).css,
                    }}
                  >
                    {t.label}
                  </span>
                </div>
              </ImdTap>
            </div>
          );
        })}
      </div>
    </div>
  );
}
