/// سياسة قوة كلمة المرور (2026-10-26).
///
/// كان الشرط الطول وحده (٨)، فتُقبل `12345678` و`aaaaaaaa` و`password` — أول ما
/// يُجرَّب في التخمين. الآن، إلى الطول: نوعان من الحروف على الأقل (حروف عربية أو
/// لاتينية، أرقام، رموز ومسافات)، ولا حرفٌ واحد مكرر، ولا تسلسلٌ بسيط، ولا كلمةٌ
/// شائعة، ولا اسم الدخول نفسه. **تُطبَّق على كلمةٍ جديدة أو مغيَّرة فقط** — لا
/// تُقفل حسابًا قائمًا؛ وكلمةٌ قائمةٌ لا تحققها تُنبَّه بالتغيير بعد الدخول.
export class PasswordPolicy {
  private constructor() {}

  static readonly minLength = 8;

  /// كلماتٌ شائعة (بالحروف الصغيرة، بلا ما يصلها من أرقام في آخرها).
  private static readonly _common: ReadonlySet<string> = new Set([
    'password',
    'passw0rd',
    'qwerty',
    'qwertyuiop',
    'asdfghjkl',
    'iloveyou',
    'admin',
    'administrator',
    'welcome',
    'letmein',
    'imdad',
    'emdad',
    'changeme',
    'default',
  ]);

  /// سبب رفض [password]، أو `null` إن قُبلت. [username] اسم الدخول إن عُرف.
  static problem(password: string, { username = '' }: { readonly username?: string } = {}): string | null {
    if (password.length < PasswordPolicy.minLength) {
      return `كلمة المرور ${PasswordPolicy.minLength} أحرف على الأقل`;
    }
    const letters = /\p{L}/u.test(password);
    const digits = /\p{Nd}/u.test(password);
    const others = /[^\p{L}\p{Nd}]/u.test(password);
    if ([letters, digits, others].filter((x) => x).length < 2) {
      return 'كلمة المرور تجمع نوعين على الأقل: حروفًا وأرقامًا أو رموزًا';
    }
    const runes = Array.from(password, (ch) => ch.codePointAt(0)!);
    if (new Set(runes).size <= 2) {
      return 'كلمة المرور لا تكون حرفًا أو حرفين مكررين';
    }
    if (PasswordPolicy._sequential(runes)) {
      return 'كلمة المرور لا تكون تسلسلًا (12345678، abcdefgh)';
    }
    const lower = password.toLowerCase();
    const stem = lower.replace(/[\d\W_]+$/u, '');
    if (PasswordPolicy._common.has(lower) || PasswordPolicy._common.has(stem)) {
      return 'كلمة المرور شائعة يسهل تخمينها';
    }
    const u = username.trim().toLowerCase();
    if (u.length >= 3 && lower.includes(u)) {
      return 'كلمة المرور لا تحوي اسم الدخول';
    }
    return null;
  }

  /// هل [password] تحقق السياسة؟
  static ok(password: string, { username = '' }: { readonly username?: string } = {}): boolean {
    return PasswordPolicy.problem(password, { username }) === null;
  }

  /// تسلسلٌ صاعد أو هابط بخطوة واحدة على طوله كله.
  private static _sequential(r: readonly number[]): boolean {
    const step = (d: number): boolean => {
      for (let i = 1; i < r.length; i++) {
        if (r[i] - r[i - 1] !== d) return false;
      }
      return true;
    };
    return step(1) || step(-1);
  }
}
