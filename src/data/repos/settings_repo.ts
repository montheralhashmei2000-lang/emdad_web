import { ErrorLogger } from '../../core/error_log';
import { ImdFonts } from '../../core/ui/imd_fonts';
import { ImdNumberPrefs, ImdNumbers } from '../../core/ui/imd_numbers';
import { DailyFormVars } from '../../domain/daily_movement_form';
import { ESignMode, ESignPolicy } from '../../domain/esign_policy';
import { PrintLayout } from '../../domain/print_layout';
import { VoucherPrintPrefs } from '../../domain/voucher_copies';
import type { AppDatabase } from '../db/app_database';
import { Value } from '../db/sqlite_driver';
import { AppSettingsCompanion } from '../db/tables/core_tables';

/// هوية التطبيق والجهة: الاسم والشعار وأسطر الترويسة والسمة.
export class AppIdentity {
  readonly name: string;
  readonly logoBase64: string;
  readonly logoSize: number;
  readonly themePref: string;
  readonly fontFamily: string;
  readonly orgLine1: string;
  readonly orgLine2: string;
  readonly orgLine3: string;
  readonly orgLine4: string;
  readonly showExpiry: boolean;

  constructor({
    name = 'نظام الإمداد والتموين',
    logoBase64 = '',
    logoSize = 140,
    themePref = 'auto',
    fontFamily = ImdFonts.defaultFamily,
    orgLine1 = '',
    orgLine2 = '',
    orgLine3 = '',
    orgLine4 = '',
    showExpiry = true,
  }: {
    readonly name?: string;
    readonly logoBase64?: string;
    readonly logoSize?: number;
    readonly themePref?: string;
    readonly fontFamily?: string;
    readonly orgLine1?: string;
    readonly orgLine2?: string;
    readonly orgLine3?: string;
    readonly orgLine4?: string;
    readonly showExpiry?: boolean;
  } = {}) {
    this.name = name;
    this.logoBase64 = logoBase64;
    this.logoSize = logoSize;
    this.themePref = themePref;
    this.fontFamily = fontFamily;
    this.orgLine1 = orgLine1;
    this.orgLine2 = orgLine2;
    this.orgLine3 = orgLine3;
    this.orgLine4 = orgLine4;
    this.showExpiry = showExpiry;
  }

  get orgLines(): string[] {
    return [this.orgLine1, this.orgLine2, this.orgLine3, this.orgLine4].filter(
      (l) => l.trim().length > 0,
    );
  }

  copyWith({
    name,
    logoBase64,
    logoSize,
    themePref,
    fontFamily,
    orgLine1,
    orgLine2,
    orgLine3,
    orgLine4,
    showExpiry,
  }: {
    readonly name?: string;
    readonly logoBase64?: string;
    readonly logoSize?: number;
    readonly themePref?: string;
    readonly fontFamily?: string;
    readonly orgLine1?: string;
    readonly orgLine2?: string;
    readonly orgLine3?: string;
    readonly orgLine4?: string;
    readonly showExpiry?: boolean;
  } = {}): AppIdentity {
    return new AppIdentity({
      name: name ?? this.name,
      logoBase64: logoBase64 ?? this.logoBase64,
      logoSize: logoSize ?? this.logoSize,
      themePref: themePref ?? this.themePref,
      fontFamily: fontFamily ?? this.fontFamily,
      orgLine1: orgLine1 ?? this.orgLine1,
      orgLine2: orgLine2 ?? this.orgLine2,
      orgLine3: orgLine3 ?? this.orgLine3,
      orgLine4: orgLine4 ?? this.orgLine4,
      showExpiry: showExpiry ?? this.showExpiry,
    });
  }

  static fromMap(m: Record<string, unknown>): AppIdentity {
    return new AppIdentity({
      name: `${m['name'] ?? 'نظام الإمداد والتموين'}`,
      logoBase64: `${m['logoBase64'] ?? ''}`,
      fontFamily: ImdFonts.normalize(`${m['fontFamily'] ?? ''}`),
      logoSize: typeof m['logoSize'] === 'number' && Number.isFinite(m['logoSize']) ? m['logoSize'] : 140,
      themePref: `${m['themePref'] ?? 'auto'}`,
      orgLine1: `${m['orgLine1'] ?? ''}`,
      orgLine2: `${m['orgLine2'] ?? ''}`,
      orgLine3: `${m['orgLine3'] ?? ''}`,
      orgLine4: `${m['orgLine4'] ?? ''}`,
      showExpiry: m['showExpiry'] !== false,
    });
  }

  toMap(): Record<string, unknown> {
    return {
      name: this.name,
      logoBase64: this.logoBase64,
      logoSize: this.logoSize,
      themePref: this.themePref,
      fontFamily: this.fontFamily,
      orgLine1: this.orgLine1,
      orgLine2: this.orgLine2,
      orgLine3: this.orgLine3,
      orgLine4: this.orgLine4,
      showExpiry: this.showExpiry,
    };
  }
}

