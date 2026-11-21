import { useEffect, useState } from 'react';
import { useImdColors } from '../../core/theme/imd_theme';
import { ImdIcon } from '../../core/ui/imd_icon';
import {
  ImdBp,
  type ImdColor,
  type ImdColors,
  ImdCursor,
  imdShadow,
} from '../../core/ui/imd_tokens';
import { ImdTap } from '../../core/ui/widgets/imd_tap';
import { AppSpace } from '../../domain/app_space';

export interface SpaceChooserScreenProps {
  readonly spaces: readonly string[];
  readonly onPick: (space: string) => void;
  readonly userName: string;
  readonly colors?: ImdColors;
}

/// اختيار مساحة العمل — لا تظهر إلا لمن يملك المساحتين.
///
/// ومن يملك واحدة يدخلها مباشرة: شاشةُ اختيارٍ بخيارٍ واحد متاح ليست اختيارًا،
/// بل نقرةٌ تُدفع كل يوم بلا مقابل.
export function SpaceChooserScreen({
  spaces,
  onPick,
  userName,
  colors,
}: SpaceChooserScreenProps) {
  const c = useImdColors(colors);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const narrow = ImdBp.of(viewportWidth).tablet;

  const renderCard = (space: string) => (
    <SpaceCard
      key={space}
      space={space}
      onTap={() => onPick(space)}
      accent={space === AppSpace.fuel ? c.warn : c.accent}
      colors={c}
    />
  );

  return (
    <div
      dir="rtl"
      data-imd-space-chooser="true"
      className="flex min-h-screen w-full items-center justify-center overflow-y-auto"
      style={{ backgroundColor: c.bg.css }}
    >
      <div
        className="w-full"
        style={{
          maxWidth: 880,
          paddingInline: 20,
          paddingBlock: 32,
        }}
      >
        <div className="flex flex-col items-stretch">
          <div
            className="text-center"
            style={{
              fontSize: 15,
              color: c.muted.css,
              letterSpacing: '0.3px',
            }}
          >
            نظام الإمداد والتموين
          </div>
          <div style={{ height: 8 }} />
          <div
            className="text-center"
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: c.text.css,
              lineHeight: 1.5,
            }}
          >
            {userName.length === 0 ? 'اختر القسم' : `أهلًا ${userName} — اختر القسم`}
          </div>
          <div style={{ height: 6 }} />
          <div
            className="text-center"
            style={{
              fontSize: 13.5,
              color: c.muted.css,
              lineHeight: 1.8,
            }}
          >
            يمكنك التبديل بينهما في أي وقت من أعلى الشريط الجانبي.
          </div>
          <div style={{ height: 28 }} />
          {narrow ? (
            <div className="flex flex-col items-stretch" style={{ gap: 14 }}>
              {spaces.map((s) => renderCard(s))}
            </div>
          ) : (
            <div
              className="grid items-stretch"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, spaces.length)}, minmax(0, 1fr))`,
                gap: 16,
              }}
            >
              {spaces.map((s) => renderCard(s))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpaceCard({
  space,
  onTap,
  accent,
  colors: c,
}: {
  readonly space: string;
  readonly onTap: () => void;
  readonly accent: ImdColor;
  readonly colors: ImdColors;
}) {
  const [hover, setHover] = useState(false);
  const shadows = hover ? imdShadow(c) : [];

  return (
    <ImdTap
      onTap={onTap}
      onHoverChange={setHover}
      cursor={ImdCursor.click}
      radius={16}
      colors={c}
      className="flex h-full w-full items-stretch"
    >
      <div
        className="flex w-full flex-col items-start transition-all duration-150"
        style={{
          padding: '24px 22px 22px 22px',
          backgroundColor: c.surface.css,
          border: `${hover ? 2 : 1}px solid ${(hover ? accent : c.line).css}`,
          borderRadius: 16,
          boxShadow:
            shadows.length > 0 ? shadows.map((s) => s.css).join(', ') : 'none',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            backgroundColor: accent.withValues({ alpha: 0.12 }).css,
            borderRadius: 14,
          }}
        >
          <ImdIcon
            name={AppSpace.icons[space] ?? 'package'}
            size={26}
            color={accent}
          />
        </div>
        <div style={{ height: 16 }} />
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: c.text.css,
          }}
        >
          {AppSpace.label(space)}
        </div>
        <div style={{ height: 8 }} />
        <div
          className="flex-1"
          style={{
            fontSize: 13,
            color: c.muted.css,
            lineHeight: 1.9,
          }}
        >
          {AppSpace.descriptions[space] ?? ''}
        </div>
        <div style={{ height: 18 }} />
        <div className="flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: accent.css,
            }}
          >
            ادخل
          </span>
          <ImdIcon name="arrow-left" size={15} color={accent} />
        </div>
      </div>
    </ImdTap>
  );
}
