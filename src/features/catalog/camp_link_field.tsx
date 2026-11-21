import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useImdColors } from '../../core/theme/imd_theme';
import { nf } from '../../core/ui/imd_format';
import { ImdIcon } from '../../core/ui/imd_icon';
import { ImdColors, ImdCursor, ImdSizes } from '../../core/ui/imd_tokens';
import {
  ImdButton,
  imdFieldDecoration,
  ImdNote,
  ImdTap,
} from '../../core/ui/imd_widgets';
import type { BeneficiaryUnit } from '../../data/db/app_database';

export interface CampLinkFieldProps {
  readonly camps: readonly BeneficiaryUnit[];
  readonly all: boolean;
  readonly ids: readonly string[];
  readonly onChanged: (all: boolean, ids: string[]) => void;
  readonly enabled?: boolean;
  readonly colors?: ImdColors;
}

/// حقل «🏕️ يغذي معسكر» — نقل لـ `injectCampLinkRow()` في forms-ux.js:
/// زر يعرض ملخص الاختيار ويفتح قائمة منبثقة: بحث (إذا زادت المعسكرات على ست)،
/// «جميع المعسكرات»، ثم المعسكرات، وتذييل بالعدد وزر «تم». يُغلق بالنقر خارجه أو Esc.
export function CampLinkField({
  camps,
  all,
  ids,
  onChanged,
  enabled = true,
  colors,
}: CampLinkFieldProps) {
  const ctxColors = useImdColors();
  const c = colors ?? ctxColors;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [anchorRect, setAnchorRect] = useState<{
    readonly top: number;
    readonly right: number;
    readonly width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const deco = imdFieldDecoration({ hint: 'بحث عن معسكر', dense: true, colors: c });

  /// `campDDSummary()`
  const summary = (() => {
    if (all) return 'جميع المعسكرات';
    const names = camps.filter((camp) => ids.includes(camp.id)).map((camp) => camp.name);
    if (names.length === 0) return 'اختر المعسكرات…';
    return names.length <= 2
      ? names.join('، ')
      : `${names.slice(0, 2).join('، ')} +${names.length - 2}`;
  })();

  const openPopup = (open: boolean) => {
    if (open) {
      setSearch('');
      const el = triggerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setAnchorRect({
          top: rect.bottom + 4,
          right: Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 1200) - rect.right),
          width: rect.width > 0 ? rect.width : 320,
        });
      } else {
        setAnchorRect({ top: 100, right: 16, width: 320 });
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    if (camps.length > 6) {
      queueMicrotask(() => searchInputRef.current?.focus());
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        openPopup(false);
      }
    };
    const onScrollOrResize = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchorRect({
        top: rect.bottom + 4,
        right: Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 1200) - rect.right),
        width: rect.width > 0 ? rect.width : 320,
      });
    };
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen, camps.length]);

  const q = search.trim();
  const filteredList = camps.filter((camp) => {
    if (q.length === 0) return true;
    const label = `${camp.code.length > 0 ? `${camp.code}-` : ''}${camp.name}`;
    return label.includes(q);
  });

  const renderOpt = (
    key: string,
    label: string,
    checked: boolean,
    onTap: (v: boolean) => void,
    bold = false,
  ) => (
    <div
      key={key}
      role="option"
      aria-selected={checked}
      onClick={() => onTap(!checked)}
      className="flex cursor-pointer items-center rounded-[8px] px-[10px] py-[8px]"
      style={{
        borderBottom: bold ? `1px solid ${c.line.css}` : undefined,
        marginBottom: bold ? 4 : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          e.stopPropagation();
          onTap(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 16,
          height: 16,
          accentColor: c.accent.css,
          flexShrink: 0,
        }}
      />
      <span style={{ width: 8, flexShrink: 0 }} />
      <span
        className="min-w-0 flex-1 text-[13px]"
        style={{
          color: c.text.css,
          fontWeight: bold ? 700 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );

  const popup =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-50" dir="rtl">
            {/* إغلاق عند النقر خارج القائمة */}
            <div
              className="fixed inset-0"
              onClick={() => openPopup(false)}
            />
            <div
              ref={popupRef}
              role="listbox"
              aria-multiselectable="true"
              className="fixed flex flex-col items-stretch p-2"
              style={{
                top: anchorRect?.top ?? 100,
                right: anchorRect?.right ?? 16,
                width: anchorRect?.width ?? 320,
                maxWidth: 'calc(100vw - 16px)',
                maxHeight: 320,
                backgroundColor: c.surface.css,
                border: `1px solid ${c.popupLine.css}`,
                borderRadius: 10,
                boxShadow: `0 10px 28px ${c.shadowPopup.css}`,
              }}
            >
              {camps.length > 6 && (
                <div style={{ paddingBottom: 6 }}>
                  <div style={deco.containerStyle(false)}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      placeholder="بحث عن معسكر"
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-transparent"
                      style={{
                        ...deco.inputStyle,
                        fontSize: 14,
                        color: c.text.css,
                      }}
                    />
                  </div>
                </div>
              )}

              {renderOpt(
                '__all__',
                'جميع المعسكرات',
                all,
                (v) => onChanged(v, v ? [] : [...ids]),
                true,
              )}

              <div className="min-h-0 flex-1 overflow-y-auto">
                {camps.length === 0 ? (
                  <div
                    className="p-[10px] text-[12px]"
                    style={{ color: c.faint.css }}
                  >
                    لا توجد معسكرات بعد — أضف المعسكرات أولًا من شاشة الوحدات
                  </div>
                ) : filteredList.length === 0 ? (
                  <div
                    className="p-[10px] text-[12px]"
                    style={{ color: c.faint.css }}
                  >
                    لا نتائج مطابقة
                  </div>
                ) : (
                  filteredList.map((camp) => {
                    const label = `${camp.code.length > 0 ? `${camp.code}-` : ''}${camp.name}`;
                    const checked = !all && ids.includes(camp.id);
                    return renderOpt(camp.id, label, checked, (v) => {
                      const next = [...ids];
                      if (v && !next.includes(camp.id)) next.push(camp.id);
                      if (!v) {
                        const idx = next.indexOf(camp.id);
                        if (idx !== -1) next.splice(idx, 1);
                      }
                      onChanged(false, next);
                    });
                  })
                )}
              </div>

              <div
                className="mt-[6px] flex items-center pt-2"
                style={{ borderTop: `1px solid ${c.line.css}` }}
              >
                <span className="text-[12px]" style={{ color: c.muted.css }}>
                  {all ? 'كل المعسكرات' : `${nf(ids.length)} محدد`}
                </span>
                <div className="flex-1" />
                <ImdButton
                  label="تم"
                  small={true}
                  colors={c}
                  onPressed={() => openPopup(false)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex flex-col items-stretch">
      <div
        className="flex flex-wrap items-center text-[13px] font-semibold"
        style={{ color: c.text2.css }}
      >
        <span
          className="inline-flex items-center"
          style={{ marginInlineEnd: 6 }}
        >
          <ImdIcon name="tent" size={14} color={c.text2} />
        </span>
        <span>يغذي معسكر </span>
        <span className="font-normal" style={{ color: c.muted.css }}>
          (يتيح ربط المستودع بالصرف/التحويل تلقائيًا)
        </span>
      </div>

      <div style={{ height: 6 }} />

      <div ref={triggerRef}>
        <ImdTap
          disabled={!enabled}
          cursor={enabled ? ImdCursor.click : 'default'}
          radius={10}
          onTap={enabled ? () => openPopup(!isOpen) : undefined}
        >
          <div
            className="flex items-center px-3"
            style={{
              minHeight: ImdSizes.touchMin,
              backgroundColor: enabled ? c.surface.css : c.bg.css,
              border: `1px solid ${(isOpen ? c.accent : c.lineStrong).css}`,
              borderRadius: 10,
            }}
          >
            <span
              className="min-w-0 flex-1 truncate text-[14px]"
              style={{ color: c.text.css }}
            >
              {summary}
            </span>
            <span
              className="inline-flex shrink-0 items-center transition-transform duration-150"
              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <ImdIcon name="chevron-down" size={14} color={c.muted} />
            </span>
          </div>
        </ImdTap>
      </div>

      <div style={{ height: 7 }} />

      <ImdNote
        text="سيظهر المستودع في الصرف والتحويل فقط عندما يكون مسموحًا لمعسكر الجهة المستفيدة."
        colors={c}
      />

      {popup}
    </div>
  );
}
