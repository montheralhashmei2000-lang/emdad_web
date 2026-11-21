import { useImdColors } from '../../../core/theme/imd_theme';
import { ImdIcon } from '../../../core/ui/imd_icon';
import type { ImdColors } from '../../../core/ui/imd_tokens';
import { AppSpace } from '../../../domain/app_space';
import { homeShellMenu, type MenuItem } from './home_shell_menu';

export interface HomeShellBottomNavProps {
  readonly space: string;
  readonly page: string;
  readonly hasPerm: (page: string) => boolean;
  readonly onGo: (page: string) => void;
  readonly onMore: () => void;
  readonly colors?: ImdColors;
}

/// أبوابٌ ثلاثة بعد الرئيسية — والرابع «المزيد» يفتح القائمة كاملة.
// أُشير بها إلى معرّفات أبوابٍ حذفناها من الشجرة عند تفكيكها إلى بنودٍ
// مباشرة؛ استُبدلت ببنودٍ فرديةٍ ما زالت في `_menu` تمثّل نفس الغرض
// (أشهر ما يُفتح) بدل أن تختفي صفوف المفضّلة في الشريط السفليّ صامتة.
const MAIN_ITEMS: Readonly<Record<string, readonly string[]>> = {
  [AppSpace.supply]: ['issue', 'receive', 'balances'],
  [AppSpace.fuel]: ['fuelIssue', 'fuelAllocations', 'fuelDaily'],
};

function itemOf(id: string): MenuItem | null {
  for (const sec of homeShellMenu) {
    for (const i of sec.items) {
      if (i.id === id) return i;
    }
  }
  return null;
}

/// شريطٌ سفليّ لأشهر أبواب القسم — وما وراءها في الدرج.
///
/// **الإبهام لا يبلغ أعلى الشاشة.** الدرج وحده يكلّف نقرتين لكل تنقّل، وأمينُ
/// المستودع ينتقل بين الصرف والاستلام عشرات المرات في الساعة.
export function HomeShellBottomNav({
  space,
  page,
  hasPerm,
  onGo,
  onMore,
  colors,
}: HomeShellBottomNavProps) {
  const c = useImdColors(colors);
  const ids = (MAIN_ITEMS[space] ?? []).filter((id) => hasPerm(id));
  const items: MenuItem[] = [];
  for (const id of ids) {
    const it = itemOf(id);
    if (it !== null) items.push(it);
  }

  return (
    <nav
      aria-label="التنقل السفلي"
      data-imd-bottom-nav="true"
      style={{
        backgroundColor: c.side.css,
        borderTop: `1px solid ${c.sideLine.css}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch" style={{ height: 58 }}>
        <BottomTile
          icon="home"
          label="الرئيسية"
          on={page === 'dash'}
          onTap={() => onGo('dash')}
          colors={c}
        />
        {items.map((i) => (
          <BottomTile
            key={i.id}
            icon={i.icon}
            label={i.name}
            on={page === i.id}
            onTap={() => onGo(i.id)}
            colors={c}
          />
        ))}
        <BottomTile
          icon="menu"
          label="المزيد"
          on={false}
          onTap={onMore}
          colors={c}
        />
      </div>
    </nav>
  );
}

function BottomTile({
  icon,
  label,
  on,
  onTap,
  colors: c,
}: {
  readonly icon: string;
  readonly label: string;
  readonly on: boolean;
  readonly onTap: () => void;
  readonly colors: ImdColors;
}) {
  const fg = on ? c.accent : c.sideMuted;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-current={on ? 'page' : undefined}
      className="flex min-w-0 flex-1 flex-col items-center justify-center border-0 bg-transparent p-0"
    >
      <ImdIcon name={icon} size={19} color={fg} />
      <div style={{ height: 3 }} />
      <span
        className="w-full truncate text-center"
        style={{
          fontSize: 10,
          fontWeight: on ? 700 : 500,
          color: fg.css,
        }}
      >
        {label}
      </span>
    </button>
  );
}
