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
| `lib/core/ui/imd_icon_data.dart` | `src/core/ui/imd_icon_data.ts` |
| `lib/core/ui/imd_icon.dart` | `src/core/ui/imd_icon.tsx` |
| `lib/core/ui/imd_page_dirty.dart` | `src/core/ui/imd_page_dirty.tsx` |
| `lib/core/ui/imd_screen_actions.dart` | `src/core/ui/imd_screen_actions.tsx` |
| `lib/core/ui/widgets/imd_tap.dart` | `src/core/ui/widgets/imd_tap.tsx` |
| `lib/core/ui/widgets/imd_chips.dart` | `src/core/ui/widgets/imd_chips.tsx` |
| `lib/core/ui/imd_layout.dart` | `src/core/ui/imd_layout.tsx` |
| `lib/core/ui/imd_empty_state.dart` | `src/core/ui/imd_empty_state.tsx` |
| `lib/core/ui/imd_shimmer.dart` | `src/core/ui/imd_shimmer.tsx` |
| `lib/core/ui/imd_occupancy_bar.dart` | `src/core/ui/imd_occupancy_bar.tsx` |
| `lib/core/ui/imd_charts.dart` | `src/core/ui/imd_charts.tsx` |
| `lib/core/ui/imd_context_menu.dart` | `src/core/ui/imd_context_menu.tsx` |
| `lib/core/ui/imd_key_scroll.dart` | `src/core/ui/imd_key_scroll.tsx` |
| `lib/core/ui/widgets/imd_tabs.dart` | `src/core/ui/widgets/imd_tabs.tsx` |
| `lib/core/ui/widgets/imd_fields.dart` | `src/core/ui/widgets/imd_fields.tsx` |
| `lib/core/ui/widgets/imd_buttons.dart` | `src/core/ui/widgets/imd_buttons.tsx` |
| `lib/core/ui/widgets/imd_dialogs.dart` | `src/core/ui/widgets/imd_dialogs.tsx` |
| `lib/core/ui/widgets/imd_column_filter.dart` | `src/core/ui/widgets/imd_column_filter.tsx` |
| `lib/core/ui/widgets/imd_page_chrome.dart` | `src/core/ui/widgets/imd_page_chrome.tsx` |
| `lib/core/ui/imd_widgets.dart` | `src/core/ui/imd_widgets.ts` |
| `lib/core/ui/imd_form.dart` | `src/core/ui/imd_form.tsx` |
| `lib/core/ui/imd_bulk.dart` | `src/core/ui/imd_bulk.tsx` |
| `lib/core/ui/imd_menu_bar.dart` | `src/core/ui/imd_menu_bar.tsx` |
| `lib/core/ui/imd_status_bar.dart` | `src/core/ui/imd_status_bar.tsx` |
| `lib/core/ui/imd_page_tabs.dart` | `src/core/ui/imd_page_tabs.tsx` |
| `lib/core/ui/imd_toolbar.dart` | `src/core/ui/imd_toolbar.tsx` |
| `lib/core/ui/imd_tabs_shell.dart` | `src/core/ui/imd_tabs_shell.tsx` |

