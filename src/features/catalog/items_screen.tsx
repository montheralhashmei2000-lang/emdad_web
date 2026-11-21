import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ErrorLogger } from '../../core/error_log';
import { Barcode128View } from '../../core/print/barcode128';
import {
  BarcodeLabelsSheet,
  type BarcodeLabelEntry,
} from '../../core/print/barcode_labels';
import { useAuthService } from '../../core/security/auth_service';
import { usePerm } from '../../core/security/perm';
import { useAppDatabase, useImdColors } from '../../core/theme/imd_theme';
import type { ImdMenuItem } from '../../core/ui/imd_context_menu';
import { ImdFiles } from '../../core/ui/imd_files';
import {
  ImdCheckbox,
  ImdChipsRow,
  ImdF2,
  ImdFld,
  ImdICard,
  ImdItabs,
  ImdLabeled,
  ImdLd,
  ImdLdText,
  ImdTextController,
  imdSetText,
} from '../../core/ui/imd_form';
import { arDate, nf } from '../../core/ui/imd_format';
import { ImdFit, ImdKpi, ImdKpis } from '../../core/ui/imd_layout';
import { ImdScanButton } from '../../core/ui/imd_scan';
import { useImdScreenActions } from '../../core/ui/imd_screen_actions';
import { imdShadow, ImdSizes } from '../../core/ui/imd_tokens';
import { ImdExcel, ImdTableToolbar } from '../../core/ui/imd_toolbar';
import {
  ImdBtnKind,
  ImdButton,
  ImdButtonOutline,
  ImdChip,
  ImdCol,
  imdConfirm,
  imdFieldDecoration,
  ImdGrid,
  ImdIconButton,
  ImdPage,
  ImdPageTitle,
  ImdSelect,
  ImdTab,
  ImdTable,
  ImdTone,
  showImdModal,
  showImdToast,
} from '../../core/ui/imd_widgets';
import type { Category, Item } from '../../data/db/app_database';
import { TemplateKind } from '../../data/migration/excel_templates/excel_templates';
import { AssetRegisterRepo } from '../../data/repos/asset_register_repo';
import { CatalogRepo, ItemUnit } from '../../data/repos/catalog_repo';
import { MovementsRepo } from '../../data/repos/movements_repo';
import { PermAction } from '../../domain/access_control';
import { AssetType } from '../../domain/assets';
import { StockAlerts } from '../../domain/stock_alerts';
import { ExcelTemplatesButton } from '../excel_templates/excel_templates_dialog';

function fmtNum(v: number): string {
  return v === Math.round(v) ? String(Math.trunc(v)) : String(v);
}

let nextUnitRowKey = 1;

/// صف وحدة قياس في النموذج.
class UnitRow {
  readonly key: number;
  readonly name: ImdTextController;
  readonly factor: ImdTextController;
  base: boolean;

  constructor(name: string, factor: number, base: boolean) {
    this.key = nextUnitRowKey++;
    this.name = new ImdTextController(name);
    this.factor = new ImdTextController(fmtNum(factor));
    this.base = base;
  }

  dispose(): void {
    // ImdTextController لا يحمل موارد أصلية خارجية تتطلب تحريراً يدوياً في React.
  }
}

