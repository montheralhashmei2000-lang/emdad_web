// MISSING: lib/domain/esign_policy.dart (المرحلة 5 / 18)
// بديل صوري مؤقت (Minimal Typed Stub) دون اختراع سياسات التوقيع الإلكتروني.

export enum ESignMode {
  auto = 'auto',
}

export const ESignPolicy = {
  settingsKey: 'esignPolicy',
  printableDocs: {} as Readonly<Record<string, string>>,
  parse(_value: unknown): ESignMode {
    return ESignMode.auto;
  },
  parsePrintOn(_value: unknown): Set<string> {
    return new Set<string>();
  },
};
