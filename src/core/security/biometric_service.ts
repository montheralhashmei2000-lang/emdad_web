// MISSING: lib/core/security/biometric_service.dart (غير مرفق في دفعة 5)
// بديل صوري مؤقت (Minimal Typed Stub) دون اختراع منطق بصمة أو تشفير جهاز.

import type { AppDatabase } from '../../data/db/app_database';
import type { User } from '../../data/db/tables/core_tables';
import { AuthResult, AuthStatus, type AuthService } from './auth_service';

export enum BiometricAvailability {
  available = 'available',
  unavailable = 'unavailable',
}

export class BiometricService {
  constructor(
    readonly db: AppDatabase,
    readonly auth: AuthService,
  ) {}

  async availability(): Promise<BiometricAvailability> {
    return BiometricAvailability.unavailable;
  }

  async enrolledUserId(): Promise<string | null> {
    return null;
  }

  async declinedPrompt(): Promise<boolean> {
    return false;
  }

  async rememberDeclined(): Promise<void> {
    // MISSING: lib/core/security/biometric_service.dart
  }

  async enroll(_user: User, _password: string): Promise<boolean> {
    return false;
  }

  async signIn(): Promise<AuthResult> {
    return new AuthResult({ status: AuthStatus.badCredentials });
  }
}