/// إدارة الأصناف بتبويباتها الست:
/// القائمة، التصنيفات، بطاقة الصنف، الأرصدة، حركة الصنف، الباركودات.
export function ItemsScreen() {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const repo = useMemo(() => (db ? new CatalogRepo(db) : null), [db]);
  const moves = useMemo(() => (db ? new MovementsRepo(db) : null), [db]);
  const perm = usePerm();
  const c = useImdColors();
  const screenActions = useImdScreenActions();

  // حالة الشاشة `itm`
  const [tab, setTab] = useState<string>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [ledger, setLedger] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [movsId, setMovsId] = useState<string>('');

  // القائمة
  const searchCtrl = useMemo(() => new ImdTextController(''), []);
  const [searchText, setSearchText] = useState<string>('');

  // التصنيفات
  const cNameCtrl = useMemo(() => new ImdTextController(''), []);
  const cDescCtrl = useMemo(() => new ImdTextController(''), []);

  // النموذج
  const iCodeCtrl = useMemo(() => new ImdTextController(''), []);
  const iBCCtrl = useMemo(() => new ImdTextController(''), []);
  const iNameCtrl = useMemo(() => new ImdTextController(''), []);
  const iMinCtrl = useMemo(() => new ImdTextController(''), []);

  /// هل لهذا الصنف حدّ أدنى عام؟
  const [iMinOn, setIMinOn] = useState<boolean>(false);
  const [iCat, setICat] = useState<string>('');
  const [iRef, setIRef] = useState<boolean>(false);
  const [iReportUnit, setIReportUnit] = useState<string>('');

  // الأصل الثابت (v27): يُستلم ويُصرف ويُجرد ويُتلف كأي صنف، ويُتابَع في سجل الأصول.
  const [iAsset, setIAsset] = useState<boolean>(false);
  const [iAssetType, setIAssetType] = useState<string>('');
  const iLifeCtrl = useMemo(() => new ImdTextController(''), []);
  const iValueCtrl = useMemo(() => new ImdTextController(''), []);
  const [assetTypes, setAssetTypes] = useState<string[]>([...AssetType.all]);
  const [uRows, setURows] = useState<UnitRow[]>([]);
  const [, setURowsVersion] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);

  // الأرصدة والحركة
  const [balId, setBalId] = useState<string>('');
  const [balOut, setBalOut] = useState<ReactNode | null>(null);
  const [movOut, setMovOut] = useState<ReactNode | null>(null);

  // الباركودات
  const [bcChecked, setBcChecked] = useState<Set<string>>(() => new Set());
  const bcCopiesCtrl = useMemo(() => new ImdTextController('1'), []);

  const mountedRef = useRef(true);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const editIdRef = useRef<string | null>(null);
  editIdRef.current = editId;
  const uRowsRef = useRef<UnitRow[]>(uRows);
  uRowsRef.current = uRows;

  /// رصيد الصنف من دفتر الحركات وحده (الأرصدة الافتتاحية + صافي الحركات).
  const qtyOf = (x: Item): number => ledger[x.id] ?? 0;

  /// وحدات الصنف كما خُزّنت (بدون افتراض وحدة عند الخلو).
  const unitsRaw = useCallback(
    (x: Item): ItemUnit[] => {
      if (!repo) return [];
      const trimmed = x.units.trim();
      if (trimmed.length === 0 || trimmed === '[]') return [];
      return repo.unitsOf(x);
    },
    [repo],
  );

  /// `itmFetchData()`
  const fetchAll = useCallback(async (): Promise<{
    readonly items: Item[];
    readonly cats: Category[];
    readonly ledger: Record<string, number>;
  }> => {
    if (!db || !repo) return { items: [], cats: [], ledger: {} };
    const [nextItems, nextCats, nextLedger] = await Promise.all([
      repo.items(),
      repo.categories(),
      new MovementsRepo(db).balances(),
    ]);
    if (!mountedRef.current) {
      return { items: nextItems, cats: nextCats, ledger: nextLedger };
    }
    setItems(nextItems);
    setCats(nextCats);
    setLedger(nextLedger);
    setLoading(false);
    return { items: nextItems, cats: nextCats, ledger: nextLedger };
  }, [db, repo]);

  const initForm = useCallback(
    (allItems: readonly Item[], targetEditId: string | null) => {
      const cur =
        targetEditId === null
          ? null
          : (allItems.find((x) => x.id === targetEditId) ?? null);
      let next = 1;
      const nums = allItems
        .map((x) => {
          const m = /\d+/.exec(x.code);
          return m ? Number.parseInt(m[0], 10) : 0;
        })
        .filter((n) => Number.isFinite(n) && n > 0);
      if (nums.length > 0) next = Math.max(...nums) + 1;

      imdSetText(iCodeCtrl, cur?.code ?? `${next}`);
      imdSetText(iBCCtrl, cur?.barcode ?? '');
      imdSetText(iNameCtrl, cur?.name ?? '');
      const minOn = cur !== null && cur.minQty !== 0;
      setIMinOn(minOn);
      imdSetText(iMinCtrl, minOn ? fmtNum(cur!.minQty) : '');
      setICat(cur?.categoryId ?? '');
      setIRef(cur?.isRefillable ?? false);
      setIReportUnit(cur?.reportUnit ?? '');
      setIAsset(cur?.isAsset ?? false);
      setIAssetType(cur?.assetType ?? '');
      imdSetText(
        iLifeCtrl,
        (cur?.lifespanMonths ?? 0) > 0 ? `${cur!.lifespanMonths}` : '',
      );
      imdSetText(
        iValueCtrl,
        (cur?.unitValue ?? 0) > 0 ? fmtNum(cur!.unitValue) : '',
      );

      if (repo) {
        void new AssetRegisterRepo(repo.db).allTypes().then((t) => {
          if (mountedRef.current) setAssetTypes(t);
        });
      }

      for (const r of uRowsRef.current) {
        r.dispose();
      }
      const nextRows: UnitRow[] = [];
      if (cur !== null) {
        for (const u of unitsRaw(cur)) {
          nextRows.push(new UnitRow(u.name, u.factor, u.isBase));
        }
      }
      if (nextRows.length === 0) {
        nextRows.push(new UnitRow('قطعة', 1, true));
      }
      uRowsRef.current = nextRows;
      setURows(nextRows);
    },
    [iBCCtrl, iCodeCtrl, iLifeCtrl, iMinCtrl, iNameCtrl, iValueCtrl, repo, unitsRaw],
  );

  /// `itmLoadMovs(id)`
  const loadMovs = useCallback(
    async (id: string) => {
      setMovsId(id);
      if (id.length === 0) {
        setMovOut(<ImdLd text="اختر صنفًا" center={true} colors={c} />);
        return;
      }
      if (!moves) return;
      setMovOut(<ImdLd text="جارٍ التحميل…" center={true} colors={c} />);
      const rcRaw = await moves.receiptsOfItem(id);
      const issRaw = await moves.issuesOfItem(id);
      const rc = rcRaw
        .filter((r) => r.status !== 'DRAFT')
        .map((r) => ({
          t: 'in' as const,
          at: r.createdAt,
          date: r.date,
          side: r.supplier.length > 0 ? r.supplier : r.warehouse,
          qty: r.qty,
          unit: r.unitName,
          ref: r.refNo,
          notes: r.notes,
        }));
      const iss = issRaw
        .filter((r) => r.status !== 'DRAFT')
        .map((r) => ({
          t: 'out' as const,
          at: r.createdAt,
          date: r.date,
          side:
            r.recipientDisplay.length > 0
              ? r.recipientDisplay
              : r.beneficiaryUnitName.length > 0
                ? r.beneficiaryUnitName
                : r.unitName,
          qty: r.qty,
          unit: r.unitName,
          ref: r.refNo,
          notes: r.notes,
        }));
      const movs = [...rc, ...iss].sort(
        (a, b) => b.at.getTime() - a.at.getTime(),
      );
      if (!mountedRef.current) return;
      if (movs.length === 0) {
        setMovOut(
          <ImdLd text="لا حركات بعد لهذا الصنف" center={true} colors={c} />,
        );
        return;
      }
      setMovOut(
        <ImdTable
          minWidth={560}
          cards={true}
          pageSize={50}
          colors={c}
          columns={[
            new ImdCol('التاريخ'),
            new ImdCol('النوع'),
            new ImdCol('الجهة', { flex: 2 }),
            new ImdCol('الكمية'),
            new ImdCol('مرجع'),
            new ImdCol('ملاحظات', { flex: 2 }),
          ]}
          rows={movs.slice(0, 100).map((m) => [
            <span key="date">{arDate(m.at)}</span>,
            m.t === 'in' ? (
              <ImdChip key="t" label="وارد 🟢" tone={ImdTone.ok} colors={c} />
            ) : (
              <ImdChip key="t" label="صرف 🔴" tone={ImdTone.pend} colors={c} />
            ),
            <span key="side">{m.side.length === 0 ? '—' : m.side}</span>,
            <span key="qty">
              <span className="font-semibold">{nf(m.qty)}</span>
              {` ${m.unit}`}
            </span>,
            <span key="ref">{m.ref.length === 0 ? '—' : m.ref}</span>,
            <span key="notes">{m.notes}</span>,
          ])}
        />,
      );
    },
    [c, moves],
  );

  const switchTab = useCallback(
    (
      nextTab: string,
      opts: {
        readonly nextEditId?: string | null;
        readonly nextItems?: readonly Item[];
      } = {},
    ) => {
      const targetEditId =
        opts.nextEditId !== undefined ? opts.nextEditId : editIdRef.current;
      const targetItems = opts.nextItems ?? items;
      setTab(nextTab);
      if (nextTab === 'form') {
        initForm(targetItems, targetEditId);
      }
      if (nextTab === 'list' || nextTab === 'cats' || nextTab === 'bc') {
        void fetchAll();
      }
      if (
        nextTab === 'movs' &&
        movsId.length > 0 &&
        targetItems.some((x) => x.id === movsId)
      ) {
        void loadMovs(movsId);
      }
    },
    [fetchAll, initForm, items, loadMovs, movsId],
  );

  const cur = useMemo(
    () =>
      editId === null ? null : (items.find((x) => x.id === editId) ?? null),
    [editId, items],
  );

  const save = useCallback(async () => {
    if (!repo) return;
    const currentEditId = editIdRef.current;
    const curItem =
      currentEditId === null
        ? null
        : (items.find((x) => x.id === currentEditId) ?? null);
    if (!perm.guard('items', curItem !== null ? 'edit' : 'create')) return;
    const name = iNameCtrl.text.trim();
    const code = iCodeCtrl.text.trim();
    if (name.length === 0) {
      showImdToast('✖ أدخل اسم الصنف');
      return;
    }
    if (code.length === 0) {
      showImdToast('✖ أدخل كود الصنف');
      return;
    }
    const us: ItemUnit[] = [];
    for (const r of uRowsRef.current) {
      const nm = r.name.text.trim();
      const rawFc = r.factor.text.trim();
      const fc = rawFc.length > 0 ? Number(rawFc) : NaN;
      if (nm.length > 0) {
        us.push(
          new ItemUnit({
            name: nm,
            factor: !Number.isFinite(fc) || fc === 0 ? 1 : fc,
            isBase: r.base,
          }),
        );
      }
    }
    if (us.length === 0) {
      showImdToast('✖ أضف وحدة قياس واحدة على الأقل');
      return;
    }
    if (!us.some((u) => u.isBase)) {
      us[0] = new ItemUnit({ name: us[0].name, factor: us[0].factor, isBase: true });
    }
    const dup = await repo.itemByCode(code);
    if (!mountedRef.current) return;
    if (dup !== null && dup.id !== currentEditId) {
      showImdToast('✖ الكود مستخدم لصنف آخر');
      return;
    }
    setSaving(true);
    try {
      const cat = cats.find((x) => x.id === iCat) ?? null;
      const rawMin = iMinCtrl.text.trim();
      const parsedMin = rawMin.length > 0 ? Number(rawMin) : NaN;
      const rawLife = iLifeCtrl.text.trim();
      const parsedLife = /^-?\d+$/.test(rawLife) ? Number.parseInt(rawLife, 10) : NaN;
      const rawVal = iValueCtrl.text.trim().replaceAll(',', '');
      const parsedVal = rawVal.length > 0 ? Number(rawVal) : NaN;

      await repo.saveItem({
        id: curItem?.id,
        code,
        name,
        barcode: iBCCtrl.text.trim(),
        categoryId: iCat,
        categoryName: cat?.name ?? '',
        minQty: iMinOn ? (Number.isFinite(parsedMin) ? parsedMin : 0) : 0,
        isRefillable: iRef,
        reportUnit: iReportUnit,
        isAsset: iAsset,
        assetType: iAsset
          ? iAssetType.length === 0
            ? AssetType.equipment
            : iAssetType
          : '',
        lifespanMonths: iAsset ? (Number.isFinite(parsedLife) ? parsedLife : 0) : 0,
        unitValue: iAsset ? (Number.isFinite(parsedVal) ? parsedVal : 0) : 0,
        units: us,
        baseUnit: (us.find((u) => u.isBase) ?? us[0]).name,
      });
      if (!mountedRef.current) return;
      showImdToast(
        curItem !== null ? '✔ تم حفظ التعديلات' : '🎉 تم حفظ الصنف بنجاح',
      );
      editIdRef.current = null;
      setEditId(null);
      const data = await fetchAll();
      if (!mountedRef.current) return;
      switchTab('list', { nextEditId: null, nextItems: data.items });
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [
    cats,
    fetchAll,
    iAsset,
    iAssetType,
    iBCCtrl,
    iCat,
    iCodeCtrl,
    iLifeCtrl,
    iMinCtrl,
    iMinOn,
    iNameCtrl,
    iRef,
    iReportUnit,
    iValueCtrl,
    items,
    perm,
    repo,
    switchTab,
  ]);

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    mountedRef.current = true;
    // Ctrl+S وF5 وCtrl+P لهذه الصفحة (CLAUDE.md §8 البند 24): تُسجَّل في خانة الصفحة
    // فلا تعمل إلا وهي الظاهرة.
    screenActions?.register({
      onSave: () => {
        if (mountedRef.current && tabRef.current === 'form') {
          void saveRef.current();
        }
      },
    });
    void fetchAll().then((data) => {
      if (!mountedRef.current) return;
      // الأصناف ذات الباركود محددة مبدئيًا.
      setBcChecked((prev) => {
        if (prev.size > 0) return prev;
        return new Set(
          data.items.filter((x) => x.barcode.length > 0).map((x) => x.id),
        );
      });
    });
    return () => {
      mountedRef.current = false;
      screenActions?.clear();
      for (const r of uRowsRef.current) {
        r.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, screenActions]);

  const w = perm.writable('items');
  /// صلاحية الحذف وحدها: [Perm.writable] يصدق بالإضافة أو التعديل أو الاعتماد،
  /// فكان زرُّ الحذف يظهر لمن لا يملك الحذف.
  const canDel = perm.canDelete('items');

  const deleteItem = async (x: Item) => {
    if (!repo) return;
    if (!perm.guard('items', PermAction.delete)) return;
    if (
      !(await imdConfirm('حذف هذا الصنف نهائيًا؟ لا يمكن التراجع.', {
        ok: 'حذف',
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await repo.deleteItem(x.id);
      if (!mountedRef.current) return;
      showImdToast('✔ تم الحذف');
      await fetchAll();
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  };

  const exportList = async (rows: readonly Item[]) => {
    if (!perm.guard('items', 'export')) return;
    await ImdExcel.save(
      `الأصناف ${ImdFiles.today()}`,
      ['الكود', 'اسم الصنف', 'التصنيف', 'حد ⚠', 'الرصيد', 'الوحدات'],
      rows.map((x) => {
        const us = unitsRaw(x);
        return [
          x.code,
          x.name,
          x.categoryName.length === 0 ? '—' : x.categoryName,
          x.minQty !== 0 ? nf(x.minQty) : '—',
          nf(qtyOf(x)),
          us.length === 0
            ? '—'
            : us
                .map((u) => u.name + (u.isBase ? ' (أساسية)' : ''))
                .join(' · '),
        ];
      }),
    );
  };

  const addCat = async () => {
    if (!repo) return;
    const name = cNameCtrl.text.trim();
    if (name.length === 0) {
      showImdToast('✖ اكتب اسم التصنيف');
      return;
    }
    try {
      await repo.saveCategory({ name, description: cDescCtrl.text.trim() });
      imdSetText(cNameCtrl, '');
      imdSetText(cDescCtrl, '');
      if (!mountedRef.current) return;
      showImdToast('✔ أُضيف التصنيف');
      await fetchAll();
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  };

  const deleteCat = async (cat: Category) => {
    if (!repo) return;
    if (!perm.guard('items', PermAction.delete)) return;
    if (
      !(await imdConfirm(
        'حذف التصنيف؟ الأصناف المرتبطة به تحتفظ بالاسم القديم.',
        { ok: 'حذف', danger: true },
      ))
    ) {
      return;
    }
    await repo.deleteCategory(cat.id);
    if (!mountedRef.current) return;
    showImdToast('✔ حُذف التصنيف');
    await fetchAll();
  };

  /// `itmCalcBal(id)` — من الاستلام والصرف غير المسودة، بمعامل وحدة السطر.
  const calcBal = async (id: string) => {
    if (id.length === 0) {
      setBalOut(<ImdLd text="اختر صنفًا" center={true} colors={c} />);
      return;
    }
    if (!moves) return;
    setBalOut(<ImdLd text="جارٍ الحساب…" center={true} colors={c} />);
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const rc = (await moves.receiptsOfItem(id)).filter((r) => r.status !== 'DRAFT');
    const iss = (await moves.issuesOfItem(id)).filter((r) => r.status !== 'DRAFT');
    const units = unitsRaw(it);
    const fac = (u: string): number => {
      const f = units.find((y) => y.name === u);
      return f === undefined ? 1 : f.factor === 0 ? 1 : f.factor;
    };

    let tin = 0;
    let tout = 0;
    let nin = 0;
    let nout = 0;
    for (const r of rc) {
      tin += r.qty * fac(r.unitName);
      nin++;
    }
    for (const r of iss) {
      tout += r.qty * fac(r.unitName);
      nout++;
    }
    const bal = tin - tout;
    const min = it.minQty;
    const base =
      it.baseUnit.length > 0
        ? it.baseUnit
        : (units.find((u) => u.isBase)?.name ?? 'وحدة الأساس');
    const r2 = (v: number): number => {
      const n = Math.round(v * 100) / 100;
      return n === 0 ? 0 : n;
    };
    if (!mountedRef.current) return;
    setBalOut(
      <div className="flex flex-col items-stretch">
        <ImdKpis colors={c}>
          <ImdKpi
            label={`إجمالي الوارد (${nf(nin)} حركة)`}
            value={nf(r2(tin))}
            color={c.accent}
            colors={c}
          />
          <ImdKpi
            label={`إجمالي المنصرف (${nf(nout)} حركة)`}
            value={nf(r2(tout))}
            color={c.danger}
            colors={c}
          />
          <ImdKpi
            label={`الرصيد الحالي — ${base}`}
            value={nf(r2(bal))}
            colors={c}
            extra={
              bal <= 0 ? (
                <ImdChip label="فارغ ❌" tone={ImdTone.off} colors={c} />
              ) : StockAlerts.isLow(bal, min) ? (
                <ImdChip label="تحت الحد ⚠️" tone={ImdTone.pend} colors={c} />
              ) : (
                <ImdChip label="جيد ✅" tone={ImdTone.ok} colors={c} />
              )
            }
          />
          <ImdKpi
            label="حد التنبيه ⚠"
            value={min !== 0 ? nf(min) : '—'}
            colors={c}
          />
        </ImdKpis>
        {nin === 0 && nout === 0 && (
          <ImdLd
            text="لا حركات بعد — استخدم شاشة «استلام بضاعة» لإضافة أول رصيد"
            colors={c}
          />
        )}
      </div>,
    );
  };

  /// زر «توليد» في بطاقة الصنف: يملأ الحقل بباركود نظامي غير مكرر (لا يحفظ).
  const genOne = async () => {
    if (!repo) return;
    try {
      const bc = await repo.newItemBarcode();
      if (mountedRef.current) imdSetText(iBCCtrl, bc);
    } catch (e) {
      if (mountedRef.current) {
        const msg = e instanceof Error ? e.message : String(e);
        showImdToast(`✖ ${msg}`, { error: true });
      }
    }
  };

  /// `itmGenMissing()`
  const genMissing = async () => {
    if (!repo) return;
    const miss = items.filter((x) => x.barcode.length === 0);
    if (miss.length === 0) {
      showImdToast('✔ جميع الأصناف لديها باركود');
      return;
    }
    if (!(await imdConfirm(`توليد باركود نظامي لـ ${miss.length} صنف؟`))) {
      return;
    }
    let n = 0;
    const gen = await repo.barcodeGenerator();
    for (const x of miss) {
      try {
        await repo.setItemBarcode(x.id, await repo.newItemBarcode({ generator: gen }));
        n++;
      } catch (err) {
        ErrorLogger.log(
          'items.barcodeGenerate',
          err,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
    if (!mountedRef.current) return;
    showImdToast(`✔ ولّد باركود لـ ${n} صنف`);
    const data = await fetchAll();
    if (!mountedRef.current) return;
    // الأصناف ذات الباركود محددة افتراضيًا.
    setBcChecked((prev) => {
      const next = new Set(prev);
      for (const x of data.items) {
        if (x.barcode.length > 0) next.add(x.id);
      }
      return next;
    });
  };

  /// `itmPrintLabels()`
  const printLabels = async () => {
    if (!perm.guard('items', 'print')) return;
    const sel = items.filter((x) => x.barcode.length > 0 && bcChecked.has(x.id));
    if (sel.length === 0) {
      showImdToast('⚠ حدد صنوفًا لها باركود');
      return;
    }
    const rawCopies = Number.parseInt(bcCopiesCtrl.text.trim(), 10);
    const copies = Math.min(50, Math.max(1, Number.isFinite(rawCopies) ? rawCopies : 1));
    showImdToast('💡 على الجوال: اختر «حفظ كملف PDF» ثم شاركه مع الطابعة');
    const labels: BarcodeLabelEntry[] = [];
    for (const x of sel) {
      for (let i = 0; i < copies; i++) {
        labels.push({ name: x.name, code: x.code, barcode: x.barcode });
      }
    }
    await showImdModal({
      title: 'معاينة الملصقات وطباعتها',
      icon: 'printer',
      maxWidth: 680,
      colors: c,
      builder: (modalCtx) => (
        <BarcodeLabelsSheet labels={labels} onClose={() => modalCtx.close()} />
      ),
    });
  };

  const searchDeco = imdFieldDecoration({
    hint: 'بحث بالكود أو الاسم أو الباركود…',
    colors: c,
  });
  const shadows = imdShadow(c);

  const renderUnitsStr = (x: Item): ReactNode => {
    const us = unitsRaw(x);
    if (us.length === 0) {
      return <span style={{ color: c.faint.css }}>—</span>;
    }
    return (
      <span>
        {us
          .map((u) => u.name + (u.isBase ? ' (أساسية)' : ''))
          .join(' · ')}
      </span>
    );
  };

  const renderItemSelect = (
    value: string,
    onChanged: (v: string) => void,
  ): ReactNode => (
    <ImdSelect<string>
      value={value}
      items={[
        ['', '— اختر الصنف —'],
        ...items.map(
          (x): readonly [string, string] => [x.id, `${x.code} — ${x.name}`],
        ),
      ]}
      colors={c}
      onChanged={(v) => onChanged(v ?? '')}
    />
  );

  // ───────────────────────── القائمة ─────────────────────────
  const renderList = () => {
    const lowN = items.filter((x) => StockAlerts.isLow(qtyOf(x), x.minQty)).length;
    const q = searchText.trim().toLowerCase();
    const rows = items.filter(
      (x) =>
        q.length === 0 ||
        x.code.toLowerCase().includes(q) ||
        x.name.toLowerCase().includes(q) ||
        x.barcode.includes(q),
    );
    return (
      <div className="flex flex-col items-stretch">
        {/* .lst-bar */}
        <div className="flex items-center pb-[10px]">
          <div className="min-w-0 flex-1" style={searchDeco.containerStyle(false)}>
            <input
              type="text"
              value={searchText}
              placeholder="بحث بالكود أو الاسم أو الباركود…"
              onChange={(e) => {
                const v = e.target.value;
                imdSetText(searchCtrl, v);
                setSearchText(v);
              }}
              className="w-full bg-transparent placeholder:text-[color:var(--imd-faint)]"
              style={{
                ...searchDeco.inputStyle,
                fontSize: 14,
                color: c.text.css,
              }}
            />
          </div>
          <div style={{ width: 6, flexShrink: 0 }} />
          <ImdScanButton
            controller={searchCtrl}
            colors={c}
            onScanned={(v) => setSearchText(v)}
          />
          <div style={{ width: 8, flexShrink: 0 }} />
          <ImdButtonOutline
            label="تحديث"
            icon="refresh"
            small={true}
            colors={c}
            onPressed={() => {
              void fetchAll();
            }}
          />
        </div>

        <ImdChipsRow>
          <ImdChip
            label={`الأصناف: ${nf(items.length)}`}
            tone={ImdTone.ok}
            colors={c}
          />
          <ImdChip
            label={`التصنيفات: ${nf(cats.length)}`}
            tone={ImdTone.code}
            colors={c}
          />
          <ImdChip
            label={`تحت الحد: ${nf(lowN)}`}
            tone={ImdTone.pend}
            icon="alert"
            colors={c}
          />
          {!w && (
            <ImdChip
              label="عرض فقط — التعديل للمدير"
              tone={ImdTone.off}
              icon="eye"
              colors={c}
            />
          )}
        </ImdChipsRow>

        <ImdTableToolbar
          page="items"
          colors={c}
          onExport={() => {
            void exportList(rows);
          }}
        />

        <ImdTable
          minWidth={720}
          cards={true}
          empty="لا أصناف مطابقة — أضف أول صنف من تبويب «بطاقة الصنف»"
          pageSize={50}
          maxHeight={ImdSizes.tableMaxHeight()}
          colors={c}
          columns={[
            new ImdCol('الكود'),
            new ImdCol('اسم الصنف', { flex: 2 }),
            new ImdCol('التصنيف'),
            new ImdCol('حد ⚠'),
            new ImdCol('الرصيد'),
            new ImdCol('الوحدات', { flex: 2 }),
            ...(w ? [new ImdCol('', { width: 110 })] : []),
          ]}
          // كليك يمين / ضغطة مطوّلة: نفس إجراءي عمود الأزرار.
          rowMenu={
            !w
              ? null
              : (i): ImdMenuItem[] => [
                  {
                    label: 'تعديل',
                    icon: 'edit',
                    onTap: () => {
                      editIdRef.current = rows[i].id;
                      setEditId(rows[i].id);
                      switchTab('form', { nextEditId: rows[i].id });
                    },
                  },
                  ...(canDel
                    ? [
                        {
                          label: 'حذف',
                          icon: 'trash',
                          danger: true,
                          onTap: () => {
                            void deleteItem(rows[i]);
                          },
                        },
                      ]
                    : []),
                ]
          }
          // قيم الخلايا الخام: تصفية الأعمدة والتجميع (مثلًا حسب التصنيف).
          values={rows.map((x) => [
            x.code,
            x.name,
            x.categoryName.length === 0 ? '—' : x.categoryName,
            x.minQty !== 0 ? nf(x.minQty) : '—',
            nf(qtyOf(x)),
          ])}
          rows={rows.map((x) => [
            <span key="code" className="font-semibold">
              {x.code}
            </span>,
            <span key="name">{x.name}</span>,
            <span key="cat">
              {x.categoryName.length === 0 ? '—' : x.categoryName}
            </span>,
            <span key="min">{x.minQty !== 0 ? nf(x.minQty) : '—'}</span>,
            <span
              key="qty"
              className="font-black"
              style={{
                color: StockAlerts.isLow(qtyOf(x), x.minQty)
                  ? c.danger.css
                  : c.text.css,
              }}
            >
              {nf(qtyOf(x))}
            </span>,
            <span key="units">{renderUnitsStr(x)}</span>,
            ...(w
              ? [
                  <div key="acts" className="inline-flex items-center gap-1">
                    <ImdIconButton
                      icon="edit"
                      tooltip="تعديل"
                      colors={c}
                      onPressed={() => {
                        editIdRef.current = x.id;
                        setEditId(x.id);
                        switchTab('form', { nextEditId: x.id });
                      }}
                    />
                    {canDel && (
                      <ImdIconButton
                        icon="trash"
                        tooltip="حذف"
                        kind={ImdBtnKind.danger}
                        colors={c}
                        onPressed={() => {
                          void deleteItem(x);
                        }}
                      />
                    )}
                  </div>,
                ]
              : []),
          ])}
        />
      </div>
    );
  };

  // ───────────────────────── التصنيفات ─────────────────────────
  const renderCatsView = () => (
    <div className="flex flex-col items-stretch">
      <ImdICard title="إضافة تصنيف رئيسي" icon="plus" colors={c}>
        <div className="flex flex-col items-stretch">
          <ImdF2>
            <ImdFld
              controller={cNameCtrl}
              hint="اسم التصنيف (مثال: مواد غذائية)"
              colors={c}
            />
            <ImdFld
              controller={cDescCtrl}
              hint="وصف / ملاحظات (اختياري)"
              colors={c}
            />
          </ImdF2>
          {w ? (
            <div className="flex justify-start pt-[10px]">
              <ImdButton
                label="إضافة التصنيف +"
                colors={c}
                onPressed={() => {
                  void addCat();
                }}
              />
            </div>
          ) : (
            <div style={{ paddingBlock: 8 }}>
              <ImdLdText text="👁 عرض فقط — الإضافة للمدير" colors={c} />
            </div>
          )}
        </div>
      </ImdICard>

      <ImdICard title="التصنيفات المسجلة" icon="folder" colors={c}>
        <ImdTable
          cards={true}
          empty="لا تصنيفات بعد"
          colors={c}
          columns={[
            new ImdCol('م', { width: 60 }),
            new ImdCol('الاسم', { flex: 2 }),
            new ImdCol('الوصف', { flex: 3 }),
            // عمودٌ لا يحمل غير زرِّ الحذف: يتبع صلاحية الحذف نفسها، فلا
            // يبقى ترويسةً بلا خلية (فيختلف عدد الخلايا عن عدد الأعمدة).
            ...(canDel ? [new ImdCol('', { width: 110 })] : []),
          ]}
          rows={cats.map((cat, i) => [
            <span key="idx">{nf(i + 1)}</span>,
            <span key="name" className="font-semibold">
              {cat.name}
            </span>,
            <span key="desc">
              {cat.description.length === 0 ? '—' : cat.description}
            </span>,
            ...(canDel
              ? [
                  <ImdButton
                    key="del"
                    label="حذف"
                    icon="trash"
                    kind={ImdBtnKind.danger}
                    small={true}
                    colors={c}
                    onPressed={() => {
                      void deleteCat(cat);
                    }}
                  />,
                ]
              : []),
          ])}
        />
      </ImdICard>
    </div>
  );

  // ───────────────────────── بطاقة الصنف ─────────────────────────
  const renderUnitRow = (r: UnitRow) => (
    <div key={r.key} className="flex items-center gap-2 pb-2">
      <div className="min-w-0 flex-[14]">
        <ImdFld
          controller={r.name}
          hint="اسم الوحدة (مثال: كرتون)"
          dense={true}
          colors={c}
          onChanged={() => setURowsVersion((v) => v + 1)}
        />
      </div>
      <div className="min-w-0 flex-[7]">
        <ImdFld
          controller={r.factor}
          hint="المعامل ×"
          number={true}
          dense={true}
          colors={c}
        />
      </div>
      <label className="inline-flex shrink-0 cursor-pointer items-center gap-1">
        <input
          type="radio"
          name="imd-item-base-unit"
          checked={r.base}
          onChange={() => {
            for (const x of uRowsRef.current) {
              x.base = x === r;
            }
            setURows([...uRowsRef.current]);
          }}
          style={{ width: 20, height: 20, accentColor: c.accent.css }}
        />
        <span
          className="text-[12px] font-bold"
          style={{ color: c.text.css }}
        >
          أساسية
        </span>
      </label>
      <ImdIconButton
        icon="x"
        tooltip="حذف السطر"
        kind={ImdBtnKind.danger}
        colors={c}
        onPressed={() => {
          const next = uRowsRef.current.filter((x) => x !== r);
          r.dispose();
          uRowsRef.current = next;
          setURows(next);
        }}
      />
    </div>
  );

  const renderForm = () => {
    const mergedAssetTypes = Array.from(
      new Set([
        ...assetTypes,
        ...(iAssetType.length > 0 ? [iAssetType] : []),
      ]),
    );
    const reportUnitOptions: readonly (readonly [string, string])[] = [
      ['', '— الوحدة الأساسية —'],
      ...uRows
        .map((r) => r.name.text.trim())
        .filter((nm) => nm.length > 0)
        .map((nm): readonly [string, string] => [nm, nm]),
    ];

    return (
      <div className="flex flex-col items-stretch">
        <ImdICard
          title={
            cur !== null
              ? `وضع التعديل: ${cur.code} — ${cur.name}`
              : 'وضع الإضافة: تسجيل صنف جديد'
          }
          icon={cur !== null ? 'edit' : 'plus-square'}
          titleColor={c.warn}
          colors={c}
        >
          <div className="flex flex-col items-stretch">
            <ImdF2>
              <ImdLabeled label="الكود (فريد) *" colors={c}>
                <ImdFld
                  controller={iCodeCtrl}
                  readOnly={cur !== null}
                  colors={c}
                />
              </ImdLabeled>
              <ImdLabeled label="الباركود" colors={c}>
                <div className="flex items-center gap-[6px]">
                  <div className="min-w-0 flex-1">
                    <ImdFld controller={iBCCtrl} colors={c} />
                  </div>
                  <ImdScanButton controller={iBCCtrl} colors={c} />
                  <ImdButtonOutline
                    label="توليد"
                    icon="settings"
                    small={true}
                    colors={c}
                    onPressed={() => {
                      void genOne();
                    }}
                  />
                </div>
              </ImdLabeled>
            </ImdF2>
            <div style={{ height: 10 }} />
            <ImdLabeled label="اسم الصنف (شجرة المواد) *" colors={c}>
              <ImdFld controller={iNameCtrl} colors={c} />
            </ImdLabeled>
            <div style={{ height: 10 }} />
            <ImdF2>
              <ImdLabeled label="التصنيف الرئيسي" colors={c}>
                <ImdSelect<string>
                  value={iCat}
                  items={[
                    ['', '— بدون تصنيف —'],
                    ...cats.map(
                      (cat): readonly [string, string] => [cat.id, cat.name],
                    ),
                  ]}
                  colors={c}
                  onChanged={(v) => setICat(v ?? '')}
                />
              </ImdLabeled>
              <ImdLabeled label="الحد الأدنى للتنبيه ⚠" colors={c}>
                <div className="flex flex-col items-stretch">
                  <ImdCheckbox
                    value={iMinOn}
                    label="تعيين حد عام لهذا الصنف"
                    colors={c}
                    onChanged={(v) => {
                      setIMinOn(v);
                      if (!v) imdSetText(iMinCtrl, '');
                    }}
                  />
                  {iMinOn ? (
                    <div style={{ paddingTop: 6 }}>
                      <ImdFld
                        controller={iMinCtrl}
                        number={true}
                        colors={c}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        paddingTop: 4,
                        fontSize: 11.5,
                        color: c.muted.css,
                        lineHeight: 1.5,
                      }}
                    >
                      بلا حد عام — تُضبط الحدود لكل مستودع من «المستودعات ← لوحة المستودعات»، فينبّه كلٌّ على نقصه.
                    </div>
                  )}
                </div>
              </ImdLabeled>
              {/* الرصيد يُخزَّن بالوحدة الأساسية دائمًا؛ هذه للعرض فقط في التقارير وفي رصيد شاشات الإدخال. */}
              <ImdLabeled label="وحدة العرض في التقارير" colors={c}>
                <ImdSelect<string>
                  value={iReportUnit}
                  items={reportUnitOptions}
                  colors={c}
                  onChanged={(v) => setIReportUnit(v ?? '')}
                />
              </ImdLabeled>
            </ImdF2>
            <div style={{ height: 12 }} />
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={iRef}
                onChange={(e) => setIRef(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: c.accent.css }}
              />
              <span
                className="text-[13px] font-bold"
                style={{ color: c.text.css }}
              >
                صنف قابل للتعبئة/الاستبدال (كالغاز)
              </span>
            </label>
            <div style={{ height: 10 }} />
            <ImdCheckbox
              value={iAsset}
              label="أصل ثابت (يُتابَع في سجل الأصول بعُهده لدى الوحدات والمطابخ والأفران)"
              colors={c}
              onChanged={(v) => {
                setIAsset(v);
                if (v && iAssetType.length === 0) {
                  setIAssetType(AssetType.equipment);
                }
              }}
            />
            {iAsset && (
              <>
                <div style={{ height: 8 }} />
                <ImdGrid columns={3} minItemWidth={170} gap={10}>
                  <ImdLabeled label="نوع الأصل" colors={c}>
                    <ImdSelect<string>
                      value={iAssetType}
                      items={mergedAssetTypes.map(
                        (t): readonly [string, string] => [t, AssetType.label(t)],
                      )}
                      colors={c}
                      onChanged={(v) =>
                        setIAssetType(v ?? AssetType.equipment)
                      }
                    />
                  </ImdLabeled>
                  <ImdLabeled label="العمر الافتراضي (أشهر)" colors={c}>
                    <ImdFld
                      controller={iLifeCtrl}
                      number={true}
                      hint="مثال: 60"
                      colors={c}
                    />
                  </ImdLabeled>
                  <ImdLabeled label="القيمة الدفترية للوحدة الأساسية" colors={c}>
                    <ImdFld
                      controller={iValueCtrl}
                      number={true}
                      hint="0"
                      colors={c}
                    />
                  </ImdLabeled>
                </ImdGrid>
              </>
            )}
          </div>
        </ImdICard>

        <ImdICard title="وحدات القياس ومعاملات التحويل" icon="scale" colors={c}>
          <div className="flex flex-col items-stretch">
            <div className="pb-2 text-[12px]" style={{ color: c.muted.css }}>
              المعامل = كم وحدة أساسية تساوي هذه الوحدة (كرتون ×12 = 12 قطعة)
            </div>
            {uRows.map((r) => renderUnitRow(r))}
            <div className="flex justify-start">
              <ImdButtonOutline
                label="+ إضافة وحدة"
                small={true}
                colors={c}
                onPressed={() => {
                  const next = [...uRowsRef.current, new UnitRow('', 1, false)];
                  uRowsRef.current = next;
                  setURows(next);
                }}
              />
            </div>
          </div>
        </ImdICard>

        <div className="flex items-center gap-[10px] pb-5">
          <div className="min-w-0 flex-1">
            <ImdButtonOutline
              label="إلغاء / مسح"
              expand={true}
              colors={c}
              onPressed={() => {
                editIdRef.current = null;
                setEditId(null);
                initForm(items, null);
              }}
            />
          </div>
          <div className="min-w-0 flex-[2]">
            {w ? (
              <ImdButton
                label={cur !== null ? 'حفظ التعديلات' : 'حفظ بطاقة الصنف'}
                icon="save"
                expand={true}
                busy={saving}
                colors={c}
                onPressed={() => {
                  void save();
                }}
              />
            ) : (
              <ImdButton
                label="عرض فقط — الإضافة للمدير"
                icon="eye"
                expand={true}
                colors={c}
                onPressed={null}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // ───────────────────────── الأرصدة ─────────────────────────
  const renderBals = () => (
    <ImdICard title="أرصدة الصنف (بوحدة الأساس)" icon="chart" colors={c}>
      <div className="flex flex-col items-stretch">
        {renderItemSelect(balId, (v) => {
          setBalId(v);
          void calcBal(v);
        })}
        <div style={{ height: 14 }} />
        {balOut ?? (
          <ImdLd
            text={items.length > 0 ? 'اختر صنفًا لعرض رصيده' : 'لا أصناف بعد'}
            center={true}
            colors={c}
          />
        )}
      </div>
    </ImdICard>
  );

  // ───────────────────────── حركة الصنف ─────────────────────────
  const renderMovs = () => (
    <ImdICard title="كارت الصنف (سجل الحركة الكامل)" icon="repeat" colors={c}>
      <div className="flex flex-col items-stretch">
        {renderItemSelect(movsId, (v) => {
          void loadMovs(v);
        })}
        <div style={{ height: 14 }} />
        {movOut ?? (
          <ImdLd text="اختر صنفًا لعرض حركته" center={true} colors={c} />
        )}
      </div>
    </ImdICard>
  );

  // ───────────────────────── الباركودات ─────────────────────────
  const renderBcRow = (x: Item) => {
    const has = x.barcode.length > 0;
    return (
      <div
        key={x.id}
        className="mb-2 flex items-center p-[10px]"
        style={{
          backgroundColor: c.surface.css,
          border: `1px solid ${c.line.css}`,
          borderRadius: ImdSizes.radius,
          boxShadow:
            shadows.length > 0 ? shadows.map((s) => s.css).join(', ') : undefined,
        }}
      >
        <input
          type="checkbox"
          aria-label={`تحديد باركود ${x.name}`}
          checked={has && bcChecked.has(x.id)}
          disabled={!has}
          onChange={(e) => {
            const checked = e.target.checked;
            setBcChecked((prev) => {
              const next = new Set(prev);
              if (checked) next.add(x.id);
              else next.delete(x.id);
              return next;
            });
          }}
          style={{ width: 20, height: 20, accentColor: c.accent.css, flexShrink: 0 }}
        />
        <div style={{ width: 10, flexShrink: 0 }} />
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <div
            className="text-[14px] font-semibold"
            style={{ color: c.text.css }}
          >
            {`${x.code} — ${x.name}`}
          </div>
          <div style={{ height: 4 }} />
          {has ? (
            <Barcode128View value={x.barcode} />
          ) : (
            <ImdChip label="⚠️ بدون باركود" tone={ImdTone.pend} colors={c} />
          )}
        </div>
        {has && (
          <>
            <div style={{ width: 10, flexShrink: 0 }} />
            <ImdButtonOutline
              label="نسخ"
              icon="clipboard"
              small={true}
              colors={c}
              onPressed={() => {
                void (async () => {
                  try {
                    await navigator.clipboard?.writeText(x.barcode);
                  } catch {
                    // قد يرفض المتصفح النسخ في سياق غير آمن
                  }
                  if (mountedRef.current) {
                    showImdToast(`📋 نُسخ: ${x.barcode}`);
                  }
                })();
              }}
            />
          </>
        )}
      </div>
    );
  };

  const renderBc = () => {
    const withBc = items.filter((x) => x.barcode.length > 0).length;
    return (
      <div className="flex flex-col items-stretch">
        <ImdICard title="محطة الباركودات" icon="camera" colors={c}>
          <div className="flex flex-col items-stretch">
            <ImdChipsRow>
              <ImdChip
                label={`إجمالي: ${nf(items.length)}`}
                tone={ImdTone.ok}
                colors={c}
              />
              <ImdChip
                label={`لديه باركود: ${nf(withBc)}`}
                tone={ImdTone.code}
                colors={c}
              />
              <ImdChip
                label={`بدون: ${nf(items.length - withBc)}`}
                tone={ImdTone.pend}
                colors={c}
              />
            </ImdChipsRow>
            <div className="flex flex-wrap items-center gap-2">
              {w && (
                <ImdButton
                  label="توليد للناقص"
                  icon="settings"
                  small={true}
                  colors={c}
                  onPressed={() => {
                    void genMissing();
                  }}
                />
              )}
              <ImdButtonOutline
                label="تحديد الكل"
                icon="check-circle"
                small={true}
                colors={c}
                onPressed={() =>
                  setBcChecked(
                    new Set(
                      items
                        .filter((x) => x.barcode.length > 0)
                        .map((x) => x.id),
                    ),
                  )
                }
              />
              <ImdButtonOutline
                label="إلغاء التحديد"
                small={true}
                colors={c}
                onPressed={() => setBcChecked(new Set())}
              />
              <div className="inline-flex items-center gap-[6px]">
                <span
                  className="text-[13px] font-bold"
                  style={{ color: c.text.css }}
                >
                  نسخ:
                </span>
                <ImdFit width={70}>
                  <ImdFld
                    controller={bcCopiesCtrl}
                    number={true}
                    dense={true}
                    colors={c}
                  />
                </ImdFit>
                <ImdScanButton controller={bcCopiesCtrl} colors={c} />
              </div>
              <ImdButton
                label="معاينة الملصقات وطباعتها"
                icon="printer"
                small={true}
                colors={c}
                onPressed={() => {
                  void printLabels();
                }}
              />
            </div>
          </div>
        </ImdICard>
        {items.length === 0 ? (
          <ImdLd text="لا أصناف بعد — أنشئ أصنافًا أولًا" center={true} colors={c} />
        ) : (
          items.map((x) => renderBcRow(x))
        )}
      </div>
    );
  };

  return (
    <ImdPage>
      <ImdPageTitle
        title="إدارة الأصناف"
        icon="package"
        subtitle="بطاقات الأصناف والتصنيفات والوحدات والأرصدة وحركة الصنف والباركودات"
        colors={c}
        actions={[
          <ExcelTemplatesButton
            key="tpl"
            kind={TemplateKind.items}
            onImported={() => {
              void fetchAll();
            }}
          />,
        ]}
      />
      <ImdItabs
        value={tab}
        onChanged={(t) => switchTab(t)}
        colors={c}
        tabs={[
          new ImdTab('list', 'القائمة', { icon: 'clipboard' }),
          new ImdTab('cats', 'التصنيفات', { icon: 'folder' }),
          new ImdTab('form', 'بطاقة الصنف', { icon: 'package' }),
          new ImdTab('bals', 'الأرصدة', { icon: 'chart' }),
          new ImdTab('movs', 'حركة الصنف', { icon: 'repeat' }),
          new ImdTab('bc', 'الباركودات', { icon: 'camera' }),
        ]}
      />
      {loading ? (
        <ImdLd text="جارٍ التحميل…" colors={c} />
      ) : tab === 'list' ? (
        renderList()
      ) : tab === 'cats' ? (
        renderCatsView()
      ) : tab === 'form' ? (
        renderForm()
      ) : tab === 'bals' ? (
        renderBals()
      ) : tab === 'movs' ? (
        renderMovs()
      ) : (
        renderBc()
      )}
    </ImdPage>
  );
}
