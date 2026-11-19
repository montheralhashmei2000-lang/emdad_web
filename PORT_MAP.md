# خريطة التحويل (PORT_MAP)

| ملف Dart | ملف TypeScript المقابل |
|---|---|
| `lib/domain/diagnostics.dart` | `src/domain/diagnostics.ts` |
| `lib/domain/iso_date.dart` | `src/domain/iso_date.ts` |
| `lib/domain/date_span.dart` | `src/domain/date_span.ts` |
| `lib/domain/arabic_words.dart` | `src/domain/arabic_words.ts` |
| `lib/domain/app_space.dart` | `src/domain/app_space.ts` |
| `lib/domain/menu_doors.dart` | `src/domain/menu_doors.ts` |
| `lib/domain/imd_fonts.dart` | `src/domain/imd_fonts.ts` |
| `lib/core/ui/imd_fonts.dart` | `src/core/ui/imd_fonts.ts` |
| `lib/core/app_names.dart` | `src/core/app_names.ts` |
| `lib/core/ids.dart` | `src/core/ids.ts` |
| `lib/core/error_log.dart` | `src/core/error_log.ts` |
| `lib/core/ui/imd_numbers.dart` | `src/core/ui/imd_numbers.ts` |
| `lib/core/ui/imd_format.dart` | `src/core/ui/imd_format.ts` |
| `lib/core/ui/imd_style.dart` | `src/core/ui/imd_style.ts` |
| `lib/core/ui/imd_density.dart` | `src/core/ui/imd_density.ts` |
| `lib/core/ui/imd_section_theme.dart` | `src/core/ui/imd_section_theme.ts` |
| `lib/core/ui/imd_tokens.dart` | `src/core/ui/imd_tokens.ts` |
| `lib/core/theme/app_theme.dart` | `src/core/theme/app_theme.ts` |
| `pubspec.yaml` | مرجع التبعيات والخطوط (Google Fonts في `index.html`) — لا ملف `.ts` مقابل |

## ملاحظات التحويل والمنصة
- `iso_date.ts` و`date_span.ts`: السنوات `0–99` عولجت عبر `setFullYear(y, mo - 1, d)` لمنع تحويلها تلقائياً في JS إلى `1900–1999`.
- `app_names.ts`: `get title()` يُرجع `AppNames.ui` دائماً لعدم وجود `dart:io` (`Platform`) في المتصفح.
- `error_log.ts`: استبدال `FlutterError.onError` و`PlatformDispatcher.instance.onError` بـ`window.onerror` و`unhandledrejection` وربط `DomainDiagnostics.sink` مع منع تكرار المستمعات.
- `imd_numbers.ts`: إضافة `ValueNotifier<T>` بواجهة `.value` و`addListener` و`removeListener` مكافئاً لـ`package:flutter/foundation.dart`.
- كسر الاستيراد الدائري (`imd_style.ts` ↔ `imd_density.ts`): حُذف استيراد `imd_density.ts` من `imd_style.ts`، ويُعلن التغيير عبر `ImdStyle.notifier` (`ValueNotifier<boolean>`) الذي يشترك فيه `ImdDensity` لاستدعاء `ImdDensity.rebuildAll()` في اتجاه واحد (`imd_numbers` ← `imd_style` ← `imd_density`).
- كسر الاستيراد الدائري (`imd_density.ts` ↔ `imd_tokens.ts`): حُذف استيراد `imd_tokens.ts` من `imd_density.ts`، ويقرأ `ImdDensity.isTouchDevice()` حالة اللمس مباشرةً عبر استعلام `@media (hover: none) and (pointer: coarse)` ليبقى الاعتماد أحادي الاتجاه (`imd_density` ← `imd_tokens`).
- `imd_style.ts` و`imd_density.ts` و`imd_section_theme.ts`: استبدال `SharedPreferences` بـ`localStorage` داخل `try/catch` بالمفاتيح الأصلية نفسها (`'imdad.style.classic'`، `'imdad.density.high'`، `'imdad.theme.fuelIdentity'`).
- `imd_tokens.ts` و`app_theme.ts`: إضافة `ImdColor` (مع `Color(0x...)` و`alphaBlend` و`lerp` و`.r/.g/.b/.a`) وتوليد متغيرات CSS (`imdCssVars` و`src/index.css`) من الرموز نفسها حرفياً دون تعديل أو تقريب.

## ملفات الاختبارات المحوَّلة (المرحلة 1)

| ملف الاختبار (Dart) | ملف Vitest المقابل |
|---|---|
| `test/fonts_test.dart` | `src/core/ui/__tests__/fonts.test.ts` |
| `test/contrast_tokens_test.dart` | `src/core/ui/__tests__/contrast_tokens.test.ts` |
| `test/ids_test.dart` | `src/core/__tests__/ids.test.ts` |
| `test/iso_date_strict_test.dart` | `src/domain/__tests__/iso_date_strict.test.ts` |
| `test/number_format_test.dart` | `src/core/ui/__tests__/number_format.test.ts` |
| `test/app_space_test.dart` | `src/domain/__tests__/app_space.test.ts` |
| `test/menu_doors_test.dart` | `src/domain/__tests__/menu_doors.test.ts` |

## اختبارات مؤجلة

| ملف الاختبار | اسم الحالة المؤجلة | الملف الناقص الذي تنتظره | رقم المرحلة التي ستُفعّله |
|---|---|---|---|
| `src/core/__tests__/ids.test.ts` | سجلّان يُحفظان في اللحظة نفسها يبقيان سجلّين | `lib/data/db/app_database.dart`، `lib/data/repos/catalog_repo.dart` | المرحلة 4 و 7 |
| `src/core/__tests__/ids.test.ts` | سند بعدة أصناف يحفظ كل سطوره | `lib/data/db/app_database.dart`، `lib/data/repos/catalog_repo.dart`، `lib/data/repos/movements_repo.dart` | المرحلة 4 و 7 و 9 |
| `src/domain/__tests__/iso_date_strict.test.ts` | الطباعة والعرض يعيدان المستحيل كما هو | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/domain/__tests__/iso_date_strict.test.ts` | منتقي التاريخ يُفتح على يومٍ داخل مداه | `lib/core/ui/imd_form.dart` | المرحلة 2 |
| `src/core/ui/__tests__/number_format.test.ts` | المطبوعات: لاتينيةٌ كما في ملفات Excel المعتمدة | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/core/ui/__tests__/number_format.test.ts` | مطبوعاتٌ هندية | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/core/ui/__tests__/number_format.test.ts` | خانات الكميات تُقصّ أصفارها، وخانات المبالغ ثابتة | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/core/ui/__tests__/number_format.test.ts` | يُحفظ ويُقرأ ويسري على الشاشات والمطبوعات معًا | `lib/data/db/app_database.dart`، `lib/data/repos/settings_repo.dart` | المرحلة 4 و 20 |
| `src/domain/__tests__/app_space.test.ts` | تعرض المساحتين بوصفيهما | `lib/features/home/space_chooser_screen.dart` | المرحلة 6 |
| `src/domain/__tests__/app_space.test.ts` | النقر يعيد المساحة المختارة | `lib/features/home/space_chooser_screen.dart` | المرحلة 6 |
| `src/domain/__tests__/app_space.test.ts` | تُبنى على عرض ضيّق بلا فيض | `lib/features/home/space_chooser_screen.dart` | المرحلة 6 |
| `src/domain/__tests__/menu_doors.test.ts` | كل تبويبةٍ صلاحيةٌ معروفة | `lib/core/security/perm.dart` | المرحلة 5 |
