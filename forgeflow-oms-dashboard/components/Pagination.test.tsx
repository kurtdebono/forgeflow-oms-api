import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ordersPageHref } from '@/lib/pagination';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('links both directions in the middle of the list, Previous first in tab order (AC22)', async () => {
    render(
      <Pagination page={2} totalPages={3} total={55} hrefForPage={ordersPageHref} />,
    );

    await userEvent.tab();
    expect(document.activeElement?.textContent).toContain('Previous');
    expect(document.activeElement?.getAttribute('href')).toBe('/orders');
    await userEvent.tab();
    expect(document.activeElement?.textContent).toContain('Next');
    expect(document.activeElement?.getAttribute('href')).toBe('/orders?page=3');
  });

  it('skips a disabled control in tab order and cannot activate it (AC22)', async () => {
    const onNavigate = vi.fn();
    render(
      <Pagination
        page={1}
        totalPages={2}
        total={28}
        hrefForPage={ordersPageHref}
        onNavigate={onNavigate}
      />,
    );

    const previous = screen.getByRole('button', { name: 'Previous' });
    await userEvent.click(previous);
    await userEvent.tab();

    expect(onNavigate).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Next' }));
  });

  it('shows the page indicator and the total', () => {
    render(
      <Pagination page={1} totalPages={2} total={28} hrefForPage={ordersPageHref} />,
    );

    expect(
      screen.getByRole('navigation', { name: 'Orders pagination' }).textContent,
    ).toContain('Page 1 of 2 · 28 orders');
  });
});
