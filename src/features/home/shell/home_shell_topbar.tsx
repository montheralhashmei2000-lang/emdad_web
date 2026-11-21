import { useEffect, useRef, useState } from 'react';
import { ErrorLogger } from '../../../core/error_log';
import { useAuthService } from '../../../core/security/auth_service';
import {
  useAppDatabase,
  useImdColors,
  useImdTheme,
} from '../../../core/theme/imd_theme';
import { ImdIcon } from '../../../core/ui/imd_icon';
import { ImdMenuBar } from '../../../core/ui/imd_menu_bar';
import {
  ImdOpenPage,
  ImdPageTabs,
} from '../../../core/ui/imd_page_tabs';
import {
  ImdShortcuts,
  useImdScreenActions,
} from '../../../core/ui/imd_screen_actions';
import {
  type ImdColors,
  ImdCursor,
  ImdSizes,
} from '../../../core/ui/imd_tokens';
import { ImdWindow } from '../../../core/ui/imd_window';
import { ImdIconButton, ImdTap } from '../../../core/ui/imd_widgets';
import type { AppDatabase } from '../../../data/db/app_database';
import { SettingsRepo } from '../../../data/repos/settings_repo';
import { AppSpace } from '../../../domain/app_space';
import { showChangePasswordDialog } from '../../auth/change_password_dialog';
import { NotificationBell } from '../pending_screens_stubs';

/// يبدّل السمة صراحةً بين فاتحٍ وداكن (لا «تلقائي»): زرٌّ سريعٌ يفترض
/// نيّة المستخدم من السطوع الحالي الفعلي — ويحفظها فتبقى بعد إعادة
/// التشغيل، بنفس مسار حفظ السمة من شاشة الهوية.
///
/// **التبديل أولًا ثم الحفظ:** كان ينتظر قراءة الهوية وكتابتها في القاعدة
/// المشفّرة (ومعها مراقبو البيانات في كل تبويب) قبل أن تتبدّل السمة، فيتأخر
/// الزرّ ملحوظًا. الحفظ الآن بعد التبديل ولا يُنتظر.
export async function toggleHomeShellTheme({
  isDark,
  db,
  applyTheme,
}: {
  readonly isDark: boolean;
  readonly db: AppDatabase | null;
  readonly applyTheme: (pref: string) => void;
}): Promise<void> {
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  if (!db) return;
  const settings = new SettingsRepo(db);
  try {
    const id = await settings.identity();
    await settings.saveIdentity(id.copyWith({ themePref: next }));
  } catch (err) {
    // السمة تبدّلت في الجلسة؛ تعذُّر حفظها يُعيدها بعد إعادة التشغيل لا أكثر.
    ErrorLogger.log('theme.save', err, err instanceof Error ? err.stack : undefined);
  }
}

