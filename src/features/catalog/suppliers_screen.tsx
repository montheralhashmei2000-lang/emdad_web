import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthService } from '../../core/security/auth_service';
import { usePerm } from '../../core/security/perm';
import { useAppDatabase, useImdColors } from '../../core/theme/imd_theme';
import type { ImdMenuItem } from '../../core/ui/imd_context_menu';
import {
  ImdBullets,
  ImdChipsRow,
  ImdF2,
  ImdFld,
  ImdICard,
  ImdLabeled,
  ImdLdText,
  ImdSearchBar,
  ImdTextController,
  imdSetText,
} from '../../core/ui/imd_form';
import { nf } from '../../core/ui/imd_format';
import { ImdGrid2, ImdRbar } from '../../core/ui/imd_layout';
import { useImdScreenActions } from '../../core/ui/imd_screen_actions';
import { ImdShimmerTable } from '../../core/ui/imd_shimmer';
import { ImdSizes } from '../../core/ui/imd_tokens';
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
  ImdTable,
  ImdTone,
  showImdToast,
} from '../../core/ui/imd_widgets';
import type { Supplier } from '../../data/db/app_database';
import { AuditRepo } from '../../data/repos/audit_repo';
import { CatalogRepo } from '../../data/repos/catalog_repo';
import { MovementsRepo, type MovementUsage } from '../../data/repos/movements_repo';