/// الإعدادات العامة المحفوظة بصيغة JSON (هوية الجهة، تخطيط الطباعة، النماذج).
export class SettingsRepo {
  constructor(readonly db: AppDatabase) {}

  /// مفاتيح خاصة بهذا الجهاز لا تغادره بالمزامنة أبدًا.
  static readonly localOnlyKeys: ReadonlySet<string> = new Set([
    'device',
    'devices',
    'revocations',
    'ocr',
    'authSession',
    'authLocks',
    'security',
    'backupSchedule',
    'sysNotice',
    'issueRecovery',
    'voucherPrint',
    'sync',
    'esign',
    'campLedger',
    'archive.auto',
    'keyEscrow',
    'tls',
  ]);

  static readonly issueRecoveryKey = 'issueRecovery';
  static readonly printLayoutKey = 'printLayout';
  static readonly orgKey = 'org';
  static readonly printFormsKey = 'printForms';
  static readonly formStampKey = '_at';
  static readonly formDeletedKey = '_deleted';
  static readonly numbersKey = ImdNumbers.key;
  static readonly dailyFormKey = 'dailyForm';

  /// مسودة الصرف المحفوظة تلقائيًا للمستخدم [userId]، أو `null`.
  async readIssueRecovery(userId: string): Promise<Record<string, unknown> | null> {
    const v = (await this.read(SettingsRepo.issueRecoveryKey))[userId];
    return v != null && typeof v === 'object' && !Array.isArray(v)
      ? { ...(v as Record<string, unknown>) }
      : null;
  }

  async writeIssueRecovery(
    userId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    const all = await this.read(SettingsRepo.issueRecoveryKey);
    all[userId] = snapshot;
    await this.write(SettingsRepo.issueRecoveryKey, all);
  }

  async clearIssueRecovery(userId: string): Promise<void> {
    const all = await this.read(SettingsRepo.issueRecoveryKey);
    if (!(userId in all)) return;
    delete all[userId];
    await this.write(SettingsRepo.issueRecoveryKey, all);
  }

  async read(key: string): Promise<Record<string, unknown>> {
    const rows = await this.db
      .select(this.db.appSettings)
      .where((t) => t.key.equals(key))
      .get();
    if (rows.length === 0) return {};
    let decoded: unknown;
    try {
      decoded = JSON.parse(rows[0].value);
    } catch (err) {
      ErrorLogger.critical(`settings.read.${key}`, err, {
        stack: err instanceof Error ? err.stack : undefined,
      });
      return {};
    }
    return decoded != null && typeof decoded === 'object' && !Array.isArray(decoded)
      ? { ...(decoded as Record<string, unknown>) }
      : {};
  }

  write(key: string, value: Record<string, unknown>): Promise<void> {
    return this.db.into(this.db.appSettings).insertOnConflictUpdate(
      AppSettingsCompanion.insert({
        key,
        value: Value.of(JSON.stringify(value)),
        updatedAt: Value.of(new Date()),
      }),
    );
  }

  /// قراءةٌ فتعديلٌ فكتابة **في معاملةٍ واحدة** (M-25).
  update<T>(
    key: string,
    change: (map: Record<string, unknown>) => T,
  ): Promise<T> {
    return this.db.transaction(async () => {
      const map = await this.read(key);
      const before = JSON.stringify(map);
      const out = change(map);
      if (JSON.stringify(map) !== before) {
        await this.write(key, map);
      }
      return out;
    });
  }

  /// تخطيط النموذج [formKey]، أو التخطيط العام إن لم يُفرد النموذج بتصميم.
  async printLayoutFor(formKey: string | null): Promise<PrintLayout> {
    if (formKey == null || formKey.length === 0) return this.printLayout();
    const own = (await this.read(SettingsRepo.printFormsKey))[formKey];
    if (
      own == null ||
      typeof own !== 'object' ||
      Array.isArray(own) ||
      (own as Record<string, unknown>)[SettingsRepo.formDeletedKey] === true
    ) {
      return this.printLayout();
    }
    return PrintLayout.fromMap({ ...(own as Record<string, unknown>) });
  }

  async printLayout(): Promise<PrintLayout> {
    const map = await this.read(SettingsRepo.printLayoutKey);
    return Object.keys(map).length === 0
      ? PrintLayout.defaults
      : PrintLayout.fromMap(map);
  }

  savePrintLayout(layout: PrintLayout): Promise<void> {
    return this.write(SettingsRepo.printLayoutKey, layout.toMap());
  }

  /// يُفرد النموذج [formKey] بتخطيطٍ خاص.
  savePrintLayoutFor(formKey: string, layout: PrintLayout): Promise<void> {
    return this.update(SettingsRepo.printFormsKey, (all) => {
      all[formKey] = {
        ...layout.toMap(),
        [SettingsRepo.formStampKey]: Date.now(),
      };
    });
  }

