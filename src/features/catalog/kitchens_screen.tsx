import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthService } from '../../core/security/auth_service';
import { usePerm } from '../../core/security/perm';
import { useAppDatabase, useImdColors } from '../../core/theme/imd_theme';
import {
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
import { nf } from '../../core/ui/imd_format';
import { ImdEmojiText } from '../../core/ui/imd_icon';
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
  ImdSelect,
  ImdTab,
  ImdTable,
  ImdTone,
  showImdToast,
} from '../../core/ui/imd_widgets';
import type { BeneficiaryUnit, Facility, Warehouse } from '../../data/db/app_database';
import { CatalogRepo, facilityIdsOf } from '../../data/repos/catalog_repo';
import { PermAction } from '../../domain/access_control';

function isKitchen(f: Facility): boolean {
  return f.fType.toUpperCase() === 'KITCHEN';
}

/// المطابخ والأفران — نقل مطابق لـ `renderKitchens()` بتبويباتها الثلاث:
/// القائمة، بطاقة مطبخ/فرن، اشتراكات الوحدات.
export function KitchensScreen() {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const repo = useMemo(() => (db ? new CatalogRepo(db) : null), [db]);
  const perm = usePerm();
  const c = useImdColors();
  const screenActions = useImdScreenActions();

  const [tab, setTab] = useState<string>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [facs, setFacs] = useState<Facility[]>([]);
  const [whs, setWhs] = useState<Warehouse[]>([]);
  const [units, setUnits] = useState<BeneficiaryUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subFid, setSubFid] = useState<string>('');

  const nameCtrl = useMemo(() => new ImdTextController(''), []);
  const capCtrl = useMemo(() => new ImdTextController(''), []);
  const notesCtrl = useMemo(() => new ImdTextController(''), []);
  const [fType, setFType] = useState<string>('KITCHEN');
  const [wh, setWh] = useState<string>('');

  /// حالة مربعات الاشتراك قبل الحفظ.
  const [subChecks, setSubChecks] = useState<Record<string, boolean>>({});

  const mountedRef = useRef(true);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const fetchAll = useCallback(async (): Promise<{
    readonly facs: Facility[];
    readonly whs: Warehouse[];
    readonly units: BeneficiaryUnit[];
  }> => {
    if (!repo) return { facs: [], whs: [], units: [] };
    const [nextFacs, nextWhs, nextUnits] = await Promise.all([
      repo.facilities(),
      repo.warehouses(),
      repo.units(),
    ]);
    if (!mountedRef.current) return { facs: nextFacs, whs: nextWhs, units: nextUnits };
    setFacs(nextFacs);
    setWhs(nextWhs);
    setUnits(nextUnits);
    setLoading(false);
    return { facs: nextFacs, whs: nextWhs, units: nextUnits };
  }, [repo]);

  const initForm = useCallback(
    (cur: Facility | null) => {
      imdSetText(nameCtrl, cur?.name ?? '');
      setFType(cur === null || isKitchen(cur) ? 'KITCHEN' : 'OVEN');
      imdSetText(capCtrl, cur !== null && cur.capacity !== 0 ? `${cur.capacity}` : '');
      setWh(cur?.warehouse ?? '');
      imdSetText(notesCtrl, cur?.notes ?? '');
    },
    [capCtrl, nameCtrl, notesCtrl],
  );

  const resetChecks = useCallback((nextUnits: readonly BeneficiaryUnit[], fid: string) => {
    const next: Record<string, boolean> = {};
    for (const u of nextUnits) {
      next[u.id] = fid.length > 0 && facilityIdsOf(u).includes(fid);
    }
    setSubChecks(next);
  }, []);

  const switchTab = useCallback(
    (
      nextTab: string,
      opts: {
        readonly nextEditId?: string | null;
        readonly nextFacs?: readonly Facility[];
        readonly nextUnits?: readonly BeneficiaryUnit[];
        readonly nextSubFid?: string;
      } = {},
    ) => {
      const targetFacs = opts.nextFacs ?? facs;
      const targetUnits = opts.nextUnits ?? units;
      const targetEditId = opts.nextEditId !== undefined ? opts.nextEditId : editId;
      const targetSubFid = opts.nextSubFid !== undefined ? opts.nextSubFid : subFid;
      setTab(nextTab);
      if (nextTab === 'form') {
        const cur =
          targetEditId === null
            ? null
            : (targetFacs.find((x) => x.id === targetEditId) ?? null);
        initForm(cur);
      }
      if (nextTab === 'subs') {
        resetChecks(targetUnits, targetSubFid);
      }
    },
    [editId, facs, initForm, resetChecks, subFid, units],
  );

  const cur = useMemo(
    () => (editId === null ? null : (facs.find((x) => x.id === editId) ?? null)),
    [editId, facs],
  );

  const save = useCallback(async () => {
    if (!repo) return;
    const name = nameCtrl.text.trim();
    if (name.length === 0) {
      showImdToast('✖ أدخل اسم المطبخ/الفرن');
      return;
    }
    const rawCap = capCtrl.text.trim();
    const parsedInt = /^-?\d+$/.test(rawCap) ? Number.parseInt(rawCap, 10) : NaN;
    const parsedFloat = rawCap.length > 0 ? Number(rawCap) : NaN;
    const capacity = Number.isFinite(parsedInt)
      ? parsedInt
      : Number.isFinite(parsedFloat)
        ? Math.trunc(parsedFloat)
        : 0;
    try {
      await repo.saveFacility({
        id: cur?.id,
        name,
        fType,
        capacity,
        warehouse: wh,
        notes: notesCtrl.text.trim(),
      });
      if (!mountedRef.current) return;
      showImdToast(cur !== null ? '✔ حُفظت التعديلات' : '🎉 أُضيف بنجاح');
      setEditId(null);
      const data = await fetchAll();
      if (!mountedRef.current) return;
      switchTab('list', {
        nextEditId: null,
        nextFacs: data.facs,
        nextUnits: data.units,
      });
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  }, [capCtrl, cur, fType, fetchAll, nameCtrl, notesCtrl, repo, switchTab, wh]);

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
      if (tabRef.current === 'form') initForm(null);
      if (tabRef.current === 'subs') resetChecks(data.units, '');
    });
    return () => {
      mountedRef.current = false;
      screenActions?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, screenActions]);

  const subCount = (fid: string): number =>
    units.filter((u) => facilityIdsOf(u).includes(fid)).length;

  const deleteFacility = async (f: Facility) => {
    if (!repo) return;
    if (!perm.guard('kitchens', PermAction.delete)) return;
    if (!(await imdConfirm('حذف هذا المطبخ/الفرن نهائيًا؟', { ok: 'حذف', danger: true }))) {
      return;
    }
    try {
      await repo.deleteFacility(f.id);
      if (!mountedRef.current) return;
      showImdToast('✔ تم الحذف');
      await fetchAll();
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`, { error: true });
    }
  };

  /// `kitSaveSubs()`
  const saveSubs = async () => {
    if (!repo) return;
    if (!perm.guard('kitchens', 'edit')) return;
    if (subFid.length === 0) {
      showImdToast('✖ اختر المطبخ/الفرن أولًا');
      return;
    }
    const changes: Record<string, string[]> = {};
    for (const u of units) {
      const checked = subChecks[u.id] ?? false;
      const current = facilityIdsOf(u);
      const was = current.includes(subFid);
      if (checked === was) continue;
      // هذا الاشتراك وحده يُضاف أو يُزال؛ بقية اشتراكات الوحدة لا تُمس.
      changes[u.id] = checked
        ? [...current, subFid]
        : current.filter((id) => id !== subFid);
    }
    await repo.setUnitFacilities(changes);
    const n = Object.keys(changes).length;
    if (!mountedRef.current) return;
    if (n === 0) {
      showImdToast('لا تغييرات لحفظها');
      return;
    }
    showImdToast(`✔ حُفظت الاشتراكات (${n} تغيير)`);
    const data = await fetchAll();
    if (!mountedRef.current) return;
    resetChecks(data.units, subFid);
  };

  const w = perm.writable('kitchens');
  const canDel = perm.canDelete('kitchens');

  const renderList = () => {
    if (facs.length === 0) {
      return (
        <ImdICard colors={c}>
          <ImdLdText
            text="لا مطابخ/أفران مسجلة بعد — أضف أول واحد من تبويب «بطاقة مطبخ/فرن»"
            colors={c}
          />
        </ImdICard>
      );
    }
    return (
      <ImdTable
        minWidth={720}
        pageSize={50}
        colors={c}
        columns={[
          new ImdCol('الاسم', { flex: 2 }),
          new ImdCol('النوع'),
          new ImdCol('الطاقة الاستيعابية'),
          new ImdCol('المستودع المغذي', { flex: 2 }),
          new ImdCol('وحدات مشتركة'),
          ...(w ? [new ImdCol('', { width: 110 })] : []),
        ]}
        rows={facs.map((f) => [
          <span key="name" className="font-semibold">
            {f.name}
          </span>,
          <ImdEmojiText
            key="type"
            text={isKitchen(f) ? '🍽️ مطبخ' : '🔥 فرن'}
            colors={c}
          />,
          <span key="cap">
            {f.capacity !== 0 ? `${nf(f.capacity)} فرد` : '—'}
          </span>,
          <span key="wh">{f.warehouse.length === 0 ? '—' : f.warehouse}</span>,
          <ImdChip
            key="subs"
            label={`${nf(subCount(f.id))} وحدة`}
            tone={ImdTone.ok}
            colors={c}
          />,
          ...(w
            ? [
                <div key="acts" className="inline-flex items-center gap-1">
                  <ImdIconButton
                    icon="edit"
                    tooltip="تعديل"
                    colors={c}
                    onPressed={() => {
                      setEditId(f.id);
                      switchTab('form', { nextEditId: f.id });
                    }}
                  />
                  {/* صلاحية الحذف وحدها: `writable` يصدق بالإضافة أو التعديل. */}
                  {canDel && (
                    <ImdIconButton
                      icon="trash"
                      tooltip="حذف"
                      kind={ImdBtnKind.danger}
                      colors={c}
                      onPressed={() => {
                        void deleteFacility(f);
                      }}
                    />
                  )}
                </div>,
              ]
            : []),
        ])}
      />
    );
  };

  const renderForm = () => {
    if (!w) {
      return (
        <ImdICard title="عرض فقط" icon="eye" colors={c}>
          <div style={{ paddingBlock: 6 }}>
            <ImdLdText text="الإضافة والتعديل متاحان لمدير النظام" colors={c} />
          </div>
        </ImdICard>
      );
    }
    return (
      <ImdICard
        title={cur !== null ? `وضع التعديل: ${cur.name}` : 'إضافة مطبخ / فرن جديد'}
        icon={cur !== null ? 'edit' : 'plus-square'}
        colors={c}
      >
        <div className="flex flex-col items-stretch">
          <ImdF2>
            <ImdLabeled label="الاسم *" colors={c}>
              <ImdFld controller={nameCtrl} colors={c} />
            </ImdLabeled>
            <ImdLabeled label="النوع" colors={c}>
              <ImdSelect<string>
                value={fType}
                items={[
                  ['KITCHEN', 'مطبخ'],
                  ['OVEN', 'فرن'],
                ]}
                colors={c}
                onChanged={(v) => setFType(v ?? 'KITCHEN')}
              />
            </ImdLabeled>
          </ImdF2>
          <div style={{ height: 10 }} />
          <ImdF2>
            <ImdLabeled label="الطاقة الاستيعابية (أفراد)" colors={c}>
              <ImdFld controller={capCtrl} number={true} colors={c} />
            </ImdLabeled>
            <ImdLabeled label="المستودع المغذي" colors={c}>
              <ImdSelect<string>
                value={wh}
                items={[
                  ['', '— بدون تحديد —'],
                  ...whs.map((item): readonly [string, string] => [item.name, item.name]),
                ]}
                colors={c}
                onChanged={(v) => setWh(v ?? '')}
              />
            </ImdLabeled>
          </ImdF2>
          <div style={{ height: 10 }} />
          <ImdLabeled label="ملاحظات" colors={c}>
            <ImdFld controller={notesCtrl} colors={c} />
          </ImdLabeled>
          <div style={{ height: 16 }} />
          <div className="flex items-center gap-[10px]">
            <div className="min-w-0 flex-1">
              <ImdButtonOutline
                label="إلغاء / مسح"
                expand={true}
                colors={c}
                onPressed={() => {
                  setEditId(null);
                  initForm(null);
                }}
              />
            </div>
            <div className="min-w-0 flex-[2]">
              <ImdButton
                label={cur !== null ? 'حفظ التعديلات' : 'حفظ البطاقة'}
                icon="save"
                expand={true}
                colors={c}
                onPressed={() => {
                  void save();
                }}
              />
            </div>
          </div>
        </div>
      </ImdICard>
    );
  };

  const renderSubs = () => {
    if (facs.length === 0) {
      return (
        <ImdICard colors={c}>
          <ImdLdText text="أضف مطبخًا أو فرنًا أولًا" colors={c} />
        </ImdICard>
      );
    }

    let listNode: React.ReactNode;
    if (subFid.length === 0) {
      listNode = <ImdLdText text="اختر المطبخ/الفرن" colors={c} />;
    } else if (units.length === 0) {
      listNode = <ImdLdText text="لا وحدات مسجلة بعد" colors={c} />;
    } else {
      listNode = (
        <ImdTable
          pageSize={50}
          colors={c}
          columns={[
            new ImdCol('اشتراك', { width: 70 }),
            new ImdCol('الكود'),
            new ImdCol('الوحدة', { flex: 2 }),
            new ImdCol('مشترك حاليًا مع', { flex: 2 }),
          ]}
          rows={units.map((u) => {
            // الوحدة قد تشترك في مطبخ وفرن معًا، فتُعرض بقية اشتراكاتها كلها.
            const others = facilityIdsOf(u).filter((id) => id !== subFid);
            const linkedName =
              others.length === 0
                ? null
                : others
                    .map((id) => facs.find((f) => f.id === id)?.name ?? '')
                    .filter((n) => n.length > 0)
                    .join('، ');
            return [
              <input
                key="chk"
                type="checkbox"
                aria-label={`اشتراك ${u.name}`}
                checked={subChecks[u.id] ?? false}
                disabled={!w}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSubChecks((prev) => ({ ...prev, [u.id]: checked }));
                }}
                style={{ width: 20, height: 20, accentColor: c.accent.css }}
              />,
              <span key="code">{u.code}</span>,
              <span key="name">{u.name}</span>,
              // لم تعد تحذيرًا: الاشتراك المتعدد صار مسموحًا (مطبخ وفرن معًا).
              linkedName === null || linkedName.length === 0 ? (
                <span key="linked">—</span>
              ) : (
                <ImdChip
                  key="linked"
                  label={linkedName}
                  tone={ImdTone.info}
                  colors={c}
                />
              ),
            ];
          })}
        />
      );
    }

    return (
      <ImdICard title="ربط الوحدات المشتركة بالمطبخ/الفرن" icon="link" colors={c}>
        <div className="flex flex-col items-stretch">
          <div className="pb-2 text-[12px]" style={{ color: c.muted.css }}>
            اختر المطبخ/الفرن ثم حدد الوحدات التي تُدمج قوتها التموينية تلقائيًا معه
          </div>
          <ImdSelect<string>
            value={subFid}
            items={[
              ['', '— اختر المطبخ/الفرن —'],
              ...facs.map((f): readonly [string, string] => [f.id, f.name]),
            ]}
            colors={c}
            onChanged={(v) => {
              const nextFid = v ?? '';
              setSubFid(nextFid);
              resetChecks(units, nextFid);
            }}
          />
          <div style={{ height: 14 }} />
          {listNode}
          {w && (
            <div className="flex justify-start pt-3">
              <ImdButton
                label="حفظ الاشتراكات"
                icon="save"
                colors={c}
                onPressed={() => {
                  void saveSubs();
                }}
              />
            </div>
          )}
        </div>
      </ImdICard>
    );
  };

  return (
    <ImdPage>
      <ImdPageTitle
        title="المطابخ والأفران"
        icon="utensils"
        subtitle="تعريف مطابخ الإعاشة والأفران، طاقتها الاستيعابية، والمستودع المغذي لها + ربط الوحدات المشتركة"
        colors={c}
      />
      <ImdItabs
        value={tab}
        onChanged={(t) => switchTab(t)}
        colors={c}
        tabs={[
          new ImdTab('list', 'القائمة', { icon: 'clipboard' }),
          new ImdTab('form', 'بطاقة مطبخ/فرن', { icon: 'utensils' }),
          new ImdTab('subs', 'اشتراكات الوحدات', { icon: 'link' }),
        ]}
      />
      {loading ? (
        <ImdLd text="جارٍ التحميل…" colors={c} />
      ) : tab === 'list' ? (
        renderList()
      ) : tab === 'form' ? (
        renderForm()
      ) : (
        renderSubs()
      )}
    </ImdPage>
  );
}
