import { useEffect, useState, type ReactNode } from 'react';
import { PermAction } from '../../domain/access_control';
import { usePerm } from '../security/perm';
import { ImdEmptyStateNoPermission } from './imd_empty_state';
import { ImdStyle } from './imd_style';
import { ImdColors } from './imd_tokens';
import { ImdPage, ImdPillTabs, ImdTab } from './imd_widgets';

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

export interface ImdShellTabSpec {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly builder: () => ReactNode;
  /// صلاحية هذه التبويبة وحدها — تُخفى إن لم يملكها المستخدم.
  ///
  /// الجمعُ في شاشةٍ واحدة تنظيمٌ للقائمة لا توسيعٌ للأذونات: من يملك
  /// المستودعات ولا يملك المركبات يرى المستودعات فقط، كما كان قبل الجمع.
  readonly perm?: string;
}

/// تبويبةٌ في غلافٍ يجمع شاشاتٍ متقاربة.
export class ImdShellTab implements ImdShellTabSpec {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly builder: () => ReactNode;
  readonly perm?: string;

  constructor({
    id,
    label,
    icon,
    builder,
    perm,
  }: ImdShellTabSpec) {
    this.id = id;
    this.label = label;
    this.icon = icon;
    this.builder = builder;
    this.perm = perm;
  }
}

export interface ImdTabsShellProps {
  readonly tabs: readonly ImdShellTabSpec[];
  readonly initial?: string;
  readonly emptyMessage?: string;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// غلافٌ يجمع شاشاتِ قسمٍ فرعيّ في بندٍ واحد بالقائمة.
///
/// **الشريط الجانبي فهرسٌ لا سجل.** عشرون شاشةً في قائمةٍ واحدة تُقرأ بالبحث
/// لا بالنظر؛ وجمعُ المتقارب منها — حركةٌ، وبياناتٌ أساسية، وتقارير — يُعيد
/// للقائمة معناها.
///
/// والشاشات تبقى كما هي: يُعلَّق فوقها شريط تبويبات ويُترك لها تمريرُها
/// الخاص، فلا تمريرٌ داخل تمرير ولا عنوانٌ يُكرَّر.
export function ImdTabsShell({
  tabs,
  initial = '',
  emptyMessage = 'لا صلاحية لأي شاشة في هذا القسم',
  colors,
  className = '',
}: ImdTabsShellProps) {
  const [tab, setTab] = useState<string>('');
  const perm = usePerm();
  const c = resolveActiveColors(colors);

  // التنقّل من اختصارٍ في اللوحة يفتح الغلاف نفسه على تبويبةٍ أخرى.
  useEffect(() => {
    if (initial.length > 0) {
      setTab(initial);
    }
  }, [initial]);

  const visible = tabs.filter(
    (t) => t.perm === undefined || perm.has(t.perm, PermAction.view),
  );

  if (visible.length === 0) {
    return (
      <ImdPage>
        <ImdEmptyStateNoPermission message={emptyMessage} colors={c} />
      </ImdPage>
    );
  }

  const wanted = tab.length === 0 ? initial : tab;
  const current = visible.some((t) => t.id === wanted)
    ? wanted
    : visible[0].id;
  const activeTab = visible.find((t) => t.id === current) ?? visible[0];

  return (
    <div className={`flex min-h-0 flex-1 flex-col items-stretch ${className}`.trim()}>
      <div
        className="w-full overflow-x-auto"
        style={{
          padding: '14px 20px 12px',
          backgroundColor: c.surface.css,
          borderBottom: `1px solid ${c.line.css}`,
        }}
      >
        <ImdPillTabs<string>
          value={current}
          onChanged={(v) => setTab(v)}
          wrap={false}
          colors={c}
          tabs={visible.map((t) => new ImdTab(t.id, t.label, { icon: t.icon }))}
        />
      </div>

      {/* الشاشة المختارة تحتفظ بتمريرها ولوحاتها كما لو فُتحت وحدها. */}
      <div key={activeTab.id} className="flex min-h-0 flex-1 flex-col items-stretch">
        {activeTab.builder()}
      </div>
    </div>
  );
}
