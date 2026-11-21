import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { ImdEmojiText, ImdIcon } from '../imd_icon';
import { ImdStyle } from '../imd_style';
import { ImdColors, ImdSizes } from '../imd_tokens';
import { ImdBtnKind, ImdButton, ImdButtonOutline, ImdIconButton } from './imd_buttons';
import { imdFieldDecoration } from './imd_fields';

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

let activeToastCleanup: (() => void) | null = null;

export interface ShowImdToastOptions {
  readonly error?: boolean;
  readonly colors?: ImdColors;
}

/// رسالة سوداء عائمة.
export function showImdToast(
  message: string,
  options: ShowImdToastOptions = {},
): void {
  if (typeof document === 'undefined' || !document.body) return;
  const error = options.error ?? false;
  const c = resolveActiveColors(options.colors);

  activeToastCleanup?.();

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    if (activeToastCleanup === cleanup) activeToastCleanup = null;
    queueMicrotask(() => {
      root.unmount();
      host.remove();
    });
  };

  activeToastCleanup = cleanup;
  const timer = setTimeout(cleanup, 3200);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  // أقصى عرض 420 يتقلّص على الشاشة الضيقة.
  const side = Math.max(16, (vw - 420) / 2);
  const displayText =
    error && !message.startsWith('✖') ? `✖ ${message}` : message;

  root.render(
    <div
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
      style={{
        position: 'fixed',
        bottom: 12,
        left: side,
        right: side,
        zIndex: 90,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        onClick={cleanup}
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: 420,
          backgroundColor: c.inverse.css,
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: `0 6px 20px ${c.shadowMd.css}`,
        }}
      >
        <ImdEmojiText
          text={displayText}
          colors={c}
          style={{
            color: c.onInverse.css,
            fontWeight: 500,
            fontSize: 14,
            fontFamily: ImdSizes.font,
          }}
        />
      </div>
    </div>,
  );
}

export interface ImdModalContext<T = unknown> {
  readonly close: (result?: T | null) => void;
  readonly colors: ImdColors;
}

export interface ImdModalDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly icon?: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly maxWidth?: number;
  readonly onEnter?: () => void;
  readonly scrollBody?: boolean;
  readonly colors?: ImdColors;
}

/// مكوّن نافذة الحوار التصريحي بزوايا 16 و`createPortal`.
export function ImdModalDialog({
  open,
  onClose,
  title,
  icon,
  children,
  actions,
  maxWidth = 560,
  onEnter,
  scrollBody = true,
  colors,
}: ImdModalDialogProps) {
  const c = resolveActiveColors(colors);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (
        (e.key === 'Enter' || e.code === 'NumpadEnter') &&
        onEnter &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLButtonElement) &&
        !(
          e.target instanceof HTMLElement &&
          e.target.getAttribute('role') === 'button'
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
        onEnter();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, onEnter]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const dialog = (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: c.scrim.css }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex w-full flex-col overflow-hidden outline-none"
        style={{
          maxWidth,
          maxHeight: '90vh',
          backgroundColor: c.surface.css,
          borderRadius: 16,
          padding: '18px 20px 16px',
          boxShadow: `0 10px 30px ${c.shadowBase.withValues({ alpha: 0.25 }).css}`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center">
          {icon && (
            <span
              className="inline-flex shrink-0 items-center"
              style={{ marginInlineEnd: 8 }}
            >
              <ImdIcon name={icon} size={18} color={c.accent} />
            </span>
          )}
          <h2
            id={titleId}
            className="min-w-0 flex-1"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: c.text.css,
              margin: 0,
            }}
          >
            {title}
          </h2>
          <ImdIconButton
            icon="x"
            tooltip="إغلاق"
            onPressed={onClose}
            colors={c}
          />
        </div>

        <div style={{ height: 14, flexShrink: 0 }} />

        {scrollBody ? (
          <div className="min-h-0 flex-initial overflow-y-auto">{children}</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        )}

        {actions !== undefined && actions !== null && (
          <>
            <div style={{ height: 14, flexShrink: 0 }} />
            <div className="flex flex-wrap items-center justify-end gap-2">
              {actions}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(dialog, document.body);
  }
  return dialog;
}

export interface ShowImdModalOptions<T> {
  readonly title: string;
  readonly icon?: string;
  readonly builder: (ctx: ImdModalContext<T>) => ReactNode;
  readonly actions?: (ctx: ImdModalContext<T>) => ReactNode;
  readonly maxWidth?: number;
  /// يُبنى بسياق الحوار الداخلي (كـ[actions]) ويُستدعى عند Enter/Numpad Enter
  /// — لحوارات التأكيد البسيطة ذات إجراءٍ أساسيٍّ واحد لا لبس فيه. يُترك
  /// `undefined` (الافتراضي) لحوارات النماذج التي قد تحوي حقول نصٍّ متعددة
  /// الأسطر، فلا يُصادَر Enter منها.
  readonly onEnter?: (ctx: ImdModalContext<T>) => () => void;
  /// `false` ⇒ الجسم بلا تمريرٍ خاصٍّ به ويملأ ارتفاع الحوار: لمحتوىً يُمرَّر
  /// بنفسه (معاينة PDF).
  readonly scrollBody?: boolean;
  readonly colors?: ImdColors;
}

function ImperativeModalHost<T>({
  options,
  onResolve,
}: {
  readonly options: ShowImdModalOptions<T>;
  readonly onResolve: (value: T | null) => void;
}) {
  const c = resolveActiveColors(options.colors);
  const close = useCallback(
    (result?: T | null) => {
      onResolve(result === undefined ? null : result);
    },
    [onResolve],
  );
  const ctx: ImdModalContext<T> = { close, colors: c };
  const enterHandler = options.onEnter ? options.onEnter(ctx) : undefined;

  return (
    <ImdModalDialog
      open={true}
      onClose={() => close(null)}
      title={options.title}
      icon={options.icon}
      maxWidth={options.maxWidth}
      scrollBody={options.scrollBody}
      onEnter={enterHandler}
      colors={c}
      actions={options.actions ? options.actions(ctx) : undefined}
    >
      {options.builder(ctx)}
    </ImdModalDialog>
  );
}

/// نافذة بزوايا 16.
export function showImdModal<T = void>(
  options: ShowImdModalOptions<T>,
): Promise<T | null> {
  if (typeof document === 'undefined' || !document.body) {
    return Promise.resolve(null);
  }

  return new Promise<T | null>((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    let settled = false;

    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      queueMicrotask(() => {
        root.unmount();
        host.remove();
      });
      resolve(value);
    };

    root.render(<ImperativeModalHost options={options} onResolve={finish} />);
  });
}

