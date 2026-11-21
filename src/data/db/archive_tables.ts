import {
  boolColumn,
  Constant,
  currentDateAndTime,
  dateTimeColumn,
  DriftTable,
  intColumn,
  textColumn,
  type GeneratedColumn,
} from './sqlite_driver';

/// جداول الأرشيف الإلكتروني — أُضيفت في إصدار المخطط v21.
///
/// **الملف نفسه لا يُخزَّن في القاعدة**: القاعدة تحفظ بياناته الوصفية وحدها،
/// ويُحفظ الملف في الأرشيف التطبيقي مع بصمة SHA-256.
export interface ArchiveFile extends Record<string, unknown> {
  readonly id: string;
  readonly space: string;
  readonly title: string;
  readonly category: string;
  readonly tags: string;
  readonly docRef: string;
  readonly warehouse: string;
  readonly docDate: string;
  readonly fileName: string;
  readonly storedPath: string;
  readonly mime: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly source: string;
  readonly opType: string;
  readonly notes: string;
  readonly pinned: boolean;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class ArchiveFilesTable extends DriftTable<ArchiveFile> {
  readonly actualTableName = 'archive_files';

  /// معرّف فريد — `Ids.next('ar')`.
  readonly id = textColumn('id');

  /// مساحة العمل المالكة للملف: `supply` أو `fuel`
  readonly space = textColumn('space').withDefault(Constant('supply'));

  /// عنوان المستند كما يظهر في القائمة (لا اسم الملف).
  readonly title = textColumn('title');

  /// التصنيف (عقود، كشوفات، مراسلات…) — نصٌّ حرّ يقترح عليه الموجود.
  readonly category = textColumn('category').withDefault(Constant('عام'));

  /// وسوم البحث — قائمة JSON نصية.
  readonly tags = textColumn('tags').withDefault(Constant('[]'));

  /// رقم السند المرتبط في سجل المستندات، إن وُجد
  readonly docRef = textColumn('docRef').withDefault(Constant(''));

  /// المستودع المتعلق — يُقيَّد بنطاق صلاحيات المستخدم.
  readonly warehouse = textColumn('warehouse').withDefault(Constant(''));

  /// تاريخ المستند الوثائقي (YYYY-MM-DD) — قد يسبق تاريخ الأرشفة سنوات.
  readonly docDate = textColumn('docDate').withDefault(Constant(''));

  /// الاسم الأصلي للملف كما وُلد على الجهاز.
  readonly fileName = textColumn('fileName');

  /// المسار المطلق للنسخة المخزَّنة داخل مجلد الأرشيف.
  readonly storedPath = textColumn('storedPath');

  /// نوع MIME — لاختيار المعاينة (صورة/PDF/أخرى).
  readonly mime = textColumn('mime').withDefault(Constant(''));

  /// حجم الملف بالبايت.
  readonly sizeBytes = intColumn('sizeBytes');

  /// بصمة SHA-256 لمحتوى الملف الأصلي — تُحسب لحظة الأرشفة.
  readonly sha256 = textColumn('sha256').withDefault(Constant(''));

  /// مصدر الأرشفة: `manual` أو `auto`
  readonly source = textColumn('source').withDefault(Constant('manual'));

  /// نوع العملية في الأرشفة التلقائية — receipt / issue / transfer / return / rationOrder / stocktake / report
  readonly opType = textColumn('opType').withDefault(Constant(''));

  /// ملاحظات حرة.
  readonly notes = textColumn('notes').withDefault(Constant(''));

  /// تثبيت في أعلى القائمة.
  readonly pinned = boolColumn('pinned').withDefault(Constant(false));

  /// من أرشفه (بريد حسابه)
  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));

  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}