## ملاحظات التحويل والمنصة
- `iso_date.ts` و`date_span.ts`: السنوات `0–99` عولجت عبر `setFullYear(y, mo - 1, d)` لمنع تحويلها تلقائياً في JS إلى `1900–1999`.
- `app_names.ts`: `get title()` يُرجع `AppNames.ui` دائماً لعدم وجود `dart:io` (`Platform`) في المتصفح.
- `error_log.ts`: استبدال `FlutterError.onError` و`PlatformDispatcher.instance.onError` بـ`window.onerror` و`unhandledrejection` وربط `DomainDiagnostics.sink` مع منع تكرار المستمعات.
- `imd_numbers.ts`: إضافة `ValueNotifier<T>` بواجهة `.value` و`addListener` و`removeListener` مكافئاً لـ`package:flutter/foundation.dart`.
- كسر الاستيراد الدائري (`imd_style.ts` ↔ `imd_density.ts`): حُذف استيراد `imd_density.ts` من `imd_style.ts`، ويُعلن التغيير عبر `ImdStyle.notifier` (`ValueNotifier<boolean>`) الذي يشترك فيه `ImdDensity` لاستدعاء `ImdDensity.rebuildAll()` في اتجاه واحد (`imd_numbers` ← `imd_style` ← `imd_density`).
- كسر الاستيراد الدائري (`imd_density.ts` ↔ `imd_tokens.ts`): حُذف استيراد `imd_tokens.ts` من `imd_density.ts`، ويقرأ `ImdDensity.isTouchDevice()` حالة اللمس مباشرةً عبر استعلام `@media (hover: none) and (pointer: coarse)` ليبقى الاعتماد أحادي الاتجاه (`imd_density` ← `imd_tokens`).
- `imd_style.ts` و`imd_density.ts` و`imd_section_theme.ts`: استبدال `SharedPreferences` بـ`localStorage` داخل `try/catch` بالمفاتيح الأصلية نفسها (`'imdad.style.classic'`، `'imdad.density.high'`، `'imdad.theme.fuelIdentity'`).
- `imd_tokens.ts` و`app_theme.ts`: إضافة `ImdColor` (مع `Color(0x...)` و`alphaBlend` و`lerp` و`.r/.g/.b/.a`) وتوليد متغيرات CSS (`imdCssVars` و`src/index.css`) من الرموز نفسها حرفياً دون تعديل أو تقريب.
- `imd_icon_data.ts` و`imd_icon.tsx`: استبدال `SvgPicture.string` بـ`<svg>` مضمّن مع تحويل `#000` في العرض فقط إلى `currentColor` ليتبع اللون الممرَّر من `ImdColor` أو النص المحيط، ودعم التلميح (`title`/`aria-label`) و`ImdEmojiText` (`\uFE0F?\s?`) بمطابقة كاملة مع المصدر.
- `imd_page_dirty.tsx`: استبدال `InheritedWidget` بـ`ImdPageDirtyContext` ومزوّد `ImdPageDirty` مع `useImdPageDirtyFlag` و`useImdPageDirty` و`ImdPageDirty.mark` و`ImdPageDirty.flagOf` دون إحداث إعادة بناء عند رفع `flag.dirty = true`.
- `imd_screen_actions.tsx`: استبدال `Provider<ImdScreenActions>` بـ`ImdScreenActionsContext` و`ImdScreenActionsProvider` و`useImdScreenActions` (مع `ImdScreenActions.maybeOf`)، واستبدال `dart:io` (`Platform.isWindows/isLinux/isMacOS`) في `ImdShortcuts.supported` بفحص متصفح آمن (`navigator.userAgent` و`navigator.platform` و`maxTouchPoints`) يستثني الجوال والأجهزة اللوحية.
- `imd_tap.tsx`: استبدال `GestureDetector` و`FocusableActionDetector` و`Semantics` بعنصر تفاعلي (`role="button"`، `tabIndex`، `Enter`/`Space`، `title` و`aria-label`، `aria-disabled`، `aria-pressed`) مرتبط بـ`ImdColors` و`ImdSizes.touchMin` و`ImdCursor.click`.
- `imd_chips.tsx`: تحويل `ImdTone` و`ImdChip` (`StatusBadge`) و`ImdNote` و`ImdAlert` مع حماية منع التجاوز الأفقي (`min-w-0`، `max-w-full`، `w-fit`، `text-ellipsis` لسطر واحد في الشارة، و`ImdColor.alphaBlend` عند التمرير).
- `imd_layout.tsx`: استبدال `LayoutBuilder` و`RenderEqualRow` و`CustomPainter` بـCSS Grid (`ImdGridRows`، `ImdEqualRow`، `ImdAutoGrid`، `ImdGrid2`) و`min(width, 100%)` (`ImdFit`) وSVG (`ImdSparkPainter`) و`marginInlineStart`/`marginInlineEnd` لدعم RTL، مع الربط بـ`ImdBp` و`ImdSizes` و`ImdDensity` و`ImdColors`.
- `imd_empty_state.tsx`: تحويل `ImdEmptyState` وجميع صيغه الجاهزة (`NoData`، `NoResults`، `Error`، `NoPermission`، `Custom`) بالربط مع `ImdIcon` (الدفعة ١) و`ImdColors`.
- `imd_shimmer.tsx`: استبدال حزمة `shimmer` بحركة `@keyframes imd-shimmer-rtl` و`imd-shimmer-ltr` في `src/index.css` مع ألوان مشتقة بـ`ImdColor.alphaBlend` من `c.text` و`c.surface` والربط بـ`ImdAutoGrid` (`imd_layout.tsx`).
- `imd_occupancy_bar.tsx`: ربط عرض القيم والنسب بـ`nf` و`arDigits` (`imd_format.ts`) وألوان العتبات بـ`ImdColors` (`c.warn`، `c.danger`، `c.accent`، `c.muted`)، مع حماية القسمة على صفر وتقييد امتلاء الشريط بين 0% و100% مع إبقاء الرقم الحقيقي للنسبة الظاهرة.
- `imd_charts.tsx`: استبدال `CustomPainter` بـSVG متجاوب عبر `ResizeObserver` (`ImdLineChart`، `ImdHBarChart`، `ImdScoreRing`، `ImdVBarChart`) مع استخدام ألوان الشبكة والمحاور (`ImdColors.chartGridLight`/`ImdColors.chartTickLight`/الوضع الداكن)، وتنسيق الأرقام عبر `arDigits`/`nf` (`imd_format.ts`)، وحماية الحسابات الهندسية عند فراغ البيانات أو `top === 0` أو `n <= 1` لمنع أي `NaN`.
- `imd_context_menu.tsx`: استبدال `showMenu` و`Overlay` بقائمة سياق منبثقة (`ImdContextMenu` و`showImdContextMenu`) مربوطة بـ`ImdIcon` و`ImdColors` و`ImdSizes`، مع حساب موضع القائمة داخل حدود الشاشة في RTL (`computeImdContextMenuPosition`) ودعم الإغلاق بـ`Escape` والنقر الخارجي والتنقل بـ`ArrowUp`/`ArrowDown`/`Home`/`End`/`Enter`/`Space`.
- `imd_key_scroll.tsx`: استبدال `HardwareKeyboard` و`hitTestInView` بمستمع لوحة المفاتيح (`ArrowUp`/`ArrowDown`/`PageUp`/`PageDown`/`Home`/`End` مع خطوة `64` ونسبة `0.85`، والأسهم الأفقية في RTL) وحفظ آخر عنصر/نقطة نقر لتمرير أعمق حاوية ثم الحاوية الأب عند بلوغ الحد، مع تجاهل حقول الإدخال (`input`، `textarea`، `select`، `contentEditable`) ومفاتيح التعديل (`Ctrl`/`Alt`/`Meta`).
- `imd_tabs.tsx`: تحويل `ImdTab` و`ImdPillTabs` و`ImdSegmented` بالربط مع `ImdTap` و`ImdIcon` و`ImdColors` و`ImdSizes.barControl`، مع التمرير الأفقي في RTL وسمات الوصول (`role="tablist"`، `role="tab"`، `aria-selected`).
- كسر الاستيراد الدائري (`imd_fields` ↔ `imd_dialogs` ↔ `imd_buttons`): فُكّت الدورة بجعل الاعتماد أحادي الاتجاه (`imd_fields.tsx` ← `imd_buttons.tsx` ← `imd_dialogs.tsx`)؛ إذ يعرض `ImdSelect` نافذة الاختيار المنبثقة محليًا عبر Portal بالمظهر والسلوك نفسيهما دون استيراد `imd_dialogs.tsx` أو `imd_buttons.tsx`، بينما يستورد `imd_buttons.tsx` سياق `ImdCompact` من `imd_fields.tsx`، وسيستورد `imd_dialogs.tsx` كليهما في الدفعة ٩ مع الإبقاء على جميع الأسماء والدوال المُصدَّرة مطابقة للمصدر.
- `imd_fields.tsx`: تحويل `ImdCompact` (وسم الكثافة المدمجة عبر React Context)، و`imdFieldDecoration`، و`ImdField`، و`ImdSelect`، و`ImdPickerBody` مع توحيد ارتفاع الحقول والمنتقيات وفق `ImdSizes.compactField`/`ImdSizes.touchMin` و`ImdDensity`، والربط مع `ImdPageDirty` و`ImdIcon` و`ImdColors`.
- `imd_buttons.tsx`: تحويل `ImdBtnKind` و`ImdMenuButton` و`ImdButton` (`ImdButton.Outline` / `ImdButtonOutline`) و`ImdIconButton` بالربط مع `ImdTap` و`ImdIcon` و`ImdColors` و`ImdSizes` و`ImdCompact`، مع تمرير `tooltip` غير الفارغ في `ImdIconButton` إلى `title` و`aria-label` معًا وإهمال التلميحات الفارغة أو المقتصرة على المسافات.
- `imd_dialogs.tsx`: استبدال `showDialog` و`ScaffoldMessenger` بـ`ImdModalDialog` (`createPortal` مع `role="dialog"` و`aria-modal="true"`) و`showImdModal` و`imdConfirm` و`imdPrompt` و`showImdToast` بأسلوب أمري وتصريحي، مع الإغلاق عبر `Escape` والنقر الخارجي، وتمرير `Enter`/`NumpadEnter` الاختياري، والربط أحادي الاتجاه مع `imd_fields.tsx` و`imd_buttons.tsx`.
- `imd_column_filter.tsx`: تحويل `ImdColumnFilterBody` بالربط مع `imd_buttons.tsx` و`imd_fields.tsx` و`ImdColors` و`ImdSizes` و`arDigits` (`imd_format.ts`)، مع البحث الفوري ومربعات الاختيار وأزرار «تحديد الكل» و«إلغاء الكل» و«إلغاء» و«تطبيق» ومنع التصفية الفارغة.
- `imd_page_chrome.tsx`: تحويل `ImdEmbedScope` و`ImdPageBack` و`ImdActionRow` و`ImdPageTitle` و`ImdPanel` و`ImdGrid` و`ImdPage` (بما فيها `ImdPage.paddingOf`) بالربط مع `ImdDensity` و`ImdSizes` و`ImdBp` و`ImdColors` و`ImdIcon` و`ImdButtonOutline`، واستخدام `ResizeObserver` وشبكة CSS في `ImdGrid` وحشوات الكثافة المتجاوبة في `ImdPage`.
- `imd_widgets.ts`: ملف التصدير المجمّع لمكوّنات الأدوات الثمانية المحوَّلة، إضافةً إلى الهيكل المؤقت `src/core/ui/widgets/imd_table.tsx` الذي يصدّر `ImdEmptyBox` فقط لحين تحويل الجدول الذكي الكامل في المرحلة 3.
- `imd_form.tsx`: تحويل جميع مكوّنات النماذج (`ImdItabs`، `ImdICard`، `ImdF2`، `ImdLabeled`، `ImdFld`، `ImdChipsRow`، `ImdLd`، `ImdLdText`، `ImdSearchBar`، `ImdBullets`، `ImdDateField`، `ImdCheckbox`، `ImdInputGroup`، `imdSetText` مع `ImdTextController`)، مع الحفاظ الحرفي على توقيع `ImdDateField.initialFor` وسلوك `parseIsoDay` الصارم، وتوحيد ارتفاع الحقول في الصف الواحد عبر `ImdSizes` و`ImdDensity`.
- `imd_bulk.tsx`: تحويل `ImdBulkCol` و`ImdBulkRow` و`ImdBulkGrid` مع التحوّل إلى بطاقات على العرض الضيق (`ImdBp.of().tablet`)، وتمرير التلميحات (`تكرار السطر`، `حذف السطر`) لأزرار الأيقونات، والربط مع `ImdEmptyBox` (`imd_widgets.ts`).
- `imd_menu_bar.tsx`: تحويل `ImdMenuBar` المرتبط بـ`ImdScreenActions` و`ImdShortcuts.supported` و`ImdSizes.desktopBarHeight` و`ImdMenuButton` (مع إضافة عرض الاختصار `shortcut` في `ImdMenuButtonItem` بـ`imd_buttons.tsx`)، لتعطيل بنود «ملف» (`سند جديد`، `حفظ`، `طباعة`، `تحديث`) تلقائيًا عند غياب إجراء الشاشة، وعرض نافذة «اختصارات لوحة المفاتيح» عبر `showImdModal`.
- `imd_status_bar.tsx`: تحويل `ImdRecordSink` و`ImdRecordScope` (`useImdRecordScope` و`ImdRecordScope.maybeOf`) و`ImdStatusBar`، مع استبدال `intl` بدالة `arDigits` و`nf` من `imd_format.ts` والاشتراك في `ImdNumbers.notifier` لتتبع الأرقام النشطة (هندية/لاتينية) وتحديث عداد السجلات بعد التفكيك بأمان.
- `imd_page_tabs.tsx`: تحويل `ImdOpenPage` و`ImdPageTabs` و`ImdPageHost` بالربط مع `ImdTap` و`showImdContextMenu` (`إغلاق` / `إغلاق الباقي`) و`ImdIcon` و`ImdRecordScope` و`ImdScreenActionsProvider` لعزل عدّاد السجلات واختصارات كل تبويبة دون إفقاد حالة الصفحات المخفية.
- `imd_toolbar.tsx`: تحويل `ImdToolbarMeta` و`ImdToolbarCfg` (`imdad.toolbarCfg` عبر `localStorage` داخل `try/catch`) و`ImdTableToolbar` و`ImdExcel`، مع ربط مؤقت بالبدائل الصورية المؤجلة (`imd_files.ts`، `auth_service.ts`، `perm.ts`، وتعليق `// MISSING: xlsx`).
- `imd_tabs_shell.tsx`: تحويل `ImdShellTab` و`ImdTabsShell` بالربط مع `ImdTokens` (`ImdColors`) و`ImdEmptyStateNoPermission` و`ImdWidgets` (`ImdPage`، `ImdPillTabs`، `ImdTab`) مع تمرير شريط التبويبات أفقياً بسطر واحد، والربط المؤقت بـ`PermAction.view` (`src/domain/access_control.ts`) و`usePerm` (`src/core/security/perm.ts`).

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

