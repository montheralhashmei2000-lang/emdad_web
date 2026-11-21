/// فصل المهام (المُنشئ لا يعتمد ما أنشأه) — طلب المالك 2026-10-26.
///
/// يُطبَّق على ثلاثة اعتماداتٍ تحرّك المخزون أو تُقرّه: طلبيات الإعاشة، وتسوية
/// الجرد، ومحضر الإتلاف. من يملك «إضافة» و«اعتماد» معًا كان يُنشئ الطلبية
/// ويعتمدها، ويفتح الجرد ويعتمد تسويته، ويحرّر الإتلاف ويخرج كمياته — بلا عينٍ
/// ثانية. الآن يعتمدها شخصٌ آخر.
///
/// **المدير والمالك مستثنيان** ([exempt]): جهةٌ صغيرة يعمل فيها شخصٌ واحد لا
/// تتوقف، والحساب المميَّز مسؤولٌ ومدقَّق أصلًا. وسجلٌّ بلا مُنشئٍ معروف (أقدم من
/// تسجيله) لا يُحكم عليه.
export class MakerChecker {
  private constructor() {}

  /// رسالة الرفض، أو `null` إن جاز الاعتماد.
  static violation({
    createdBy,
    actor,
    exempt,
    doc,
  }: {
    readonly createdBy: string;
    readonly actor: string;
    readonly exempt: boolean;
    readonly doc: string;
  }): string | null {
    if (exempt) return null;
    const c = createdBy.trim().toLowerCase();
    const a = actor.trim().toLowerCase();
    if (c.length === 0 || a.length === 0 || c !== a) return null;
    return `لا يعتمد مُنشئ ${doc} ما أنشأه — يعتمده شخصٌ آخر يملك صلاحية الاعتماد (فصل المهام)`;
  }
}

/// رفض الاعتماد لفصل المهام — لمسارٍ لا يعيد نتيجةً تحمل الخطأ (تسوية الجرد).
export class ApprovalBlocked extends Error {
  override readonly message: string;

  constructor(message: string) {
    super(message);
    this.name = 'ApprovalBlocked';
    this.message = message;
  }

  override toString(): string {
    return this.message;
  }
}
