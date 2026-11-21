// NOT-PORTED: ملف خاص بالجهاز الأصلي (lib/core/ui/imd_window.dart)
// محوّل ويب صامت (No-op) لإدارة نافذة سطح المكتب — لا نافذة أصلية ولا Mica في المتصفح.

import { ValueNotifier } from './imd_numbers';

export class ImdWindow {
  private constructor() {}

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static readonly micaActive = new ValueNotifier<boolean>(false);

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static readonly loginSize = { width: 460, height: 640 } as const;

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static onBeforeExit: (() => Promise<void>) | null = null;

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static get supported(): boolean {
    return false;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static async login(): Promise<void> {
    // لا تغيير مقاس نافذة سطح مكتب في المتصفح
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static async main(): Promise<void> {
    // لا تكبير نافذة سطح مكتب في المتصفح
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static async syncMica(_mode: unknown): Promise<void> {
    // لا تأثير Mica في المتصفح
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  static async exit(): Promise<void> {
    if (ImdWindow.onBeforeExit !== null) {
      await ImdWindow.onBeforeExit();
    }
  }
}
