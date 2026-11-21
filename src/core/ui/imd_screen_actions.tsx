import { createContext, useContext, type ReactNode } from 'react';

export type VoidCallback = () => void;

export interface ImdScreenActionRegistration {
  readonly onSave?: VoidCallback | null;
  readonly onPrint?: VoidCallback | null;
  readonly onNewDoc?: VoidCallback | null;
  readonly onRefresh?: VoidCallback | null;
}

/// سجلّ إجراءات الشاشة النشطة — تسجّله كل شاشةٍ تريد الاستجابة لاختصارات
/// لوحة المفاتيح على سطح المكتب (Ctrl+S حفظ، Ctrl+P طباعة، Ctrl+N سند جديد،
/// F5 تحديث) في `initState`، وتُفرغه في `dispose`. طبقة الاختصارات العامة في
/// `main.dart` وشريط القوائم العلوي يستدعيانه بدل أن يعرفا بنفسهما أيّ شاشةٍ
/// نشطة الآن — بنفس فكرة `ImdNav` (التنقّل) لكن للإجراءات، وبنفس أسلوب
/// `.of(context)`/`Perm` في الوصول من أي مكان عبر `useContext`.
///
/// ليست `ChangeNotifier` عمدًا: شريط القوائم يقرأها لا يستمع إليها، فتُقرأ من
/// جديد مع كل إعادة بناءٍ لقالب الشاشة الرئيسية (كما يحدث عند كل تنقّل)، بلا
/// حاجةٍ لإشعارٍ فعلي ولا خطر استدعاء مستمعٍ أثناء تفكيك شجرة عنصرٍ جماعي.
export class ImdScreenActions {
  // إجراءات الصفحة. على الكائن الجذر (اختصارات الإطار وقائمة «ملف») تُقرأ من
  // [delegate] أولًا: خانة الصفحة الظاهرة الآن. كان التسجيل في الجذر مباشرة،
  // والصفحات تبقى حيّةً تبويبات، فيملك Ctrl+S آخرُ صفحةٍ فُتحت لا الظاهرة —
  // فيُحفظ سندٌ في تبويبٍ مخفيّ.
  private _onSave: VoidCallback | null = null;
  private _onPrint: VoidCallback | null = null;
  private _onNewDoc: VoidCallback | null = null;
  private _onRefresh: VoidCallback | null = null;

  /// خانة الصفحة الظاهرة (يضبطها الإطار عند تبديل الصفحة) — للجذر وحده.
  delegate: ImdScreenActions | null = null;

  get onSave(): VoidCallback | null {
    return this.delegate?.onSave ?? this._onSave;
  }
  set onSave(v: VoidCallback | null | undefined) {
    this._onSave = v ?? null;
  }

  get onPrint(): VoidCallback | null {
    return this.delegate?.onPrint ?? this._onPrint;
  }
  set onPrint(v: VoidCallback | null | undefined) {
    this._onPrint = v ?? null;
  }

  get onNewDoc(): VoidCallback | null {
    return this.delegate?.onNewDoc ?? this._onNewDoc;
  }
  set onNewDoc(v: VoidCallback | null | undefined) {
    this._onNewDoc = v ?? null;
  }

  get onRefresh(): VoidCallback | null {
    return this.delegate?.onRefresh ?? this._onRefresh;
  }
  set onRefresh(v: VoidCallback | null | undefined) {
    this._onRefresh = v ?? null;
  }

  /// البحث العام (Ctrl+K) — **إجراءُ الإطار لا الشاشة**: يسجّله `HomeShell`
  /// مرةً واحدة لأن اللوحة تفتح أي شاشةٍ كانت. ولذلك لا تمسّه [register] ولا
  /// [clear]: كلتاهما تُستدعى من كل شاشةٍ تُفتح، فلو شملتاه ضاع الاختصار بعد
  /// أول شاشة.
  onSearch: VoidCallback | null = null;

  /// تُستدعى في التهيئة — الدوالّ غير المطلوبة تُترك `null` فلا يفعل
  /// اختصارها شيئًا، بدل أن تُفرَض دلالةٌ لا تملكها الشاشة.
  register({
    onSave = null,
    onPrint = null,
    onNewDoc = null,
    onRefresh = null,
  }: ImdScreenActionRegistration = {}): void {
    this.onSave = onSave;
    this.onPrint = onPrint;
    this.onNewDoc = onNewDoc;
    this.onRefresh = onRefresh;
  }

  /// تُستدعى عند التفكيك — وإلا بقيت الشاشة المغلقة "نشطة" لاختصارات شاشةٍ
  /// غيرها فتحت بعدها.
  clear(): void {
    this.onSave = null;
    this.onPrint = null;
    this.onNewDoc = null;
    this.onRefresh = null;
  }

  /// قراءة السجل من السياق بلا رميٍ إن لم يُسجَّل فوق الشجرة — شاشاتٌ في
  /// اختباراتٍ أو سياقاتٍ معزولةٍ عن الجذر لا تملك هذا المزوِّد، فيصحّ أن تُبنى
  /// بلا اختصارات بدل أن تنهار.
  static maybeOf(): ImdScreenActions | null {
    return useImdScreenActions();
  }
}

export const ImdScreenActionsContext = createContext<ImdScreenActions | null>(null);

export interface ImdScreenActionsProviderProps {
  readonly value: ImdScreenActions;
  readonly children?: ReactNode;
}

export function ImdScreenActionsProvider({
  value,
  children,
}: ImdScreenActionsProviderProps) {
  return (
    <ImdScreenActionsContext.Provider value={value}>
      {children}
    </ImdScreenActionsContext.Provider>
  );
}

export function useImdScreenActions(): ImdScreenActions | null {
  return useContext(ImdScreenActionsContext);
}

/// اختصارات لوحة المفاتيح مدعومةٌ على سطح المكتب وحده — بلا أثرٍ على
/// الجوّال حتى مع لوحة مفاتيح خارجية متّصلة به.
export class ImdShortcuts {
  private constructor() {}

  static get supported(): boolean {
    try {
      if (typeof navigator === 'undefined') return false;
      const ua = navigator.userAgent ?? '';
      const platform = navigator.platform ?? '';
      const maxTouch = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;

      // استبعاد أجهزة الجوال والأجهزة اللوحية (بما فيها iPadOS بوضع سطح المكتب)
      const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
        ua,
      );
      const isIpadDesktopMode = platform === 'MacIntel' && maxTouch > 1;
      if (isMobileUa || isIpadDesktopMode) return false;

      return (
        /Windows|Win32|Win64|Linux|X11|Macintosh|MacIntel|MacPPC|Mac68K/i.test(platform) ||
        /Windows|Linux|Macintosh|Mac OS X/i.test(ua)
      );
    } catch {
      return false;
    }
  }
}
