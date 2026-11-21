import {
  Constant,
  currentDateAndTime,
  dateTimeColumn,
  DriftTable,
  intColumn,
  textColumn,
  type CompanionInput,
  type GeneratedColumn,
} from './sqlite_driver';

/// جداول «البرقيات» — أُضيفت في إصدار المخطط v23.
export interface Cable extends Record<string, unknown> {
  readonly id: string;
  readonly direction: string;
  readonly cableNo: string;
  readonly cableDate: string;
  readonly subject: string;
  readonly body: string;
  readonly fromParty: string;
  readonly toParty: string;
  readonly branch: string | null;
  readonly classification: string;
  readonly priority: string;
  readonly status: string;
  readonly cableTime: string;
  readonly ccParty: string;
  readonly recipientsJson: string;
  readonly editorName: string;
  readonly editorRank: string;
  readonly editorJob: string;
  readonly signerText: string;
  readonly serialNo: string;
  readonly sendMethod: string;
  readonly sendDateTime: string;
  readonly specialist: string;
  readonly receiverName: string;
  readonly receiveTime: string;
  readonly replyToNo: string;
  readonly attachName: string;
  readonly attachPath: string;
  readonly attachSize: number;
  readonly attachSha256: string;
  readonly notes: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
}

export class CablesTable extends DriftTable<Cable> {
  readonly actualTableName = 'cables';

  /// معرّف فريد — `Ids.next('cb')`.
  readonly id = textColumn('id');

  /// الاتجاه: `in` واردة | `out` صادرة.
  readonly direction = textColumn('direction').withDefault(Constant('in'));

  /// رقم البرقية الرسمي.
  readonly cableNo = textColumn('cableNo').withDefault(Constant(''));

  /// تاريخ البرقية (YYYY-MM-DD).
  readonly cableDate = textColumn('cableDate').withDefault(Constant(''));

  /// الموضوع.
  readonly subject = textColumn('subject');

  /// نص البرقية / الملخص.
  readonly body = textColumn('body').withDefault(Constant(''));

  /// الجهة المرسلة.
  readonly fromParty = textColumn('fromParty').withDefault(Constant(''));

  /// الجهة المستلمة.
  readonly toParty = textColumn('toParty').withDefault(Constant(''));

  /// v30: فرع الجهاز الذي أنشأها — **قابلٌ للفراغ** عمدًا.
  readonly branch = textColumn('branch').nullable();

  /// التصنيف: `normal` عادي | `secret` سري | `top` سري للغاية.
  readonly classification = textColumn('classification').withDefault(Constant('normal'));

  /// الأولوية: `normal` عادي | `urgent` عاجل | `immediate` عاجل جدًا.
  readonly priority = textColumn('priority').withDefault(Constant('normal'));

  /// الحالة: `new` جديد | `processing` قيد المعالجة | `replied` تم الرد | `archived` مؤرشف.
  readonly status = textColumn('status').withDefault(Constant('new'));

  /// ساعة إنشاء البرقية (HH:mm).
  readonly cableTime = textColumn('cableTime').withDefault(Constant(''));

  /// نسخة إلى — أكثر من سطر، سطرٌ لكل جهة.
  readonly ccParty = textColumn('ccParty').withDefault(Constant(''));

  /// جدول المرسَل إليهم مُرمَّزًا JSON: `[{"name":"","unit":"","note":""}]`.
  readonly recipientsJson = textColumn('recipientsJson').withDefault(Constant('[]'));

  /// قسم «لاستعمال المركز / المكتب»
  readonly editorName = textColumn('editorName').withDefault(Constant(''));
  readonly editorRank = textColumn('editorRank').withDefault(Constant(''));
  readonly editorJob = textColumn('editorJob').withDefault(Constant(''));
  readonly signerText = textColumn('signerText').withDefault(Constant(''));
  readonly serialNo = textColumn('serialNo').withDefault(Constant(''));
  readonly sendMethod = textColumn('sendMethod').withDefault(Constant(''));
  readonly sendDateTime = textColumn('sendDateTime').withDefault(Constant(''));
  readonly specialist = textColumn('specialist').withDefault(Constant(''));
  readonly receiverName = textColumn('receiverName').withDefault(Constant(''));
  readonly receiveTime = textColumn('receiveTime').withDefault(Constant(''));
  readonly replyToNo = textColumn('replyToNo').withDefault(Constant(''));

  /// مرفق PDF
  readonly attachName = textColumn('attachName').withDefault(Constant(''));
  readonly attachPath = textColumn('attachPath').withDefault(Constant(''));
  readonly attachSize = intColumn('attachSize').withDefault(Constant(0));
  readonly attachSha256 = textColumn('attachSha256').withDefault(Constant(''));
  readonly notes = textColumn('notes').withDefault(Constant(''));

  readonly createdBy = textColumn('createdBy').withDefault(Constant(''));
  readonly createdAt = dateTimeColumn('createdAt').withDefault(currentDateAndTime);
  readonly updatedAt = dateTimeColumn('updatedAt').nullable();

  override get primaryKey(): readonly GeneratedColumn<unknown>[] {
    return [this.id];
  }
}

export const CablesCompanion = {
  insert(data: {
    id: CompanionInput<string>;
    direction?: CompanionInput<string>;
    cableNo?: CompanionInput<string>;
    cableDate?: CompanionInput<string>;
    subject: CompanionInput<string>;
    body?: CompanionInput<string>;
    fromParty?: CompanionInput<string>;
    toParty?: CompanionInput<string>;
    branch?: CompanionInput<string | null>;
    classification?: CompanionInput<string>;
    priority?: CompanionInput<string>;
    status?: CompanionInput<string>;
    cableTime?: CompanionInput<string>;
    ccParty?: CompanionInput<string>;
    recipientsJson?: CompanionInput<string>;
    editorName?: CompanionInput<string>;
    editorRank?: CompanionInput<string>;
    editorJob?: CompanionInput<string>;
    signerText?: CompanionInput<string>;
    serialNo?: CompanionInput<string>;
    sendMethod?: CompanionInput<string>;
    sendDateTime?: CompanionInput<string>;
    specialist?: CompanionInput<string>;
    receiverName?: CompanionInput<string>;
    receiveTime?: CompanionInput<string>;
    replyToNo?: CompanionInput<string>;
    attachName?: CompanionInput<string>;
    attachPath?: CompanionInput<string>;
    attachSize?: CompanionInput<number>;
    attachSha256?: CompanionInput<string>;
    notes?: CompanionInput<string>;
    createdBy?: CompanionInput<string>;
    createdAt?: CompanionInput<Date>;
    updatedAt?: CompanionInput<Date | null>;
  }) {
    return data;
  },
};
