import { useState } from 'react';
import { ImdShortcuts, useImdScreenActions } from './imd_screen_actions';
import { ImdStyle } from './imd_style';
import { ImdColors, ImdSizes } from './imd_tokens';
import {
  ImdButton,
  ImdMenuButton,
  type ImdMenuButtonItem,
  showImdModal,
} from './imd_widgets';

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

export interface ImdMenuBarProps {
  readonly colors?: ImdColors;
  readonly className?: string;
}

function showShortcutsModal(colors?: ImdColors): void {
  void showImdModal<void>({
    title: 'اختصارات لوحة المفاتيح',
    icon: 'info',
    maxWidth: 420,
    colors,
    builder: (ctx) => {
      const c = ctx.colors;
      const rows: readonly (readonly [string, string])[] = [
        ['Ctrl+S', 'حفظ — الزر الرئيسي في الشاشة الحالية'],
        ['Ctrl+P', 'طباعة'],
        ['Ctrl+N', 'سند/طلبية جديدة — تعلّق الحالية وتفتح فارغة'],
        ['F5', 'تحديث البيانات'],
        ['Esc', 'إغلاق الحوار الحالي'],
        ['Enter', 'تأكيد في حوارات التأكيد'],
      ];
      return (
        <div className="flex flex-col items-stretch">
          {rows.map(([shortcutKey, desc]) => (
            <div
              key={shortcutKey}
              className="flex items-start"
              style={{ paddingBlock: 5 }}
            >
              <span
                dir="ltr"
                className="shrink-0 text-start"
                style={{
                  width: 84,
                  fontWeight: 700,
                  fontSize: 13,
                  color: c.text.css,
                }}
              >
                {shortcutKey}
              </span>
              <span
                className="min-w-0 flex-1"
                style={{
                  fontSize: 13,
                  color: c.text2.css,
                  lineHeight: 1.5,
                }}
              >
                {desc}
              </span>
            </div>
          ))}
        </div>
      );
    },
    actions: (ctx) => (
      <ImdButton
        label="إغلاق"
        onPressed={() => ctx.close()}
        colors={ctx.colors}
      />
    ),
  });
}

/// بندا «ملف»/«مساعدة» — يُدمجان داخل الشريط العلوي بجانب اسم النظام مباشرة،
/// على وندوز/لينكس/ماك وحدها ([ImdShortcuts.supported])؛ يغيبان تمامًا عن
/// الجوال بلا أي أثر على تخطيط الشريط هناك.
///
/// بنود «ملف» تعكس ما سجّلته الشاشة النشطة فعلًا في [ImdScreenActions]
/// فتُعطَّل تلقائيًا حين لا تدعمها الشاشة الحالية — لا قائمة جامدة تدّعي
/// إجراءً لا تملكه الشاشة.
export function ImdMenuBar({ colors, className = '' }: ImdMenuBarProps) {
  const actions = useImdScreenActions();
  const [, setVersion] = useState(0);

  if (!ImdShortcuts.supported) return null;
  if (actions === null) return null;

  const c = resolveActiveColors(colors);

  const fileItems = (): readonly ImdMenuButtonItem<string>[] => [
    {
      value: 'new',
      label: 'سند جديد',
      shortcut: 'Ctrl+N',
      disabled: actions.onNewDoc === null,
    },
    {
      value: 'save',
      label: 'حفظ',
      shortcut: 'Ctrl+S',
      disabled: actions.onSave === null,
    },
    {
      value: 'print',
      label: 'طباعة',
      shortcut: 'Ctrl+P',
      disabled: actions.onPrint === null,
    },
    {
      value: 'refresh',
      label: 'تحديث',
      shortcut: 'F5',
      disabled: actions.onRefresh === null,
    },
  ];

  const helpItems: readonly ImdMenuButtonItem<string>[] = [
    {
      value: 'shortcuts',
      label: 'اختصارات لوحة المفاتيح',
    },
  ];

  return (
    <div
      className={`inline-flex items-center ${className}`.trim()}
      style={{ minHeight: ImdSizes.desktopBarHeight }}
      onMouseDown={() => setVersion((v) => v + 1)}
    >
      <ImdMenuButton<string>
        label="ملف"
        icon="file"
        dense={true}
        colors={c}
        items={fileItems}
        onSelected={(v) => {
          switch (v) {
            case 'new':
              actions.onNewDoc?.();
              break;
            case 'save':
              actions.onSave?.();
              break;
            case 'print':
              actions.onPrint?.();
              break;
            case 'refresh':
              actions.onRefresh?.();
              break;
          }
        }}
      />
      <span style={{ width: 6, flexShrink: 0 }} />
      <ImdMenuButton<string>
        label="مساعدة"
        icon="info"
        dense={true}
        colors={c}
        items={helpItems}
        onSelected={(v) => {
          if (v === 'shortcuts') {
            showShortcutsModal(c);
          }
        }}
      />
    </div>
  );
}
