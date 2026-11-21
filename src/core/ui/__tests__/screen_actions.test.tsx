import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdPageHost } from '../imd_page_tabs';
import { ImdScreenActions, useImdScreenActions } from '../imd_screen_actions';
import { ImdRecordSink } from '../imd_status_bar';

/// CLAUDE.md §8 البند 24: Ctrl+S كان يعمل في ١١ شاشة فقط، ويملكه آخرُ صفحةٍ فُتحت
/// لا الظاهرة (الصفحات تبقى حيّةً تبويبات). الآن خانةٌ لكل صفحة والجذر يقرأ خانة
/// الظاهرة، وكل شاشةٍ لها حفظ تسجّله.
describe('screen_actions_test', () => {
  afterEach(() => {
    cleanup();
  });

  it('الجذر يقرأ خانة الصفحة الظاهرة، وما سجّله هو حين لا خانة', () => {
    const root = new ImdScreenActions();
    let hits = '';
    root.register({
      onSave: () => {
        hits += 'root';
      },
    });
    const a = new ImdScreenActions();
    a.register({
      onSave: () => {
        hits += 'a';
      },
    });
    const b = new ImdScreenActions();
    b.register({
      onSave: () => {
        hits += 'b';
      },
    });

    root.onSave!();
    root.delegate = a;
    root.onSave!();
    root.delegate = b;
    root.onSave!();
    expect(hits).toBe('rootab');
  });

  it('الشاشة داخل ImdPageHost تسجّل في خانة صفحتها لا في الجذر', () => {
    const slot = new ImdScreenActions();
    let saved = 0;

    function InnerScreen() {
      const actions = useImdScreenActions();
      actions?.register({
        onSave: () => {
          saved++;
        },
      });
      return null;
    }

    render(
      <ImdPageHost active={true} sink={new ImdRecordSink()} actions={slot}>
        <InnerScreen />
      </ImdPageHost>,
    );

    slot.onSave!();
    expect(saved).toBe(1);
  });

  // MISSING: lib/features/*_screen.dart (مراحل 5+)
  it.skip('كل شاشةٍ لها حفظ تسجّل Ctrl+S', () => {
    // يفحص شاشات lib/features/*_screen.dart عند تحويلها في المراحل 5+.
  });
});
