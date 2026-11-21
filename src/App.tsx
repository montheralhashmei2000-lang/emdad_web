import { useEffect, useMemo, useState } from 'react';
import { AppNames } from './core/app_names';
import { AppTheme } from './core/theme/app_theme';
import { ImdDensity } from './core/ui/imd_density';
import { ImdDropZone } from './core/ui/imd_drop_zone';
import { ImdFonts } from './core/ui/imd_fonts';
import { arDate, arDay, isoDay, nf, nfMoney } from './core/ui/imd_format';
import { ImdDateField, ImdF2, ImdLabeled } from './core/ui/imd_form';
import { ImdFreeTableEditor } from './core/ui/imd_free_table';
import { ImdKeyScroll } from './core/ui/imd_key_scroll';
import { ImdDigits, ImdNumbers } from './core/ui/imd_numbers';
import { ImdOccupancyBar } from './core/ui/imd_occupancy_bar';
import { ImdOpenPage, ImdPageHost, ImdPageTabs } from './core/ui/imd_page_tabs';
import { ImdQr } from './core/ui/imd_qr';
import { ImdScreenActions } from './core/ui/imd_screen_actions';
import { ImdSectionTheme } from './core/ui/imd_section_theme';
import { ImdRecordSink, ImdStatusBar } from './core/ui/imd_status_bar';
import { ImdStyle } from './core/ui/imd_style';
import { ImdColors } from './core/ui/imd_tokens';
import { ImdCol, ImdTable } from './core/ui/widgets/imd_table';
import { FreeCol, FreeTable } from './domain/free_table';
import {
  ImdBtnKind,
  ImdButton,
  ImdButtonOutline,
  ImdChip,
  ImdField,
  ImdIconButton,
  ImdPage,
  ImdPageTitle,
  ImdPanel,
  ImdSelect,
  ImdTone,
  showImdModal,
  showImdToast,
} from './core/ui/imd_widgets';

const DEMO_WAREHOUSES: readonly [string, string][] = [
  ['main', 'المستودع الرئيسي'],
  ['central', 'مستودع التموين المركزي'],
  ['north', 'مستودع القطاع الشمالي'],
  ['fuel-a', 'محطة المحروقات الأولى'],
  ['fuel-b', 'خزّان الاحتياط الاستراتيجي'],
  ['medical', 'المستودع الطبي'],
  ['fleet', 'مستودع قطع الغيار والآليات'],
];

interface PreviewSupplyRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly warehouse: string;
  readonly qty: number;
  readonly status: string;
}

const PREVIEW_TABLE_ROWS: readonly PreviewSupplyRow[] = [
  { id: 'r1', code: 'ITM-101', name: 'ديزل مولدات مركزي', warehouse: 'المستودع الرئيسي', qty: 4200, status: 'مضبوط' },
  { id: 'r2', code: 'ITM-102', name: 'زيوت محركات ثقيلة 15W40', warehouse: 'مستودع قطع الغيار والآليات', qty: 320, status: 'مضبوط' },
  { id: 'r3', code: 'ITM-103', name: 'بنزين أوكتان ٩٥', warehouse: 'محطة المحروقات الأولى', qty: 1850, status: 'منخفض' },
  { id: 'r4', code: 'ITM-104', name: 'فلاتر هواء صناعية', warehouse: 'مستودع قطع الغيار والآليات', qty: 95, status: 'قيد المراجعة' },
  { id: 'r5', code: 'ITM-105', name: 'مستلزمات إسعاف ميدانية', warehouse: 'المستودع الطبي', qty: 640, status: 'مضبوط' },
  { id: 'r6', code: 'ITM-106', name: 'وقود طوارئ احتياطي', warehouse: 'خزّان الاحتياط الاستراتيجي', qty: 7500, status: 'مضبوط' },
  { id: 'r7', code: 'ITM-107', name: 'بطاريات تشغيل جافة', warehouse: 'مستودع القطاع الشمالي', qty: 44, status: 'منخفض' },
  { id: 'r8', code: 'ITM-108', name: 'خراطيم ضخ ضغط عالٍ', warehouse: 'محطة المحروقات الأولى', qty: 120, status: 'مضبوط' },
];

