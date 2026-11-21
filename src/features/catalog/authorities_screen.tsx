import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuthService } from '../../core/security/auth_service';
import { usePerm } from '../../core/security/perm';
import { useAppDatabase, useImdColors } from '../../core/theme/imd_theme';
import type { ImdMenuItem } from '../../core/ui/imd_context_menu';
import {
  ImdCheckbox,
  ImdF2,
  ImdFld,
  ImdLabeled,
  ImdLd,
  ImdTextController,
  imdSetText,
} from '../../core/ui/imd_form';
import { nf } from '../../core/ui/imd_format';
import { ImdIcon } from '../../core/ui/imd_icon';
import { ImdKpi, ImdKpis } from '../../core/ui/imd_layout';
import { useImdScreenActions } from '../../core/ui/imd_screen_actions';
import {
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
import type { SupplyAuthority } from '../../data/db/app_database';
import { RationRepo } from '../../data/repos/ration_repo';
import { PermAction } from '../../domain/access_control';

export interface AuthoritiesScreenProps {
  /// تبويبًا داخل الإعدادات: بلا عنوان صفحة ولا هوامشها.
  readonly embedded?: boolean;
}

/// جهات الاعتمادات: من يعتمدون الطلبيات ومن يطلب منهم **المخزن الرئيسي**.
///
/// المخزن الرئيسي لا يطلب من مستودعٍ آخر — يطلب من جهةٍ في تسلسل الفرقة: ركن
/// الإمداد، رئيس الشعبة، قائد الفرقة. وهذه ليست طرفًا مخزنيًّا فلا رصيد لها
/// ولا حركة عليها؛ ولذلك دليلٌ مستقل لا صفٌّ في المستودعات.
///
/// ويُدار من هنا لا من الكود: تُضاف جهةٌ أو يُغيَّر مسمّاها بلا تحديثٍ
/// للبرنامج، ويُزامَن كبقية الأدلة.
///
/// وموضعه الإعدادات لا قائمة العمليات: دليلٌ يُضبط مرةً ثم يُنسى، لا شاشةٌ
/// تُفتح كل يوم — فوجوده بين شاشات التشغيل يزحم ما يُستعمل فعلًا.
export function AuthoritiesScreen({ embedded = false }: AuthoritiesScreenProps) {
  const auth = useAuthService();
  const db = useAppDatabase() ?? auth?.db ?? null;
  const repo = useMemo(() => (db ? new RationRepo(db) : null), [db]);
  const perm = usePerm();
  const c = useImdColors();
  const screenActions = useImdScreenActions();

  const [items, setItems] = useState<SupplyAuthority[]>([]);
  /// عدد الطلبيات المعلّقة بكل جهة — بها تُعرف الجهة التي لا تُحذف.
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [active, setActive] = useState<boolean>(true);

  const nameCtrl = useMemo(() => new ImdTextController(''), []);
  const titleCtrl = useMemo(() => new ImdTextController(''), []);
  const notesCtrl = useMemo(() => new ImdTextController(''), []);

  const mountedRef = useRef(true);

  const renderData = useCallback(async () => {
    if (!repo) return;
    const rows = await repo.authorities();
    const orders = await repo.orders();
    const nextUsage: Record<string, number> = {};
    for (const o of orders) {
      if (o.authorityId.length === 0) continue;
      nextUsage[o.authorityId] = (nextUsage[o.authorityId] ?? 0) + 1;
    }
    if (!mountedRef.current) return;
    setItems(rows);
    setUsage(nextUsage);
    setLoading(false);
  }, [repo]);

  const reset = useCallback(() => {
    imdSetText(nameCtrl, '');
    imdSetText(titleCtrl, '');
    imdSetText(notesCtrl, '');
    setEditId(null);
    setActive(true);
  }, [nameCtrl, notesCtrl, titleCtrl]);

  const editAuthority = (a: SupplyAuthority) => {
    imdSetText(nameCtrl, a.name);
    imdSetText(titleCtrl, a.title);
    imdSetText(notesCtrl, a.notes);
    setEditId(a.id);
    setActive(a.active);
  };

  const save = useCallback(async () => {
    if (!repo) return;
    if (
      !perm.guard(
        'supplyAuthorities',
        editId === null ? PermAction.create : PermAction.edit,
      )
    ) {
      return;
    }
    const res = await repo.saveAuthority({
      id: editId,
      name: nameCtrl.text,
      title: titleCtrl.text,
      notes: notesCtrl.text,
      active,
      actor: auth?.currentUser?.email ?? '',
    });
    if (!mountedRef.current) return;
    showImdToast(res.ok ? '✔ حُفظت الجهة' : res.error, { error: !res.ok });
    if (res.ok) {
      reset();
      await renderData();
    }
  }, [active, auth, editId, nameCtrl, notesCtrl, perm, renderData, repo, reset, titleCtrl]);

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

  const deleteAuthority = async (a: SupplyAuthority) => {
    if (!repo) return;
    if (!perm.guard('supplyAuthorities', PermAction.delete)) return;
    if (!(await imdConfirm(`حذف الجهة «${a.name}»؟`, { ok: 'حذف', danger: true }))) {
      return;
    }
    if (!mountedRef.current) return;
    const res = await repo.deleteAuthority(a.id, {
      actor: auth?.currentUser?.email ?? '',
    });
    if (!mountedRef.current) return;
    showImdToast(res.ok ? '✔ حُذفت الجهة' : res.error, { error: !res.ok });
    if (res.ok) {
      if (editId === a.id) reset();
      await renderData();
    }
  };

  /// إطار القسم: لوحةٌ حين تكون الشاشة مستقلة، وعنوانٌ خفيف حين تُضمَّن.
  ///
  /// لوحةٌ داخل لوحة تُضاعف الهوامش، فيضيق الجدول عن أضيق عرضٍ يقبله ويفيض
  /// خارج الشاشة. والإعدادات تضع محتواها في لوحةٍ أصلًا.
  const wrapSection = (title: string, icon: string, child: ReactNode): ReactNode => {
    if (!embedded) {
      return (
        <ImdPanel title={title} icon={icon} colors={c}>
          {child}
        </ImdPanel>
      );
    }
    return (
      <div className="flex flex-col items-stretch" style={{ paddingTop: 14 }}>
        <div className="flex items-center" style={{ paddingBottom: 8 }}>
          <ImdIcon name={icon} size={15} color={c.accent} />
          <span style={{ width: 6, flexShrink: 0 }} />
          <span
            className="text-[14px] font-bold"
            style={{ color: c.text.css }}
          >
            {title}
          </span>
        </div>
        {child}
      </div>
    );
  };

  if (loading) {
    const spinner = <ImdLd text="⏳ جارٍ التحميل…" colors={c} />;
    return embedded ? (
      spinner
    ) : (
      <ImdPage>
        <ImdPageTitle title="جهات الاعتمادات" icon="users" colors={c} />
        {spinner}
      </ImdPage>
    );
  }

  const can = perm.writable('supplyAuthorities');
  // صلاحية الحذف وحدها: `writable` يصدق بالإضافة أو التعديل أو الاعتماد.
  const canDel = perm.canDelete('supplyAuthorities');
  const activeCount = items.filter((a) => a.active).length;

  const body = (
    <>
      {!embedded && (
        <ImdPageTitle
          title="جهات الاعتمادات"
          icon="users"
          subtitle="من يعتمدون الطلبيات ويطلب منهم المخزن الرئيسي: ركن الإمداد، رئيس الشعبة، قائد الفرقة — جهاتٌ لا مستودعات"
          colors={c}
        />
      )}

      <ImdKpis colors={c}>
        <ImdKpi label="إجمالي الجهات" value={nf(items.length)} colors={c} />
        <ImdKpi label="مفعَّلة" value={nf(activeCount)} colors={c} />
        <ImdKpi
          label="معطَّلة"
          value={nf(items.length - activeCount)}
          colors={c}
          extra={
            items.length === activeCount ? null : (
              <ImdChip
                label="لا تظهر في الطلبيات"
                tone={ImdTone.off}
                colors={c}
              />
            )
          }
        />
      </ImdKpis>

      {can &&
        wrapSection(
          editId === null ? 'إضافة جهة' : 'تعديل جهة',
          editId === null ? 'plus-square' : 'edit',
          <div className="flex flex-col items-stretch">
            <ImdF2>
              <ImdLabeled label="اسم الجهة *" size={11} colors={c}>
                <ImdFld controller={nameCtrl} colors={c} />
              </ImdLabeled>
              <ImdLabeled label="المسمّى الوظيفي" size={11} colors={c}>
                <ImdFld
                  controller={titleCtrl}
                  hint="ركن إمداد الفرقة"
                  colors={c}
                />
              </ImdLabeled>
            </ImdF2>
            <div style={{ height: 10 }} />
            <ImdLabeled label="ملاحظات" colors={c}>
              <ImdFld controller={notesCtrl} maxLines={2} colors={c} />
            </ImdLabeled>
            <div style={{ height: 10 }} />
            <ImdCheckbox
              value={active}
              label="مفعَّلة — تظهر في قائمة الطلبيات"
              colors={c}
              onChanged={(v) => setActive(v)}
            />
            <div style={{ height: 12 }} />
            <div className="flex flex-wrap gap-[10px]">
              <ImdButton
                label={editId === null ? 'إضافة' : 'حفظ التعديل'}
                icon="check"
                colors={c}
                onPressed={() => {
                  void save();
                }}
              />
              {editId !== null && (
                <ImdButtonOutline
                  label="إلغاء"
                  icon="x"
                  colors={c}
                  onPressed={reset}
                />
              )}
            </div>
          </div>,
        )}

      {wrapSection(
        'الجهات',
        'list',
        <ImdTable
          empty="لا جهات بعد — أضف ركن إمداد الفرقة أولًا"
          minWidth={560}
          cards={true}
          pageSize={50}
          colors={c}
          columns={[
            new ImdCol('الجهة'),
            new ImdCol('المسمّى'),
            new ImdCol('الحالة'),
            new ImdCol('طلبياتها', { numeric: true }),
            new ImdCol('ملاحظات'),
            new ImdCol('', { center: true }),
          ]}
          rowMenu={
            !can
              ? null
              : (i): ImdMenuItem[] => [
                  {
                    label: 'تعديل',
                    icon: 'edit',
                    onTap: () => editAuthority(items[i]),
                  },
                  ...(canDel && (usage[items[i].id] ?? 0) === 0
                    ? [
                        {
                          label: 'حذف',
                          icon: 'trash',
                          danger: true,
                          onTap: () => {
                            void deleteAuthority(items[i]);
                          },
                        },
                      ]
                    : []),
                ]
          }
          rows={items.map((a) => [
            <span key="name" className="font-semibold">
              {a.name}
            </span>,
            <span key="title">{a.title.length === 0 ? '—' : a.title}</span>,
            a.active ? (
              <ImdChip key="status" label="مفعَّلة" tone={ImdTone.ok} colors={c} />
            ) : (
              <ImdChip key="status" label="معطَّلة" tone={ImdTone.off} colors={c} />
            ),
            <span key="usage">{nf(usage[a.id] ?? 0)}</span>,
            <span key="notes" style={{ color: c.muted.css }}>
              {a.notes.length === 0 ? '—' : a.notes}
            </span>,
            <div key="acts" className="flex flex-wrap items-center justify-center gap-[6px]">
              {can && (
                <ImdIconButton
                  icon="edit"
                  tooltip="تعديل"
                  colors={c}
                  onPressed={() => editAuthority(a)}
                />
              )}
              {canDel && (usage[a.id] ?? 0) === 0 && (
                <ImdIconButton
                  icon="trash"
                  tooltip="حذف"
                  colors={c}
                  onPressed={() => {
                    void deleteAuthority(a);
                  }}
                />
              )}
            </div>,
          ])}
        />,
      )}
    </>
  );

  return embedded ? (
    <div className="flex flex-col items-stretch">{body}</div>
  ) : (
    <ImdPage>{body}</ImdPage>
  );
}
