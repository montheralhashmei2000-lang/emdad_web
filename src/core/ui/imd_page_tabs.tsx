import { useState, type ReactNode } from 'react';
import { showImdContextMenu } from './imd_context_menu';
import { ImdIcon } from './imd_icon';
import {
  ImdScreenActions,
  ImdScreenActionsProvider,
} from './imd_screen_actions';
import { ImdRecordScope, ImdRecordSink } from './imd_status_bar';
import { ImdStyle } from './imd_style';
import { ImdColors, ImdCursor } from './imd_tokens';
import { ImdTap } from './widgets/imd_tap';

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

export interface ImdOpenPageSpec {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  /// تغيّرت البيانات من صفحةٍ أخرى منذ أُخفيت هذه — قد تعرض أرقامًا قديمة.
  readonly stale?: boolean;
}

/// تبويبةٌ لصفحةٍ مفتوحة في القشرة.
export class ImdOpenPage implements ImdOpenPageSpec {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly stale: boolean;

  constructor({
    id,
    title,
    icon,
    stale = false,
  }: {
    readonly id: string;
    readonly title: string;
    readonly icon?: string;
    readonly stale?: boolean;
  }) {
    this.id = id;
    this.title = title;
    this.icon = icon;
    this.stale = stale;
  }
}