export default function App() {
  const [dark, setDark] = useState(false);
  const [fuelIdentity, setFuelIdentity] = useState(ImdSectionTheme.distinctFuel);
  const [highDensity, setHighDensity] = useState(ImdDensity.isHigh);
  const [classic, setClassic] = useState(ImdStyle.classic);
  const [latinDigits, setLatinDigits] = useState(
    ImdNumbers.current.uiDigits === ImdDigits.latin,
  );
  const [font, setFont] = useState(ImdFonts.defaultFamily);

  const [pages, setPages] = useState<ImdOpenPage[]>(() => [
    new ImdOpenPage({ id: 'phase3', title: 'الجدول الذكي والملفات (م٣)', icon: 'table' }),
    new ImdOpenPage({ id: 'components', title: 'مكونات المرحلة ٢', icon: 'dashboard' }),
    new ImdOpenPage({ id: 'occupancy', title: 'الإشغال والشارات', icon: 'fuel', stale: true }),
  ]);
  const [activeId, setActiveId] = useState('phase3');

  const [docTitle, setDocTitle] = useState('سند صرف تموين رقم ١٠٤');
  const [warehouse, setWarehouse] = useState<string | null>('main');
  const [docDate, setDocDate] = useState(() => isoDay(new Date()));

  const [tableSortCol, setTableSortCol] = useState<number | null>(null);
  const [tableSortAsc, setTableSortAsc] = useState(true);
  const [tableCards, setTableCards] = useState(false);
  const [freeTable, setFreeTable] = useState<FreeTable>(() =>
    new FreeTable({
      title: 'كشف المستلمين',
      cols: [new FreeCol('الاسم', 5), new FreeCol('الوحدة', 4), new FreeCol('ملاحظة', 4)],
      rows: [
        ['أحمد السالم', 'شعبة التموين', 'استلام كامل'],
        ['سعد العتيبي', 'قطاع الشمال', 'قيد المطابقة'],
      ],
    }),
  );
  const [droppedFileInfo, setDroppedFileInfo] = useState<string | null>(null);

  const sinkPhase3 = useMemo(() => new ImdRecordSink(), []);
  const sinkComponents = useMemo(() => {
    const s = new ImdRecordSink();
    s.report('preview-components', { shown: 3, total: 12 });
    return s;
  }, []);
  const sinkOccupancy = useMemo(() => {
    const s = new ImdRecordSink();
    s.report('preview-occupancy', { shown: 4, total: 4 });
    return s;
  }, []);
  const actionsPhase3 = useMemo(() => new ImdScreenActions(), []);
  const actionsComponents = useMemo(() => new ImdScreenActions(), []);
  const actionsOccupancy = useMemo(() => new ImdScreenActions(), []);

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

  const activeColors = useMemo(() => {
    if (fuelIdentity) return dark ? ImdColors.fuelDark : ImdColors.fuelLight;
    if (dark) return ImdColors.dark;
    return classic ? ImdColors.classicLight : ImdColors.light;
  }, [dark, fuelIdentity, classic]);

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

  const handleClosePage = (id: string) => {
    if (pages.length <= 1) return;
    const next = pages.filter((p) => p.id !== id);
    setPages(next);
    if (activeId === id && next.length > 0) {
      setActiveId(next[0].id);
    }
  };

  const handleCloseOthers = (id: string) => {
    const keep = pages.filter((p) => p.id === id);
    if (keep.length > 0) {
      setPages(keep);
      setActiveId(id);
    }
  };

  const reopenAllPages = () => {
    setPages([
      new ImdOpenPage({ id: 'phase3', title: 'الجدول الذكي والملفات (م٣)', icon: 'table' }),
      new ImdOpenPage({ id: 'components', title: 'مكونات المرحلة ٢', icon: 'dashboard' }),
      new ImdOpenPage({ id: 'occupancy', title: 'الإشغال والشارات', icon: 'fuel', stale: true }),
    ]);
  };

  const activeSink =
    activeId === 'phase3'
      ? sinkPhase3
      : activeId === 'occupancy'
        ? sinkOccupancy
        : sinkComponents;
  const activeActions =
    activeId === 'phase3'
      ? actionsPhase3
      : activeId === 'occupancy'
        ? actionsOccupancy
        : actionsComponents;

  const sortedPreviewRows = useMemo(() => {
    if (tableSortCol === null) return PREVIEW_TABLE_ROWS;
    const copy = [...PREVIEW_TABLE_ROWS];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (tableSortCol) {
        case 0:
          cmp = a.code.localeCompare(b.code, 'ar');
          break;
        case 1:
          cmp = a.name.localeCompare(b.name, 'ar');
          break;
        case 2:
          cmp = a.warehouse.localeCompare(b.warehouse, 'ar');
          break;
        case 3:
          cmp = a.qty - b.qty;
          break;
        case 4:
          cmp = a.status.localeCompare(b.status, 'ar');
          break;
      }
      return tableSortAsc ? cmp : -cmp;
    });
    return copy;
  }, [tableSortCol, tableSortAsc]);

  const openSampleModal = () => {
    void showImdModal<void>({
      title: 'معاينة نافذة حوار المرحلة ٢',
      icon: 'info',
      colors: activeColors,
      builder: (ctx) => (
        <div className="flex flex-col gap-3" style={{ color: ctx.colors.text.css }}>
          <p className="text-sm leading-relaxed">
            هذه نافذة حوار تفاعلية مبنية عبر <code dir="ltr">showImdModal</code> ومغلّفة
            بـ <code dir="ltr">createPortal</code> مع إغلاق عبر Escape أو النقر خارج الإطار.
          </p>
          <div className="flex flex-wrap gap-2">
            <ImdChip label="المستودع المختار" tone={ImdTone.info} colors={ctx.colors} />
            <ImdChip
              label={
                DEMO_WAREHOUSES.find(([k]) => k === warehouse)?.[1] ?? 'غير محدد'
              }
              tone={ImdTone.ok}
              colors={ctx.colors}
            />
          </div>
        </div>
      ),
      actions: (ctx) => (
        <>
          <ImdButtonOutline
            label="إغلاق"
            onPressed={() => ctx.close()}
            colors={ctx.colors}
          />
          <ImdButton
            label="تأكيد وإشعار"
            onPressed={() => {
              ctx.close();
              showImdToast('تم تأكيد المعاينة بنجاح', { colors: activeColors });
            }}
            colors={ctx.colors}
          />
        </>
      ),
      onEnter: (ctx) => () => ctx.close(),
    });
  };

  const today = new Date();

  return (
    <ImdKeyScroll className="flex min-h-screen flex-col">
      <div
        dir="rtl"
        className="flex min-h-screen flex-col transition-colors"
        style={{
          backgroundColor: activeColors.bg.css,
          color: activeColors.text.css,
          fontFamily: 'var(--imd-font-family)',
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
          style={{
            backgroundColor: activeColors.surface.css,
            borderColor: activeColors.line.css,
          }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold">{AppNames.ui}</h1>
            <ImdChip
              label={fuelIdentity ? 'هوية المحروقات' : 'معاينة المرحلة ٢'}
              tone={fuelIdentity ? ImdTone.pend : ImdTone.info}
              colors={activeColors}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ImdButton
              label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
              icon={dark ? 'sun' : 'moon'}
              small={true}
              kind={ImdBtnKind.primary}
              onPressed={() => setDark((d) => !d)}
              colors={activeColors}
            />
            <ImdButtonOutline
              label={`هوية المحروقات: ${fuelIdentity ? 'مفعّلة' : 'موحدة'}`}
              icon="fuel"
              small={true}
              onPressed={toggleFuel}
              colors={activeColors}
            />
            <ImdButtonOutline
              label={`الكثافة: ${highDensity ? 'عالية' : 'مريحة'}`}
              small={true}
              onPressed={toggleDensity}
              colors={activeColors}
            />
            <ImdButtonOutline
              label={`النمط: ${classic ? 'كلاسيكي' : 'حديث'}`}
              small={true}
              onPressed={toggleClassic}
              colors={activeColors}
            />
            <ImdButtonOutline
              label={`الأرقام: ${latinDigits ? 'لاتينية' : 'عربية'}`}
              small={true}
              onPressed={toggleDigits}
              colors={activeColors}
            />
            <div style={{ width: 170 }}>
              <ImdSelect<string>
                items={ImdFonts.all.map((f) => [f.family, f.label] as const)}
                value={font}
                dense={true}
                title="الخط"
                onChanged={(v) => {
                  if (v) setFont(v);
                }}
                colors={activeColors}
              />
            </div>
          </div>
        </div>

        <ImdPageTabs
          pages={pages}
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
          onClose={handleClosePage}
          onCloseOthers={handleCloseOthers}
          colors={activeColors}
        />

        <div className="flex-1 overflow-y-auto">
          <ImdPageHost
            active={activeId === 'phase3'}
            sink={sinkPhase3}
            actions={actionsPhase3}
          >
            <ImdPage className="mx-auto w-full max-w-[1080px]">
              <ImdPageTitle
                title="معاينة المرحلة ٣ — الجدول الذكي والملفات"
                subtitle="بحث فوري، تصفية الأعمدة، فرز، تجميع بالسحب، ترقيم، عرض البطاقات، الجدول الحر، QR، وإفلات الملفات"
                colors={activeColors}
                actions={[
                  <ImdButtonOutline
                    key="cards-toggle"
                    label={tableCards ? 'عرض الجدول' : 'عرض البطاقات'}
                    icon={tableCards ? 'table' : 'list'}
                    small={true}
                    onPressed={() => setTableCards((prev) => !prev)}
                    colors={activeColors}
                  />,
                  <ImdIconButton
                    key="reopen-tabs"
                    icon="refresh"
                    tooltip="إعادة فتح التبويبات"
                    onPressed={reopenAllPages}
                    colors={activeColors}
                  />,
                ]}
              />

              <ImdPanel
                title="الجدول الذكي (ImdTable) — مرتبط بعدّاد السجلات في شريط الحالة"
                colors={activeColors}
              >
                <ImdTable
                  columns={[
                    new ImdCol('الرمز', { width: 105 }),
                    new ImdCol('الصنف'),
                    new ImdCol('المستودع'),
                    new ImdCol('الكمية', { numeric: true, width: 100 }),
                    new ImdCol('الحالة', { center: true, width: 120 }),
                  ]}
                  rowKeys={sortedPreviewRows.map((r) => r.id)}
                  rows={sortedPreviewRows.map((r) => [
                    <span key="c" dir="ltr" className="font-mono text-xs">
                      {r.code}
                    </span>,
                    r.name,
                    r.warehouse,
                    nf(r.qty),
                    <ImdChip
                      key="st"
                      label={r.status}
                      tone={
                        r.status === 'مضبوط'
                          ? ImdTone.ok
                          : r.status === 'قيد المراجعة'
                            ? ImdTone.pend
                            : ImdTone.err
                      }
                      colors={activeColors}
                    />,
                  ])}
                  values={sortedPreviewRows.map((r) => [
                    r.code,
                    r.name,
                    r.warehouse,
                    r.qty,
                    r.status,
                  ])}
                  sortIndex={tableSortCol}
                  sortAsc={tableSortAsc}
                  onHeaderTap={(colIdx) => {
                    if (tableSortCol === colIdx) {
                      setTableSortAsc((prev) => !prev);
                    } else {
                      setTableSortCol(colIdx);
                      setTableSortAsc(true);
                    }
                  }}
                  filterable={true}
                  groupable={true}
                  pageSize={5}
                  cards={tableCards}
                  zebra={true}
                  freezeFirst={true}
                  colors={activeColors}
                  onRowTap={(idx) => {
                    const row = sortedPreviewRows[idx];
                    if (row) {
                      showImdToast(`تم اختيار الصنف: ${row.name} (${nf(row.qty)})`, {
                        colors: activeColors,
                      });
                    }
                  }}
                />
              </ImdPanel>

              <div style={{ height: 14 }} />

              <ImdPanel
                title={`محرر الجدول الحر (ImdFreeTableEditor) — ${nf(freeTable.filledRows.length)} صفوف معبأة`}
                colors={activeColors}
              >
                <ImdFreeTableEditor
                  initial={freeTable}
                  onChanged={setFreeTable}
                  colors={activeColors}
                />
              </ImdPanel>

              <div style={{ height: 14 }} />

              <ImdF2 cols={2}>
                <ImdPanel title="رمز الاستجابة السريعة (ImdQr)" colors={activeColors}>
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="rounded-lg border p-2"
                      style={{ borderColor: activeColors.line.css }}
                    >
                      <ImdQr data="IMD-8.0.2-PREVIEW-104" size={160} />
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs" style={{ color: activeColors.muted.css }}>
                      <span className="font-semibold" style={{ color: activeColors.text.css }}>
                        الرمز المشفر: <code dir="ltr">IMD-8.0.2-PREVIEW-104</code>
                      </span>
                      <span>خلفية ورقية بيضاء ثابتة وهامش هادئ ٦٪ لقراءة الكاميرا في الوضعين الفاتح والداكن.</span>
                    </div>
                  </div>
                </ImdPanel>

                <ImdPanel title="منطقة إفلات الملفات (ImdDropZone)" colors={activeColors}>
                  <ImdDropZone
                    extensions={['xlsx', 'json', 'csv']}
                    hint="أفلت ملف JSON أو CSV أو XLSX هنا"
                    colors={activeColors}
                    onFileBytes={(file) => {
                      setDroppedFileInfo(`${file.name} (${nf(file.bytes.length)} بايت)`);
                      showImdToast(`تمت قراءة الملف: ${file.name}`, { colors: activeColors });
                    }}
                  >
                    <div
                      className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center"
                      style={{
                        borderColor: activeColors.line.css,
                        backgroundColor: activeColors.bg.css,
                        color: activeColors.muted.css,
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: activeColors.text.css }}>
                        اسحب ملفاً وأفلته هنا للمعاينة الفورية
                      </span>
                      <span className="text-xs">
                        الامتدادات المسموحة: <code dir="ltr">.xlsx, .json, .csv</code>
                      </span>
                      {droppedFileInfo ? (
                        <ImdChip
                          label={`آخر ملف: ${droppedFileInfo}`}
                          tone={ImdTone.ok}
                          colors={activeColors}
                        />
                      ) : null}
                    </div>
                  </ImdDropZone>
                </ImdPanel>
              </ImdF2>
            </ImdPage>
          </ImdPageHost>

          <ImdPageHost
            active={activeId === 'components'}
            sink={sinkComponents}
            actions={actionsComponents}
          >
            <ImdPage className="mx-auto w-full max-w-[1040px]">
              <ImdPageTitle
                title="معاينة مكونات الواجهة — المرحلة ٢"
                subtitle={`تاريخ اليوم: ${arDay(arDate(today))} · الكمية: ${nf(1250.5)} · المبلغ: ${nfMoney(30000)}`}
                colors={activeColors}
                actions={[
                  <ImdIconButton
                    key="refresh"
                    icon="refresh"
                    tooltip="إعادة فتح التبويبات"
                    onPressed={reopenAllPages}
                    colors={activeColors}
                  />,
                  <ImdIconButton
                    key="print"
                    icon="printer"
                    tooltip="طباعة"
                    onPressed={() =>
                      showImdToast('إجراء طباعة تجريبي من شريط الإجراءات', {
                        colors: activeColors,
                      })
                    }
                    colors={activeColors}
                  />,
                  <ImdButton
                    key="modal"
                    label="فتح نافذة حوار"
                    icon="info"
                    small={true}
                    onPressed={openSampleModal}
                    colors={activeColors}
                  />,
                ]}
              />

              <ImdPanel
                title="النماذج والحقول وتوحيد الارتفاع"
                colors={activeColors}
              >
                <p className="mb-3 text-xs" style={{ color: activeColors.muted.css }}>
                  ImdField و ImdSelect و ImdDateField داخل صف ImdF2 متكافئ الارتفاع
                </p>
                <ImdF2 cols={3}>
                  <ImdField
                    label="عنوان السند"
                    value={docTitle}
                    hint="أدخل وصف السند"
                    required={true}
                    onChanged={setDocTitle}
                    colors={activeColors}
                  />
                  <ImdLabeled label="المستودع (ImdSelect)" colors={activeColors}>
                    <ImdSelect<string>
                      hint="اختر المستودع"
                      items={DEMO_WAREHOUSES}
                      value={warehouse}
                      onChanged={setWarehouse}
                      colors={activeColors}
                    />
                  </ImdLabeled>
                  <ImdLabeled label="تاريخ السند (ImdDateField)" colors={activeColors}>
                    <ImdDateField
                      value={docDate}
                      onChanged={setDocDate}
                      colors={activeColors}
                    />
                  </ImdLabeled>
                </ImdF2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ImdButton
                    label="إشعار نجاح (Toast)"
                    icon="check"
                    onPressed={() =>
                      showImdToast('تم الحفظ في سجل المعاينة بنجاح', {
                        colors: activeColors,
                      })
                    }
                    colors={activeColors}
                  />
                  <ImdButton
                    label="إشعار خطأ"
                    icon="alert"
                    kind={ImdBtnKind.danger}
                    onPressed={() =>
                      showImdToast('تعذّر تنفيذ الإجراء التجريبي', {
                        error: true,
                        colors: activeColors,
                      })
                    }
                    colors={activeColors}
                  />
                  <ImdButtonOutline
                    label="معاينة نافذة showImdModal"
                    icon="search"
                    onPressed={openSampleModal}
                    colors={activeColors}
                  />
                  <ImdIconButton
                    icon="printer"
                    tooltip="معاينة الطباعة"
                    onPressed={() =>
                      showImdToast('تم استدعاء زر الأيقونة بالتلميحة', {
                        colors: activeColors,
                      })
                    }
                    colors={activeColors}
                  />
                </div>
              </ImdPanel>

              <div style={{ height: 14 }} />

              <ImdF2 cols={2}>
                <ImdPanel title="الشارات (ImdChip)" colors={activeColors}>
                  <div className="flex flex-wrap gap-2">
                    <ImdChip label="مضبوط" tone={ImdTone.ok} icon="check" colors={activeColors} />
                    <ImdChip label="قيد المراجعة" tone={ImdTone.pend} icon="alert" colors={activeColors} />
                    <ImdChip label="مرفوض" tone={ImdTone.err} icon="x" colors={activeColors} />
                    <ImdChip label="معلومة" tone={ImdTone.info} icon="info" colors={activeColors} />
                    <ImdChip label="معطّل" tone={ImdTone.off} colors={activeColors} />
                  </div>
                  <div className="mt-3" style={{ width: 170 }}>
                    <ImdChip
                      label="نص شارة طويل يُقصّ داخل حاوية ضيّقة دون فيض"
                      tone={ImdTone.pend}
                      icon="alert"
                      colors={activeColors}
                    />
                  </div>
                </ImdPanel>

                <ImdPanel title="أشرطة الإشغال (ImdOccupancyBar)" colors={activeColors}>
                  <div className="flex flex-col gap-3">
                    <ImdOccupancyBar
                      name="خزّان الديزل الرئيسي"
                      used={6200}
                      capacity={10000}
                      unit="لتر"
                      colors={activeColors}
                    />
                    <ImdOccupancyBar
                      name="خزّان البنزين (قرب الامتلاء)"
                      used={9400}
                      capacity={10000}
                      unit="لتر"
                      colors={activeColors}
                    />
                    <ImdOccupancyBar
                      name="خزّان الطوارئ (منخفض)"
                      used={1200}
                      capacity={10000}
                      unit="لتر"
                      colors={activeColors}
                    />
                  </div>
                </ImdPanel>
              </ImdF2>
            </ImdPage>
          </ImdPageHost>

          <ImdPageHost
            active={activeId === 'occupancy'}
            sink={sinkOccupancy}
            actions={actionsOccupancy}
          >
            <ImdPage className="mx-auto w-full max-w-[900px]">
              <ImdPageTitle
                title="متابعة سعة المستودعات والخزّانات"
                subtitle="تبويبة ثانية معزولة عبر ImdPageHost وImdRecordSink"
                colors={activeColors}
              />
              <ImdPanel title="تفاصيل الإشغال" colors={activeColors}>
                <div className="flex flex-col gap-4">
                  <ImdOccupancyBar
                    name="المستودع الرئيسي"
                    used={450}
                    capacity={600}
                    unit="طرد"
                    colors={activeColors}
                  />
                  <ImdOccupancyBar
                    name="سعة مفتوحة"
                    used={85}
                    capacity={0}
                    unit="وحدة"
                    colors={activeColors}
                  />
                </div>
              </ImdPanel>
            </ImdPage>
          </ImdPageHost>
        </div>

        <ImdStatusBar
          connection="متصل (معاينة)"
          connectionOk={true}
          records={activeSink}
          colors={activeColors}
        />
      </div>
    </ImdKeyScroll>
  );
}
