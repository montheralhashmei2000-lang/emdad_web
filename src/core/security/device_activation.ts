// NOT-PORTED: ملف خاص بالجهاز الأصلي (lib/core/security/device_activation.dart)
// محوّل ويب صامت (No-op) لنظام تفعيل الأجهزة المرتبط بعتاد الجهاز الأصلي.

import type { DriftDatabase } from '../../data/db/sqlite_driver';

export class DeviceActivation {
  constructor(readonly db: DriftDatabase) {}

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  async deviceId(): Promise<string> {
    return 'A2B3C4';
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  async isBranch(): Promise<boolean> {
    return false;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  async canIssue(): Promise<boolean> {
    return false;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  async importPrivateKey(_pem: string): Promise<boolean> {
    return false;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  async mayAssignOwner(): Promise<boolean> {
    return true;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  async lockReason(): Promise<string | null> {
    return null;
  }
}
