import { ImdShellTab, ImdTabsShell } from '../../core/ui/imd_tabs_shell';
import {
  ActivityIntelScreen,
  ActualEntitlementScreen,
  AssetsScreen,
  AuditScreen,
  BalancesScreen,
  CampLedgerScreen,
  CampSettlementScreen,
  DailyOperationsScreen,
  DestructionScreen,
  ExecutiveCmdScreen,
  HealthOpsScreen,
  IssueScreen,
  ItemsScreen,
  KitchensScreen,
  OpeningScreen,
  PendingScreen,
  RationOrderScreen,
  RatiosScreen,
  ReceiveScreen,
  ReportsCenterScreen,
  ReturnsScreen,
  SensitiveOpsScreen,
  StockAlertsScreen,
  StrengthScreen,
  SuppliersScreen,
  TransferScreen,
  UnitsScreen,
  WarehousesScreen,
} from './pending_screens_stubs';

/// أبواب قسم الإمداد والتموين.
///
/// **الشريط فهرسٌ لا سجل.** ستّة وعشرون بندًا في خمسة أقسام تُقرأ بالبحث لا
/// بالنظر. والمتقارب فيها ظاهر: سندات الحركة الخمسة يحرّرها أمينُ مستودعٍ
/// واحد في جلسةٍ واحدة، والأدلّة الستة تُعرَّف مرةً وتُقرأ دائمًا، والرقابة
/// خمسُ نظراتٍ على السجل نفسه.
///
/// وكلُّ بابٍ يُخفي تبويبةً لا يملك المستخدم صلاحيتها: الجمع تنظيمٌ للقائمة
/// لا توسيعٌ للأذونات.

/// حركة المخزون — السندات التي تحرّك الرصيد.
export function SupplyMovesScreen({
  initialTab = 'receive',
}: {
  readonly initialTab?: string;
} = {}) {
  return (
    <ImdTabsShell
      initial={initialTab}
      emptyMessage="لا صلاحية لأي من سندات الحركة"
      tabs={[
        new ImdShellTab({
          id: 'receive',
          label: 'الاستلام',
          icon: 'download',
          perm: 'receive',
          builder: () => <ReceiveScreen />,
        }),
        new ImdShellTab({
          id: 'issue',
          label: 'الصرف',
          icon: 'upload',
          perm: 'issue',
          builder: () => <IssueScreen />,
        }),
        new ImdShellTab({
          id: 'transfer',
          label: 'التحويل',
          icon: 'refresh',
          perm: 'transfer',
          builder: () => <TransferScreen />,
        }),
        new ImdShellTab({
          id: 'returns',
          label: 'المرتجعات',
          icon: 'undo',
          perm: 'returns',
          builder: () => <ReturnsScreen />,
        }),
        new ImdShellTab({
          id: 'opening',
          label: 'الأرصدة الافتتاحية',
          icon: 'clipboard',
          perm: 'opening',
          builder: () => <OpeningScreen />,
        }),
        new ImdShellTab({
          id: 'destruction',
          label: 'الإتلاف',
          icon: 'trash',
          perm: 'destruction',
          builder: () => <DestructionScreen />,
        }),
      ]}
    />
  );
}

/// الطلبيات — ما يُطلب قبل أن يُستلم.
///
/// وهي غير الحركة: الطلبية **لا تمسّ الرصيد** حتى تُعتمد ويُحرَّر سندها.
export function SupplyOrdersScreen({
  initialTab = 'rationOrders',
}: {
  readonly initialTab?: string;
} = {}) {
  return (
    <ImdTabsShell
      initial={initialTab}
      emptyMessage="لا صلاحية للطلبيات"
      tabs={[
        new ImdShellTab({
          id: 'rationOrders',
          label: 'طلبيات الإعاشة',
          icon: 'clipboard',
          perm: 'rationOrders',
          builder: () => <RationOrderScreen />,
        }),
        new ImdShellTab({
          id: 'pendingOrders',
          label: 'أوامر التوريد المعلقة',
          icon: 'bell',
          perm: 'pendingOrders',
          builder: () => <PendingScreen />,
        }),
      ]}
    />
  );
}

/// البيانات الأساسية — أدلّة القسم التي يُبنى عليها كل سند.
export function SupplyDataScreen({
  initialTab = 'items',
}: {
  readonly initialTab?: string;
} = {}) {
  return (
    <ImdTabsShell
      initial={initialTab}
      emptyMessage="لا صلاحية لأي من الأدلّة"
      tabs={[
        new ImdShellTab({
          id: 'items',
          label: 'الأصناف',
          icon: 'package',
          perm: 'items',
          builder: () => <ItemsScreen />,
        }),
        new ImdShellTab({
          id: 'stores',
          label: 'المستودعات',
          icon: 'warehouse',
          perm: 'stores',
          builder: () => <WarehousesScreen />,
        }),
        new ImdShellTab({
          id: 'units',
          label: 'الوحدات المستفيدة',
          icon: 'users',
          perm: 'units',
          builder: () => <UnitsScreen />,
        }),
        new ImdShellTab({
          id: 'suppliers',
          label: 'الموردون',
          icon: 'truck',
          perm: 'suppliers',
          builder: () => <SuppliersScreen />,
        }),
        new ImdShellTab({
          id: 'kitchens',
          label: 'المطابخ والأفران',
          icon: 'utensils',
          perm: 'kitchens',
          builder: () => <KitchensScreen />,
        }),
        new ImdShellTab({
          id: 'assets',
          label: 'الأصول الثابتة',
          icon: 'package',
          perm: 'assets',
          builder: () => <AssetsScreen />,
        }),
      ]}
    />
  );
}