function useContainerWidth(explicitWidth?: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<number>(() =>
    explicitWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1200),
  );

  useEffect(() => {
    if (explicitWidth !== undefined) {
      setMeasured(explicitWidth);
      return;
    }
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      const onResize = () => setMeasured(window.innerWidth);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setMeasured(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [explicitWidth]);

  return [ref, explicitWidth ?? measured];
}

export interface HomeShellTopbarProps {
  readonly userName: string;
  readonly showBurger: boolean;
  readonly onBurger: () => void;
  readonly onOpenPage: (page: string) => void;
  /// القسم الذي يقف فيه المستخدم — الجرس يخصّ ما بين يديه.
  readonly space: string;
  /// زر التبديل لا يظهر تفاعليًّا لمن يملك مساحةً واحدة: تبديلٌ إلى لا شيء،
  /// لكن اسم القسم يبقى معروضًا فيعرف من فتحه أين هو.
  readonly canSwitch: boolean;
  readonly onSwitchSpace: () => void;
  readonly topInset?: number;
  readonly width?: number;
  readonly colors?: ImdColors;
}

/// الشريط العلوي **للجوال**: زرّ القائمة، واسم النظام، وتبديل القسم والسمة
/// والجرس والحساب. سطح المكتب يستعمل [HomeShellDesktopBar] (شريطٌ واحدٌ يجمع التبويبات).
export function HomeShellTopbar({
  userName,
  showBurger,
  onBurger,
  onOpenPage,
  space,
  canSwitch,
  onSwitchSpace,
  topInset = 0,
  width,
  colors,
}: HomeShellTopbarProps) {
  const c = useImdColors(colors);
  const [containerRef, w] = useContainerWidth(width);
  const showName = w > 560;
  const showTitle = w > 430;

  return (
    <header
      ref={containerRef}
      data-imd-topbar="mobile"
      className="flex shrink-0 items-center"
      style={{
        height: ImdSizes.topbarHeight + topInset,
        paddingInline: 12,
        paddingTop: 8 + topInset,
        paddingBottom: 10,
        backgroundColor: c.topbar({ mica: ImdWindow.micaActive.value }).css,
        borderBottom: `1px solid ${c.line.css}`,
      }}
    >
      {showBurger && (
        <>
          <ImdIconButton
            icon="menu"
            tooltip="القائمة"
            onPressed={onBurger}
            colors={c}
          />
          <span style={{ width: 8, flexShrink: 0 }} />
        </>
      )}
      {showTitle && (
        <div
          className="min-w-0 shrink truncate"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: c.text2.css,
          }}
        >
          <span>نظام </span>
          <span style={{ color: c.accent.css, fontWeight: 700 }}>
            الإمداد والتموين
          </span>
        </div>
      )}
      {showTitle && (
        <>
          <span style={{ width: 10, flexShrink: 0 }} />
          <ImdMenuBar colors={c} />
        </>
      )}
      <span style={{ width: 10, flexShrink: 0 }} />
      <SpacePill
        space={space}
        canSwitch={canSwitch}
        onTap={onSwitchSpace}
        showLabel={showTitle}
        colors={c}
      />
      <div className="flex-1" />
      <SearchButton colors={c} />
      <span style={{ width: 8, flexShrink: 0 }} />
      <ThemeButton isDark={c.isDark} colors={c} />
      <span style={{ width: 8, flexShrink: 0 }} />
      <NotificationBell onOpenPage={onOpenPage} space={space} />
      <span style={{ width: 8, flexShrink: 0 }} />
      <UserChip
        userName={userName}
        showName={showName}
        height={40}
        avatar={32}
        colors={c}
      />
    </header>
  );
}

