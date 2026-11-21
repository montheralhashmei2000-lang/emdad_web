import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { ImdDensity } from '../../imd_density';
import { ImdRecordSink, useImdRecordScope } from '../../imd_status_bar';
import type { ImdTableProps } from './support_part';

export interface ImdTableBaseState {
  readonly hover: number;
  readonly setHover: (row: number) => void;
  readonly headerHover: number;
  readonly setHeaderHover: (col: number) => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly findQ: string;
  readonly findInput: string;
  readonly setFindInput: (val: string) => void;
  readonly filters: ReadonlyMap<number, Set<string>>;
  readonly setFilters: React.Dispatch<React.SetStateAction<Map<number, Set<string>>>>;
  readonly groupBy: number | null;
  readonly setGroupBy: React.Dispatch<React.SetStateAction<number | null>>;
  readonly collapsed: ReadonlySet<string>;
  readonly setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly dragCol: number | null;
  readonly setDragCol: React.Dispatch<React.SetStateAction<number | null>>;
  readonly hScrollOffset: number;
  readonly setHScrollOffset: (offset: number) => void;
  readonly hScrollRef: MutableRefObject<HTMLDivElement | null>;
  readonly vScrollRef: MutableRefObject<HTMLDivElement | null>;
  readonly vScroll2Ref: MutableRefObject<HTMLDivElement | null>;
  readonly ownerRef: MutableRefObject<object>;
  readonly sink: ImdRecordSink | null;
  readonly tools: boolean;
  readonly syncVertical: (
    from: HTMLDivElement | null,
    to: HTMLDivElement | null,
  ) => void;
}

/// حالة الجدول: الحقول وتزامن تمرير النسختين.
export function useImdTableBase(props: ImdTableProps): ImdTableBaseState {
  const [hover, setHover] = useState(-1);
  const [headerHover, setHeaderHover] = useState(-1);
  const [page, setPage] = useState(0);
  const [findInput, setFindInputState] = useState('');
  const [findQ, setFindQ] = useState('');
  const [filters, setFilters] = useState<Map<number, Set<string>>>(
    () => new Map(),
  );
  const [groupBy, setGroupBy] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [hScrollOffset, setHScrollOffset] = useState(0);

  const [, setDensityTick] = useState(0);
  useEffect(() => {
    const bump = () => setDensityTick((t) => t + 1);
    ImdDensity.addRebuildListener(bump);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', bump);
    }
    return () => {
      ImdDensity.removeRebuildListener(bump);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', bump);
      }
    };
  }, []);

  const hScrollRef = useRef<HTMLDivElement | null>(null);
  const vScrollRef = useRef<HTMLDivElement | null>(null);
  const vScroll2Ref = useRef<HTMLDivElement | null>(null);
  const ownerRef = useRef<object>({});

  const sink = useImdRecordScope();
  const prevSinkRef = useRef<ImdRecordSink | null>(null);

  useEffect(() => {
    const prev = prevSinkRef.current;
    if (prev && prev !== sink) {
      prev.remove(ownerRef.current);
    }
    prevSinkRef.current = sink;
  }, [sink]);

  useEffect(() => {
    const owner = ownerRef.current;
    return () => {
      prevSinkRef.current?.remove(owner);
    };
  }, []);

  const setFindInput = useCallback((val: string) => {
    setFindInputState(val);
    setFindQ(val.trim());
    setPage(0);
  }, []);

  const filterable = props.filterable ?? true;
  const groupable = props.groupable ?? true;
  const tools =
    props.values !== null &&
    props.values !== undefined &&
    props.columns.length > 0 &&
    (filterable || groupable);

  /// يطابق تمرير النسختين رأسيًّا (الأصل والعمود المثبَّت).
  const syncVertical = useCallback(
    (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
      if (!from || !to) return;
      const o = from.scrollTop;
      if (Math.abs(to.scrollTop - o) < 0.5) return;
      const maxScroll = Math.max(0, to.scrollHeight - to.clientHeight);
      to.scrollTop = Math.min(maxScroll, Math.max(0, o));
    },
    [],
  );

  return {
    hover,
    setHover,
    headerHover,
    setHeaderHover,
    page,
    setPage,
    findQ,
    findInput,
    setFindInput,
    filters,
    setFilters,
    groupBy,
    setGroupBy,
    collapsed,
    setCollapsed,
    dragCol,
    setDragCol,
    hScrollOffset,
    setHScrollOffset,
    hScrollRef,
    vScrollRef,
    vScroll2Ref,
    ownerRef,
    sink,
    tools,
    syncVertical,
  };
}
