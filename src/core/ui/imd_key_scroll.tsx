import { useEffect, useRef, type ReactNode } from 'react';

function isTypingElement(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  const candidates = [active, target].filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  for (const el of candidates) {
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
      return true;
    }
    if (typeof el.closest === 'function' && el.closest('[contenteditable="true"]')) {
      return true;
    }
  }
  return false;
}

function isVerticallyScrollable(el: HTMLElement): boolean {
  if (el.scrollHeight <= el.clientHeight + 0.5) return false;
  if (typeof getComputedStyle !== 'function') return true;
  const ovY = getComputedStyle(el).overflowY;
  return (
    ovY === 'auto' ||
    ovY === 'scroll' ||
    ovY === 'overlay' ||
    el.style.overflowY === 'auto' ||
    el.style.overflowY === 'scroll' ||
    el === document.scrollingElement
  );
}

function isHorizontallyScrollable(el: HTMLElement): boolean {
  if (el.scrollWidth <= el.clientWidth + 0.5) return false;
  if (typeof getComputedStyle !== 'function') return true;
  const ovX = getComputedStyle(el).overflowX;
  return (
    ovX === 'auto' ||
    ovX === 'scroll' ||
    ovX === 'overlay' ||
    el.style.overflowX === 'auto' ||
    el.style.overflowX === 'scroll'
  );
}

function isRtlContext(el: HTMLElement): boolean {
  if (typeof getComputedStyle === 'function') {
    const dir = getComputedStyle(el).direction;
    if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl';
  }
  if (typeof document !== 'undefined') {
    return (document.documentElement.dir || 'rtl').toLowerCase() === 'rtl';
  }
  return true;
}

export interface ImdKeyScrollProps {
  readonly children: ReactNode;
  readonly enabled?: boolean;
  readonly className?: string;
}

