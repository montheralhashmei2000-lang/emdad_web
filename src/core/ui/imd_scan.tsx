import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ScanDebouncer } from '../../domain/stocktake_scan';
import { ImdTextController, imdSetText } from './imd_form';
import { ImdIcon } from './imd_icon';
import { ImdStyle } from './imd_style';
import { ImdColors, ImdCursor, ImdFixedColors } from './imd_tokens';
import {
  ImdButton,
  ImdButtonOutline,
  ImdIconButton,
  showImdToast,
} from './imd_widgets';

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

interface DetectedBarcode {
  readonly rawValue?: string;
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<readonly DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new () => BarcodeDetectorLike;

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof globalThis === 'undefined') return null;
  const ctor = (
    globalThis as unknown as { readonly BarcodeDetector?: BarcodeDetectorCtor }
  ).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // تجاهل أخطاء إيقاف المسار بعد انتهاء الجلسة
    }
  }
}

interface CameraScanSessionResult {
  readonly videoRef: { current: HTMLVideoElement | null };
  readonly torchSupported: boolean;
  readonly torchOn: boolean;
  readonly toggleTorch: () => Promise<void>;
  readonly stopStream: () => void;
}

function useCameraScanSession(
  active: boolean,
  onRawCode: (code: string) => void | Promise<void>,
): CameraScanSessionResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callbackRef = useRef(onRawCode);
  callbackRef.current = onRawCode;

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      typeof navigator.mediaDevices?.getUserMedia !== 'function'
    ) {
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;
    let detecting = false;

    const detectorCtor = getBarcodeDetectorCtor();
    let detector: BarcodeDetectorLike | null = null;
    if (detectorCtor) {
      try {
        detector = new detectorCtor();
      } catch {
        detector = null;
      }
    }

    const tickDetect = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (
        detector &&
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        !detecting
      ) {
        detecting = true;
        void detector
          .detect(video)
          .then((barcodes) => {
            if (cancelled) return;
            for (const b of barcodes) {
              const v = b.rawValue;
              if (typeof v === 'string' && v.length > 0) {
                void callbackRef.current(v);
                break;
              }
            }
          })
          .catch(() => {
            // تجاهل خطأ إطار واحد عند فحص الكاميرا
          })
          .finally(() => {
            detecting = false;
            if (!cancelled && typeof window.requestAnimationFrame === 'function') {
              rafId = window.requestAnimationFrame(tickDetect);
            }
          });
        return;
      }

      if (typeof window.requestAnimationFrame === 'function') {
        rafId = window.requestAnimationFrame(tickDetect);
      }
    };

    void navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play?.().catch(() => {});
        }
        const [videoTrack] = stream.getVideoTracks();
        const caps = videoTrack?.getCapabilities?.() as
          | (MediaTrackCapabilities & { readonly torch?: boolean })
          | undefined;
        setTorchSupported(Boolean(caps?.torch));

        if (detector && typeof window.requestAnimationFrame === 'function') {
          rafId = window.requestAnimationFrame(tickDetect);
        }
      })
      .catch(() => {
        // عند تعذر فتح الكاميرا يبقى الإدخال اليدوي البديل متاحًا في الواجهة
      });

    return () => {
      cancelled = true;
      if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      }
      stopStream();
    };
  }, [active, stopStream]);

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const [videoTrack] = stream.getVideoTracks();
    if (!videoTrack || typeof videoTrack.applyConstraints !== 'function') return;
    const next = !torchOn;
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // المتصفح أو الكاميرا لا تدعم التحكم بالكشاف
    }
  }, [torchOn]);

  return { videoRef, torchSupported, torchOn, toggleTorch, stopStream };
}

