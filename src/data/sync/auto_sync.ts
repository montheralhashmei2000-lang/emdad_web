// NOT-PORTED: ملف خاص بالجهاز الأصلي (lib/data/sync/auto_sync.dart)
// محوّل ويب صامت (No-op) للمزامنة التلقائية عبر الشبكة المحلية — يحفظ الحالة المحلية المتوقفة
// ليعرض شريط الحالة «العمل محلي — المزامنة متوقفة» دون فتح منافذ أو مؤقتات.

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AppDatabase } from '../db/app_database';

export class AutoSyncService {
  readonly db: AppDatabase;
  private readonly _listeners = new Set<() => void>();
  private _disposed = false;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  get isRunning(): boolean {
    return false;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  get enabled(): boolean {
    return false;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  get failed(): boolean {
    return false;
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  get lastAt(): Date | null {
    return null;
  }

  addListener(listener: () => void): void {
    if (!this._disposed) {
      this._listeners.add(listener);
    }
  }

  removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  refresh(): void {
    // لا مزامنة عبر الشبكة المحلية في المتصفح
  }

  // NOT-PORTED: ملف خاص بالجهاز الأصلي
  async shutdown(): Promise<void> {
    // لا خادم مزامنة محلي لإيقافه في المتصفح
  }

  dispose(): void {
    this._disposed = true;
    this._listeners.clear();
  }
}

export const AutoSyncContext = createContext<AutoSyncService | null>(null);

export interface AutoSyncProviderProps {
  readonly service: AutoSyncService;
  readonly children?: ReactNode;
}

export function AutoSyncProvider({ service, children }: AutoSyncProviderProps) {
  return createElement(AutoSyncContext.Provider, { value: service }, children);
}

export function useAutoSync(): AutoSyncService | null {
  const service = useContext(AutoSyncContext);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!service) return;
    const l = () => setTick((t) => t + 1);
    service.addListener(l);
    return () => service.removeListener(l);
  }, [service]);

  return service;
}
