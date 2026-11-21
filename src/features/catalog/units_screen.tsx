import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuthService } from '../../core/security/auth_service';
import { usePerm } from '../../core/security/perm';
import { useAppDatabase, useImdColors } from '../../core/theme/imd_theme';
import {
  ImdChipsRow,
  ImdDateField,
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
import { arDate, isoDay, nf } from '../../core/ui/imd_format';
import { ImdEmojiText, ImdIcon } from '../../core/ui/imd_icon';
import { useImdScreenActions } from '../../core/ui/imd_screen_actions';
import { ImdColors, ImdCursor, imdShadow, ImdSizes } from '../../core/ui/imd_tokens';
import {
  ImdBtnKind,
  ImdButton,
  ImdButtonOutline,
  ImdChip,
  ImdCol,
  imdConfirm,
  imdFieldDecoration,
  ImdIconButton,
  ImdPage,
  ImdPageTitle,
  ImdSelect,
  ImdTab,
  ImdTable,
  ImdTap,
  ImdTone,
  showImdToast,
} from '../../core/ui/imd_widgets';
import type { BeneficiaryUnit } from '../../data/db/app_database';
import { TemplateKind } from '../../data/migration/excel_templates/excel_templates';
import { CatalogRepo } from '../../data/repos/catalog_repo';
import { MovementsRepo } from '../../data/repos/movements_repo';
import { ExcelTemplatesButton } from '../excel_templates/excel_templates_dialog';

function dstr(d: Date): string {
  return isoDay(d);
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/// الوحدات المستفيدة — نقل مطابق لـ `renderUnits()`: الشجرة التنظيمية (معسكرات ووحدات تابعة)
/// مع الترقيم التلقائي من `imdad-upgrade-v4.js`، وسجل الصرف الاستهلاكي للوحدة.
export function UnitsScreen() {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const repo = useMemo(() => (db ? new CatalogRepo(db) : null), [db]);
  const perm = usePerm();
  const c = useImdColors();
  const screenActions = useImdScreenActions();

  const [tab, setTab] = useState<string>('tree');
  const [editId, setEditId] = useState<string | null>(null);
  const [units, setUnits] = useState<BeneficiaryUnit[]>([]);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');

  const codeCtrl = useMemo(() => new ImdTextController(''), []);
  const nameCtrl = useMemo(() => new ImdTextController(''), []);
  const catCtrl = useMemo(() => new ImdTextController(''), []);
  const searchCtrl = useMemo(() => new ImdTextController(''), []);
  const [codeValue, setCodeValue] = useState<string>('');
  const [parent, setParent] = useState<string>('');
  const [type, setType] = useState<string>('camp');

  // سجل الصرف
  const [hUnit, setHUnit] = useState<string>('');
  const [hFrom, setHFrom] = useState<string>(() =>
    dstr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
  );
  const [hTo, setHTo] = useState<string>(() => dstr(new Date()));
  const [histOut, setHistOut] = useState<ReactNode | null>(null);

  const mountedRef = useRef(true);
  const editIdRef = useRef<string | null>(null);
  editIdRef.current = editId;

  useEffect(() => {
    const syncCode = () => setCodeValue(codeCtrl.text);
    codeCtrl.addListener(syncCode);
    return () => codeCtrl.removeListener(syncCode);
  }, [codeCtrl]);

  /// `nextCode(units, parentId)` — ترقيم تلقائي: المعسكر رقم تسلسلي، والتابعة «كود الأب-تسلسل».
  const nextCodeOf = useCallback(
    (list: readonly BeneficiaryUnit[], parentId: string): string => {
      let max = 0;
      for (const u of list) {
        if (u.parentId !== parentId) continue;
        const m = /(\d+)$/.exec(u.code);
        if (m) {
          const n = Number.parseInt(m[1], 10);
          if (n > max) max = n;
        }
      }
      const p =
        parentId.length === 0
          ? null
          : (list.find((u) => u.id === parentId) ?? null);
      return p !== null
        ? `${p.code.length === 0 ? '1' : p.code}-${max + 1}`
        : `${max + 1}`;
    },
    [],
  );

  const initForm = useCallback(
    (list: readonly BeneficiaryUnit[], targetEditId: string | null) => {
      const cur =
        targetEditId === null
          ? null
          : (list.find((x) => x.id === targetEditId) ?? null);
      const nextParent = cur?.parentId ?? '';
      setParent(nextParent);
      imdSetText(codeCtrl, cur?.code ?? nextCodeOf(list, nextParent));
      imdSetText(nameCtrl, cur?.name ?? '');
      setType(cur?.type === 'unit' ? 'unit' : 'camp');
      imdSetText(catCtrl, cur?.category ?? '');
    },
    [catCtrl, codeCtrl, nameCtrl, nextCodeOf],
  );

  /// `unFetch()` — بترتيب الإنشاء.
  const fetchUnits = useCallback(async (): Promise<BeneficiaryUnit[]> => {
    if (!repo) return [];
    const rows = await repo.unitsUnsorted();
    if (!mountedRef.current) return rows;
    setUnits(rows);
    setLoading(false);
    return rows;
  }, [repo]);

  /// `unSave()`
  const save = useCallback(async () => {
    if (!repo) return;
    const currentEditId = editIdRef.current;
    if (!perm.guard('units', currentEditId !== null ? 'edit' : 'create')) return;
    const code = codeCtrl.text.trim();
    const name = nameCtrl.text.trim();
    const cat = catCtrl.text.trim();
    if (code.length === 0) {
      showImdToast('✖ أدخل كود الوحدة');
      return;
    }
    if (name.length === 0) {
      showImdToast('✖ أدخل اسم الوحدة');
      return;
    }
    const dup = units.find((x) => x.code === code) ?? null;
    if (dup !== null && dup.id !== currentEditId) {
      showImdToast('✖ الكود مستخدم لوحدة أخرى');
      return;
    }
    const parentObj =
      parent.length === 0
        ? null
        : (units.find((x) => x.id === parent) ?? null);
    try {
      await repo.saveUnit({
        id: currentEditId,
        code,
        name,
        category: cat,
        type,
        parentId: parent,
        parentName: parentObj?.name ?? '',
        facilityId: currentEditId === null ? '' : null,
      });
      if (!mountedRef.current) return;
      showImdToast(
        currentEditId !== null ? '✔ حُفظت التعديلات' : '🎉 أُضيفت الوحدة بنجاح',
      );
      editIdRef.current = null;
      setEditId(null);
      const fresh = await fetchUnits();
      if (!mountedRef.current) return;
      initForm(fresh, null);
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  }, [catCtrl, codeCtrl, fetchUnits, initForm, nameCtrl, parent, perm, repo, type, units]);

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
    void fetchUnits().then((rows) => {
      if (mountedRef.current) initForm(rows, editIdRef.current);
    });
    return () => {
      mountedRef.current = false;
      screenActions?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, screenActions]);

  const childrenOf = (pid: string): BeneficiaryUnit[] =>
    units.filter((u) => u.parentId === pid);

  /// `unDescSet(id)`
  const descOf = (id: string): Set<string> => {
    const set = new Set<string>();
    const q = [id];
    while (q.length > 0) {
      const curId = q.pop()!;
      for (const u of units) {
        if (u.parentId === curId && !set.has(u.id)) {
          set.add(u.id);
          q.push(u.id);
        }
      }
    }
    return set;
  };

  const deleteUnit = async (u: BeneficiaryUnit) => {
    if (!repo) return;
    if (!perm.guard('units', 'delete')) return;
    if (!(await imdConfirm('حذف هذه الوحدة نهائيًا؟', { ok: 'حذف', danger: true }))) {
      return;
    }
    try {
      await repo.deleteUnit(u.id);
      if (editIdRef.current === u.id) {
        editIdRef.current = null;
        setEditId(null);
      }
      if (!mountedRef.current) return;
      showImdToast('✔ حُذفت الوحدة');
      await fetchUnits();
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  };

  /// `unLoadHist()`
  const loadHist = async () => {
    if (!db || !repo) return;
    const u = units.find((x) => x.id === hUnit) ?? null;
    if (u === null) {
      setHistOut(<ImdLdText text="اختر الوحدة أولًا" colors={c} />);
      return;
    }
    const f = hFrom;
    const t = hTo;
    if (f.length > 0 && t.length > 0 && compareStrings(f, t) > 0) {
      setHistOut(
        <ImdEmojiText
          text="✖ نطاق التاريخ غير صحيح (من بعد إلى؟)"
          colors={c}
          style={{ color: c.danger.css }}
        />,
      );
      return;
    }
    setHistOut(<ImdLdText text="⏳ جارٍ التحميل…" colors={c} />);
    const iss = await new MovementsRepo(db).issuesOfUnit(u.id, u.name);
    const allItems = await repo.items();
    const itemMap: Record<string, string> = {};
    for (const i of allItems) {
      itemMap[i.id] = i.name.length > 0 ? i.name : i.code;
    }
    const fMs = f.length === 0 ? null : new Date(`${f}T00:00:00`).getTime();
    const tMs = t.length === 0 ? null : new Date(`${t}T23:59:59`).getTime();
    const filtered = iss
      .filter((r) => {
        if (r.status === 'DRAFT') return false;
        if (
          r.unitId !== u.id &&
          r.beneficiaryUnitId !== u.id &&
          r.beneficiaryUnitName !== u.name &&
          r.recipientDisplay !== u.name
        ) {
          return false;
        }
        const m = r.createdAt.getTime();
        if (fMs !== null && m < fMs) return false;
        if (tMs !== null && m > tMs) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (!mountedRef.current) return;
    if (filtered.length === 0) {
      setHistOut(
        <ImdLdText
          text="لا حركات صرف لهذه الوحدة في النطاق المحدد"
          colors={c}
        />,
      );
      return;
    }

    setHistOut(
      <div className="flex flex-col items-stretch">
        <ImdChipsRow>
          <ImdChip
            label={`الحركات: ${nf(filtered.length)}`}
            tone={ImdTone.ok}
            colors={c}
          />
          {(f.length > 0 || t.length > 0) && (
            <ImdChip
              label={`${f.length === 0 ? '…' : f} ← ${t.length === 0 ? '…' : t}`}
              tone={ImdTone.code}
              colors={c}
            />
          )}
        </ImdChipsRow>
        <ImdTable
          minWidth={560}
          cards={true}
          pageSize={50}
          colors={c}
          columns={[
            new ImdCol('التاريخ'),
            new ImdCol('الصنف', { flex: 2 }),
            new ImdCol('الكمية'),
            new ImdCol('المرجع'),
            new ImdCol('ملاحظات', { flex: 2 }),
          ]}
          rows={filtered.map((r) => [
            <span key="date">{arDate(r.createdAt)}</span>,
            <span key="item" className="font-semibold">
              {r.itemName.length > 0 ? r.itemName : (itemMap[r.itemId] ?? '—')}
            </span>,
            <span
              key="qty"
              className="font-black"
              style={{ color: c.danger.css }}
            >
              -{nf(r.qty)} {r.unitName}
            </span>,
            <span key="ref">{r.refNo.length === 0 ? '—' : r.refNo}</span>,
            <span key="notes">{r.notes}</span>,
          ])}
        />
      </div>,
    );
  };

  const w = perm.writable('units');
  const canDel = perm.canDelete('units');
  const cur =
    editId === null ? null : (units.find((x) => x.id === editId) ?? null);
  const skip = cur === null ? new Set<string>() : descOf(cur.id);

  const codeDeco = imdFieldDecoration({ readOnly: true, colors: c });
  const searchDeco = imdFieldDecoration({
    hint: 'بحث بالكود أو الاسم أو الاختصاص…',
    colors: c,
  });
  const shadows = imdShadow(c);

  const renderNode = (
    u: BeneficiaryUnit,
    isCamp: boolean,
    kids: number,
    isOpen: boolean,
  ): ReactNode => {
    const fg = isCamp ? c.onInverse : c.text;
    return (
      <div
        key={`node-${u.id}`}
        style={{
          marginBottom: isCamp ? 4 : 0,
          padding: '10px 12px',
          backgroundColor: isCamp ? c.inverse.css : c.surface.css,
          border: `1px solid ${(isCamp ? c.inverseLine : c.line).css}`,
          borderRadius: 10,
          color: fg.css,
          fontSize: isCamp ? 14 : 13.5,
          fontWeight: isCamp ? 600 : 400,
        }}
      >
        <div className="flex items-center">
          {isCamp && kids > 0 ? (
            <ImdTap
              cursor={ImdCursor.click}
              radius={8}
              tooltip={isOpen ? 'طي الفروع' : 'توسيع الفروع'}
              onTap={() =>
                setOpenMap((prev) => ({ ...prev, [u.id]: !isOpen }))
              }
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 28,
                  height: ImdSizes.touchMin,
                  backgroundColor: c.onInverseSoft.css,
                  borderRadius: 8,
                }}
              >
                <ImdIcon
                  name={isOpen ? 'chevron-down' : 'chevron-left'}
                  size={14}
                  color={c.onInverse}
                />
              </div>
            </ImdTap>
          ) : (
            <div style={{ width: 28, flexShrink: 0 }} />
          )}

          <div style={{ width: 8, flexShrink: 0 }} />

          <div className="flex min-w-0 flex-1 items-center">
            <span
              className="shrink-0 font-black"
              style={{
                color: (isCamp ? ImdColors.dark.accentHover : fg).css,
              }}
            >
              {u.code}
            </span>
            <span style={{ width: 8, flexShrink: 0 }} />
            <span className="min-w-0 truncate">{u.name}</span>
            {u.category.length > 0 && (
              <>
                <span style={{ width: 8, flexShrink: 0 }} />
                <span
                  className="min-w-0 truncate rounded-full px-[10px] py-[2px] text-[11px] font-medium"
                  style={{
                    backgroundColor: (isCamp ? c.onInverseSoft2 : c.subtle).css,
                    color: (isCamp ? c.onInverseText : c.text2).css,
                  }}
                >
                  {u.category}
                </span>
              </>
            )}
          </div>

          {isCamp && (
            <span
              className="shrink-0 text-[11.5px]"
              style={{ color: c.onInverseMuted.css }}
            >
              {nf(kids)} تابعة
            </span>
          )}

          {w && (
            <div
              className="inline-flex shrink-0 items-center"
              style={{ marginInlineStart: 8, gap: 6 }}
            >
              <ImdIconButton
                icon="edit"
                tooltip="تعديل"
                colors={c}
                onPressed={() => {
                  editIdRef.current = u.id;
                  setEditId(u.id);
                  initForm(units, u.id);
                }}
              />
              {kids === 0 && canDel && (
                <ImdIconButton
                  icon="trash"
                  tooltip="حذف"
                  kind={ImdBtnKind.danger}
                  colors={c}
                  onPressed={() => {
                    void deleteUnit(u);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /// `unPaintTree(q)` — بناء تكراري مع إبقاء آباء النتائج المطابقة.
  const buildTree = (list: readonly BeneficiaryUnit[]): ReactNode[] => {
    const q = searchText.trim().toLowerCase();
    const hit = (u: BeneficiaryUnit) =>
      q.length === 0 ||
      [u.code, u.name, u.category].some((v) => v.toLowerCase().includes(q));
    const out: ReactNode[] = [];
    for (const u of list) {
      const kids = childrenOf(u.id);
      const kidNodes = buildTree(kids);
      const isCamp = u.parentId.length === 0;
      if (!hit(u) && kidNodes.length === 0) continue;
      const isOpen = q.length > 0 ? true : openMap[u.id] !== false;
      out.push(renderNode(u, isCamp, kids.length, isOpen));
      if (kids.length > 0 && isOpen) {
        out.push(
          <div
            key={`kids-${u.id}`}
            className="flex flex-col items-stretch"
            style={{
              paddingInlineStart: 22,
              paddingTop: 4,
              paddingBottom: 6,
            }}
          >
            {kidNodes}
          </div>,
        );
      }
    }
    return out;
  };

  const renderTreeTab = () => {
    const nodes = buildTree(childrenOf(''));
    return (
      <div className="flex flex-col items-stretch">
        {w ? (
          <ImdICard
            title={
              cur !== null
                ? `وضع التعديل: ${cur.code} — ${cur.name}`
                : 'إضافة معسكر / وحدة'
            }
            icon={cur !== null ? 'edit' : 'plus-square'}
            colors={c}
          >
            <div className="flex flex-col items-stretch">
              <ImdF2>
                <ImdLabeled label="كود الوحدة *" colors={c}>
                  <div
                    style={{
                      ...codeDeco.containerStyle(false),
                      backgroundColor: c.fieldFill.css,
                    }}
                  >
                    <input
                      type="text"
                      aria-label="يتم توليد الكود تلقائيًا"
                      value={codeValue}
                      readOnly={true}
                      className="w-full bg-transparent"
                      style={{
                        ...codeDeco.inputStyle,
                        fontSize: 14,
                        fontWeight: 900,
                        color: c.text.css,
                      }}
                    />
                  </div>
                </ImdLabeled>
                <ImdLabeled label="التسلسل التبعي" colors={c}>
                  <ImdSelect<string>
                    value={parent}
                    items={[
                      ['', '— بدون (معسكر رئيسي) —'],
                      ...units
                        .filter((u) => u.id !== cur?.id && !skip.has(u.id))
                        .map(
                          (u): readonly [string, string] => [
                            u.id,
                            `${u.code} — ${u.name}`,
                          ],
                        ),
                    ]}
                    colors={c}
                    onChanged={(v) => {
                      const nextParent = v ?? '';
                      setParent(nextParent);
                      if (editIdRef.current === null) {
                        imdSetText(codeCtrl, nextCodeOf(units, nextParent));
                      }
                    }}
                  />
                </ImdLabeled>
              </ImdF2>
              <div style={{ height: 10 }} />
              <ImdF2>
                <ImdLabeled label="اسم المعسكر / الوحدة *" colors={c}>
                  <ImdFld controller={nameCtrl} colors={c} />
                </ImdLabeled>
                <ImdLabeled label="نوع الجهة *" colors={c}>
                  <ImdSelect<string>
                    value={type}
                    items={[
                      ['camp', 'معسكر رئيسي'],
                      ['unit', 'وحدة مستفيدة'],
                    ]}
                    colors={c}
                    onChanged={(v) => setType(v ?? 'camp')}
                  />
                </ImdLabeled>
              </ImdF2>
              <div style={{ height: 10 }} />
              <ImdF2>
                <ImdLabeled label="الاختصاص (مثال: مشاة)" colors={c}>
                  <ImdFld controller={catCtrl} colors={c} />
                </ImdLabeled>
                <div />
              </ImdF2>
              <div style={{ height: 12 }} />
              <div className="flex items-center gap-[10px]">
                <div className="min-w-0 flex-1">
                  <ImdButtonOutline
                    label="إلغاء / مسح"
                    expand={true}
                    colors={c}
                    onPressed={() => {
                      editIdRef.current = null;
                      setEditId(null);
                      initForm(units, null);
                    }}
                  />
                </div>
                <div className="min-w-0 flex-[2]">
                  <ImdButton
                    label={cur !== null ? 'حفظ التعديلات' : 'إضافة وحدة'}
                    icon={cur !== null ? 'save' : 'plus'}
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
        ) : (
          <ImdICard title="عرض فقط" icon="eye" colors={c}>
            <div style={{ paddingBlock: 6 }}>
              <ImdLdText text="الإضافة والتعديل متاحان لمدير النظام" colors={c} />
            </div>
          </ImdICard>
        )}

        {/* .unbar */}
        <div className="flex items-center pb-[10px]">
          <div className="min-w-0 flex-1" style={searchDeco.containerStyle(false)}>
            <input
              type="text"
              value={searchText}
              placeholder="بحث بالكود أو الاسم أو الاختصاص…"
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
          <div style={{ width: 8, flexShrink: 0 }} />
          <ImdIconButton
            icon="refresh"
            tooltip="تحديث الشجرة"
            colors={c}
            onPressed={() => {
              void fetchUnits().then(() => {
                if (mountedRef.current) showImdToast('🔄 حُدّثت الشجرة');
              });
            }}
          />
        </div>

        {/* .uTree */}
        <div
          className="flex flex-col items-stretch p-3"
          style={{
            backgroundColor: c.surface.css,
            border: `1px solid ${c.line.css}`,
            borderRadius: ImdSizes.radius,
            boxShadow:
              shadows.length > 0 ? shadows.map((s) => s.css).join(', ') : undefined,
          }}
        >
          {nodes.length === 0 ? (
            <div
              className="px-2 py-6 text-center font-bold"
              style={{ color: c.muted.css }}
            >
              لا توجد وحدات بعد — أضف أول معسكر من النموذج أعلاه
            </div>
          ) : (
            <div className="flex flex-col items-stretch">{nodes}</div>
          )}
        </div>
      </div>
    );
  };

  const renderHistTab = () => (
    <ImdICard title="سجل الصرف الاستهلاكي للوحدة" icon="file" colors={c}>
      <div className="flex flex-col items-stretch">
        <ImdSelect<string>
          value={hUnit}
          items={[
            ['', '— اختر الوحدة —'],
            ...units.map(
              (u): readonly [string, string] => [u.id, `${u.code} — ${u.name}`],
            ),
          ]}
          colors={c}
          onChanged={(v) => setHUnit(v ?? '')}
        />
        <div style={{ height: 10 }} />
        <ImdF2>
          <ImdLabeled label="من تاريخ" colors={c}>
            <ImdDateField
              value={hFrom}
              onChanged={(v) => setHFrom(v)}
              colors={c}
            />
          </ImdLabeled>
          <ImdLabeled label="إلى تاريخ" colors={c}>
            <ImdDateField
              value={hTo}
              onChanged={(v) => setHTo(v)}
              colors={c}
            />
          </ImdLabeled>
        </ImdF2>
        <div style={{ height: 12 }} />
        <div className="flex justify-start">
          <ImdButton
            label="عرض السجل"
            icon="search"
            colors={c}
            onPressed={() => {
              void loadHist();
            }}
          />
        </div>
        <div style={{ height: 14 }} />
        {histOut ?? (
          <ImdLdText text="اختر الوحدة ثم اضغط «عرض السجل»" colors={c} />
        )}
      </div>
    </ImdICard>
  );

  return (
    <ImdPage>
      <ImdPageTitle
        title="الوحدات المستفيدة"
        icon="users"
        subtitle="شجرة المعسكرات والوحدات التابعة + سجل الصرف الاستهلاكي"
        colors={c}
        actions={[
          <ExcelTemplatesButton
            key="tpl"
            kind={TemplateKind.units}
            onImported={() => {
              void fetchUnits();
            }}
          />,
        ]}
      />
      <ImdItabs
        value={tab}
        onChanged={(t) => setTab(t)}
        colors={c}
        tabs={[
          new ImdTab('tree', 'الشجرة التنظيمية', { icon: 'tent' }),
          new ImdTab('hist', 'سجل الصرف', { icon: 'file' }),
        ]}
      />
      {loading ? (
        <ImdLd text="جارٍ التحميل…" colors={c} />
      ) : tab === 'tree' ? (
        renderTreeTab()
      ) : (
        renderHistTab()
      )}
    </ImdPage>
  );
}