function ScanManyPage({
  onCode,
  onDone,
  colors,
}: {
  readonly onCode: (code: string) => Promise<string>;
  readonly onDone: () => void;
  readonly colors?: ImdColors;
}) {
  const c = resolveActiveColors(colors);
  const debounceRef = useRef(new ScanDebouncer());
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  const [last, setLast] = useState(
    'وجّه الكاميرا نحو باركود الصنف — كل مسحة قطعة واحدة',
  );
  const [error, setError] = useState(false);
  const [count, setCount] = useState(0);
  const [manual, setManual] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleDetect = useCallback(
    async (v: string) => {
      const code = v.trim();
      if (!code || busyRef.current || !debounceRef.current.accept(code)) return;
      busyRef.current = true;
      try {
        const msg = await onCode(code);
        if (!mountedRef.current) return;
        const err = msg.startsWith('✖');
        if (
          !err &&
          typeof navigator !== 'undefined' &&
          typeof navigator.vibrate === 'function'
        ) {
          try {
            navigator.vibrate(10);
          } catch {
            // تجاهل عدم دعم الاهتزاز
          }
        }
        setLast(msg);
        setError(err);
        if (!err) setCount((n) => n + 1);
      } finally {
        busyRef.current = false;
      }
    },
    [onCode],
  );

  const { videoRef, torchSupported, torchOn, toggleTorch, stopStream } =
    useCameraScanSession(true, handleDetect);

  const finish = useCallback(() => {
    stopStream();
    onDone();
  }, [onDone, stopStream]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [finish]);

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    setManual('');
    void handleDetect(v);
  };

  const fg = ImdFixedColors.cameraForeground;
  const backdrop = ImdFixedColors.cameraBackdrop;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="مسح الباركود بالكاميرا"
      className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden"
      style={{ backgroundColor: backdrop.css }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          style={{
            width: 260,
            height: 160,
            border: `3px solid ${(error ? c.danger : c.accent).css}`,
            borderRadius: 14,
          }}
        />
      </div>

      <div className="relative z-10 flex items-center p-3">
        <ImdButton
          label={`إنهاء (${count})`}
          icon="check"
          onPressed={finish}
          colors={c}
        />
        <div className="flex-1" />
        <button
          type="button"
          title="الكشّاف"
          aria-label="الكشّاف"
          aria-pressed={torchOn}
          disabled={!torchSupported}
          onClick={() => void toggleTorch()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-0 bg-transparent"
          style={{
            cursor: torchSupported ? ImdCursor.click : 'default',
            opacity: torchSupported ? 1 : 0.65,
          }}
        >
          <ImdIcon name="zap" size={22} color={fg} />
        </button>
      </div>

      <div className="relative z-10 mx-4 mb-10 flex flex-col gap-2">
        <div
          className="flex items-center gap-2 rounded-[10px] p-2"
          style={{
            backgroundColor: backdrop.withValues({ alpha: 0.72 }).css,
          }}
        >
          <input
            type="text"
            value={manual}
            placeholder="إدخال يدوي للباركود"
            aria-label="إدخال يدوي للباركود"
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitManual();
              }
            }}
            className="min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm outline-none"
            style={{
              backgroundColor: c.surface.css,
              borderColor: c.lineStrong.css,
              color: c.text.css,
            }}
          />
          <ImdButton
            label="تأكيد"
            small={true}
            onPressed={submitManual}
            colors={c}
          />
        </div>

        <div
          style={{
            padding: '10px 14px',
            backgroundColor: (error ? c.danger : backdrop).withValues({
              alpha: 0.7,
            }).css,
            borderRadius: 10,
            color: fg.css,
            fontSize: 15,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {last}
        </div>
      </div>
    </div>
  );
}

function ScanPage({
  onResult,
  colors,
}: {
  readonly onResult: (value: string | null) => void;
  readonly colors?: ImdColors;
}) {
  const c = resolveActiveColors(colors);
  const doneRef = useRef(false);
  const [manual, setManual] = useState('');

  const { videoRef, torchSupported, torchOn, toggleTorch, stopStream } =
    useCameraScanSession(true, (v) => {
      if (doneRef.current || !v) return;
      doneRef.current = true;
      stopStream();
      onResult(v);
    });

  const cancel = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopStream();
    onResult(null);
  }, [onResult, stopStream]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cancel]);

  const submitManual = () => {
    const v = manual.trim();
    if (!v || doneRef.current) return;
    doneRef.current = true;
    stopStream();
    onResult(v);
  };

  const fg = ImdFixedColors.cameraForeground;
  const backdrop = ImdFixedColors.cameraBackdrop;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="مسح الباركود بالكاميرا"
      className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden"
      style={{ backgroundColor: backdrop.css }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          style={{
            width: 260,
            height: 160,
            border: `3px solid ${c.accent.css}`,
            borderRadius: 14,
          }}
        />
      </div>

      <div className="relative z-10 flex items-center p-3">
        <ImdButtonOutline
          label="إغلاق"
          icon="x"
          onPressed={cancel}
          colors={c}
        />
        <div className="flex-1" />
        <button
          type="button"
          title="الكشّاف"
          aria-label="الكشّاف"
          aria-pressed={torchOn}
          disabled={!torchSupported}
          onClick={() => void toggleTorch()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-0 bg-transparent"
          style={{
            cursor: torchSupported ? ImdCursor.click : 'default',
            opacity: torchSupported ? 1 : 0.65,
          }}
        >
          <ImdIcon name="zap" size={22} color={fg} />
        </button>
      </div>

      <div className="relative z-10 mx-4 mb-10 flex flex-col gap-2">
        <div
          className="flex items-center gap-2 rounded-[10px] p-2"
          style={{
            backgroundColor: backdrop.withValues({ alpha: 0.72 }).css,
          }}
        >
          <input
            type="text"
            value={manual}
            placeholder="إدخال يدوي للباركود"
            aria-label="إدخال يدوي للباركود"
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitManual();
              }
            }}
            className="min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm outline-none"
            style={{
              backgroundColor: c.surface.css,
              borderColor: c.lineStrong.css,
              color: c.text.css,
            }}
          />
          <ImdButton
            label="تأكيد"
            small={true}
            onPressed={submitManual}
            colors={c}
          />
        </div>

        <div
          style={{
            color: fg.css,
            fontSize: 15,
            textAlign: 'center',
          }}
        >
          وجّه الكاميرا نحو الباركود
        </div>
      </div>
    </div>
  );
}