export interface ImdConfirmOptions {
  readonly ok?: string;
  readonly cancel?: string;
  readonly danger?: boolean;
  readonly colors?: ImdColors;
}

/// حوار تأكيدٍ بسؤالٍ وزرَّي موافقة وإلغاء.
export async function imdConfirm(
  message: string,
  options: ImdConfirmOptions = {},
): Promise<boolean> {
  const { ok = 'تأكيد', cancel = 'إلغاء', danger = false, colors } = options;
  const result = await showImdModal<boolean>({
    title: 'تأكيد',
    icon: danger ? 'alert' : 'info',
    maxWidth: 440,
    colors,
    builder: (ctx) => (
      <div
        style={{
          fontSize: 14,
          color: ctx.colors.text.css,
          lineHeight: 1.7,
        }}
      >
        {message}
      </div>
    ),
    actions: (ctx) => (
      <>
        <ImdButtonOutline
          label={cancel}
          onPressed={() => ctx.close(false)}
          colors={ctx.colors}
        />
        <ImdButton
          label={ok}
          kind={danger ? ImdBtnKind.danger : ImdBtnKind.primary}
          onPressed={() => ctx.close(true)}
          colors={ctx.colors}
        />
      </>
    ),
    onEnter: (ctx) => () => ctx.close(true),
  });
  return result ?? false;
}

export interface ImdPromptOptions {
  readonly ok?: string;
  readonly initial?: string;
  readonly colors?: ImdColors;
}

function PromptBody({
  initial,
  colors,
  valueRef,
  onSubmit,
}: {
  readonly initial: string;
  readonly colors: ImdColors;
  readonly valueRef: { current: string };
  readonly onSubmit: (val: string) => void;
}) {
  const [val, setVal] = useState(initial);
  const [focused, setFocused] = useState(false);
  const deco = imdFieldDecoration({ colors });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onSubmit(val);
    }
  };

  return (
    <div style={{ ...deco.containerStyle(focused), alignItems: 'flex-start' }}>
      <textarea
        ref={inputRef}
        rows={1}
        autoFocus
        value={val}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const next = e.target.value;
          valueRef.current = next;
          setVal(next);
        }}
        onKeyDown={handleKeyDown}
        className="w-full resize-none bg-transparent outline-none"
        style={{
          ...deco.inputStyle,
          fontSize: 14,
          color: colors.text.css,
          maxHeight: '5.5em',
        }}
      />
    </div>
  );
}

/// حوار إدخال نصٍّ واحد.
export async function imdPrompt(
  message: string,
  options: ImdPromptOptions = {},
): Promise<string | null> {
  const { ok = 'تأكيد', initial = '', colors } = options;
  const valueRef = { current: initial };
  return showImdModal<string>({
    title: message,
    icon: 'edit',
    maxWidth: 460,
    colors,
    builder: (ctx) => (
      <PromptBody
        initial={initial}
        colors={ctx.colors}
        valueRef={valueRef}
        onSubmit={(v) => ctx.close(v)}
      />
    ),
    actions: (ctx) => (
      <>
        <ImdButtonOutline
          label="إلغاء"
          onPressed={() => ctx.close(null)}
          colors={ctx.colors}
        />
        <ImdButton
          label={ok}
          onPressed={() => ctx.close(valueRef.current)}
          colors={ctx.colors}
        />
      </>
    ),
  });
}