export interface ImdPageTabsProps {
  readonly pages: readonly ImdOpenPageSpec[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onCloseOthers?: (id: string) => void;
  /// داخل شريط التطبيق الواحد: بلا خلفيةٍ ولا إطارٍ ولا ارتفاعٍ خاصّ — يملأ ارتفاع
  /// الشريط المضيف ويتركه هو يرسم خلفيته.
  readonly embedded?: boolean;
  readonly colors?: ImdColors;
  readonly className?: string;
}

function PageTab({
  page,
  active,
  closable,
  embedded,
  onTap,
  onClose,
  onCloseOthers,
  colors: c,
}: {
  readonly page: ImdOpenPageSpec;
  readonly active: boolean;
  readonly closable: boolean;
  readonly embedded: boolean;
  readonly onTap: () => void;
  readonly onClose: () => void;
  readonly onCloseOthers?: () => void;
  readonly colors: ImdColors;
}) {
  const [hover, setHover] = useState(false);
  const fg = active ? c.text : c.muted;

  return (
    <div
      role="tab"
      aria-selected={active}
      className="flex shrink-0 items-stretch"
    >
      <ImdTap
        onTap={onTap}
        onHoverChange={setHover}
        selected={active}
        radius={0}
        cursor={ImdCursor.click}
        colors={c}
        // زرّ الفأرة الأوسط يغلق التبويبة كما في المتصفحات.
        onTertiaryTapUp={closable ? () => onClose() : undefined}
        onSecondaryTapDown={
          onCloseOthers
            ? (d) => {
                void showImdContextMenu(
                  d.globalPosition,
                  [
                    {
                      label: 'إغلاق',
                      icon: 'x',
                      onTap: onClose,
                      enabled: closable,
                    },
                    {
                      label: 'إغلاق الباقي',
                      onTap: onCloseOthers,
                    },
                  ],
                  { colors: c },
                );
              }
            : undefined
        }
        className="flex items-stretch"
      >
        <div
          className="flex items-center transition-colors"
          style={{
            marginTop: embedded ? 6 : 5,
            marginInline: 2,
            paddingInline: embedded ? 8 : 10,
            maxWidth: embedded ? 150 : 220,
            backgroundColor: active
              ? c.surface.css
              : hover
                ? c.hover.css
                : 'transparent',
            borderTop: `2px solid ${active ? c.accent.css : 'transparent'}`,
            borderInlineStart: `1px solid ${active ? c.line.css : 'transparent'}`,
            borderInlineEnd: `1px solid ${active ? c.line.css : 'transparent'}`,
          }}
        >
          {page.icon !== undefined && (
            <span
              className="inline-flex shrink-0 items-center"
              style={{ marginInlineEnd: 6 }}
            >
              <ImdIcon
                name={page.icon}
                size={13}
                color={active ? c.accent : c.muted}
              />
            </span>
          )}
          <span
            className="min-w-0 flex-1 truncate"
            style={{
              fontSize: 12.5,
              fontWeight: active ? 700 : 500,
              color: fg.css,
            }}
          >
            {page.title}
          </span>
          {page.stale && (
            <span
              title="تغيّرت البيانات منذ فتحتَ هذه الصفحة"
              aria-label="تغيّرت البيانات منذ فتحتَ هذه الصفحة"
              className="shrink-0 rounded-full"
              style={{
                width: 7,
                height: 7,
                marginInlineStart: 6,
                backgroundColor: c.warn.css,
              }}
            />
          )}
          {closable && (
            <span className="inline-flex shrink-0 items-center" style={{ marginInlineStart: 6 }}>
              {/* زرّ إغلاقٍ بأيقونة: اسمه على عقدة النقر، ومساحته ٢٤×٢٤ (WCAG 2.5.8). */}
              <ImdTap
                label={`إغلاق «${page.title}»`}
                tooltip={`إغلاق «${page.title}»`}
                radius={4}
                onTap={onClose}
                colors={c}
              >
                <span
                  className="flex items-center justify-center"
                  style={{ padding: 6.5 }}
                >
                  <ImdIcon
                    name="x"
                    size={11}
                    color={active || hover ? c.muted : c.faint}
                  />
                </span>
              </ImdTap>
            </span>
          )}
        </div>
      </ImdTap>
    </div>
  );
}

/// شريط الصفحات المفتوحة (سطح المكتب): تبويبٌ لكل صفحة، ونقرةٌ للتنقّل، و×
/// للإغلاق. الصفحات المخفيّة تبقى حيّةً بحالتها فلا يضيع نموذجٌ نصف مملوء.
export function ImdPageTabs({
  pages,
  activeId,
  onSelect,
  onClose,
  onCloseOthers,
  embedded = false,
  colors,
  className = '',
}: ImdPageTabsProps) {
  const c = resolveActiveColors(colors);

  const renderTab = (p: ImdOpenPageSpec) => (
    <PageTab
      key={p.id}
      page={p}
      active={p.id === activeId}
      closable={embedded || pages.length > 1}
      embedded={embedded}
      onTap={() => onSelect(p.id)}
      onClose={() => onClose(p.id)}
      onCloseOthers={
        !onCloseOthers || pages.length < 2 ? undefined : () => onCloseOthers(p.id)
      }
      colors={c}
    />
  );

  if (embedded) {
    return (
      <div
        role="tablist"
        className={`flex h-full min-w-0 max-w-full flex-nowrap items-stretch overflow-x-auto ${className}`.trim()}
      >
        {pages.map(renderTab)}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-stretch overflow-x-auto ${className}`.trim()}
      style={{
        height: 38,
        paddingInline: 8,
        backgroundColor: c.tableHead.css,
        borderBottom: `1px solid ${c.line.css}`,
      }}
    >
      <div role="tablist" className="flex h-full flex-nowrap items-stretch">
        {pages.map(renderTab)}
      </div>
    </div>
  );
}

export interface ImdPageHostProps {
  readonly active: boolean;
  readonly sink: ImdRecordSink;
  readonly children?: ReactNode;
  /// خانة إجراءات هذه الصفحة (Ctrl+S/P/N وF5): تسجّل فيها الشاشة، ويقرؤها الجذر
  /// حين تكون الصفحة ظاهرة. `null` ⇒ الشاشة تسجّل في الجذر كما كانت.
  readonly actions?: ImdScreenActions | null;
}

/// يستضيف صفحةً مفتوحة: تبقى مبنيّةً بحالتها وإن لم تكن الظاهرة.
///
/// تعزل كل صفحة نطاق [ImdRecordScope] و[ImdScreenActionsProvider] الخاصّين بها
/// فلا تلوّث الصفحات المخفية عدّاد السجلات أو اختصارات الصفحة الظاهرة.
export function ImdPageHost({
  active,
  sink,
  children,
  actions = null,
}: ImdPageHostProps) {
  const scoped = (
    <ImdRecordScope sink={sink}>
      {actions === null ? (
        children
      ) : (
        <ImdScreenActionsProvider value={actions}>
          {children}
        </ImdScreenActionsProvider>
      )}
    </ImdRecordScope>
  );

  return (
    <div
      aria-hidden={!active}
      style={active ? { display: 'contents' } : { display: 'none' }}
    >
      {scoped}
    </div>
  );
}
