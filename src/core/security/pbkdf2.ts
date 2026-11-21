/// اشتقاق المفاتيح: PBKDF2-HMAC-SHA256 · Salt عشوائي 16 بايت · مخرج 256 بت (64 حرفًا hex).
///
/// عدد الدورات يُحفظ مع كل حساب (`users.iterations`)، فالحسابات القديمة المُرحَّلة
/// من النظام السابق (45,000 دورة — [legacyIterations]) تبقى تعمل، وتُعاد تجزئتها بالعدد
/// الحالي [iterations] عند أول دخول ناجح (انظر `PasswordHash`).

const _utf8Encoder = new TextEncoder();

const _sha256Init = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const _sha256K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/// دالة ضغط SHA-256 (FIPS 180-4) على حالة 8 كلمات بعمليات 32-بت غير موقّعة (`>>> 0`).
class _Sha256 {
  static compressBlock(state: Uint32Array, block: Uint8Array, offset: number, w: Uint32Array): void {
    for (let i = 0; i < 16; i++) {
      const idx = offset + i * 4;
      w[i] =
        ((block[idx] << 24) |
          (block[idx + 1] << 16) |
          (block[idx + 2] << 8) |
          block[idx + 3]) >>>
        0;
    }
    _Sha256.run(state, w);
  }

  /// ضغط الكتلة الأخيرة لرسالة من 32 بايت تلي كتلة مفتاح: الكلمات الثماني ثم
  /// بت الحشوة ثم الطول الكلي 768 بت.
  static compressDigest(state: Uint32Array, w: Uint32Array, digest: Uint32Array): void {
    for (let i = 0; i < 8; i++) {
      w[i] = digest[i];
    }
    w[8] = 0x80000000;
    for (let i = 9; i < 15; i++) {
      w[i] = 0;
    }
    w[15] = 768;
    _Sha256.run(state, w);
  }

