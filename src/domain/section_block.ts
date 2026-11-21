/// حجب الأقسام عن مستخدم: قسم الإمداد، وقسم المحروقات، وخمسة أقسامٍ إداريةٍ فرعية.
///
/// **طبقةٌ فوق الصلاحيات لا بديلٌ عنها:** الصلاحيات تقول ماذا يفعل المستخدم في
/// كل صفحة؛ الحجب يقول إن هذا القسم **كله** ليس له — مهما كانت صلاحياته (ومنها
/// المدير الذي يملك كل الصفحات). والمالك وحده لا يُحجب عنه شيء.
///
/// **فشلٌ مغلق:** قيمةٌ تالفة (JSON لا يُقرأ، أو ليست قائمة) تُعامل حجبًا للكل
/// (`parse`)؛ فتلفٌ بالمزامنة أو بتعديلٍ يدويٍّ لا يفتح قسمًا كان مغلقًا.
export class SectionBlock {
  private constructor() {}

  static readonly supply = 'supply';
  static readonly fuel = 'fuel';
  static readonly adminSettings = 'admin.settings';
  static readonly adminUsers = 'admin.users';
  static readonly adminAudit = 'admin.audit';
  static readonly adminSync = 'admin.sync';
  static readonly adminDevices = 'admin.devices';

  /// كل الأقسام القابلة للحجب، بترتيب عرضها.
  static readonly all: readonly string[] = [
    SectionBlock.supply,
    SectionBlock.fuel,
    SectionBlock.adminSettings,
    SectionBlock.adminUsers,
    SectionBlock.adminAudit,
    SectionBlock.adminSync,
    SectionBlock.adminDevices,
  ];

  static readonly labels: Readonly<Record<string, string>> = {
    [SectionBlock.supply]: 'قسم الإمداد والتموين',
    [SectionBlock.fuel]: 'قسم المحروقات',
    [SectionBlock.adminSettings]:
      'الإعدادات العامة (الهوية، النماذج، التوقيع الإلكتروني، النسخ الاحتياطي)',
    [SectionBlock.adminUsers]: 'المستخدمون',
    [SectionBlock.adminAudit]: 'سجل التدقيق والرقابة',
    [SectionBlock.adminSync]: 'المزامنة',
    [SectionBlock.adminDevices]: 'تفعيل الأجهزة',
  };

  /// أقسام شاشة الإعدادات الداخلية ← القسم الذي يحجبها.
  ///
  /// «نظرة عامة» والمخزون والطباعة وغيرها لا تتبع حجبًا: شاشة الإعدادات نفسها تبقى
  /// متاحةً، وما يُخفى هو أقسامها المحجوبة فقط.
  static readonly settingsSections: Readonly<Record<string, string>> = {
    company: SectionBlock.adminSettings,
    forms: SectionBlock.adminSettings,
    verify: SectionBlock.adminSettings,
    backup: SectionBlock.adminSettings,
    users: SectionBlock.adminUsers,
    sync: SectionBlock.adminSync,
    devices: SectionBlock.adminDevices,
  };

  /// صفحاتٌ إدارية مباشرة (تفتح الإعدادات على قسمٍ بعينه أو تدقّق).
  private static readonly _adminPages: Readonly<Record<string, string>> = {
    branding: SectionBlock.adminSettings,
    formsDesigner: SectionBlock.adminSettings,
    verifySign: SectionBlock.adminSettings,
    usersAccess: SectionBlock.adminUsers,
    lanSync: SectionBlock.adminSync,
    deviceActivation: SectionBlock.adminDevices,
    supplyAudit: SectionBlock.adminAudit,
    auditTrail: SectionBlock.adminAudit,
    activityIntel: SectionBlock.adminAudit,
    executiveCmd: SectionBlock.adminAudit,
    sensitiveOps: SectionBlock.adminAudit,
    healthOps: SectionBlock.adminAudit,
    audit: SectionBlock.adminAudit,
  };

  /// صفحاتٌ محايدة: الرئيسية تتبع القسم المفتوح، والإعدادات تُرشَّح أقسامها.
  private static readonly _neutral: ReadonlySet<string> = new Set([
    'dash',
    'dashboard',
    'settings',
  ]);

  /// القسم الذي تنتمي إليه [page]، أو `null` لصفحةٍ محايدة.
  ///
  /// تُمرَّر **هوية الصفحة الأصلية** لا المطبَّعة: `lanSync` تُطبَّع إلى صلاحيةٍ
  /// نظامية، فيضيع انتماؤها الإداري لو طُبِّعت قبل السؤال.
  static sectionOf(page: string): string | null {
    if (SectionBlock._neutral.has(page)) return null;
    const admin = SectionBlock._adminPages[page];
    if (admin !== undefined) return admin;
    if (page.startsWith('fuel')) return SectionBlock.fuel;
    return SectionBlock.supply;
  }

  // ───────────────────────── القراءة والكتابة

  /// قائمة الأقسام المحجوبة من JSON المخزَّن. التالف ⇒ **كل الأقسام** (فشل مغلق).
  static parse(json?: string | null): Set<string> {
    const text = (json ?? '').trim();
    if (text.length === 0) return new Set<string>();
    try {
      const v: unknown = JSON.parse(text);
      if (!Array.isArray(v)) return new Set<string>(SectionBlock.all);
      const out = new Set<string>();
      for (const e of v) {
        if (typeof e === 'string' && SectionBlock.all.includes(e)) {
          out.add(e);
        }
      }
      return out;
    } catch {
      return new Set<string>(SectionBlock.all);
    }
  }

  /// يرمّز مجموعةً إلى JSON مرتّب بلا تكرار وبلا أقسامٍ مجهولة — ترميزٌ **حتميّ**
  /// لأن التوقيع يُحسب على نصّه.
  static encode(sections: Iterable<string>): string {
    const set = new Set<string>();
    for (const s of sections) {
      if (SectionBlock.all.includes(s)) set.add(s);
    }
    return JSON.stringify(SectionBlock.all.filter((s) => set.has(s)));
  }

  // ───────────────────────── الفحص

  /// هل تُحجب [page] عن حسابٍ بدور [role] وحجبه [blockedJson]؟
  /// المالك لا يُحجب عنه شيء.
  static blocksPage({
    role,
    blockedJson,
    page,
  }: {
    readonly role?: string | null;
    readonly blockedJson?: string | null;
    readonly page: string;
  }): boolean {
    if (role === 'owner') return false;
    const section = SectionBlock.sectionOf(page);
    if (section === null) return false;
    return SectionBlock.parse(blockedJson).has(section);
  }

  /// هل [section] (من [all]) محجوبٌ عن هذا الحساب؟ المالك لا.
  static blocksSection({
    role,
    blockedJson,
    section,
  }: {
    readonly role?: string | null;
    readonly blockedJson?: string | null;
    readonly section: string;
  }): boolean {
    if (role === 'owner') return false;
    return SectionBlock.parse(blockedJson).has(section);
  }
}
