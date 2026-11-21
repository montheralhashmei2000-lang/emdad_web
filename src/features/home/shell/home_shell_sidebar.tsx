import { useEffect, useRef, useState } from 'react';
import { useImdColors } from '../../../core/theme/imd_theme';
import {
  type ImdMenuItem,
  showImdContextMenu,
} from '../../../core/ui/imd_context_menu';
import { ImdIcon } from '../../../core/ui/imd_icon';
import {
  ImdColor,
  ImdColors,
  ImdCursor,
  ImdSizes,
} from '../../../core/ui/imd_tokens';
import { ImdWindow } from '../../../core/ui/imd_window';
import { ImdTap } from '../../../core/ui/imd_widgets';
import { AppSpace } from '../../../domain/app_space';
import {
  homeShellMenu,
  type MenuItem,
  type MenuSection,
} from './home_shell_menu';

export interface HomeShellSidebarProps {
  readonly page: string;
  /// مساحة العمل الحالية — تُرشَّح بها بنود القائمة.
  readonly space: string;
  readonly openSec: string | null;
  readonly hasPerm: (page: string) => boolean;
  readonly userName: string;
  readonly onGo: (page: string) => void;
  readonly onToggle: (sec: string) => void;
  readonly onLogout: () => Promise<void>;
  /// أيقوناتٌ بلا أسماء — لشاشةٍ لا تتسع لـ٢٩٠ بكسل من قائمة.
  readonly rail?: boolean;
  /// عرض القائمة الكاملة — يسحبه المستخدم بفاصلٍ قابلٍ للسحب على سطح المكتب.
  /// و`null` داخل درج الجوال: العرض للدرج، والقائمة تملؤه.
  readonly width?: number | null;
  /// حشوة شريط الحالة وشريط التنقل داخل الدرج على الجوال.
  readonly topInset?: number;
  readonly bottomInset?: number;
  readonly colors?: ImdColors;
}

/// هل للمساحة قسمٌ واحد فيُعرض مسطّحًا بلا رأس؟
function isFlatSpace(space: string, hasPerm: (page: string) => boolean): boolean {
  const visibleSections = homeShellMenu.filter((s) =>
    s.items.some((i) => AppSpace.shows(i.space, space) && hasPerm(i.id)),
  );
  return visibleSections.length <= 1;
}

