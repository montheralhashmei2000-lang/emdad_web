// MISSING: lib/core/security/device_activation.dart (المرحلة 5+)
// بديل صوري مؤقت (Minimal Typed Stub) يُستبدل بنظام تفعيل الأجهزة عند توفر ملفه المصدري.

import type { DriftDatabase } from '../../data/db/sqlite_driver';

export class DeviceActivation {
  constructor(readonly db: DriftDatabase) {}

  async deviceId(): Promise<string> {
    return 'A2B3C4';
  }

  async isBranch(): Promise<boolean> {
    return false;
  }

  async canIssue(): Promise<boolean> {
    return false;
  }

  async importPrivateKey(_pem: string): Promise<boolean> {
    return false;
  }
}
