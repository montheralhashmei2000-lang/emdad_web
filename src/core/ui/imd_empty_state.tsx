import type { ReactNode } from 'react';
import { ImdIcon } from './imd_icon';
import { ImdStyle } from './imd_style';
import { ImdColors } from './imd_tokens';

function resolveActiveColors(explicit?: ImdColors): ImdColors {
  if (explicit) return explicit;
  if (typeof document !== 'undefined') {
    const ds = document.documentElement.dataset;
    const isDark = ds.theme === 'dark';
    const isFuel = ds.section === 'fuel';
    if (isFuel) return isDark ? ImdColors.fuelDark : ImdColors.fuelLight;
    if (isDark) return ImdColors.dark;
  }
  return ImdStyle.classic ? ImdColors.classicLight : ImdColors.light;
}

export interface ImdEmptyStateProps {
  readonly title: string;
  /// اسم أيقونة `ImdIcon`.
  readonly icon: string;
  readonly message?: string | null;
  /// عادةً `ImdButton`.
  readonly action?: ReactNode;
  readonly colors?: ImdColors;
  readonly className?: string;
}

export interface ImdEmptyStatePresetProps {
  readonly title?: string;
  readonly message?: string | null;
  readonly action?: ReactNode;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// حالة «لا شيء لعرضه»: أيقونة كبيرة فوق عنوان ونص مساعد وزر إجراء اختياري.
///
/// تصلح للشاشة كلها أو لقسمٍ صغير أو لجدولٍ فارغ. أمّا [ImdEmptyBox] فيبقى صفَّ
/// نصٍّ داخل إطار جدول للاستعمالات القائمة.
///
/// الأيقونات من مكتبة `ImdIcon` لا من `Icons` في Material،
/// وليس فيها `inbox` ولا `search_off`، فأقربُ بدائلها: `package` و`search`.
export function ImdEmptyState({
  title,
  icon,
  message,
  action,
  colors,
  className = '',
}: ImdEmptyStateProps) {
  const c = resolveActiveColors(colors);
  const hasMessage = message !== undefined && message !== null && message.length > 0;

  return (
    <div className={`flex w-full items-center justify-center p-6 ${className}`.trim()}>
      {/* سقفٌ لعرض النص كي لا تمتد الأسطر على شاشةٍ عريضة؛ ويضيق مع الشاشة الضيقة. */}
      <div className="flex w-full max-w-[420px] flex-col items-center text-center">
        <ImdIcon
          name={icon}
          size={64}
          color={c.text.withValues({ alpha: 0.4 })}
          strokeWidth={1.5}
        />
        <div
          className="mt-6 text-center text-[18px] font-semibold"
          style={{ color: c.text.css }}
        >
          {title}
        </div>
        {hasMessage && (
          <div
            className="mt-2 text-center text-[14px] leading-[1.6]"
            style={{ color: c.muted.css }}
          >
            {message}
          </div>
        )}
        {action !== undefined && action !== null && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

/// لا توجد بيانات بعد.
export function ImdEmptyStateNoData({
  title = 'لا توجد بيانات',
  message,
  action,
  colors,
  className,
}: ImdEmptyStatePresetProps) {
  return (
    <ImdEmptyState
      title={title}
      icon="package"
      message={message}
      action={action}
      colors={colors}
      className={className}
    />
  );
}

/// بحثٌ أو تصفيةٌ لم تُرجع شيئًا.
export function ImdEmptyStateNoResults({
  title = 'لا توجد نتائج',
  message = 'جرّب تغيير كلمات البحث أو إزالة عوامل التصفية.',
  action,
  colors,
  className,
}: ImdEmptyStatePresetProps) {
  return (
    <ImdEmptyState
      title={title}
      icon="search"
      message={message}
      action={action}
      colors={colors}
      className={className}
    />
  );
}

/// فشل تحميل أو عملية.
export function ImdEmptyStateError({
  title = 'حدث خطأ',
  message,
  action,
  colors,
  className,
}: ImdEmptyStatePresetProps) {
  return (
    <ImdEmptyState
      title={title}
      icon="alert"
      message={message}
      action={action}
      colors={colors}
      className={className}
    />
  );
}

/// المستخدم لا يملك صلاحية العرض.
export function ImdEmptyStateNoPermission({
  title = 'لا تملك صلاحية العرض',
  message = 'تواصل مع مدير النظام إن كنت تحتاج هذا الوصول.',
  action,
  colors,
  className,
}: ImdEmptyStatePresetProps) {
  return (
    <ImdEmptyState
      title={title}
      icon="lock"
      message={message}
      action={action}
      colors={colors}
      className={className}
    />
  );
}

/// حالة مخصصة: أيّ أيقونةٍ من مكتبة `ImdIcon`.
export function ImdEmptyStateCustom(props: ImdEmptyStateProps) {
  return <ImdEmptyState {...props} />;
}

export namespace ImdEmptyState {
  export const NoData = ImdEmptyStateNoData;
  export const noData = ImdEmptyStateNoData;
  export const NoResults = ImdEmptyStateNoResults;
  export const noResults = ImdEmptyStateNoResults;
  export const Error = ImdEmptyStateError;
  export const error = ImdEmptyStateError;
  export const NoPermission = ImdEmptyStateNoPermission;
  export const noPermission = ImdEmptyStateNoPermission;
  export const Custom = ImdEmptyStateCustom;
  export const custom = ImdEmptyStateCustom;
}
