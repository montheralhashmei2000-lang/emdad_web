/// إجراءات الصلاحيات في وحدة مستقلة صغيرة لكسر التهيئة الدائرية (TDZ) بين
/// `access_control.ts` و`perm_catalog.ts`، ويُعاد تصديرها من `access_control.ts`.
export const PermAction = {
  view: 'view',
  create: 'create',
  edit: 'edit',
  delete: 'delete',
  approve: 'approve',
  print: 'print',
  export: 'export',
  /// استيراد بياناتٍ من ملف (Excel وغيره) — إجراءٌ مستقل عن «إضافة».
  import: 'import',
} as const;

export type PermAction = (typeof PermAction)[keyof typeof PermAction];