export interface HomeShellDesktopBarProps {
  readonly userName: string;
  /// القائمة الجانبية مطويّةٌ الآن؟ (تحدّد تلميح الزرّ.)
  readonly collapsed: boolean;
  readonly onToggleSide: () => void;
  readonly pages: readonly ImdOpenPage[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onCloseOthers: (id: string) => void;
  readonly onOpenPage: (page: string) => void;
  readonly space: string;
  readonly canSwitch: boolean;
  readonly onSwitchSpace: () => void;
  readonly width?: number;
  readonly colors?: ImdColors;
}

/// **الشريط الواحد لسطح المكتب**: زرّ طيّ القائمة، فالتبويبات، فالأدوات — كلها
/// في صفٍّ واحد بدل ثلاثة (شريط عنوان النظام + شريط علوي + شريط تبويبات).
export function HomeShellDesktopBar({
  userName,
  collapsed,
  onToggleSide,
  pages,
  activeId,
  onSelect,
  onClose,
  onCloseOthers,
  onOpenPage,
  space,
  canSwitch,
  onSwitchSpace,
  width,
  colors,
}: HomeShellDesktopBarProps) {
  const c = useImdColors(colors);
  const [containerRef, w] = useContainerWidth(width);
  const h = ImdSizes.desktopBarHeight;
  const showMenus = w > 1180;
  const showName = w > 1040;
  const showLabel = w > 1040;
  const toggleLabel = collapsed ? 'توسيع القائمة' : 'طيّ القائمة';

  // الرئيسية تُفتح من الشريط الجانبي ولا تحتاج تبويبة.
  const tabPages = pages.filter(
    (p) => p.id !== 'dash' && p.id !== 'fuelDashboard',
  );

  return (
    <header
      ref={containerRef}
      data-imd-topbar="desktop"
      className="flex shrink-0 items-center"
      style={{
        height: h,
        backgroundColor: c.topbar({ mica: ImdWindow.micaActive.value }).css,
        borderBottom: `1px solid ${c.line.css}`,
      }}
    >
      <span style={{ width: 8, flexShrink: 0 }} />
      <button
        type="button"
        title={toggleLabel}
        aria-label={toggleLabel}
        onClick={onToggleSide}
        className="flex shrink-0 items-center justify-center rounded-lg border-0 bg-transparent transition-colors"
        style={{
          width: 34,
          height: 28,
          cursor: ImdCursor.click,
        }}
      >
        <ImdIcon name="menu" size={16} color={c.text2} />
      </button>
      <span style={{ width: 6, flexShrink: 0 }} />
      <div className="flex h-full min-w-0 flex-1 items-center justify-start">
        <ImdPageTabs
          embedded={true}
          pages={tabPages}
          activeId={activeId}
          onSelect={onSelect}
          onClose={onClose}
          onCloseOthers={onCloseOthers}
          colors={c}
        />
      </div>
      <span style={{ width: 8, flexShrink: 0 }} />
      {showMenus && (
        <>
          <ImdMenuBar colors={c} />
          <span style={{ width: 8, flexShrink: 0 }} />
        </>
      )}
      <SpacePill
        space={space}
        canSwitch={canSwitch}
        onTap={onSwitchSpace}
        showLabel={showLabel}
        dense={true}
        colors={c}
      />
      <span style={{ width: 8, flexShrink: 0 }} />
      <SearchButton dense={true} colors={c} />
      <span style={{ width: 6, flexShrink: 0 }} />
      <ThemeButton isDark={c.isDark} dense={true} colors={c} />
      <span style={{ width: 6, flexShrink: 0 }} />
      <NotificationBell onOpenPage={onOpenPage} space={space} dense={true} />
      <span style={{ width: 8, flexShrink: 0 }} />
      <UserChip
        userName={userName}
        showName={showName}
        height={30}
        avatar={24}
        colors={c}
      />
      <span style={{ width: 10, flexShrink: 0 }} />
    </header>
  );
}

/// تبديل القسم: أيقونةٌ دائمًا، واسمه معها ما اتّسع الشريط. من يملك مساحةً
/// واحدة يبقى الاسم معروضًا له لكن بلا تفاعل — لا تبديل إلى لا شيء.
function SpacePill({
  space,
  canSwitch,
  onTap,
  showLabel,
  dense = false,
  colors: c,
}: {
  readonly space: string;
  readonly canSwitch: boolean;
  readonly onTap: () => void;
  readonly showLabel: boolean;
  readonly dense?: boolean;
  readonly colors: ImdColors;
}) {
  const semanticLabel = canSwitch ? 'تبديل القسم' : AppSpace.label(space);
  const inner = (
    <div
      className="inline-flex items-center"
      style={{
        height: dense ? 28 : 34,
        paddingInlineStart: 10,
        paddingInlineEnd: showLabel ? 12 : 10,
        paddingBlock: dense ? 3 : 6,
        backgroundColor: c.subtle.css,
        border: `1px solid ${c.line.css}`,
        borderRadius: 999,
      }}
    >
      <ImdIcon
        name={canSwitch ? 'swap' : (AppSpace.icons[space] ?? 'package')}
        size={13}
        color={c.muted}
      />
      {showLabel && (
        <>
          <span style={{ width: 6, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: c.text2.css,
            }}
          >
            {AppSpace.label(space)}
          </span>
        </>
      )}
    </div>
  );

  if (!canSwitch) {
    return (
      <span aria-label={semanticLabel} className="inline-flex shrink-0">
        {inner}
      </span>
    );
  }

  return (
    <ImdTap
      onTap={onTap}
      label={semanticLabel}
      tooltip={semanticLabel}
      cursor={ImdCursor.click}
      radius={999}
      colors={c}
      className="inline-flex shrink-0"
    >
      {inner}
    </ImdTap>
  );
}

/// البحث العام: الزرُّ نظيرُ Ctrl+K لمن لا يحفظ الاختصار أو لا لوحة مفاتيح لديه.
function SearchButton({
  dense = false,
  colors: c,
}: {
  readonly dense?: boolean;
  readonly colors: ImdColors;
}) {
  const actions = useImdScreenActions();
  return (
    <ImdIconButton
      icon="search"
      tooltip={ImdShortcuts.supported ? 'البحث العام (Ctrl+K)' : 'البحث العام'}
      dense={dense}
      colors={c}
      onPressed={() => actions?.onSearch?.()}
    />
  );
}

function ThemeButton({
  isDark,
  dense = false,
  colors: c,
}: {
  readonly isDark: boolean;
  readonly dense?: boolean;
  readonly colors: ImdColors;
}) {
  const imdTheme = useImdTheme();
  const db = useAppDatabase();
  const auth = useAuthService();
  const resolvedDb = db ?? auth?.db ?? null;

  return (
    <ImdIconButton
      icon={isDark ? 'sun' : 'moon'}
      tooltip={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      dense={dense}
      colors={c}
      onPressed={() => {
        void toggleHomeShellTheme({
          isDark,
          db: resolvedDb,
          applyTheme: (pref) => imdTheme?.apply(pref),
        });
      }}
    />
  );
}

/// صورة المستخدم واسمه. (شارة «IAM محمي» أُزيلت من الشريط.)
function UserChip({
  userName,
  showName,
  height,
  avatar,
  colors: c,
}: {
  readonly userName: string;
  readonly showName: boolean;
  readonly height: number;
  readonly avatar: number;
  readonly colors: ImdColors;
}) {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const me = auth?.currentUser ?? null;

  return (
    <ImdTap
      label={`حساب ${userName} — تغيير كلمة المرور`}
      tooltip="تغيير كلمة المرور"
      radius={99}
      colors={c}
      onTap={
        me === null || db === null
          ? null
          : () => {
              void showChangePasswordDialog({
                db,
                userId: me.id,
                colors: c,
              });
            }
      }
      className="inline-flex shrink-0"
    >
      <div
        className="inline-flex items-center"
        style={{
          height,
          paddingInlineStart: 4,
          paddingInlineEnd: showName ? 12 : 4,
          paddingBlock: 4,
          backgroundColor: c.subtle.css,
          borderRadius: 99,
        }}
      >
        <Avatar name={userName} size={avatar} fontSize={13} colors={c} />
        {showName && (
          <>
            <span style={{ width: 10, flexShrink: 0 }} />
            <span
              className="truncate"
              style={{
                maxWidth: 140,
                fontSize: 13,
                fontWeight: 700,
                color: c.text.css,
              }}
            >
              {userName}
            </span>
          </>
        )}
      </div>
    </ImdTap>
  );
}

/// دائرة الحرف الأول من اسم المستخدم.
function Avatar({
  name,
  size,
  fontSize,
  colors: c,
}: {
  readonly name: string;
  readonly size: number;
  readonly fontSize: number;
  readonly colors: ImdColors;
}) {
  const firstChar = name.length === 0 ? '؟' : ([...name][0] ?? '؟').toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: c.accent.css,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 600,
          color: c.onAccent.css,
        }}
      >
        {firstChar}
      </span>
    </div>
  );
}
