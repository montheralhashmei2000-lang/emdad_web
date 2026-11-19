/// مولّد معرّفات فريد.
///
/// الاعتماد على الوقت وحده لا يكفي: ساعة ويندوز دقّتها نحو ملّي ثانية، فسجلّان
/// يُكتبان في اللحظة نفسها — كسطور السند في حلقة واحدة — يأخذان المعرّف نفسه
/// فيطمس أحدهما الآخر. لذلك يُضاف عدّاد تصاعدي وقيمة عشوائية.
export class Ids {
  private constructor() {}

  private static _counter = 0;

  /// معرّف فريد بصيغة: البادئة-الوقت-العداد-عشوائي
  static next(prefix: string): string {
    const micros = Math.floor((performance.timeOrigin + performance.now()) * 1000);
    const now = micros.toString(36);
    Ids._counter = (Ids._counter + 1) & 0xffffff;
    const seq = Ids._counter.toString(36);
    const rand = Math.floor(Math.random() * (1 << 24)).toString(36);
    return `${prefix}-${now}-${seq}${rand}`;
  }

  /// معرّفٌ **حتميّ** من مفتاحٍ طبيعي — لسجلٍّ هو «الشيء نفسه» أينما أُنشئ:
  /// سجل معسكرٍ لشهر، تصفية شهر، حدّ مخزون صنفٍ في مستودع، رصيدٌ افتتاحي.
  ///
  /// جهازان يُنشئان السجلَّ نفسه قبل أن يتزامنا يصلان إلى المعرّف نفسه، فيلتقي
  /// الصفّان بالدمج العادي (الأحدث يفوز) بدل أن يتصادم الفهرس الفريد ويُجهض
  /// المزامنة (H-1)، أو يبقى صفّان يُجمعان (H-7). الأجزاء تُرمَّز فلا يلتبس
  /// فاصلٌ داخل اسمٍ بحدٍّ بين جزأين.
  static natural(prefix: string, parts: readonly unknown[]): string {
    return `${prefix}:${parts.map((p) => encodeURIComponent(`${p}`)).join(':')}`;
  }
}
