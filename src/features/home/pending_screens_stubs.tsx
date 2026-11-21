// ملف تجميع البدائل الصورية الدنيا لشاشات المراحل 7–27 (موسوم بـ // MISSING دون اختراع شاشات وهمية).
// يُستبدل كل مُصدَّر هنا بملفه الفعلي عند الوصول إلى مرحلته دون كسر القشرة.

import { useImdColors } from '../../core/theme/imd_theme';
import { ImdIconButton, showImdToast } from '../../core/ui/imd_widgets';
import type { ReportId } from '../../data/repos/reports_repo';
import { MissingScreenStub } from './missing_screen_stub';

// MISSING: lib/features/home/notification_bell.dart (المرحلة 23)
export interface NotificationBellProps {
  readonly onOpenPage: (page: string) => void;
  readonly space: string;
  readonly dense?: boolean;
}

export function NotificationBell({
  onOpenPage: _onOpenPage,
  space: _space,
  dense = false,
}: NotificationBellProps) {
  const c = useImdColors();
  return (
    <span data-imd-notification-bell="true" className="inline-flex">
      <ImdIconButton
        icon="bell"
        tooltip="التنبيهات"
        dense={dense}
        colors={c}
        onPressed={() => {
          // MISSING: lib/features/home/notification_bell.dart
        }}
      />
    </span>
  );
}

// MISSING: lib/features/search/search_modal.dart (المرحلة 23)
export function showSearchModal(_options: {
  readonly onOpenPage: (page: string) => void;
}): void {
  showImdToast('// MISSING: lib/features/search/search_modal.dart');
}

// ═════════ المرحلة 7: البيانات الأساسية (١) ═════════

// MISSING: lib/features/catalog/items_screen.dart
export function ItemsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/catalog/items_screen.dart"
      screenName="ItemsScreen"
    />
  );
}

// MISSING: lib/features/catalog/warehouses_screen.dart
export function WarehousesScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/catalog/warehouses_screen.dart"
      screenName="WarehousesScreen"
    />
  );
}

// MISSING: lib/features/catalog/suppliers_screen.dart
export function SuppliersScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/catalog/suppliers_screen.dart"
      screenName="SuppliersScreen"
    />
  );
}

// MISSING: lib/features/catalog/units_screen.dart
export function UnitsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/catalog/units_screen.dart"
      screenName="UnitsScreen"
    />
  );
}

// MISSING: lib/features/catalog/kitchens_screen.dart
export function KitchensScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/catalog/kitchens_screen.dart"
      screenName="KitchensScreen"
    />
  );
}

// ═════════ المرحلة 8: البيانات الأساسية (٢) ═════════

// MISSING: lib/features/catalog/assets_screen.dart
export function AssetsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/catalog/assets_screen.dart"
      screenName="AssetsScreen"
    />
  );
}

// ═════════ المراحل 10–13: العمليات المخزنية والطلبيات والجرد ═════════

// MISSING: lib/features/inventory/receive_screen.dart
export function ReceiveScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/receive_screen.dart"
      screenName="ReceiveScreen"
    />
  );
}

// MISSING: lib/features/inventory/issue_screen.dart
export function IssueScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/issue_screen.dart"
      screenName="IssueScreen"
    />
  );
}

// MISSING: lib/features/inventory/transfer_screen.dart
export function TransferScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/transfer_screen.dart"
      screenName="TransferScreen"
    />
  );
}

// MISSING: lib/features/inventory/returns_screen.dart
export function ReturnsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/returns_screen.dart"
      screenName="ReturnsScreen"
    />
  );
}

// MISSING: lib/features/inventory/opening_screen.dart
export function OpeningScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/opening_screen.dart"
      screenName="OpeningScreen"
    />
  );
}

// MISSING: lib/features/inventory/destruction_screen.dart
export function DestructionScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/destruction_screen.dart"
      screenName="DestructionScreen"
    />
  );
}

// MISSING: lib/features/inventory/pending_screen.dart
export function PendingScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/pending_screen.dart"
      screenName="PendingScreen"
    />
  );
}

// MISSING: lib/features/inventory/ration_order_screen.dart
export function RationOrderScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/inventory/ration_order_screen.dart"
      screenName="RationOrderScreen"
    />
  );
}

