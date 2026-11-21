// MISSING: lib/core/security/owner_signature.dart (مرحلة لاحقة)
// بديل صوري مؤقت (Minimal Typed Stub) — دون اختراع قواعد توقيع أو تشفير ECDSA.

import type { DeviceActivation } from './device_activation';

export class OwnerSignature {
  private constructor() {}

  static readonly roleKey = 'r';
  static readonly credsKey = 'c';
  static readonly sectionsKey = 's';

  static seconds(dt: Date): number {
    return Math.trunc(dt.getTime() / 1000);
  }

  static rank(_role: string): number {
    return 0;
  }

  static parse(_raw: string): Record<string, string> {
    return {};
  }

  static encode(sigs: Readonly<Record<string, string>>): string {
    return Object.keys(sigs).length === 0 ? '' : JSON.stringify(sigs);
  }

  static async signRole(
    _activation: DeviceActivation,
    _opts: { readonly userId: string; readonly role: string; readonly updatedAtSec: number },
  ): Promise<string | null> {
    return null;
  }

  static async signCreds(
    _activation: DeviceActivation,
    _opts: {
      readonly userId: string;
      readonly role: string;
      readonly saltHex: string;
      readonly hashHex: string;
      readonly permissions: string;
      readonly warehouseScope: string;
      readonly active: boolean;
      readonly approved: boolean;
      readonly updatedAtSec: number;
    },
  ): Promise<string | null> {
    return null;
  }

  static async signSections(
    _activation: DeviceActivation,
    _opts: {
      readonly userId: string;
      readonly blockedJson: string;
      readonly updatedAtSec: number;
    },
  ): Promise<string | null> {
    return null;
  }
}
