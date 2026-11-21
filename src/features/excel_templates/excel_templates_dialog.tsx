// MISSING: lib/features/excel_templates/excel_templates_dialog.dart (المرحلة 19/22)
// بديل صوري أدنى لزر قوالب Excel دون اختراع حوار استيراد.

import type { TemplateKind } from '../../data/migration/excel_templates/excel_templates';

export interface ExcelTemplatesButtonProps {
  readonly kind: TemplateKind;
  readonly onImported?: () => void | Promise<void>;
}

export function ExcelTemplatesButton(_props: ExcelTemplatesButtonProps) {
  // MISSING: lib/features/excel_templates/excel_templates_dialog.dart
  return null;
}
