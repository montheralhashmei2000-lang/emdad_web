import { createContext, useCallback, useContext, type ReactNode } from 'react';

/// علامة «عدّل المستخدم شيئًا في هذه الصفحة» — واحدةٌ لكل صفحةٍ مفتوحة.
///
/// القشرة تُعيد بناء الصفحة المخفيّة التي تغيّرت بياناتها حين يعود إليها
/// المستخدم، **إلا** إن كان قد كتب فيها أو اختار: إعادة البناء تمحو سندًا نصف
/// مملوء وتبويبات السندات المعلّقة. فتبقى تلك الصفحة كما هي، بنقطةٍ على تبويبها.
///
/// تُرفع من حقول البيت نفسها ([ImdPageDirty.mark]) عند تعديلٍ **من المستخدم**:
/// `onChanged` في `TextField` ومنتقيات البيت لا يُطلق على التعبئة البرمجية.
/// ولا تُنزل إلا بإعادة بناء الصفحة أو إغلاقها: الشاشات لا تُبلغ عن الحفظ،
/// وتصفير النموذج بعده لا يعني أن لا سندات معلّقة في تبويباتها.
export class ImdDirtyFlag {
  dirty = false;
}

export const ImdPageDirtyContext = createContext<ImdDirtyFlag | null>(null);

export interface ImdPageDirtyProps {
  readonly flag: ImdDirtyFlag;
  readonly children?: ReactNode;
}

/// مزوِّد علامة التعديل غير المحفوظ للفرع الشجري للصفحة (مكافئ `InheritedWidget`).
export function ImdPageDirty({ flag, children }: ImdPageDirtyProps) {
  return <ImdPageDirtyContext.Provider value={flag}>{children}</ImdPageDirtyContext.Provider>;
}

/// العلامة نفسها لتُرفع بعد `await` دون الرجوع إلى سياقٍ ربما فُكّ.
export function useImdPageDirtyFlag(): ImdDirtyFlag | null {
  return useContext(ImdPageDirtyContext);
}

/// خطاف مساعد يرجع العلامة مع دالة مستقرة لرفعها عند تعديل المستخدم.
export function useImdPageDirty(): {
  readonly flag: ImdDirtyFlag | null;
  readonly mark: () => void;
} {
  const flag = useImdPageDirtyFlag();
  const mark = useCallback(() => {
    if (flag) flag.dirty = true;
  }, [flag]);
  return { flag, mark };
}

export namespace ImdPageDirty {
  export const Context = ImdPageDirtyContext;

  /// يرفع علامة الصفحة المحيطة. بلا صفحةٍ محيطة (حوار، اختبار معزول) لا شيء.
  /// لا يُنشئ اعتمادًا: يُستدعى من معالجات الأحداث لا من `render`.
  export function mark(flag?: ImdDirtyFlag | null): void {
    if (flag) flag.dirty = true;
  }

  /// العلامة نفسها لتُرفع بعد `await` دون الرجوع إلى سياقٍ ربما فُكّ.
  export function flagOf(): ImdDirtyFlag | null {
    return useImdPageDirtyFlag();
  }

  export const useFlag = useImdPageDirtyFlag;
  export const useDirty = useImdPageDirty;
}
