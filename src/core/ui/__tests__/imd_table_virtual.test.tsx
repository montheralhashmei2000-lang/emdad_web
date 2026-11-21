import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImdCol, ImdTable } from '../imd_widgets';

describe('imd_table_virtual_test', () => {
  afterEach(() => {
    cleanup();
  });

  it('صفحةٌ من ٥٠٠ صف لا تُبنى كلها، والنقر يحمل فهرس الصف', () => {
    let tapped: number | null = null;
    render(
      <div dir="rtl">
        <ImdTable
          columns={[new ImdCol('الرقم'), new ImdCol('الاسم')]}
          pageSize={500}
          maxHeight={400}
          onRowTap={(i) => {
            tapped = i;
          }}
          rows={Array.from({ length: 500 }, (_, i) => [
            <span key="id">{`r${i}`}</span>,
            <span key="name">{`اسم ${i}`}</span>,
          ])}
        />
      </div>,
    );

    const built = screen.getAllByText(/^r\d+$/).length;
    expect(built, `بُنيت ${built} صفًّا من ٥٠٠`).toBeLessThan(60);
    expect(screen.getByText('r0')).toBeTruthy();
    expect(screen.queryByText('r499')).toBeNull();

    fireEvent.click(screen.getByText('r3'));
    expect(tapped).toBe(3);
  });
});