interface SupplierUsage {
  count: number;
  receipts: number;
  returns: number;
  lastDate: string;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/// الموردون — نقل مطابق لـ `renderSuppliers()`: بحث وإحصاءات، نموذج إضافة/تعديل،
/// ملاحظات تشغيلية، وجدول بالاستخدام (الوارد والمرتجع للمورد) وآخر استخدام.
export function SuppliersScreen() {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const repo = useMemo(() => (db ? new CatalogRepo(db) : null), [db]);
  const perm = usePerm();
  const c = useImdColors();
  const screenActions = useImdScreenActions();

  const [items, setItems] = useState<Supplier[]>([]);
  const [usage, setUsage] = useState<Record<string, SupplierUsage>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [queryText, setQueryText] = useState<string>('');

  const qCtrl = useMemo(() => new ImdTextController(''), []);
  const nameCtrl = useMemo(() => new ImdTextController(''), []);
  const contactCtrl = useMemo(() => new ImdTextController(''), []);
  const phoneCtrl = useMemo(() => new ImdTextController(''), []);
  const cityCtrl = useMemo(() => new ImdTextController(''), []);
  const notesCtrl = useMemo(() => new ImdTextController(''), []);

  const mountedRef = useRef(true);
  const editIdRef = useRef<string | null>(null);
  editIdRef.current = editId;

  /// `supLoad()` ثم `renderSuppliers()`
  const renderData = useCallback(
    async (explicitEditId?: string | null) => {
      if (!db || !repo) return;
      const targetEditId =
        explicitEditId !== undefined ? explicitEditId : editIdRef.current;
      const sups = await repo.suppliers();
      const moves = new MovementsRepo(db);
      const receipts = await moves.usageOf('receipts', 'supplier');
      const returns = await moves.usageOf('returns', 'party', {
        where: "type = 'TO_SUPPLIER'",
      });
      sups.sort((a, b) => compareStrings(a.name, b.name));

      const nextUsage: Record<string, SupplierUsage> = {};
      const add = (src: Record<string, MovementUsage>, kind: 'receipts' | 'returns') => {
        for (const [k, v] of Object.entries(src)) {
          let u = nextUsage[k];
          if (!u) {
            u = { count: 0, receipts: 0, returns: 0, lastDate: '' };
            nextUsage[k] = u;
          }
          u.count += v.count;
          if (kind === 'receipts') u.receipts += v.count;
          if (kind === 'returns') u.returns += v.count;
          if (
            v.lastDate.length > 0 &&
            (u.lastDate.length === 0 || compareStrings(v.lastDate, u.lastDate) > 0)
          ) {
            u.lastDate = v.lastDate;
          }
        }
      };

      add(receipts, 'receipts');
      add(returns, 'returns');
      if (!mountedRef.current) return;

      const cur =
        targetEditId === null
          ? null
          : (sups.find((x) => x.id === targetEditId) ?? null);
      imdSetText(nameCtrl, cur?.name ?? '');
      imdSetText(contactCtrl, cur?.contact ?? '');
      imdSetText(phoneCtrl, cur?.phone ?? '');
      imdSetText(cityCtrl, cur?.city ?? '');
      imdSetText(notesCtrl, cur?.notes ?? '');

      setItems(sups);
      setUsage(nextUsage);
      setLoading(false);
    },
    [cityCtrl, contactCtrl, db, nameCtrl, notesCtrl, phoneCtrl, repo],
  );

  const save = useCallback(async () => {
    if (!db || !repo) return;
    const currentEditId = editIdRef.current;
    if (!perm.guard('suppliers', currentEditId !== null ? 'edit' : 'create')) return;
    const name = nameCtrl.text.trim();
    if (name.length === 0) {
      showImdToast('✖ أدخل اسم المورد');
      return;
    }
    const dup = items.some(
      (x) =>
        x.id !== currentEditId &&
        x.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (dup) {
      showImdToast('✖ يوجد مورد بنفس الاسم بالفعل');
      return;
    }
    const audit = new AuditRepo(db);
    const actor = auth?.currentUser ?? null;
    try {
      await repo.saveSupplier({
        id: currentEditId,
        name,
        contact: contactCtrl.text.trim(),
        phone: phoneCtrl.text.trim(),
        city: cityCtrl.text.trim(),
        notes: notesCtrl.text.trim(),
      });
      if (currentEditId !== null) {
        await audit.write('SUPPLIER_UPDATED', 'supplier', 'تعديل بيانات مورد', {
          details: { target: name, status: 'UPDATED', risk: 'normal' },
          actor,
        });
        if (mountedRef.current) showImdToast('✔ تم تحديث المورد');
      } else {
        await audit.write('SUPPLIER_CREATED', 'supplier', 'إضافة مورد جديد', {
          details: { target: name, status: 'CREATED', risk: 'normal' },
          actor,
        });
        if (mountedRef.current) showImdToast('🎉 تم إضافة المورد');
      }
      editIdRef.current = null;
      setEditId(null);
      await renderData(null);
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  }, [
    auth,
    cityCtrl,
    contactCtrl,
    db,
    items,
    nameCtrl,
    notesCtrl,
    perm,
    phoneCtrl,
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

  const deleteSupplier = async (it: Supplier) => {
    if (!db || !repo) return;
    if (!perm.guard('suppliers', 'delete')) return;
    const u = usage[it.name.trim()];
    if (
      (u?.count ?? 0) > 0 &&
      !(await imdConfirm(
        `هذا المورد مستخدم في سجلات سابقة (${nf(u!.count)}). هل تريد حذفه رغم ذلك؟`,
        { danger: true },
      ))
    ) {
      return;
    }
    if (
      !mountedRef.current ||
      !(await imdConfirm(`حذف المورد «${it.name}»؟`, { ok: 'حذف', danger: true }))
    ) {
      return;
    }
    if (!mountedRef.current) return;
    const actor = auth?.currentUser ?? null;
    try {
      await repo.deleteSupplier(it.id);
      await new AuditRepo(db).write('SUPPLIER_DELETED', 'supplier', 'حذف مورد', {
        details: {
          target: it.name,
          status: 'DELETED',
          qty: u?.count ?? 0,
          risk: 'sensitive',
        },
        actor,
      });
      if (!mountedRef.current) return;
      showImdToast('✔ تم حذف المورد');
      const nextEdit = editIdRef.current === it.id ? null : editIdRef.current;
      editIdRef.current = nextEdit;
      setEditId(nextEdit);
      await renderData(nextEdit);
    } catch (e) {
      if (mountedRef.current) showImdToast(`✖ ${e}`);
    }
  };

  const newRecord = () => {
    editIdRef.current = null;
    setEditId(null);
    void renderData(null);
  };

  // الإضافة والتعديل والحذف بصلاحية «الموردون» نفسها (لا بالمدير وحده)، وكل إجراءٍ محروسٌ في دالته.
  const can = perm.writable('suppliers');
  // صلاحية الحذف وحدها: `writable` يصدق بالإضافة أو التعديل أو الاعتماد،
  // فكان زرُّ الحذف يظهر لمن لا يملك الحذف.
  const canDel = perm.canDelete('suppliers');
  const cur =
    editId === null ? null : (items.find((x) => x.id === editId) ?? null);
  const q = queryText.trim().toLowerCase();
  const rows = items.filter(
    (x) =>
      q.length === 0 ||
      [x.name, x.phone, x.city, x.contact, x.notes].some((v) =>
        v.toLowerCase().includes(q),
      ),
  );
  const withPhone = items.filter((x) => x.phone.trim().length > 0).length;
  const used = items.filter((x) => (usage[x.name.trim()]?.count ?? 0) > 0).length;
  const orDash = (v: string): string => (v.length === 0 ? '—' : v);

  return (
    <ImdPage>
      <ImdPageTitle
        title="الموردون"
        icon="truck"
        subtitle="إدارة بيانات الموردين المستخدمة في سندات الاستلام والمرتجعات وإعدادات التوريد"
        colors={c}
      />

      <ImdICard colors={c}>
        <div className="flex flex-col items-stretch">
          <ImdSearchBar
            controller={qCtrl}
            hint="بحث باسم المورد أو الهاتف أو المدينة…"
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
                      label="مورد جديد"
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
              label={`إجمالي الموردين: ${nf(items.length)}`}
              tone={ImdTone.ok}
              colors={c}
            />
            <ImdChip
              label={`بأرقام هاتف: ${nf(withPhone)}`}
              tone={ImdTone.code}
              colors={c}
            />
            <ImdChip
              label={`موردون مستخدمون: ${nf(used)}`}
              tone={ImdTone.pend}
              colors={c}
            />
            <ImdChip
              label={`غير مستخدمين: ${nf(items.length - used)}`}
              tone={ImdTone.off}
              colors={c}
            />
          </ImdChipsRow>
        </div>
      </ImdICard>

      <ImdGrid2>
        <ImdPanel
          margin={0}
          title={cur !== null ? `تعديل مورد: ${cur.name}` : 'إضافة مورد جديد'}
          icon={cur !== null ? 'edit' : 'plus-square'}
          colors={c}
        >
          <div className="flex flex-col items-stretch">
            <ImdF2>
              <ImdLabeled label="اسم المورد *" size={11} colors={c}>
                <ImdFld controller={nameCtrl} enabled={can} colors={c} />
              </ImdLabeled>
              <ImdLabeled label="اسم جهة الاتصال" size={11} colors={c}>
                <ImdFld controller={contactCtrl} enabled={can} colors={c} />
              </ImdLabeled>
              <ImdLabeled label="رقم الهاتف" size={11} colors={c}>
                <ImdFld controller={phoneCtrl} enabled={can} colors={c} />
              </ImdLabeled>
              <ImdLabeled label="المدينة / العنوان المختصر" size={11} colors={c}>
                <ImdFld controller={cityCtrl} enabled={can} colors={c} />
              </ImdLabeled>
            </ImdF2>
            <div style={{ height: 4 }} />
            <ImdLabeled label="ملاحظات" size={11} colors={c}>
              <ImdFld controller={notesCtrl} enabled={can} colors={c} />
            </ImdLabeled>
            {can ? (
              <div style={{ paddingTop: 12 }}>
                <ImdRbar bottom={0}>
                  <ImdButton
                    label={cur !== null ? 'حفظ التعديلات' : 'إضافة المورد'}
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
              'يفضل توحيد اسم المورد بنفس الصياغة المستخدمة في سندات الاستلام.',
              'أضف رقم الهاتف واسم جهة الاتصال لتسريع المتابعة وقت التوريد أو المرتجعات.',
              'حذف المورد المستخدم سابقًا قد يربك السجلات التاريخية؛ الأفضل إيقاف استخدامه فقط أو تعديل بياناته.',
            ]}
          />
        </ImdPanel>
      </ImdGrid2>

      {loading ? (
        <ImdShimmerTable rows={6} columns={5} colors={c} />
      ) : (
        <ImdTable
          minWidth={820}
          cards={true}
          empty="لا موردين مطابقين — أضف أول مورد من النموذج أعلاه"
          pageSize={50}
          maxHeight={ImdSizes.tableMaxHeight()}
          colors={c}
          columns={[
            new ImdCol('الاسم', { flex: 2 }),
            new ImdCol('جهة الاتصال'),
            new ImdCol('الهاتف'),
            new ImdCol('المدينة'),
            new ImdCol('الاستخدام', { flex: 2 }),
            new ImdCol('آخر استخدام'),
            new ImdCol('ملاحظات'),
            ...(can ? [new ImdCol('', { width: 110 })] : []),
          ]}
          rowMenu={
            !can
              ? null
              : (i): ImdMenuItem[] => [
                  {
                    label: 'تعديل',
                    icon: 'edit',
                    onTap: () => {
                      editIdRef.current = rows[i].id;
                      setEditId(rows[i].id);
                      void renderData(rows[i].id);
                    },
                  },
                  ...(canDel
                    ? [
                        {
                          label: 'حذف',
                          icon: 'trash',
                          danger: true,
                          onTap: () => {
                            void deleteSupplier(rows[i]);
                          },
                        },
                      ]
                    : []),
                ]
          }
          // قيم الخلايا الخام: تصفية الأعمدة والتجميع (مثلًا حسب المدينة).
          values={rows.map((x) => {
            const u = usage[x.name.trim()];
            return [
              orDash(x.name),
              orDash(x.contact),
              orDash(x.phone),
              orDash(x.city),
              (u?.count ?? 0) > 0
                ? `وارد ${nf(u!.receipts)} • مرتجع ${nf(u!.returns)}`
                : '—',
              orDash(u?.lastDate ?? ''),
              orDash(x.notes),
            ];
          })}
          rows={rows.map((x) => {
            const u = usage[x.name.trim()];
            return [
              <span key="name" className="font-semibold">
                {orDash(x.name)}
              </span>,
              <span key="contact">{orDash(x.contact)}</span>,
              <span key="phone">{orDash(x.phone)}</span>,
              <span key="city">{orDash(x.city)}</span>,
              <span key="usage">
                {(u?.count ?? 0) > 0
                  ? `وارد ${nf(u!.receipts)} • مرتجع ${nf(u!.returns)}`
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
                            void deleteSupplier(x);
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
    </ImdPage>
  );
}