## ملفات الاختبارات المحوَّلة (المرحلة 2)

| ملف الاختبار (Dart) | ملف Vitest المقابل |
|---|---|
| `test/field_row_height_test.dart` | `src/core/ui/__tests__/field_row_height.test.tsx` |
| `test/chip_overflow_test.dart` | `src/core/ui/__tests__/chip_overflow.test.tsx` |
| `test/icon_button_label_test.dart` | `src/core/ui/__tests__/icon_button_label.test.tsx` |
| `test/screen_actions_test.dart` | `src/core/ui/__tests__/screen_actions.test.tsx` |
| `test/imd_key_scroll_test.dart` | `src/core/ui/__tests__/imd_key_scroll.test.tsx` |

## ربط مؤجل لمراحل لاحقة

| الملف الحالي | الرمز / الاعتماد الناقص | مرحلة التنفيذ المستهدفة | حالة البديل المؤقت |
|---|---|---|---|
| `src/core/ui/imd_widgets.ts` و`src/core/ui/imd_bulk.tsx` | `lib/core/ui/widgets/imd_table.dart` (`ImdEmptyBox` وبقية مكونات الجدول الذكي) | المرحلة 3 | بديل صوري مؤقت `src/core/ui/widgets/imd_table.tsx` يصدّر `ImdEmptyBox` فقط دون اختراع منطق الجدول الذكي |
| `src/core/ui/imd_toolbar.tsx` | `lib/core/ui/imd_files.dart` (`ImdFiles.saveBytes`) | المرحلة 3 | بديل صوري مؤقت `src/core/ui/imd_files.ts` موسوم بـ`// MISSING` دون منطق حفظ ملفات |
| `src/core/ui/imd_toolbar.tsx` | `lib/core/security/auth_service.dart` (`AuthService`, `useAuthService`) | المرحلة 5 | بديل صوري مؤقت `src/core/security/auth_service.ts` موسوم بـ`// MISSING` دون منطق مصادقة |
| `src/core/ui/imd_toolbar.tsx` | `lib/core/security/perm.dart` (`Perm`, `usePerm`) | المرحلة 5 | بديل صوري مؤقت `src/core/security/perm.ts` موسوم بـ`// MISSING` دون قواعد صلاحيات |
| `src/core/ui/imd_toolbar.tsx` | مكتبة `xlsx` (`ImdExcel.build`) | المرحلة 3 / 19 | تعليق `// MISSING: xlsx (المرحلة 3/19)` يُرجع مصفوفة بايتات فارغة لحين ربط حزمة Excel |
| `src/core/ui/imd_tabs_shell.tsx` | `lib/domain/access_control.dart` (`PermAction.view`) | المرحلة 5 | بديل صوري مؤقت `src/domain/access_control.ts` موسوم بـ`// MISSING` يصدّر `PermAction.view` فقط دون اختراع قواعد صلاحيات |
| `src/core/ui/imd_tabs_shell.tsx` | `lib/core/security/perm.dart` (`usePerm`) | المرحلة 5 | مرتبط بالبديل الصوري المؤقت `src/core/security/perm.ts` الموسوم بـ`// MISSING` دون قواعد صلاحيات |