const UNSUPPORTED_MSG =
  '✖ الماسح غير متاح: الكاميرا غير مدعومة على هذا الجهاز — استخدم قارئ باركود USB';

export interface ScanManyOptions {
  readonly onCode: (code: string) => Promise<string>;
  readonly colors?: ImdColors;
}

/// ماسح الباركود بالكاميرا — يُعرض زرُّه بجوار حقول الباركود على الأجهزة التي
/// تملك كاميرا مدعومة، ويُخفى على غيرها فتبقى الكتابة أو قارئ USB.
export class ImdScanner {
  private constructor() {}

  static get supported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return typeof navigator.mediaDevices?.getUserMedia === 'function';
  }

  /// يفتح الكاميرا ويُرجع أول قيمة مقروءة.
  static async scan(colors?: ImdColors): Promise<string | null> {
    if (!ImdScanner.supported) {
      showImdToast(UNSUPPORTED_MSG, { error: true, colors });
      return null;
    }
    if (typeof document === 'undefined' || !document.body) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root: Root = createRoot(host);
      let settled = false;

      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        queueMicrotask(() => {
          root.unmount();
          host.remove();
        });
        resolve(value);
      };

      root.render(<ScanPage onResult={finish} colors={colors} />);
    });
  }

  /// مسح متواصل: الكاميرا تبقى مفتوحة وكل قراءة تُمرَّر إلى [onCode]، التي
  /// تُرجع سطر النتيجة المعروض أسفل الشاشة (وما يبدأ بـ ✖ يُعرض خطأً).
  /// تكرار الباركود نفسه وهو ما زال أمام الكاميرا لا يُحتسب ([ScanDebouncer]).
  static async scanMany(
    onCodeOrOptions: ((code: string) => Promise<string>) | ScanManyOptions,
  ): Promise<void> {
    const onCode =
      typeof onCodeOrOptions === 'function'
        ? onCodeOrOptions
        : onCodeOrOptions.onCode;
    const colors =
      typeof onCodeOrOptions === 'function' ? undefined : onCodeOrOptions.colors;

    if (!ImdScanner.supported) {
      showImdToast(UNSUPPORTED_MSG, { error: true, colors });
      return;
    }
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    await new Promise<void>((resolve) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root: Root = createRoot(host);
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        queueMicrotask(() => {
          root.unmount();
          host.remove();
        });
        resolve();
      };

      root.render(
        <ScanManyPage onCode={onCode} onDone={finish} colors={colors} />,
      );
    });
  }
}

export interface ImdScanButtonProps {
  readonly controller?: ImdTextController;
  readonly onScanned?: (value: string) => void;
  readonly colors?: ImdColors;
  readonly className?: string;
}

/// زر 📷 (`btn btn-o btn-sm`) يملأ الحقل بالقيمة الممسوحة.
export function ImdScanButton({
  controller,
  onScanned,
  colors,
  className = '',
}: ImdScanButtonProps) {
  if (!ImdScanner.supported) return null;
  return (
    <ImdIconButton
      icon="camera"
      tooltip="مسح الباركود بالكاميرا"
      colors={colors}
      className={className}
      onPressed={() => {
        void ImdScanner.scan(colors).then((v) => {
          if (!v) return;
          if (controller) {
            imdSetText(controller, v);
          }
          onScanned?.(v);
        });
      }}
    />
  );
}