/// القائمة الجانبية الداكنة.
export function HomeShellSidebar({
  page,
  space,
  openSec,
  hasPerm,
  onGo,
  onToggle,
  onLogout,
  rail = false,
  width = ImdSizes.sideWidth,
  topInset = 0,
  bottomInset = 0,
  colors,
}: HomeShellSidebarProps) {
  const c = useImdColors(colors);

  const itemsOf = (sec: MenuSection): MenuItem[] =>
    sec.items.filter((i) => AppSpace.shows(i.space, space) && hasPerm(i.id));

  const flatItems = (): MenuItem[] => {
    const out: MenuItem[] = [];
    for (const sec of homeShellMenu) {
      for (const i of sec.items) {
        if (AppSpace.shows(i.space, space) && hasPerm(i.id)) {
          out.push(i);
        }
      }
    }
    return out;
  };

  const micaAlpha = ImdWindow.micaActive.value ? 0.82 : 1;
  const sideBgGradient = `linear-gradient(180deg, ${c.side.withValues({ alpha: micaAlpha }).css} 0%, ${c.sideDeep.withValues({ alpha: micaAlpha }).css} 100%)`;

  if (rail) {
    const items = flatItems();
    const flat = isFlatSpace(space, hasPerm);
    return (
      <aside
        aria-label="القائمة الجانبية"
        data-imd-sidebar="rail"
        className="flex shrink-0 flex-col items-center"
        style={{
          width: 68,
          background: sideBgGradient,
          borderInlineStart: `1px solid ${c.sideLine.css}`,
        }}
      >
        <div style={{ height: 10 }} />
        <RailTile
          icon="home"
          label="الرئيسية"
          on={page === 'dash'}
          onTap={() => onGo('dash')}
          colors={c}
        />
        <div className="min-h-0 w-full flex-1 overflow-y-auto">
          <div className="flex flex-col items-center">
            {flat
              ? items.map((i) => (
                  <RailTile
                    key={i.id}
                    icon={i.icon}
                    label={i.name}
                    on={page === i.id}
                    onTap={() => onGo(i.id)}
                    colors={c}
                  />
                ))
              : homeShellMenu.map((sec) => {
                  const secItems = itemsOf(sec);
                  if (secItems.length === 0) return null;
                  return (
                    <RailSection
                      key={sec.sec}
                      icon={sec.icon}
                      label={sec.name}
                      on={secItems.some((i) => i.id === page)}
                      items={secItems}
                      page={page}
                      onGo={onGo}
                      colors={c}
                    />
                  );
                })}
          </div>
        </div>
        <RailTile
          icon="log-out"
          label="تسجيل الخروج"
          on={false}
          danger={true}
          onTap={() => {
            void onLogout();
          }}
          colors={c}
        />
        <div style={{ height: 10 }} />
      </aside>
    );
  }

  const insetTop = width === null ? topInset : 0;
  const insetBottom = width === null ? bottomInset : 0;
  const flat = isFlatSpace(space, hasPerm);

  return (
    <aside
      aria-label="القائمة الجانبية"
      data-imd-sidebar="full"
      className="flex shrink-0 flex-col items-stretch overflow-hidden"
      style={{
        width: width === null ? '100%' : width,
        background: sideBgGradient,
        borderInlineStart: `1px solid ${c.sideLine.css}`,
        paddingInline: 10,
        paddingTop: 12 + insetTop,
        paddingBottom: 12 + insetBottom,
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-stretch">
          {/* الرئيسية بندٌ مستقلٌّ دائمًا في القسمين — لا قائمة فرعية تحته */}
          <SideTile
            icon="home"
            label="الرئيسية"
            kind={SideKind.home}
            on={page === 'dash'}
            onTap={() => onGo('dash')}
            colors={c}
          />
          {flat
            ? flatItems().map((i) => (
                <SideTile
                  key={i.id}
                  icon={i.icon}
                  label={i.name}
                  kind={SideKind.item}
                  on={page === i.id}
                  onTap={() => onGo(i.id)}
                  colors={c}
                />
              ))
            : homeShellMenu.map((s) => {
                const secItems = itemsOf(s);
                if (secItems.length === 0) return null;
                const isOpen = openSec === s.sec;
                return (
                  <div key={s.sec} className="flex flex-col items-stretch">
                    <SideTile
                      icon={s.icon}
                      label={s.name}
                      kind={SideKind.header}
                      open={isOpen}
                      onTap={() => onToggle(s.sec)}
                      colors={c}
                    />
                    {isOpen && (
                      <div className="flex flex-col items-stretch">
                        {secItems.map((i) => (
                          <SideTile
                            key={i.id}
                            icon={i.icon}
                            label={i.name}
                            kind={SideKind.item}
                            on={page === i.id}
                            onTap={() => onGo(i.id)}
                            colors={c}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${c.sideLine.css}`,
        }}
      >
        <SideTile
          icon="lock"
          label="تسجيل خروج"
          kind={SideKind.logout}
          onTap={() => {
            void onLogout();
          }}
          colors={c}
        />
      </div>
    </aside>
  );
}

/// أيقونةُ بابٍ في الشريط الضيّق، واسمُه في تلميحها.
function RailTile({
  icon,
  label,
  on,
  onTap,
  danger = false,
  colors: c,
}: {
  readonly icon: string;
  readonly label: string;
  readonly on: boolean;
  readonly onTap: () => void;
  readonly danger?: boolean;
  readonly colors: ImdColors;
}) {
  const fg = danger ? c.danger : on ? c.sideText : c.sideMuted;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onTap}
      className="flex items-center justify-center border-0 transition-colors"
      style={{
        width: 48,
        height: 44,
        marginInline: 10,
        marginBlock: 3,
        backgroundColor: on ? c.sideActive.css : 'transparent',
        borderRadius: 10,
        cursor: ImdCursor.click,
      }}
    >
      <ImdIcon name={icon} size={19} color={fg} />
    </button>
  );
}

/// أيقونة قسمٍ رئيسيّ في الشريط المطويّ: تلميحها اسمه، ونقرتها تفتح قائمةً بأبوابه.
function RailSection({
  icon,
  label,
  on,
  items,
  page,
  onGo,
  colors: c,
}: {
  readonly icon: string;
  readonly label: string;
  readonly on: boolean;
  readonly items: readonly MenuItem[];
  readonly page: string;
  readonly onGo: (page: string) => void;
  readonly colors: ImdColors;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const fg = on ? c.sideText : c.sideMuted;

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    const pos = rect
      ? { dx: rect.left, dy: rect.top }
      : { dx: 68, dy: 80 };
    const menuItems: ImdMenuItem[] = items.map((i) => ({
      label: i.id === page ? `${i.name}  ●` : i.name,
      icon: i.icon,
      onTap: () => onGo(i.id),
    }));
    void showImdContextMenu(pos, menuItems, { colors: c });
  };

  return (
    <button
      ref={btnRef}
      type="button"
      title={label}
      aria-label={label}
      onClick={openMenu}
      className="flex items-center justify-center border-0 transition-colors"
      style={{
        width: 48,
        height: 44,
        marginInline: 10,
        marginBlock: 3,
        backgroundColor: on ? c.sideActive.css : 'transparent',
        borderRadius: 10,
        cursor: ImdCursor.click,
      }}
    >
      <ImdIcon name={icon} size={19} color={fg} />
    </button>
  );
}

enum SideKind {
  home = 'home',
  header = 'header',
  item = 'item',
  logout = 'logout',
}

function SideTile({
  icon,
  label,
  kind,
  onTap,
  on = false,
  open = false,
  colors: c,
}: {
  readonly icon: string;
  readonly label: string;
  readonly kind: SideKind;
  readonly onTap: () => void;
  readonly on?: boolean;
  readonly open?: boolean;
  readonly colors: ImdColors;
}) {
  const [hover, setHover] = useState(false);

  let bg: string;
  let fg: ImdColor;
  let border: string | undefined;
  let padding: string;
  let margin: string;
  let fs: number;
  let fw: number;
  let radius: number;
  let iconColor: ImdColor | undefined;

  switch (kind) {
    case SideKind.home:
      bg = (hover ? c.sideHover : c.side2).css;
      fg = c.sideBright;
      border = `1px solid ${c.sideBorder.css}`;
      padding = '13px 16px';
      margin = '0 0 10px 0';
      fs = 14;
      fw = 600;
      radius = 10;
      break;
    case SideKind.header:
      bg = hover ? c.sideHover.css : 'transparent';
      fg = hover || open ? c.sideBright : c.sideMuted;
      padding = '11px 14px';
      margin = '6px 0 4px 0';
      fs = 12.5;
      fw = 600;
      radius = 8;
      break;
    case SideKind.item:
      bg = on
        ? c.sideActive.css
        : hover
          ? c.sideHover.css
          : 'transparent';
      fg =
        on || hover
          ? c.sideBright
          : c.sideText.withValues({ alpha: 0.86 });
      iconColor = on ? ImdColors.dark.accentHover : undefined;
      padding = '11px 10px 11px 14px';
      margin = '1px 0';
      fs = 13.5;
      fw = 500;
      radius = 8;
      break;
    case SideKind.logout:
      bg = hover ? c.sideHover.css : 'transparent';
      fg = c.sideText;
      border = `1px solid ${(hover ? c.sideMuted : c.sideBorder).css}`;
      padding = '13px';
      margin = '0';
      fs = 14;
      fw = 600;
      radius = 10;
      break;
  }

  const isItem = kind === SideKind.item;

  return (
    <ImdTap
      onTap={onTap}
      onHoverChange={setHover}
      cursor={ImdCursor.click}
      radius={radius}
      colors={c}
      className="block w-full"
    >
      <div
        className={`flex items-center ${kind === SideKind.logout ? 'justify-center' : 'justify-start'}`}
        style={{
          margin,
          marginInlineStart: isItem ? 4 : undefined,
          backgroundColor: bg,
          borderRadius: radius,
          ...(isItem
            ? on
              ? { borderRight: `2px solid ${ImdColors.dark.accentHover.css}` }
              : {}
            : border
              ? { border }
              : {}),
          padding: isItem ? undefined : padding,
          paddingInlineStart: isItem ? 10 : undefined,
          paddingInlineEnd: isItem ? 14 : undefined,
          paddingBlock: isItem ? 11 : undefined,
        }}
      >
        <ImdIcon name={icon} size={fs * 1.1} color={iconColor ?? fg} />
        <span
          style={{
            width:
              kind === SideKind.header
                ? 8
                : kind === SideKind.logout
                  ? 6
                  : 10,
            flexShrink: 0,
          }}
        />
        {kind === SideKind.logout ? (
          <span
            style={{
              fontSize: fs,
              fontWeight: fw,
              color: fg.css,
              lineHeight: 1.6,
            }}
          >
            {label}
          </span>
        ) : (
          <span
            className="min-w-0 flex-1 truncate text-start"
            style={{
              fontSize: fs,
              fontWeight: fw,
              color: fg.css,
              lineHeight: 1.6,
            }}
          >
            {label}
          </span>
        )}
        {kind === SideKind.header && (
          <ImdIcon
            name={open ? 'chevron-down' : 'chevron-left'}
            size={12}
            color={c.sideMuted}
          />
        )}
      </div>
    </ImdTap>
  );
}

/// فاصلٌ رأسيّ رفيع بين القائمة الجانبية والمحتوى يُسحب لتغيير عرضها —
/// مؤشّر تغيير الحجم وخطٌّ بلون العلامة عند المرور، كنوافذ سطح المكتب.
export function HomeShellSideSplitter({
  onDrag,
  onEnd,
  colors,
}: {
  readonly onDrag: (dx: number) => void;
  readonly onEnd: () => void;
  readonly colors?: ImdColors;
}) {
  const c = useImdColors(colors);
  const [hover, setHover] = useState(false);
  const [drag, setDrag] = useState(false);
  const lastXRef = useRef<number | null>(null);
  const onDragRef = useRef(onDrag);
  const onEndRef = useRef(onEnd);
  onDragRef.current = onDrag;
  onEndRef.current = onEnd;

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      if (lastXRef.current !== null) {
        onDragRef.current(e.clientX - lastXRef.current);
      }
      lastXRef.current = e.clientX;
    };
    const onUp = () => {
      setDrag(false);
      lastXRef.current = null;
      onEndRef.current();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag]);

  const on = hover || drag;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => {
        e.preventDefault();
        lastXRef.current = e.clientX;
        setDrag(true);
      }}
      className="flex shrink-0 items-center justify-center select-none"
      style={{
        width: 6,
        cursor: 'col-resize',
      }}
    >
      <div
        className="h-full transition-all duration-150"
        style={{
          width: on ? 3 : 1,
          backgroundColor: on ? c.accent.css : 'transparent',
        }}
      />
    </div>
  );
}