/// التشغيل اليومي — ما يُفتح كل صباح.
export function SupplyDailyScreen({
  initialTab = 'feeding',
}: {
  readonly initialTab?: string;
} = {}) {
  return (
    <ImdTabsShell
      initial={initialTab}
      emptyMessage="لا صلاحية لشاشات التشغيل اليومي"
      tabs={[
        new ImdShellTab({
          id: 'feeding',
          label: 'التفريدة اليومية',
          icon: 'calendar',
          perm: 'feeding',
          builder: () => <StrengthScreen />,
        }),
        new ImdShellTab({
          id: 'dailyOperations',
          label: 'التخطيط والتشغيل',
          icon: 'calendar',
          perm: 'dailyOperations',
          builder: () => <DailyOperationsScreen />,
        }),
        new ImdShellTab({
          id: 'ratios',
          label: 'نسب الاستحقاق',
          icon: 'scale',
          perm: 'ratios',
          builder: () => <RatiosScreen />,
        }),
      ]}
    />
  );
}

/// التقارير — نظراتٌ على البيانات نفسها.
export function SupplyReportsScreen({
  initialTab = 'reports',
}: {
  readonly initialTab?: string;
} = {}) {
  return (
    <ImdTabsShell
      initial={initialTab}
      emptyMessage="لا صلاحية لأي من التقارير"
      tabs={[
        new ImdShellTab({
          id: 'reports',
          label: 'مركز التقارير',
          icon: 'chart',
          perm: 'reports',
          builder: () => <ReportsCenterScreen />,
        }),
        new ImdShellTab({
          id: 'balances',
          label: 'الأرصدة الحالية',
          icon: 'calculator',
          perm: 'balances',
          builder: () => <BalancesScreen />,
        }),
        new ImdShellTab({
          id: 'stockAlerts',
          label: 'تنبيهات المخزون',
          icon: 'alert',
          perm: 'balances',
          builder: () => <StockAlertsScreen />,
        }),
      ]}
    />
  );
}

/// الرقابة والتدقيق — خمسُ نظراتٍ على السجل نفسه.
///
/// السجل يُقرأ سطرًا سطرًا للتحقيق، ويُقرأ مجمَّعًا لكشف الانحراف، ويُقرأ
/// مرشَّحًا على الحسّاس وحده. وثلاثتها بابٌ واحد.
export function SupplyAuditScreen({
  initialTab = 'auditTrail',
}: {
  readonly initialTab?: string;
} = {}) {
  return (
    <ImdTabsShell
      initial={initialTab}
      emptyMessage="لا صلاحية للرقابة والتدقيق"
      tabs={[
        new ImdShellTab({
          id: 'auditTrail',
          label: 'سجل النشاط',
          icon: 'scan',
          perm: 'auditTrail',
          builder: () => <AuditScreen />,
        }),
        new ImdShellTab({
          id: 'activityIntel',
          label: 'ذكاء النشاط',
          icon: 'bulb',
          perm: 'activityIntel',
          builder: () => <ActivityIntelScreen />,
        }),
        new ImdShellTab({
          id: 'sensitiveOps',
          label: 'التغييرات الحساسة',
          icon: 'alert',
          perm: 'sensitiveOps',
          builder: () => <SensitiveOpsScreen />,
        }),
        new ImdShellTab({
          id: 'executiveCmd',
          label: 'مركز القيادة',
          icon: 'target',
          perm: 'executiveCmd',
          builder: () => <ExecutiveCmdScreen />,
        }),
        new ImdShellTab({
          id: 'healthOps',
          label: 'صحة النظام',
          icon: 'shield',
          perm: 'healthOps',
          builder: () => <HealthOpsScreen />,
        }),
      ]}
    />
  );
}

/// حساب المعسكر والاستحقاق — التقارير الثلاثة المترابطة في شاشةٍ واحدة.
///
/// الاستحقاق الفعلي يحسب المستحق مقابل الواصل لأي نطاق (الجهة، معسكرٌ ومخزنه،
/// وحدة، مستودع) على أي مدى؛ وسجل المعسكر يحفظه شهرًا بشهر بالقاعدة نفسها
/// (`EntitlementScopes`)؛ والتصفية تُقفل الشهر وترحّل رصيده. كانت ثلاثة بنودٍ
/// متفرقة لحسابٍ واحد.
export function CampAccountsScreen({
  initialTab = 'actualEntitlement',
}: {
  readonly initialTab?: string;
} = {}) {
  return (
    <ImdTabsShell
      initial={initialTab}
      emptyMessage="لا صلاحية لحسابات المعسكرات والاستحقاق"
      tabs={[
        new ImdShellTab({
          id: 'actualEntitlement',
          label: 'الاستحقاق الفعلي',
          icon: 'calculator',
          perm: 'actualEntitlement',
          builder: () => <ActualEntitlementScreen />,
        }),
        new ImdShellTab({
          id: 'campLedger',
          label: 'سجل حساب المعسكر',
          icon: 'list',
          perm: 'campLedger',
          builder: () => <CampLedgerScreen />,
        }),
        new ImdShellTab({
          id: 'campSettlement',
          label: 'تصفية الشهر',
          icon: 'scale',
          perm: 'campSettlement',
          builder: () => <CampSettlementScreen />,
        }),
      ]}
    />
  );
}
