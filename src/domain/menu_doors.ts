/// أبواب القائمة: بندٌ واحد يفتح شاشةً بتبويبات.
///
/// **الباب يُفتح لمن ملك إحدى تبويباته**، والتبويبة تُخفى عمّن لا يملكها —
/// فالجمع تنظيمٌ للقائمة لا توسيعٌ للأذونات.

/// تبويبات كل باب، بمعرّفات صلاحياتها.
export const kMenuDoors: Readonly<Record<string, readonly string[]>> = {
  // الإمداد والتموين
  supplyMoves: ['receive', 'issue', 'transfer', 'returns', 'opening', 'destruction'],
  supplyOrders: ['rationOrders', 'pendingOrders'],
  supplyData: ['items', 'stores', 'units', 'suppliers', 'kitchens', 'assets'],
  supplyDaily: ['feeding', 'dailyOperations', 'ratios'],
  // التشغيل اليومي شاشةٌ بلا صلاحيةٍ خاصة: يراها من يملك الخطط أو سجل
  // المطبخ. وهو بابٌ داخل باب، ولا دور فيه فلا يتكرر الفحص.
  dailyOperations: ['mealPlans', 'kitchenLog'],
  supplyReports: ['reports', 'balances'],
  // حساب المعسكر والاستحقاق: ثلاثة تقارير على الحساب نفسه (المستحق مقابل الواصل)
  // — الاستحقاق الفعلي لأي نطاق، وسجل المعسكر الشهري، وتصفيته.
  campAccounts: ['actualEntitlement', 'campLedger', 'campSettlement'],
  supplyAudit: [
    'auditTrail',
    'activityIntel',
    'sensitiveOps',
    'executiveCmd',
    'healthOps',
  ],
  // المحروقات
  fuelData: ['fuelWarehouses', 'fuelUnits', 'fuelVehicles'],
};

/// هل يُفتح [door] لمن تقول [can] بما يملك؟
///
/// **التبويبة التي تحمل اسم بابها تُتخطّى.** بابٌ يشير إلى نفسه يجعل الفحص
/// يستدعي نفسه بلا نهاية، فيفيض المكدّس وتسقط القائمة كلها — وفي نسخة
/// الإصدار تظهر مستطيلًا رماديًّا بلا رسالة. والحارس هنا أرخص من تتبّعٍ آخر.
export function menuDoorAllows(door: string, can: (page: string) => boolean): boolean {
  const tabs = kMenuDoors[door];
  if (tabs === undefined) return false;
  return tabs.some((p) => p !== door && can(p));
}

/// أبوابٌ تشير إلى أنفسها — يجب أن تبقى فارغة.
///
/// تُقرأ في الاختبار لا في التشغيل: `assert` يُنزع من نسخة الإصدار، وهذا
/// العطل لا يظهر إلا فيها.
export function selfReferencingDoors(): string[] {
  return Object.entries(kMenuDoors)
    .filter(([key, value]) => value.includes(key))
    .map(([key]) => key);
}
