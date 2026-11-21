import { Pbkdf2 } from './pbkdf2';

/// بصمة كلمة مرور جاهزة للحفظ في جدول المستخدمين (الأعمدة الثلاثة معًا).
export class PasswordHash {
  readonly saltHex: string;
  readonly hashHex: string;
  readonly iterations: number;

  constructor({
    saltHex,
    hashHex,
    iterations,
  }: {
    readonly saltHex: string;
    readonly hashHex: string;
    readonly iterations: number;
  }) {
    this.saltHex = saltHex;
    this.hashHex = hashHex;
    this.iterations = iterations;
  }

  /// بصمة جديدة بملح جديد وبالعدد الحالي من الدورات.
  static async create(password: string): Promise<PasswordHash> {
    const salt = Pbkdf2.newSaltHex();
    const n = Pbkdf2.iterations;
    const hash = Pbkdf2.deriveHex(password, salt, { iterations: n });
    return new PasswordHash({ saltHex: salt, hashHex: hash, iterations: n });
  }

  /// مطابقة كلمة مرور مع بصمة محفوظة بعدد دوراتها هي (لا العدد الحالي).
  static async verify(
    password: string,
    saltHex: string,
    hashHex: string,
    iterations: number,
  ): Promise<boolean> {
    if (
      saltHex.length === 0 ||
      hashHex.length === 0 ||
      iterations < 1 ||
      iterations > Pbkdf2.iterations
    ) {
      return false;
    }
    const derived = Pbkdf2.deriveHex(password, saltHex, { iterations });
    return Pbkdf2.constantTimeEquals(derived, hashHex);
  }

  /// هل البصمة أضعف من المعيار الحالي فتُعاد تجزئتها عند الدخول الناجح؟
  static needsUpgrade(iterations: number): boolean {
    return iterations < Pbkdf2.iterations;
  }
}
