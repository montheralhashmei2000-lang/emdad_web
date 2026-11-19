import { useEffect, useState } from 'react';
import { AppNames } from './core/app_names';
import { AppTheme } from './core/theme/app_theme';
import { ImdDensity } from './core/ui/imd_density';
import { ImdFonts } from './core/ui/imd_fonts';
import { arDate, arDay, nf, nfMoney } from './core/ui/imd_format';
import { ImdDigits, ImdNumbers } from './core/ui/imd_numbers';
import { ImdSectionTheme } from './core/ui/imd_section_theme';
import { ImdStyle } from './core/ui/imd_style';

export default function App() {
  const [dark, setDark] = useState(false);
  const [fuelIdentity, setFuelIdentity] = useState(ImdSectionTheme.distinctFuel);
  const [highDensity, setHighDensity] = useState(ImdDensity.isHigh);
  const [classic, setClassic] = useState(ImdStyle.classic);
  const [latinDigits, setLatinDigits] = useState(
    ImdNumbers.current.uiDigits === ImdDigits.latin,
  );
  const [font, setFont] = useState(ImdFonts.defaultFamily);

  useEffect(() => {
    const theme = fuelIdentity
      ? AppTheme.fuelSection({ dark, font })
      : classic && !dark
        ? AppTheme.classic({ font })
        : dark
          ? AppTheme.dark({ font })
          : AppTheme.light({ font });

    AppTheme.applyToDocument(theme);
    if (typeof document !== 'undefined') {
      if (fuelIdentity) {
        document.documentElement.dataset.section = 'fuel';
      } else {
        delete document.documentElement.dataset.section;
      }
    }
  }, [dark, fuelIdentity, highDensity, classic, font]);

  const toggleFuel = async () => {
    await ImdSectionTheme.toggle();
    setFuelIdentity(ImdSectionTheme.distinctFuel);
  };

  const toggleDensity = async () => {
    await ImdDensity.toggle();
    setHighDensity(ImdDensity.isHigh);
  };

  const toggleClassic = async () => {
    await ImdStyle.toggle();
    setClassic(ImdStyle.classic);
  };

  const toggleDigits = () => {
    const nextLatin = !latinDigits;
    ImdNumbers.apply(
      ImdNumbers.current.copyWith({
        uiDigits: nextLatin ? ImdDigits.latin : ImdDigits.arabic,
      }),
    );
    setLatinDigits(nextLatin);
  };

  const today = new Date();

  return (
    <div
      dir="rtl"
      className="min-h-screen p-6 transition-colors"
      style={{
        backgroundColor: 'var(--imd-bg)',
        color: 'var(--imd-text)',
        fontFamily: 'var(--imd-font-family)',
      }}
    >
      <div
        className="mx-auto max-w-2xl border p-6"
        style={{
          backgroundColor: 'var(--imd-surface)',
          borderColor: 'var(--imd-line)',
          borderRadius: 'var(--ui-radius)',
          boxShadow: 'var(--ui-shadow)',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--imd-line)' }}>
          <div>
            <h1 className="text-xl font-bold">{AppNames.ui}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--imd-muted)' }}>
              معاينة المرحلة ١ — الأساس: الألوان والخطوط والتنسيق والتواريخ
            </p>
          </div>
          <span
            className="px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: 'var(--imd-accent-soft)',
              color: 'var(--imd-accent)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            {fuelIdentity ? 'هوية المحروقات' : 'هوية الإمداد'}
          </span>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className="border p-3"
            style={{
              backgroundColor: 'var(--imd-panel-fill)',
              borderColor: 'var(--imd-line)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            <div className="text-xs" style={{ color: 'var(--imd-muted)' }}>
              تاريخ اليوم
            </div>
            <div className="mt-1 text-lg font-bold">{arDay(arDate(today))}</div>
          </div>

          <div
            className="border p-3"
            style={{
              backgroundColor: 'var(--imd-panel-fill)',
              borderColor: 'var(--imd-line)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            <div className="text-xs" style={{ color: 'var(--imd-muted)' }}>
              تنسيق الكمية
            </div>
            <div className="mt-1 text-lg font-bold">{nf(1250.5)}</div>
          </div>

          <div
            className="border p-3"
            style={{
              backgroundColor: 'var(--imd-panel-fill)',
              borderColor: 'var(--imd-line)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            <div className="text-xs" style={{ color: 'var(--imd-muted)' }}>
              تنسيق المبلغ
            </div>
            <div className="mt-1 text-lg font-bold">{nfMoney(30000)}</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor: 'var(--imd-accent)',
              color: 'var(--imd-on-accent)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            {dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          </button>

          <button
            type="button"
            onClick={toggleFuel}
            className="border px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: fuelIdentity ? 'var(--imd-warn-soft)' : 'var(--imd-surface)',
              borderColor: 'var(--imd-line-strong)',
              color: fuelIdentity ? 'var(--imd-warn)' : 'var(--imd-text)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            هوية المحروقات: {fuelIdentity ? 'مفعّلة' : 'موحدة'}
          </button>

          <button
            type="button"
            onClick={toggleDensity}
            className="border px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: highDensity ? 'var(--imd-info-soft)' : 'var(--imd-surface)',
              borderColor: 'var(--imd-line-strong)',
              color: highDensity ? 'var(--imd-info)' : 'var(--imd-text)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            الكثافة العالية: {highDensity ? 'نعم' : 'لا'}
          </button>

          <button
            type="button"
            onClick={toggleClassic}
            className="border px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--imd-surface)',
              borderColor: 'var(--imd-line-strong)',
              color: 'var(--imd-text)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            النمط: {classic ? 'كلاسيكي' : 'حديث'}
          </button>

          <button
            type="button"
            onClick={toggleDigits}
            className="border px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--imd-surface)',
              borderColor: 'var(--imd-line-strong)',
              color: 'var(--imd-text)',
              borderRadius: 'var(--imd-compact-radius)',
            }}
          >
            الأرقام: {latinDigits ? 'لاتينية' : 'عربية'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 text-sm">
          <span style={{ color: 'var(--imd-muted)' }}>الخط:</span>
          {ImdFonts.all.map((f) => (
            <button
              key={f.family}
              type="button"
              onClick={() => setFont(f.family)}
              className="border px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor:
                  font === f.family ? 'var(--imd-accent-soft)' : 'var(--imd-surface)',
                borderColor: font === f.family ? 'var(--imd-accent)' : 'var(--imd-line)',
                color: font === f.family ? 'var(--imd-accent)' : 'var(--imd-text2)',
                borderRadius: 'var(--imd-compact-radius)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