/// تمرير الشاشة بلوحة المفاتيح (قرار المالك 2026-10-23): انقر في أيّ موضع ثم
/// ↑ / ↓ لسطر، و Page Up / Page Down لصفحة، و Home / End لأول المحتوى وآخره،
/// مع دعم الأسهم الأفقية ← / → في اتجاه RTL.
///
/// يُحفظ موضع آخر نقرة وعنصرها، وعند الضغط يُحرَّك **أعمق** منطقةٍ تحت ذلك
/// الموضع ما زال لها ما تتحرك إليه، فإن بلغت حدّها انتقل الضغط إلى التي تحويها.
///
/// لا يمسّ الكتابة: والتركيز في حقل نصٍّ تبقى الأسهم للمؤشر. ولا يعمل مع Ctrl أو
/// Alt أو Meta (اختصارات الشاشة).
export function ImdKeyScroll({
  children,
  enabled = true,
  className = '',
}: ImdKeyScrollProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastTargetRef = useRef<HTMLElement | null>(null);
  const cacheVerticalRef = useRef<HTMLElement[] | null>(null);
  const cacheHorizontalRef = useRef<HTMLElement[] | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const collectRegions = (horizontal: boolean): HTMLElement[] => {
      const host = hostRef.current;
      const predicate = horizontal ? isHorizontallyScrollable : isVerticallyScrollable;
      const found: HTMLElement[] = [];
      const seen = new Set<HTMLElement>();

      const pushAncestors = (start: HTMLElement | null) => {
        let cur: HTMLElement | null = start;
        while (cur) {
          if (!seen.has(cur) && predicate(cur)) {
            seen.add(cur);
            found.push(cur);
          }
          if (host && cur === host) break;
          cur = cur.parentElement;
        }
      };

      // أولاً: فحص العناصر تحت آخر نقرة عبر elementsFromPoint (في المتصفح الحقيقي)
      const pt = lastPointRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
      if (typeof document.elementsFromPoint === 'function') {
        try {
          const hit = document.elementsFromPoint(pt.x, pt.y);
          for (const el of hit) {
            if (el instanceof HTMLElement && (!host || host.contains(el))) {
              pushAncestors(el);
            }
          }
        } catch {
          // قد تفشل خارج بيئة العرض الحقيقية
        }
      }

      // ثانياً: المشي من عنصر النقرة الأخير (يدعم الاختبارات وبيئات بدون layout كامل)
      if (found.length === 0 && lastTargetRef.current && lastTargetRef.current.isConnected) {
        pushAncestors(lastTargetRef.current);
      }

      // أخيراً: إن لم توجد نقرة، البحث داخل الحاوية عن أعمق منطقة قابلة للتمرير تحت المركز
      if (found.length === 0 && host) {
        const queue: HTMLElement[] = [host];
        const leavesFirst: HTMLElement[] = [];
        while (queue.length > 0) {
          const node = queue.shift()!;
          leavesFirst.push(node);
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            if (child instanceof HTMLElement) queue.push(child);
          }
        }
        for (let i = leavesFirst.length - 1; i >= 0; i--) {
          const el = leavesFirst[i];
          if (!seen.has(el) && predicate(el)) {
            seen.add(el);
            found.push(el);
          }
        }
      }

      if (
        !horizontal &&
        document.scrollingElement instanceof HTMLElement &&
        !seen.has(document.scrollingElement) &&
        document.scrollingElement.scrollHeight > document.scrollingElement.clientHeight + 0.5
      ) {
        found.push(document.scrollingElement);
      }

      return found;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key;
      const isDown = key === 'ArrowDown' || key === 'PageDown' || key === 'End';
      const isUp = key === 'ArrowUp' || key === 'PageUp' || key === 'Home';
      const isHoriz = key === 'ArrowLeft' || key === 'ArrowRight';
      if (!isDown && !isUp && !isHoriz) return;

      if (isTypingElement(e.target)) return;

      if (isHoriz) {
        let regions = (cacheHorizontalRef.current ?? []).filter((el) => el.isConnected);
        if (regions.length === 0) {
          regions = collectRegions(true);
          cacheHorizontalRef.current = regions;
        }
        for (const el of regions) {
          const rtl = isRtlContext(el);
          // في RTL: السهم الأيسر يتقدم في الاتجاه البصري لليسار (ينقص scrollLeft أو يزيحه حسب المتصفح)
          const delta = key === 'ArrowLeft' ? -ImdKeyScroll.lineStep : ImdKeyScroll.lineStep;
          const prev = el.scrollLeft;
          const maxAbs = Math.max(0, el.scrollWidth - el.clientWidth);
          const next = rtl
            ? Math.max(-maxAbs, Math.min(maxAbs, prev + delta))
            : Math.max(0, Math.min(maxAbs, prev + delta));
          if (Math.abs(next - prev) < 0.5) continue;
          el.scrollLeft = next;
          e.preventDefault();
          return;
        }
        return;
      }

      let regions = (cacheVerticalRef.current ?? []).filter((el) => el.isConnected);
      if (regions.length === 0) {
        regions = collectRegions(false);
        cacheVerticalRef.current = regions;
      }

      for (const el of regions) {
        const maxExtent = Math.max(0, el.scrollHeight - el.clientHeight);
        if (maxExtent <= 0.5) continue;
        const cur = el.scrollTop;
        const edge = isDown ? maxExtent : 0;
        if (Math.abs(cur - edge) < 0.5) continue;

        let step: number;
        if (key === 'Home' || key === 'End') {
          step = Infinity;
        } else if (key === 'PageUp' || key === 'PageDown') {
          const viewport = el.clientHeight > 0 ? el.clientHeight : window.innerHeight || 600;
          step = viewport * ImdKeyScroll.pageFraction;
        } else {
          step = ImdKeyScroll.lineStep;
        }

        const rawTarget = cur + (isDown ? step : -step);
        const target = Math.max(0, Math.min(maxExtent, rawTarget));
        el.scrollTop = target;
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  const recordPointer = (x: number, y: number, target: EventTarget | null) => {
    lastPointRef.current = { x, y };
    lastTargetRef.current = target instanceof HTMLElement ? target : null;
    cacheVerticalRef.current = null;
    cacheHorizontalRef.current = null;
  };

  return (
    <div
      ref={hostRef}
      className={className}
      onMouseDown={(e) => recordPointer(e.clientX, e.clientY, e.target)}
      onWheel={(e) => recordPointer(e.clientX, e.clientY, e.target)}
    >
      {children}
    </div>
  );
}

export namespace ImdKeyScroll {
  /// مقدار السهم الواحد بالبكسل.
  export const lineStep = 64;

  /// نسبة الصفحة من ارتفاع المنطقة — يبقى سطرٌ من السابقة ظاهرًا للاستدلال.
  export const pageFraction = 0.85;
}
