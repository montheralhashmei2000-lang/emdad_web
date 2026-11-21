import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthService } from '../../core/security/auth_service';
import { usePerm } from '../../core/security/perm';
import { useAppDatabase, useImdColors } from '../../core/theme/imd_theme';
import {
  ImdBullets,
  ImdChipsRow,
  ImdF2,
  ImdFld,
  ImdICard,
  ImdItabs,
  ImdLabeled,
  ImdLd,
  ImdLdText,
  ImdSearchBar,
  ImdTextController,
  imdSetText,
} from '../../core/ui/imd_form';
import { nf } from '../../core/ui/imd_format';
import { ImdGrid2, ImdRbar } from '../../core/ui/imd_layout';
import { useImdScreenActions } from '../../core/ui/imd_screen_actions';
import {
  ImdBtnKind,
  ImdButton,
  ImdButtonOutline,
  ImdChip,
  ImdCol,
  imdConfirm,
  ImdIconButton,
  ImdPage,
  ImdPageTitle,
  ImdPanel,
  ImdTab,
  ImdTable,
  ImdTone,
  showImdToast,
} from '../../core/ui/imd_widgets';
import type { BeneficiaryUnit, Warehouse } from '../../data/db/app_database';
import { AuditRepo } from '../../data/repos/audit_repo';
import { CampLedgerRepo } from '../../data/repos/camp_ledger_repo';
import { CatalogRepo } from '../../data/repos/catalog_repo';
import { MovementsRepo, type MovementUsage } from '../../data/repos/movements_repo';
import { CampLinkField } from './camp_link_field';
import { WarehouseDashboardView } from './warehouse_dashboard_view';

