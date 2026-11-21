import { useImdColors } from '../../../core/theme/imd_theme';
import { ImdEmptyStateNoPermission } from '../../../core/ui/imd_empty_state';
import { ImdPage, ImdPageTitle } from '../../../core/ui/imd_widgets';

/// رسالة «صلاحية غير متاحة 🔒».
export function HomeShellNoAccess() {
  const c = useImdColors();
  return (
    <ImdPage>
      <ImdPageTitle title="صلاحية غير متاحة" icon="lock" colors={c} />
      <ImdEmptyStateNoPermission
        message="لا تملك صلاحية الوصول إلى هذه الشاشة. اطلب من مدير النظام منحك الصلاحية المناسبة."
        colors={c}
      />
    </ImdPage>
  );
}

export function HomeShellSoon() {
  const c = useImdColors();
  return (
    <ImdPage>
      <ImdPageTitle
        title="قريبًا"
        icon="alert"
        subtitle="هذه الشاشة ستُبنى في خطوة قادمة"
        colors={c}
      />
    </ImdPage>
  );
}
