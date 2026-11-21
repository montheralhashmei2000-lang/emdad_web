import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Pbkdf2 } from '../pbkdf2';

function sha256Of(v: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(v).digest());
}

/// قيم مرجعية مأخوذة من النظام الحالي (WebCrypto PBKDF2-HMAC-SHA256) حرفيًا،
/// حتى تعمل حسابات المستخدمين المُرحَّلة في التطبيق الجديد دون إعادة تعيين كلمات المرور.
describe('pbkdf2_test', () => {
  describe('PBKDF2 مطابق لنسخة الويب', () => {
    it('كلمة مرور لاتينية · 45,000 دورة', () => {
      const hash = Pbkdf2.deriveHex(
        'Admin#12345',
        'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        { iterations: Pbkdf2.legacyIterations },
      );
      expect(hash).toBe(
        '126a93206f5d47d8466ae625f0470bc73b835c9569a10b34db5b91356f4ef4e7',
      );
    });

    it('كلمة مرور عربية (UTF-8) · 45,000 دورة', () => {
      const hash = Pbkdf2.deriveHex(
        'كلمة المرور',
        '00112233445566778899aabbccddeeff',
        { iterations: Pbkdf2.legacyIterations },
      );
      expect(hash).toBe(
        '76327c2f79784042286b93c84cc70d100eeaa6160d82b01ee3012c861c64bef3',
      );
    });

    it('عدد دورات مختلف (1,000) للتأكد من صحة التنفيذ لا الثوابت', () => {
      const hash = Pbkdf2.deriveHex(
        'x',
        '0f0e0d0c0b0a09080706050403020100',
        { iterations: 1000 },
      );
      expect(hash).toBe(
        '3830d1e88b6dd2bc0edbcfcb67e633a1975a193b143a748b5a588a759aed8147',
      );
    });

    it('متجهات RFC 7914 (PBKDF2-HMAC-SHA256)', () => {
      const enc = new TextEncoder();
      // مستقلة عن نسخة الويب: تحرس التنفيذ السريع للحلقة الداخلية وطول مخرج أطول من كتلة.
      expect(
        Pbkdf2.toHex(
          Pbkdf2.derive(enc.encode('passwd'), enc.encode('salt'), {
            iterations: 1,
            length: 64,
          }),
        ),
      ).toBe(
        '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc' +
          '49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783',
      );
      expect(
        Pbkdf2.toHex(
          Pbkdf2.derive(enc.encode('Password'), enc.encode('NaCl'), {
            iterations: 80000,
            length: 64,
          }),
        ),
      ).toBe(
        '4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56' +
          'a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d',
      );
    });

    it('مفتاح أطول من كتلة SHA-256 (64 بايت) يُختصر أولًا', () => {
      const enc = new TextEncoder();
      const long = new Uint8Array(100).fill(0x61); // 'a' × 100
      expect(
        Pbkdf2.toHex(Pbkdf2.derive(long, enc.encode('salt'), { iterations: 2 })),
      ).toBe(
        Pbkdf2.toHex(
          Pbkdf2.derive(sha256Of(long), enc.encode('salt'), { iterations: 2 }),
        ),
      );
    });

    it('الملح الجديد بطول 32 حرفًا hex ويختلف في كل مرة', () => {
      const a = Pbkdf2.newSaltHex();
      const b = Pbkdf2.newSaltHex();
      expect(a.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(a)).toBe(true);
      expect(a).not.toBe(b);
    });

    it('المقارنة بزمن ثابت', () => {
      expect(Pbkdf2.constantTimeEquals('abc', 'abc')).toBe(true);
      expect(Pbkdf2.constantTimeEquals('abc', 'abd')).toBe(false);
      expect(Pbkdf2.constantTimeEquals('abc', 'ab')).toBe(false);
    });

    it('تحويل hex ذهابًا وإيابًا', () => {
      const hex = 'deadbeef0102';
      expect(Pbkdf2.toHex(Pbkdf2.fromHex(hex))).toBe(hex);
    });
  });
});