// MISSING: lib/features/stocktake/stocktake_screen.dart
export function StocktakeScreen({
  initialTab,
  standalone,
}: {
  readonly initialTab?: string;
  readonly standalone?: boolean;
} = {}) {
  return (
    <MissingScreenStub
      sourcePath="lib/features/stocktake/stocktake_screen.dart"
      screenName="StocktakeScreen"
      extra={[initialTab, standalone ? 'standalone' : ''].filter(Boolean).join(', ')}
    />
  );
}

// ═════════ المراحل 14–16: التشغيل اليومي والوجبات ═════════

// MISSING: lib/features/daily/strength_screen.dart
export function StrengthScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/daily/strength_screen.dart"
      screenName="StrengthScreen"
    />
  );
}

// MISSING: lib/features/daily/ratios_screen.dart
export function RatiosScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/daily/ratios_screen.dart"
      screenName="RatiosScreen"
    />
  );
}

// MISSING: lib/features/daily/meal_plan_screen.dart
export function MealPlanScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/daily/meal_plan_screen.dart"
      screenName="MealPlanScreen"
    />
  );
}

// MISSING: lib/features/daily/meal_dispatch_screen.dart
export function MealDispatchScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/daily/meal_dispatch_screen.dart"
      screenName="MealDispatchScreen"
    />
  );
}

// MISSING: lib/features/daily/kitchen_log_screen.dart
export function KitchenLogScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/daily/kitchen_log_screen.dart"
      screenName="KitchenLogScreen"
    />
  );
}

// MISSING: lib/features/daily/daily_operations_screen.dart
export function DailyOperationsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/daily/daily_operations_screen.dart"
      screenName="DailyOperationsScreen"
    />
  );
}

// ═════════ المرحلة 17: التقارير وحساب المعسكر ═════════

// MISSING: lib/features/reports/balances_screen.dart
export function BalancesScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/reports/balances_screen.dart"
      screenName="BalancesScreen"
    />
  );
}

// MISSING: lib/features/reports/reports_center_screen.dart
export function ReportsCenterScreen({
  initialReport,
  standalone,
}: {
  readonly initialReport?: ReportId;
  readonly standalone?: boolean;
} = {}) {
  return (
    <MissingScreenStub
      sourcePath="lib/features/reports/reports_center_screen.dart"
      screenName="ReportsCenterScreen"
      extra={[initialReport, standalone ? 'standalone' : ''].filter(Boolean).join(', ')}
    />
  );
}

// MISSING: lib/features/reports/actual_entitlement_screen.dart
export function ActualEntitlementScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/reports/actual_entitlement_screen.dart"
      screenName="ActualEntitlementScreen"
    />
  );
}

// MISSING: lib/features/reports/camp_ledger_screen.dart
export function CampLedgerScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/reports/camp_ledger_screen.dart"
      screenName="CampLedgerScreen"
    />
  );
}

// MISSING: lib/features/reports/camp_settlement_screen.dart
export function CampSettlementScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/reports/camp_settlement_screen.dart"
      screenName="CampSettlementScreen"
    />
  );
}

// ═════════ المراحل 20 و23: الإعدادات، التدقيق، اللوحة، التنبيهات، المراقبة ═════════

// MISSING: lib/features/settings/settings_screen.dart
export function SettingsScreen({
  initialSection,
}: {
  readonly initialSection?: string;
} = {}) {
  return (
    <MissingScreenStub
      sourcePath="lib/features/settings/settings_screen.dart"
      screenName="SettingsScreen"
      extra={initialSection}
    />
  );
}

// MISSING: lib/features/settings/audit_screen.dart
export function AuditScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/settings/audit_screen.dart"
      screenName="AuditScreen"
    />
  );
}

// MISSING: lib/features/home/dashboard_screen.dart
export function DashboardScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/home/dashboard_screen.dart"
      screenName="DashboardScreen"
    />
  );
}

// MISSING: lib/features/alerts/stock_alerts_screen.dart
export function StockAlertsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/alerts/stock_alerts_screen.dart"
      screenName="StockAlertsScreen"
    />
  );
}

// MISSING: lib/features/insights/activity_intel_screen.dart
export function ActivityIntelScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/insights/activity_intel_screen.dart"
      screenName="ActivityIntelScreen"
    />
  );
}