## اختبارات مؤجلة

| ملف الاختبار | اسم الحالة المؤجلة | الملف الناقص الذي تنتظره | رقم المرحلة التي ستُفعّله |
|---|---|---|---|
| `src/core/__tests__/ids.test.ts` | سجلّان يُحفظان في اللحظة نفسها يبقيان سجلّين | `lib/data/db/app_database.dart`، `lib/data/repos/catalog_repo.dart` | المرحلة 4 و 7 |
| `src/core/__tests__/ids.test.ts` | سند بعدة أصناف يحفظ كل سطوره | `lib/data/db/app_database.dart`، `lib/data/repos/catalog_repo.dart`، `lib/data/repos/movements_repo.dart` | المرحلة 4 و 7 و 9 |
| `src/domain/__tests__/iso_date_strict.test.ts` | الطباعة والعرض يعيدان المستحيل كما هو | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/core/ui/__tests__/number_format.test.ts` | المطبوعات: لاتينيةٌ كما في ملفات Excel المعتمدة | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/core/ui/__tests__/number_format.test.ts` | مطبوعاتٌ هندية | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/core/ui/__tests__/number_format.test.ts` | خانات الكميات تُقصّ أصفارها، وخانات المبالغ ثابتة | `lib/core/print/print_format.dart` | المرحلة 18 |
| `src/core/ui/__tests__/number_format.test.ts` | يُحفظ ويُقرأ ويسري على الشاشات والمطبوعات معًا | `lib/data/db/app_database.dart`، `lib/data/repos/settings_repo.dart` | المرحلة 4 و 20 |
| `src/domain/__tests__/app_space.test.ts` | تعرض المساحتين بوصفيهما | `lib/features/home/space_chooser_screen.dart` | المرحلة 6 |
| `src/domain/__tests__/app_space.test.ts` | النقر يعيد المساحة المختارة | `lib/features/home/space_chooser_screen.dart` | المرحلة 6 |
| `src/domain/__tests__/app_space.test.ts` | تُبنى على عرض ضيّق بلا فيض | `lib/features/home/space_chooser_screen.dart` | المرحلة 6 |
| `src/domain/__tests__/menu_doors.test.ts` | كل تبويبةٍ صلاحيةٌ معروفة | `lib/core/security/perm.dart` | المرحلة 5 |
| `src/core/ui/__tests__/icon_button_label.test.tsx` | كل زرِّ أيقونةٍ في الشِّفرة يحمل اسمًا | `lib/features/*_screen.dart` | المراحل 5+ |
| `src/core/ui/__tests__/screen_actions.test.tsx` | كل شاشةٍ لها حفظ تسجّل Ctrl+S | `lib/features/*_screen.dart` | المراحل 5+ |
