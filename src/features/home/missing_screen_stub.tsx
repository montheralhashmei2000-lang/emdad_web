// بديل صوري موحّد ونظيف للشاشات المؤجلة من المراحل 7–27 (موسوم بـ // MISSING دون اختراع شاشات وهمية).

import { useImdColors } from '../../core/theme/imd_theme';
import { ImdPage, ImdPageTitle } from '../../core/ui/imd_widgets';

export interface MissingScreenStubProps {
  readonly sourcePath: string;
  readonly screenName: string;
  readonly extra?: string;
}

export function MissingScreenStub({
  sourcePath,
  screenName,
  extra,
}: MissingScreenStubProps) {
  const c = useImdColors();
  return (
    <ImdPage className="h-full">
      <div
        data-missing-screen={screenName}
        data-missing-source={sourcePath}
        className="flex flex-col items-stretch"
      >
        <ImdPageTitle
          title={screenName}
          icon="alert"
          subtitle={`// MISSING: ${sourcePath}${extra ? ` (${extra})` : ''}`}
          colors={c}
        />
      </div>
    </ImdPage>
  );
}
