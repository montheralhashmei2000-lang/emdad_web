import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { ImdIcon } from './imd_icon';
import { ImdStyle } from './imd_style';
import { ImdColors, ImdSizes } from './imd_tokens';
import { ImdWindow } from './imd_window';

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

export interface ImdDroppedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface ImdDropZoneProps {
  readonly extensions: readonly string[];
  readonly onFile?: (path: string) => void;
  readonly onFileBytes?: (file: ImdDroppedFile) => void;
  readonly child?: ReactNode;
  readonly children?: ReactNode;
  readonly hint?: string;
  readonly enabled?: boolean;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// منطقة إفلات ملفاتٍ من مستكشف النظام فوق [child]/[children].
///
/// تفعل شيئًا عند تفعيل [ImdWindow.supported]؛ وفي المتصفح تُمرّر الملفات عبر
/// HTML5 Drag & Drop مع عدّاد لمنع وميض العناصر الفرعية وقراءة الملف إلى `Uint8Array`.
export function ImdDropZone({
  extensions,
  onFile,
  onFileBytes,
  child,
  children,
  hint = 'أفلت الملف هنا',
  enabled = true,
  colors,
  className = '',
}: ImdDropZoneProps) {
  const [over, setOver] = useState(false);
  const dragCounterRef = useRef(0);
  const content = children ?? child ?? null;

  if (!ImdWindow.supported || !enabled) {
    return <>{content}</>;
  }

  const c = resolveActiveColors(colors);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setOver(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setOver(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setOver(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const matched = ImdDropZone.firstMatchingFile(Array.from(files), extensions);
    if (!matched) return;

    const filePath = (matched as File & { readonly path?: string }).path;
    if (onFileBytes) {
      void matched.arrayBuffer().then((buf) => {
        onFileBytes({
          name: matched.name,
          bytes: new Uint8Array(buf),
        });
      });
    } else {
      void matched.arrayBuffer().then((buf) => {
        void new Uint8Array(buf);
      });
    }
    onFile?.(filePath ?? matched.name);
  };

  return (
    <div
      className={`relative ${className}`.trim()}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {content}
      {over && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{
            backgroundColor: c.accentSoft.withValues({ alpha: 0.92 }).css,
            border: `2px solid ${c.accent.css}`,
            borderRadius: ImdSizes.radius,
          }}
        >
          <ImdIcon name="arrow-down" size={28} color={c.accent} />
          <div style={{ height: 8 }} />
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: c.accent.css,
            }}
          >
            {hint}
          </div>
          <div style={{ height: 4 }} />
          <div
            style={{
              fontSize: 12,
              color: c.muted.css,
            }}
          >
            {extensions.map((e) => `.${e}`).join('  ')}
          </div>
        </div>
      )}
    </div>
  );
}

export namespace ImdDropZone {
  /// امتداد المسار بأحرفٍ صغيرة بلا نقطة — أو فارغ إن لم يكن له امتداد.
  export function extensionOf(path: string): string {
    const name = path.split(/[\\/]/).pop() ?? '';
    const dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
  }

  /// أول مسارٍ بامتدادٍ مقبول، أو `null`.
  export function firstMatching(
    paths: Iterable<string>,
    extensions: readonly string[],
  ): string | null {
    for (const p of paths) {
      if (extensions.includes(extensionOf(p))) return p;
    }
    return null;
  }

  /// أول ملفٍّ بامتدادٍ مقبول من إفلات المتصفح، أو `null`.
  export function firstMatchingFile(
    files: Iterable<File>,
    extensions: readonly string[],
  ): File | null {
    for (const f of files) {
      if (extensions.includes(extensionOf(f.name))) return f;
    }
    return null;
  }
}
