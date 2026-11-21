/// الباركود النظامي للأصناف: ١٢ رقمًا = السنة (٤) + يوم-ساعة-دقيقة (٦) + تسلسل (٢).
///
/// مثال: `202610143001` ⇐ سنة 2026، يوم 10، الساعة 14، الدقيقة 30، تسلسل 01.
/// السنة تُؤخذ من الساعة لا من ثابت. التسلسل 01–99 داخل الدقيقة؛ بعد 99
/// ينتقل إلى الدقيقة التالية ويعود إلى 01. الباركودات القديمة (`104…`) لا تُمسّ.

export class ItemBarcodeStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

const kItemBarcodeLength = 12;
const kItemBarcodeMaxSeq = 99;
const kItemBarcodeMaxAttempts = 10;

class _ItemBarcode {
  private _at: Date;
  private _seq: number;

  constructor(at: Date, seq: number) {
    this._at = at;
    this._seq = seq;
  }

  /// المرشّح التالي، ثم يتقدّم المؤشر.
  take(): string {
    const out = ItemBarcode.format(this._at, this._seq);
    if (this._seq >= kItemBarcodeMaxSeq) {
      this._seq = 1;
      this._at = new Date(this._at.getTime() + 60 * 1000);
    } else {
      this._seq++;
    }
    return out;
  }

  /// أول مرشّح غير مستعمل خلال [maxAttempts] محاولة؛ وإلا `StateError`.
  async nextFree(
    taken: (barcode: string) => Promise<boolean> | boolean,
  ): Promise<string> {
    for (let i = 0; i < kItemBarcodeMaxAttempts; i++) {
      const bc = this.take();
      if (!(await taken(bc))) return bc;
    }
    throw new ItemBarcodeStateError(
      `تعذّر توليد باركود غير مكرر بعد ${kItemBarcodeMaxAttempts} محاولات`,
    );
  }
}

function _p2(v: number): string {
  return String(v).padStart(2, '0');
}

export type ItemBarcode = _ItemBarcode;

export const ItemBarcode = {
  length: kItemBarcodeLength,
  maxSeq: kItemBarcodeMaxSeq,

  /// عدد المرشّحين المفحوصين قبل الاستسلام.
  maxAttempts: kItemBarcodeMaxAttempts,

  /// يبدأ من [now] بعد أكبر تسلسل مستعمل في دقيقته ([usedSeqs]: تسلسلات
  /// الباركودات المحفوظة ببادئة تلك الدقيقة، انظر [prefixOf]).
  startingAt(now: Date, usedSeqs: Iterable<number>): ItemBarcode {
    const at = new Date(0);
    at.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    at.setHours(now.getHours(), now.getMinutes(), 0, 0);
    let top = 0;
    for (const b of usedSeqs) {
      if (b > top) top = b;
    }
    if (top >= kItemBarcodeMaxSeq) {
      return new _ItemBarcode(new Date(at.getTime() + 60 * 1000), 1);
    }
    return new _ItemBarcode(at, top + 1);
  },

  /// البادئة (١٠ أرقام) لدقيقة [t].
  prefixOf(t: Date): string {
    return `${t.getFullYear()}${_p2(t.getDate())}${_p2(t.getHours())}${_p2(t.getMinutes())}`;
  },

  format(t: Date, seq: number): string {
    return `${ItemBarcode.prefixOf(t)}${_p2(seq)}`;
  },

  /// تسلسل باركودٍ بصيغة النظام ببادئة [prefix]، أو `null` لغيره.
  seqOf(barcode: string, prefix: string): number | null {
    if (barcode.length !== kItemBarcodeLength || !barcode.startsWith(prefix)) {
      return null;
    }
    const suffix = barcode.substring(prefix.length).trim();
    if (!/^[+-]?\d+$/.test(suffix)) return null;
    return Number.parseInt(suffix, 10);
  },
} as const;