  static rotr(x: number, n: number): number {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  static run(state: Uint32Array, w: Uint32Array): void {
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15];
      const y = w[i - 2];
      const s0 = (_Sha256.rotr(x, 7) ^ _Sha256.rotr(x, 18) ^ (x >>> 3)) >>> 0;
      const s1 = (_Sha256.rotr(y, 17) ^ _Sha256.rotr(y, 19) ^ (y >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = state[0];
    let b = state[1];
    let c = state[2];
    let d = state[3];
    let e = state[4];
    let f = state[5];
    let g = state[6];
    let h = state[7];
    for (let i = 0; i < 64; i++) {
      const s1 = (_Sha256.rotr(e, 6) ^ _Sha256.rotr(e, 11) ^ _Sha256.rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + s1 + ch + _sha256K[i] + w[i]) >>> 0;
      const s0 = (_Sha256.rotr(a, 2) ^ _Sha256.rotr(a, 13) ^ _Sha256.rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }
}

/// إكمال SHA-256 فوق حالة قائمة ([baseState]) بعد معالجة [priorBytes] بايت مسبقًا (مثل 64 بايت لـ ipad).
function sha256Finalize(
  baseState: Uint32Array,
  priorBytes: number,
  tail: Uint8Array,
  w: Uint32Array,
  outState: Uint32Array,
): void {
  outState.set(baseState);
  const tailLen = tail.length;
  const totalBytes = priorBytes + tailLen;
  // نحتاج بايت 0x80 ثم أصفارًا ثم 8 بايت لطول البتات، بما يملأ مضاعفات 64 بايت.
  const paddedLen = Math.ceil((tailLen + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(tail, 0);
  padded[tailLen] = 0x80;
  const totalBitsHi = Math.floor((totalBytes * 8) / 0x100000000);
  const totalBitsLo = (totalBytes * 8) >>> 0;
  const lenPos = paddedLen - 8;
  padded[lenPos] = (totalBitsHi >>> 24) & 0xff;
  padded[lenPos + 1] = (totalBitsHi >>> 16) & 0xff;
  padded[lenPos + 2] = (totalBitsHi >>> 8) & 0xff;
  padded[lenPos + 3] = totalBitsHi & 0xff;
  padded[lenPos + 4] = (totalBitsLo >>> 24) & 0xff;
  padded[lenPos + 5] = (totalBitsLo >>> 16) & 0xff;
  padded[lenPos + 6] = (totalBitsLo >>> 8) & 0xff;
  padded[lenPos + 7] = totalBitsLo & 0xff;

  for (let off = 0; off < paddedLen; off += 64) {
    _Sha256.compressBlock(outState, padded, off, w);
  }
}

/// تجزئة SHA-256 مباشرةً لبايتاتٍ اعتباطية الطول.
export function sha256Bytes(data: Uint8Array | readonly number[]): Uint8Array {
  const bytes = data instanceof Uint8Array ? data : Uint8Array.from(data);
  const st = new Uint32Array(8);
  const w = new Uint32Array(64);
  sha256Finalize(_sha256Init, 0, bytes, w, st);
  const out = new Uint8Array(32);
  for (let j = 0; j < 8; j++) {
    out[j * 4] = (st[j] >>> 24) & 0xff;
    out[j * 4 + 1] = (st[j] >>> 16) & 0xff;
    out[j * 4 + 2] = (st[j] >>> 8) & 0xff;
    out[j * 4 + 3] = st[j] & 0xff;
  }
  return out;
}

export class Pbkdf2 {
  private constructor() {}

  /// العدد الحالي لكل كلمة مرور جديدة أو مُعاد تجزئتها. (توصية OWASP لـ SHA-256.)
  static readonly iterations = 310000;

  /// عدد النظام السابق ودفعات التطبيق الأولى — للتحقق من الحسابات القديمة فقط.
  static readonly legacyIterations = 45000;
  private static readonly _keyLengthBytes = 32; // 256 بت
  private static readonly _saltLengthBytes = 16;

  /// توليد salt عشوائي بصيغة hex (32 حرفًا) كما يفعل النظام الحالي.
  static newSaltHex(): string {
    const bytes = new Uint8Array(Pbkdf2._saltLengthBytes);
    globalThis.crypto.getRandomValues(bytes);
    return Pbkdf2.toHex(bytes);
  }

  /// اشتقاق المفتاح وإرجاعه hex — نفس ناتج WebCrypto في النسخة الحالية.
  static deriveHex(
    password: string,
    saltHex: string,
    { iterations = Pbkdf2.iterations }: { readonly iterations?: number } = {},
  ): string {
    const derived = Pbkdf2.derive(_utf8Encoder.encode(password), Pbkdf2.fromHex(saltHex), {
      iterations,
      length: Pbkdf2._keyLengthBytes,
    });
    return Pbkdf2.toHex(derived);
  }

  /// PBKDF2 (RFC 8018) فوق HMAC-SHA256 — متزامن ومطابق بايتًا ببايت لمتجهات RFC 7914 وWebCrypto.
  static derive(
    password: Uint8Array | readonly number[],
    salt: Uint8Array | readonly number[],
    {
      iterations = Pbkdf2.iterations,
      length = Pbkdf2._keyLengthBytes,
    }: { readonly iterations?: number; readonly length?: number } = {},
  ): Uint8Array {
    if (iterations < 1) {
      throw new RangeError(`iterations يجب أن يكون 1 فأكثر (${iterations})`);
    }
    if (length < 1) {
      throw new RangeError(`length يجب أن يكون 1 فأكثر (${length})`);
    }

    const pwdBytes = password instanceof Uint8Array ? password : Uint8Array.from(password);
    const saltBytes = salt instanceof Uint8Array ? salt : Uint8Array.from(salt);

    // مفتاح HMAC: يُختصر بـ SHA-256 إن زاد عن طول الكتلة (64 بايت).
    const key = new Uint8Array(64);
    key.set(pwdBytes.length > 64 ? sha256Bytes(pwdBytes) : pwdBytes, 0);

    const ipad = new Uint8Array(64);
    const opad = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      ipad[i] = key[i] ^ 0x36;
      opad[i] = key[i] ^ 0x5c;
    }

    const w = new Uint32Array(64);
    const innerState = new Uint32Array(_sha256Init);
    _Sha256.compressBlock(innerState, ipad, 0, w);
    const outerState = new Uint32Array(_sha256Init);
    _Sha256.compressBlock(outerState, opad, 0, w);

    const hashLength = 32; // sha256
    const blocks = Math.floor((length + hashLength - 1) / hashLength);
    const output = new Uint8Array(blocks * hashLength);

    const st = new Uint32Array(8);
    const u = new Uint32Array(8);
    const acc = new Uint32Array(8);
    const firstMsg = new Uint8Array(saltBytes.length + 4);
    firstMsg.set(saltBytes, 0);

    for (let block = 1; block <= blocks; block++) {
      firstMsg[saltBytes.length] = (block >>> 24) & 0xff;
      firstMsg[saltBytes.length + 1] = (block >>> 16) & 0xff;
      firstMsg[saltBytes.length + 2] = (block >>> 8) & 0xff;
      firstMsg[saltBytes.length + 3] = block & 0xff;

      // U_1 = HMAC(key, salt || BE32(block))
      sha256Finalize(innerState, 64, firstMsg, w, u);
      st.set(outerState);
      _Sha256.compressDigest(st, w, u);
      u.set(st);
      acc.set(u);

      for (let i = 1; i < iterations; i++) {
        // الداخلي: SHA256(ipad || u)
        st.set(innerState);
        _Sha256.compressDigest(st, w, u);
        // الخارجي: SHA256(opad || الداخلي)
        u.set(st);
        st.set(outerState);
        _Sha256.compressDigest(st, w, u);
        u.set(st);
        for (let j = 0; j < 8; j++) {
          acc[j] = (acc[j] ^ u[j]) >>> 0;
        }
      }

      const base = (block - 1) * hashLength;
      for (let j = 0; j < 8; j++) {
        output[base + j * 4] = (acc[j] >>> 24) & 0xff;
        output[base + j * 4 + 1] = (acc[j] >>> 16) & 0xff;
        output[base + j * 4 + 2] = (acc[j] >>> 8) & 0xff;
        output[base + j * 4 + 3] = acc[j] & 0xff;
      }
    }

    return output.subarray(0, length);
  }

  /// مقارنة بزمن ثابت لتفادي تسريب المعلومات عبر توقيت المقارنة.
  static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  static toHex(bytes: Uint8Array | readonly number[]): string {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += (bytes[i] & 0xff).toString(16).padStart(2, '0');
    }
    return out;
  }

  static fromHex(hex: string): Uint8Array {
    const clean = hex.trim();
    if (clean.length % 2 !== 0) {
      throw new Error(`hex: طول غير صالح (${hex})`);
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      const byte = Number.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
      if (Number.isNaN(byte)) {
        throw new Error(`hex: حرف غير صالح (${hex})`);
      }
      out[i] = byte;
    }
    return out;
  }
}