interface WarehouseUsage {
  count: number;
  receipts: number;
  issues: number;
  transfers: number;
  returns: number;
  facs: number;
  lastDate: string;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/// المستودعات — نقل مطابق لـ `renderStores()`: بحث وإحصاءات، نموذج إضافة/تعديل مع حقل «يغذي معسكر»،
/// ملاحظات تشغيلية، وجدول بالاستخدام (وارد/صرف/تحويل) وآخر حركة.
export function WarehousesScreen() {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const repo = useMemo(() => (db ? new CatalogRepo(db) : null), [db]);
  const perm = usePerm();
  const c = useImdColors();
  const screenActions = useImdScreenActions();

  const [items, setItems] = useState<Warehouse[]>([]);
  const [camps, setCamps] = useState<BeneficiaryUnit[]>([]);
  const [usage, setUsage] = useState<Record<string, WarehouseUsage>>({});
  const [feedsAll, setFeedsAll] = useState<boolean>(true);
  const [campIds, setCampIds] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [queryText, setQueryText] = useState<string>('');
  /// dir | board
  const [tab, setTab] = useState<string>('dir');

  const qCtrl = useMemo(() => new ImdTextController(''), []);
  const codeCtrl = useMemo(() => new ImdTextController(''), []);
  const nameCtrl = useMemo(() => new ImdTextController(''), []);
  const managerCtrl = useMemo(() => new ImdTextController(''), []);
  const locationCtrl = useMemo(() => new ImdTextController(''), []);
  const notesCtrl = useMemo(() => new ImdTextController(''), []);

  const mountedRef = useRef(true);
  const editIdRef = useRef<string | null>(null);
  editIdRef.current = editId;

  /// `stoLoad()` ثم `renderStores()`
  const renderData = useCallback(
    async (explicitEditId?: string | null) => {
      if (!db || !repo) return;
      const targetEditId =
        explicitEditId !== undefined ? explicitEditId : editIdRef.current;
      const moves = new MovementsRepo(db);
      const [whs, receipts, issues, transfers, transfersIn, returns, facs, units] =
        await Promise.all([
          repo.warehouses(),
          moves.usageOf('receipts', 'warehouse'),
          moves.usageOf('issues', 'warehouse'),
          moves.usageOf('transfers', 'warehouse'),
          moves.usageOf('transfers', 'dest_warehouse'),
          moves.usageOf('returns', 'warehouse'),
          repo.facilities(),
          repo.units(),
        ]);

      whs.sort((a, b) => compareStrings(a.name, b.name));
      const nextCamps = units
        .filter((u) => u.type === 'camp' || u.parentId.length === 0)
        .sort((a, b) => compareStrings(a.code, b.code));

      const nextUsage: Record<string, WarehouseUsage> = {};
      const add = (
        name: string,
        kind: 'receipts' | 'issues' | 'transfers' | 'returns' | 'facs',
        n: number,
        date: string,
      ) => {
        const k = name.trim();
        if (k.length === 0) return;
        let u = nextUsage[k];
        if (!u) {
          u = {
            count: 0,
            receipts: 0,
            issues: 0,
            transfers: 0,
            returns: 0,
            facs: 0,
            lastDate: '',
          };
          nextUsage[k] = u;
        }
        u.count += n;
        switch (kind) {
          case 'receipts':
            u.receipts += n;
            break;
          case 'issues':
            u.issues += n;
            break;
          case 'transfers':
            u.transfers += n;
            break;
          case 'returns':
            u.returns += n;
            break;
          case 'facs':
            u.facs += n;
            break;
        }
        if (
          date.length > 0 &&
          (u.lastDate.length === 0 || compareStrings(date, u.lastDate) > 0)
        ) {
          u.lastDate = date;
        }
      };

      const addAll = (
        src: Record<string, MovementUsage>,
        kind: 'receipts' | 'issues' | 'transfers' | 'returns',
      ) => {
        for (const [k, v] of Object.entries(src)) {
          add(k, kind, v.count, v.lastDate);
        }
      };

      addAll(receipts, 'receipts');
      addAll(issues, 'issues');
      addAll(transfers, 'transfers');
      addAll(transfersIn, 'transfers');
      addAll(returns, 'returns');
      for (const f of facs) {
        add(f.warehouse, 'facs', 1, '');
      }

      if (!mountedRef.current) return;
      const cur =
        targetEditId === null
          ? null
          : (whs.find((x) => x.id === targetEditId) ?? null);
      imdSetText(codeCtrl, cur?.code ?? '');
      imdSetText(nameCtrl, cur?.name ?? '');
      imdSetText(managerCtrl, cur?.manager ?? '');
      imdSetText(locationCtrl, cur?.location ?? '');
      imdSetText(notesCtrl, cur?.notes ?? '');
      const ids = cur === null ? [] : repo.campsOf(cur);

      setItems(whs);
      setCamps(nextCamps);
      setUsage(nextUsage);
      setCampIds(ids);
      setFeedsAll(cur === null ? true : cur.feedsAllCamps && ids.length === 0);
      setLoading(false);
    },
    [codeCtrl, db, locationCtrl, managerCtrl, nameCtrl, notesCtrl, repo],
  );

  /// `stoFeedsCampLabel(w)`
  const feedsLabel = (w: Warehouse): string => {
    if (w.feedsAllCamps) return 'كل المعسكرات';
    const ids = repo ? repo.campsOf(w) : [];
    if (ids.length === 0) return '—';
    const names = ids
      .map((id) => camps.find((camp) => camp.id === id)?.name)
      .filter((n): n is string => n !== undefined);
    return names.length === 0 ? '—' : names.join('، ');
  };

  /// `stoSave()`
  const save = useCallback(async () => {
    if (!db || !repo) return;
    const currentEditId = editIdRef.current;
    if (!perm.guard('stores', currentEditId !== null ? 'edit' : 'create')) return;
    const name = nameCtrl.text.trim();
    const code = codeCtrl.text.trim();
    if (name.length === 0) {
      showImdToast('✖ أدخل اسم المستودع');
      return;
    }
    if (
      items.some(
        (x) =>
          x.id !== currentEditId &&
          x.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      showImdToast('✖ يوجد مستودع بنفس الاسم بالفعل');
      return;
    }
    if (
      code.length > 0 &&
      items.some(
        (x) =>
          x.id !== currentEditId &&
          x.code.trim().toLowerCase() === code.toLowerCase(),
      )
    ) {
      showImdToast('✖ يوجد مستودع بنفس الكود بالفعل');
      return;
    }
    // «محدد» بلا أي معسكر يُعامل كجميع المعسكرات حتى لا يختفي المستودع من الصرف والتحويل.
    const all = feedsAll || campIds.length === 0;
    const audit = new AuditRepo(db);
    const actor = auth?.currentUser ?? null;
    try {
      await repo.saveWarehouse({
        id: currentEditId,
        code,
        name,
        manager: managerCtrl.text.trim(),
        location: locationCtrl.text.trim(),
        notes: notesCtrl.text.trim(),
        feedsAllCamps: all,
        campIds: all ? [] : campIds,
      });
      if (currentEditId !== null) {
        await audit.write('WAREHOUSE_UPDATED', 'warehouse', 'تعديل بيانات مستودع', {
          details: { target: name, status: 'UPDATED', risk: 'normal' },
          actor,
        });
        if (mountedRef.current) showImdToast('✔ تم تحديث المستودع');
      } else {
        await audit.write('WAREHOUSE_CREATED', 'warehouse', 'إضافة مستودع جديد', {
          details: { target: name, status: 'CREATED', risk: 'normal' },
          actor,
        });
        if (mountedRef.current) showImdToast('🎉 تم إضافة المستودع');
      }
      editIdRef.current = null;
      setEditId(null);
      await renderData(null);
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  }, [
    auth,
    campIds,
    codeCtrl,
    db,
    feedsAll,
    items,
    locationCtrl,
    managerCtrl,
    nameCtrl,
    notesCtrl,
    perm,
    renderData,
    repo,
  ]);

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    mountedRef.current = true;
    // Ctrl+S وF5 وCtrl+P لهذه الصفحة (CLAUDE.md §8 البند 24): تُسجَّل في خانة الصفحة
    // فلا تعمل إلا وهي الظاهرة.
    screenActions?.register({
      onSave: () => {
        if (mountedRef.current) void saveRef.current();
      },
    });
    void renderData();
    return () => {
      mountedRef.current = false;
      screenActions?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, screenActions]);

  const deleteWarehouse = async (it: Warehouse) => {
    if (!db || !repo) return;
    if (!perm.guard('stores', 'delete')) return;
    const u = usage[it.name.trim()];
    if (
      (u?.count ?? 0) > 0 &&
      !(await imdConfirm(
        `هذا المستودع مرتبط بحركات سابقة (${nf(u!.count)}). هل تريد حذفه رغم ذلك؟`,
        { danger: true },
      ))
    ) {
      return;
    }
    if (
      !mountedRef.current ||
      !(await imdConfirm(`حذف المستودع «${it.name}»؟`, { ok: 'حذف', danger: true }))
    ) {
      return;
    }
    if (!mountedRef.current) return;
    const actor = auth?.currentUser ?? null;
    try {
      await repo.deleteWarehouse(it.id);
      await new AuditRepo(db).write('WAREHOUSE_DELETED', 'warehouse', 'حذف مستودع', {
        details: {
          target: it.name,
          status: 'DELETED',
          qty: u?.count ?? 0,
          risk: 'sensitive',
        },
        actor,
      });
      if (!mountedRef.current) return;
      showImdToast('✔ تم حذف المستودع');
      const nextEdit = editIdRef.current === it.id ? null : editIdRef.current;
      editIdRef.current = nextEdit;
      setEditId(nextEdit);
      await renderData(nextEdit);
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  };

  /// تعيين المخزن الرئيسي — منه وحده تُغذّى المعسكرات.
  const setMain = async (w: Warehouse) => {
    if (!db) return;
    if (!perm.guard('stores', 'edit')) return;
    const current = await new CampLedgerRepo(db).mainWarehouse();
    if (!mountedRef.current) return;
    const ok = await imdConfirm(
      current === null
        ? `تعيين «${w.name}» مخزنًا رئيسيًا؟ تغذية المعسكرات ستكون منه وحده.`
        : `نقل الصفة من «${current.name}» إلى «${w.name}»؟ تغذية المعسكرات ستكون من «${w.name}» وحده بعد ذلك.`,
      { ok: 'تعيين' },
    );
    if (!ok || !mountedRef.current) return;
    await new CampLedgerRepo(db).setMainWarehouse(w.id, {
      actor: auth?.currentUser?.email ?? '',
    });
    if (!mountedRef.current) return;
    showImdToast(`✔ صار «${w.name}» المخزن الرئيسي`);
    await renderData();
  };

  const newRecord = () => {
    editIdRef.current = null;
    setEditId(null);
    void renderData(null);
  };

  // الإضافة والتعديل والحذف بصلاحية «المستودعات» نفسها (لا بالمدير وحده)، وكل إجراءٍ محروسٌ في دالته.
  const can = perm.writable('stores');
  // صلاحية الحذف وحدها: `writable` يصدق بالإضافة أو التعديل أو الاعتماد،
  // فكان زرُّ الحذف يظهر لمن لا يملك الحذف.
  const canDel = perm.canDelete('stores');
  const cur =
    editId === null ? null : (items.find((x) => x.id === editId) ?? null);
  const q = queryText.trim().toLowerCase();
  const rows = items.filter(
    (x) =>
      q.length === 0 ||
      [x.code, x.name, x.manager, x.notes, x.location].some((v) =>
        v.toLowerCase().includes(q),
      ),
  );
  const used = items.filter((x) => (usage[x.name.trim()]?.count ?? 0) > 0).length;
  const withCode = items.filter((x) => x.code.trim().length > 0).length;
  const linkedF = items.filter((x) => (usage[x.name.trim()]?.facs ?? 0) > 0).length;
  const orDash = (v: string): string => (v.length === 0 ? '—' : v);

  return (
    <ImdPage>
      <ImdPageTitle
        title="المستودعات"
        icon="warehouse"
        subtitle="تعريف المستودعات وحدود مخزونها — ما تحت الحد الأدنى وما فوق الأعلى"
        colors={c}
      />

      <ImdItabs
        value={tab}
        onChanged={(v) => setTab(v)}
        colors={c}
        tabs={[
          new ImdTab('dir', 'دليل المستودعات', { icon: 'warehouse' }),
          new ImdTab('board', 'لوحة المستودعات', { icon: 'radio' }),
        ]}
      />
      <div style={{ height: 4 }} />

      {/* اللوحة حيث يقع الرصيد لا في شاشةٍ أخرى تُبحث عنها: من يعرّف المستودع هو من يضبط حدوده ويقرأ نقصها. */}
      {tab === 'board' ? (
        <WarehouseDashboardView warehouses={items} />
      ) : (
        <>
          <ImdICard colors={c}>
            <div className="flex flex-col items-stretch">
              <ImdSearchBar
                controller={qCtrl}
                hint="بحث بالكود أو الاسم أو الموقع…"
                onChanged={(v) => setQueryText(v)}
                colors={c}
                actions={[
                  <ImdButtonOutline
                    key="refresh"
                    label="تحديث"
                    icon="refresh"
                    small={true}
                    colors={c}
                    onPressed={() => {
                      void renderData();
                    }}
                  />,
                  ...(can
                    ? [
                        <ImdButtonOutline
                          key="new"
                          label="مستودع جديد"
                          icon="plus-square"
                          small={true}
                          colors={c}
                          onPressed={newRecord}
                        />,
                      ]
                    : []),
                ]}
              />
              <ImdChipsRow bottom={0}>
                <ImdChip
                  label={`المستودعات: ${nf(items.length)}`}
                  tone={ImdTone.ok}
                  colors={c}
                />
                <ImdChip
                  label={`بأكواد: ${nf(withCode)}`}
                  tone={ImdTone.code}
                  colors={c}
                />
                <ImdChip
                  label={`نشطة بالحركات: ${nf(used)}`}
                  tone={ImdTone.pend}
                  colors={c}
                />
                <ImdChip
                  label={`مرتبطة بمطابخ/أفران: ${nf(linkedF)}`}
                  tone={ImdTone.off}
                  colors={c}
                />
              </ImdChipsRow>
            </div>
          </ImdICard>

          <ImdGrid2>
            <ImdPanel
              margin={0}
              title={
                cur !== null ? `تعديل مستودع: ${cur.name}` : 'إضافة مستودع جديد'
              }
              icon={cur !== null ? 'edit' : 'plus-square'}
              colors={c}
            >
              <div className="flex flex-col items-stretch">
                <ImdF2>
                  <ImdLabeled label="الكود" size={11} colors={c}>
                    <ImdFld controller={codeCtrl} enabled={can} colors={c} />
                  </ImdLabeled>
                  <ImdLabeled label="اسم المستودع *" size={11} colors={c}>
                    <ImdFld controller={nameCtrl} enabled={can} colors={c} />
                  </ImdLabeled>
                  <ImdLabeled label="المسؤول" size={11} colors={c}>
                    <ImdFld controller={managerCtrl} enabled={can} colors={c} />
                  </ImdLabeled>
                  <ImdLabeled label="الموقع" size={11} colors={c}>
                    <ImdFld controller={locationCtrl} enabled={can} colors={c} />
                  </ImdLabeled>
                  {/* forms-ux.js يُدرج الحقل بعد خانة «الموقع» داخل شبكة .f2 نفسها فيأخذ نصف العرض. */}
                  <CampLinkField
                    camps={camps}
                    all={feedsAll}
                    ids={campIds}
                    enabled={can}
                    colors={c}
                    onChanged={(all, ids) => {
                      setFeedsAll(all);
                      setCampIds(all ? [] : ids);
                    }}
                  />
                </ImdF2>
                <div style={{ height: 13 }} />
                <ImdLabeled label="ملاحظات" size={11} colors={c}>
                  <ImdFld controller={notesCtrl} enabled={can} colors={c} />
                </ImdLabeled>
                {can ? (
                  <div style={{ paddingTop: 12 }}>
                    <ImdRbar bottom={0}>
                      <ImdButton
                        label={cur !== null ? 'حفظ التعديلات' : 'إضافة المستودع'}
                        icon={cur !== null ? 'save' : 'plus'}
                        colors={c}
                        onPressed={() => {
                          void save();
                        }}
                      />
                      <ImdButtonOutline
                        label="إلغاء"
                        colors={c}
                        onPressed={newRecord}
                      />
                    </ImdRbar>
                  </div>
                ) : (
                  <div style={{ paddingTop: 8 }}>
                    <ImdLdText
                      text="👁 عرض فقط — الإدارة متاحة لمدير النظام"
                      colors={c}
                    />
                  </div>
                )}
              </div>
            </ImdPanel>

            <ImdPanel margin={0} title="ملاحظات تشغيلية" icon="pin" colors={c}>
              <ImdBullets
                colors={c}
                lines={[
                  'يفضل إعطاء كل مستودع كودًا مختصرًا ثابتًا لتسهيل الطباعة والتقارير.',
                  'لا تحذف مستودعًا له حركات تاريخية إلا بعد التأكد من عدم تأثير ذلك على الأرشفة.',
                  'اربط المستودع بالمسؤول والموقع لتقليل أخطاء التحويل والاستلام.',
                ]}
              />
            </ImdPanel>
          </ImdGrid2>

          {loading ? (
            <ImdLd text="جارٍ التحميل…" colors={c} />
          ) : (
            <ImdTable
              minWidth={960}
              cards={true}
              empty="لا مستودعات مطابقة — أضف أول مستودع من النموذج أعلاه"
              pageSize={50}
              colors={c}
              columns={[
                new ImdCol('الكود'),
                new ImdCol('اسم المستودع', { flex: 2 }),
                new ImdCol('المسؤول'),
                new ImdCol('الموقع'),
                new ImdCol('🏕️ يغذي معسكر', { flex: 2 }),
                new ImdCol('رئيسي', { center: true }),
                new ImdCol('الاستخدام', { flex: 2 }),
                new ImdCol('آخر حركة'),
                new ImdCol('ملاحظات'),
                ...(can ? [new ImdCol('', { width: 110 })] : []),
              ]}
              rows={rows.map((x) => {
                const u = usage[x.name.trim()];
                return [
                  <span key="code" className="font-semibold">
                    {orDash(x.code)}
                  </span>,
                  <span key="name">{orDash(x.name)}</span>,
                  <span key="mgr">{orDash(x.manager)}</span>,
                  <span key="loc">{orDash(x.location)}</span>,
                  <span key="feeds">{feedsLabel(x)}</span>,
                  x.isMain ? (
                    <ImdChip
                      key="main"
                      label="المخزن الرئيسي"
                      tone={ImdTone.ok}
                      colors={c}
                    />
                  ) : can ? (
                    <ImdButtonOutline
                      key="main"
                      label="تعيين"
                      icon="shield"
                      small={true}
                      colors={c}
                      onPressed={() => {
                        void setMain(x);
                      }}
                    />
                  ) : (
                    <span key="main">—</span>
                  ),
                  <span key="usage">
                    {(u?.count ?? 0) > 0
                      ? `وارد ${nf(u!.receipts)} • صرف ${nf(u!.issues)} • تحويل ${nf(u!.transfers)}`
                      : '—'}
                  </span>,
                  <span key="last">{orDash(u?.lastDate ?? '')}</span>,
                  <span key="notes">{orDash(x.notes)}</span>,
                  ...(can
                    ? [
                        <div key="acts" className="inline-flex items-center gap-1">
                          <ImdIconButton
                            icon="edit"
                            tooltip="تعديل"
                            colors={c}
                            onPressed={() => {
                              editIdRef.current = x.id;
                              setEditId(x.id);
                              void renderData(x.id);
                            }}
                          />
                          {canDel && (
                            <ImdIconButton
                              icon="trash"
                              tooltip="حذف"
                              kind={ImdBtnKind.danger}
                              colors={c}
                              onPressed={() => {
                                void deleteWarehouse(x);
                              }}
                            />
                          )}
                        </div>,
                      ]
                    : []),
                ];
              })}
            />
          )}
        </>
      )}
    </ImdPage>
  );
}