  /// يُعيد النموذج إلى التخطيط العام (يحذف إفراده بشاهدٍ مختوم).
  async clearPrintLayoutFor(formKey: string): Promise<void> {
    const all = await this.read(SettingsRepo.printFormsKey);
    const own = all[formKey];
    if (
      own == null ||
      typeof own !== 'object' ||
      Array.isArray(own) ||
      (own as Record<string, unknown>)[SettingsRepo.formDeletedKey] === true
    ) {
      return;
    }
    await this.update(SettingsRepo.printFormsKey, (m) => {
      m[formKey] = {
        [SettingsRepo.formDeletedKey]: true,
        [SettingsRepo.formStampKey]: Date.now(),
      };
    });
  }

  /// مفاتيح النماذج المُفردة بتصميمٍ خاص.
  async customizedPrintForms(): Promise<Set<string>> {
    const all = await this.read(SettingsRepo.printFormsKey);
    const out = new Set<string>();
    for (const [k, val] of Object.entries(all)) {
      if (
        val != null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        (val as Record<string, unknown>)[SettingsRepo.formDeletedKey] !== true
      ) {
        out.add(k);
      }
    }
    return out;
  }

  /// دمج نسختين من `printForms` نموذجًا نموذجًا: الأحدث ختمًا لكلٍّ يفوز.
  static mergePrintForms(
    local: Record<string, unknown>,
    incoming: Record<string, unknown>,
  ): Record<string, unknown> {
    const at = (val: unknown): number => {
      if (val != null && typeof val === 'object' && !Array.isArray(val)) {
        const raw = (val as Record<string, unknown>)[SettingsRepo.formStampKey];
        if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
      }
      return -1;
    };
    const out: Record<string, unknown> = { ...local };
    for (const [k, val] of Object.entries(incoming)) {
      if (val == null || typeof val !== 'object' || Array.isArray(val)) continue;
      const mine = out[k];
      const a = at(val);
      const b = at(mine);
      if (
        a > b ||
        (a === b && JSON.stringify(val).localeCompare(JSON.stringify(mine)) > 0)
      ) {
        out[k] = val;
      }
    }
    return out;
  }

  /// هوية التطبيق والجهة.
  async identity(): Promise<AppIdentity> {
    const map = await this.read(SettingsRepo.orgKey);
    return Object.keys(map).length === 0
      ? new AppIdentity()
      : AppIdentity.fromMap(map);
  }

  saveIdentity(id: AppIdentity): Promise<void> {
    return this.write(SettingsRepo.orgKey, id.toMap());
  }

  /// تفضيلات تنسيق الأرقام.
  async numbers(): Promise<ImdNumberPrefs> {
    const map = await this.read(SettingsRepo.numbersKey);
    return Object.keys(map).length === 0
      ? new ImdNumberPrefs()
      : ImdNumberPrefs.fromMap(map);
  }

  /// يحفظ التفضيل **ويُفعّله في الجلسة**.
  async saveNumbers(p: ImdNumberPrefs): Promise<void> {
    await this.write(SettingsRepo.numbersKey, p.toMap());
    ImdNumbers.apply(p);
  }

  /// وضع التوقيع الإلكتروني للسندات.
  async esignMode(): Promise<ESignMode> {
    return ESignPolicy.parse((await this.read(ESignPolicy.settingsKey))['mode']);
  }

  /// ورق طباعة السندات وآخر نسخٍ اختيرت على هذا الجهاز.
  async voucherPrintPrefs(): Promise<VoucherPrintPrefs> {
    return VoucherPrintPrefs.fromMap(
      await this.read(VoucherPrintPrefs.settingsKey),
    );
  }

  saveVoucherPrintPrefs(p: VoucherPrintPrefs): Promise<void> {
    return this.write(VoucherPrintPrefs.settingsKey, p.toMap());
  }

  async dailyFormVars(): Promise<DailyFormVars> {
    return DailyFormVars.fromMap(await this.read(SettingsRepo.dailyFormKey));
  }

  saveDailyFormVars(v: DailyFormVars): Promise<void> {
    return this.write(SettingsRepo.dailyFormKey, v.toMap());
  }

  saveEsignMode(mode: ESignMode): Promise<void> {
    return this.update<void>(ESignPolicy.settingsKey, (m) => {
      m['mode'] = mode;
    });
  }

  async esignPrintOn(): Promise<Set<string>> {
    return ESignPolicy.parsePrintOn(
      (await this.read(ESignPolicy.settingsKey))['printOn'],
    );
  }

  saveEsignPrintOn(docs: Set<string>): Promise<void> {
    return this.update<void>(ESignPolicy.settingsKey, (m) => {
      m['printOn'] = Object.keys(ESignPolicy.printableDocs).filter((k) =>
        docs.has(k),
      );
    });
  }

  /// يقرأ التفضيل المحفوظ ويُفعّله — يُنادى مرةً عند الإقلاع.
  async loadNumbers(): Promise<void> {
    ImdNumbers.apply(await this.numbers());
  }
}
