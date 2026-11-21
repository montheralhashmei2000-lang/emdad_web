// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SpaceChooserScreen } from '../../features/home/space_chooser_screen';
import { AppSpace } from '../app_space';

/// مساحتا العمل: الإمداد والمحروقات.
///
/// القاعدة التي تحرسها هذه الاختبارات: **من يملك مساحةً واحدة لا يُسأل**.
/// شاشةُ اختيارٍ بخيارٍ واحد متاح ليست اختيارًا، بل نقرةٌ تُدفع كل يوم.
describe('app_space_test', () => {
  afterEach(() => {
    cleanup();
  });

  describe('ما يملكه المستخدم من مساحات', () => {
    it('من له صفحات الإمداد وحدها يملك مساحةً واحدة', () => {
      const spaces = AppSpace.availableFor((p) => AppSpace.pages[AppSpace.supply]!.includes(p));
      expect(spaces).toEqual([AppSpace.supply]);
    });

    it('من له صفحات المحروقات وحدها يملك مساحةً واحدة', () => {
      const spaces = AppSpace.availableFor((p) => AppSpace.pages[AppSpace.fuel]!.includes(p));
      expect(spaces).toEqual([AppSpace.fuel]);
    });

    it('من له الاثنتان يملكهما', () => {
      expect(AppSpace.availableFor(() => true)).toEqual(AppSpace.all);
    });

    it('الإعدادات وحدها لا تمنح مساحة', () => {
      // وإلا رأى مساحةً فارغة إلا من إعداداتٍ عامة.
      expect(AppSpace.availableFor((p) => p === 'settings')).toEqual([]);
    });
  });

  describe('أي مساحة تُفتح', () => {
    it('صاحب مساحةٍ واحدة يدخلها بلا سؤال', () => {
      expect(
        AppSpace.resolve({ available: [AppSpace.fuel], saved: null }),
      ).toBe(AppSpace.fuel);
    });

    it('صاحب المساحتين بلا اختيار محفوظ يُسأل', () => {
      expect(AppSpace.resolve({ available: AppSpace.all, saved: null })).toBeNull();
    });

    it('الاختيار المحفوظ يُحترم فلا يُسأل مرتين', () => {
      expect(
        AppSpace.resolve({ available: AppSpace.all, saved: AppSpace.fuel }),
      ).toBe(AppSpace.fuel);
    });

    it('محفوظٌ لم يعد متاحًا لا يحبس صاحبه', () => {
      // تغيّرت صلاحياته فلم تبقَ له إلا الإمداد — لا يُفتح على المحروقات.
      expect(
        AppSpace.resolve({ available: [AppSpace.supply], saved: AppSpace.fuel }),
      ).toBe(AppSpace.supply);
    });

    it('بلا مساحة أصلًا لا شيء يُفتح', () => {
      expect(AppSpace.resolve({ available: [], saved: AppSpace.fuel })).toBeNull();
    });
  });

  describe('الفصل بعد إخراج المشترك', () => {
    it('لا بند مشترك: كل بند لقسمه', () => {
      // المستخدم أراد الفصل نهائيًّا، فلم يبقَ بندٌ يظهر في القسمين.
      expect(AppSpace.shows(AppSpace.supply, AppSpace.fuel)).toBe(false);
      expect(AppSpace.shows(AppSpace.fuel, AppSpace.supply)).toBe(false);
    });

    it('صفحات الإمداد لا تتضمن شيئًا من المحروقات', () => {
      const supply = AppSpace.pages[AppSpace.supply]!;
      expect(supply.filter((p) => p.startsWith('fuel'))).toEqual([]);
    });

    it('صفحات المحروقات كلها تبدأ بـfuel', () => {
      const fuel = AppSpace.pages[AppSpace.fuel]!;
      expect(fuel.every((p) => p.startsWith('fuel'))).toBe(true);
    });
  });

  describe('ترشيح البنود', () => {
    it('المشترك يظهر في المساحتين', () => {
      expect(AppSpace.shows(AppSpace.both, AppSpace.supply)).toBe(true);
      expect(AppSpace.shows(AppSpace.both, AppSpace.fuel)).toBe(true);
    });

    it('بند القسم لا يظهر في غيره', () => {
      expect(AppSpace.shows(AppSpace.fuel, AppSpace.supply)).toBe(false);
      expect(AppSpace.shows(AppSpace.supply, AppSpace.fuel)).toBe(false);
    });
  });

  describe('شاشة الاختيار', () => {
    it('تعرض المساحتين بوصفيهما', () => {
      render(
        <SpaceChooserScreen
          spaces={AppSpace.all}
          userName="أحمد"
          onPick={() => {}}
        />,
      );
      expect(screen.getByText('أهلًا أحمد — اختر القسم')).not.toBeNull();
      expect(screen.getByText(AppSpace.label(AppSpace.supply))).not.toBeNull();
      expect(screen.getByText(AppSpace.label(AppSpace.fuel))).not.toBeNull();
      expect(
        screen.getByText(AppSpace.descriptions[AppSpace.supply]!),
      ).not.toBeNull();
      expect(
        screen.getByText(AppSpace.descriptions[AppSpace.fuel]!),
      ).not.toBeNull();
    });

    it('النقر يعيد المساحة المختارة', () => {
      let picked: string | null = null;
      render(
        <SpaceChooserScreen
          spaces={AppSpace.all}
          userName=""
          onPick={(s) => {
            picked = s;
          }}
        />,
      );

      fireEvent.click(screen.getByText(AppSpace.label(AppSpace.fuel)));
      expect(picked).toBe(AppSpace.fuel);

      fireEvent.click(screen.getByText(AppSpace.label(AppSpace.supply)));
      expect(picked).toBe(AppSpace.supply);
    });

    it('تُبنى على عرض ضيّق بلا فيض', () => {
      const prevWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360,
      });
      try {
        const { container } = render(
          <SpaceChooserScreen
            spaces={AppSpace.all}
            userName="أحمد"
            onPick={() => {}}
          />,
        );
        expect(
          container.querySelector('[data-imd-space-chooser="true"]'),
        ).not.toBeNull();
        expect(screen.getByText(AppSpace.label(AppSpace.supply))).not.toBeNull();
        expect(screen.getByText(AppSpace.label(AppSpace.fuel))).not.toBeNull();
        // في العرض الضيق (< tablet) تصطف البطاقات عموديًا داخل عمود مرن لا شبكة أفقية.
        expect(container.querySelector('.grid')).toBeNull();
      } finally {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: prevWidth,
        });
      }
    });
  });
});
