/// أسماء التطبيق — قرار المالك (2026-10-11): **مصدرٌ واحد** لا نصوصٌ متفرّقة.
///
/// • الواجهة (عنوان النافذة، شاشات الاسترداد والقفل): «نظام الإمداد والتموين».
/// • اسم التطبيق تحت أيقونته في أندرويد/iOS: «Emdad System» (`android:label`).
/// • الملف التنفيذي على ويندوز: `imdad.exe` (`BINARY_NAME` في CMake).
/// • المثبّت: `EmdadSystem_<الإصدار>.exe` (`tool/installer/imdad.iss`).
export class AppNames {
  private constructor() {}

  static readonly ui = 'نظام الإمداد والتموين';
  static readonly mobileLabel = 'Emdad System';
  static readonly windowsExe = 'imdad.exe';
  static readonly installerStem = 'EmdadSystem';

  /// عنوان التطبيق كما يراه نظام التشغيل — في الويب يُرجع [AppNames.ui] دائمًا
  /// (في المصدر: `(Platform.isAndroid || Platform.isIOS) ? mobileLabel : ui`).
  static get title(): string {
    return AppNames.ui;
  }
}