// MISSING: lib/features/insights/executive_cmd_screen.dart
export function ExecutiveCmdScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/insights/executive_cmd_screen.dart"
      screenName="ExecutiveCmdScreen"
    />
  );
}

// MISSING: lib/features/insights/health_ops_screen.dart
export function HealthOpsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/insights/health_ops_screen.dart"
      screenName="HealthOpsScreen"
    />
  );
}

// MISSING: lib/features/insights/sensitive_ops_screen.dart
export function SensitiveOpsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/insights/sensitive_ops_screen.dart"
      screenName="SensitiveOpsScreen"
    />
  );
}

// ═════════ المراحل 24–25: المحروقات ═════════

// MISSING: lib/features/fuel/fuel_dashboard_screen.dart
export function FuelDashboardScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_dashboard_screen.dart"
      screenName="FuelDashboardScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_moves_screen.dart
export function FuelMovesScreen({
  initialTab,
  standalone,
}: {
  readonly initialTab?: string;
  readonly standalone?: boolean;
} = {}) {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_moves_screen.dart"
      screenName="FuelMovesScreen"
      extra={[initialTab, standalone ? 'standalone' : ''].filter(Boolean).join(', ')}
    />
  );
}

// MISSING: lib/features/fuel/fuel_allocations_screen.dart
export function FuelAllocationsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_allocations_screen.dart"
      screenName="FuelAllocationsScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_stocktake_screen.dart
export function FuelStocktakeScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_stocktake_screen.dart"
      screenName="FuelStocktakeScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_groups.dart
export function FuelDataScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_groups.dart"
      screenName="FuelDataScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_directories_screen.dart
export function FuelWarehousesScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_directories_screen.dart"
      screenName="FuelWarehousesScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_directories_screen.dart
export function FuelUnitsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_directories_screen.dart"
      screenName="FuelUnitsScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_vehicles_screen.dart
export function FuelVehiclesScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_vehicles_screen.dart"
      screenName="FuelVehiclesScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_consumption_screen.dart
export function FuelConsumptionScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_consumption_screen.dart"
      screenName="FuelConsumptionScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_daily_report_screen.dart
export function FuelDailyReportScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_daily_report_screen.dart"
      screenName="FuelDailyReportScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_official_report_screen.dart
export function FuelOfficialReportScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_official_report_screen.dart"
      screenName="FuelOfficialReportScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_groups.dart
export function FuelStocksReportScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_groups.dart"
      screenName="FuelStocksReportScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_ledger_screen.dart
export function FuelLedgerScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_ledger_screen.dart"
      screenName="FuelLedgerScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_groups.dart
export function FuelPlanVsIssuedScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_groups.dart"
      screenName="FuelPlanVsIssuedScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_groups.dart
export function FuelReportsHubScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_groups.dart"
      screenName="FuelReportsHubScreen"
    />
  );
}

// MISSING: lib/features/fuel/fuel_settings_screen.dart
export function FuelSettingsScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/fuel/fuel_settings_screen.dart"
      screenName="FuelSettingsScreen"
    />
  );
}

// ═════════ المراحل 26–27: الارتباطات والكابلات والأرشيف ═════════

// MISSING: lib/features/cables/cables_screen.dart
export function CablesScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/cables/cables_screen.dart"
      screenName="CablesScreen"
    />
  );
}

// MISSING: lib/features/archive/electronic_archive_screen.dart
export function ElectronicArchiveScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/archive/electronic_archive_screen.dart"
      screenName="ElectronicArchiveScreen"
    />
  );
}

// MISSING: lib/features/linkages/personnel_screen.dart
export function PersonnelStrengthScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/linkages/personnel_screen.dart"
      screenName="PersonnelStrengthScreen"
    />
  );
}

// MISSING: lib/features/linkages/linkages_screen.dart
export function LinkFinancesScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/linkages/linkages_screen.dart"
      screenName="LinkFinancesScreen"
    />
  );
}

// MISSING: lib/features/linkages/linkages_screen.dart
export function LinkArmamentScreen() {
  return (
    <MissingScreenStub
      sourcePath="lib/features/linkages/linkages_screen.dart"
      screenName="LinkArmamentScreen"
    />
  );
}
