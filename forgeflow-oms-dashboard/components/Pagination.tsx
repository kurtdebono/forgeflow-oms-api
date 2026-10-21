import Link from 'next/link';
import {
  disabledControlClassName,
  secondaryControlClassName,
} from './controlStyles';

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  hrefForPage: (page: number) => string;
  onNavigate?: () => void;
};

type PageControlProps = {
  label: string;
  arrow: string;
  arrowFirst: boolean;
  href: string | null;
  rel: 'prev' | 'next';
  onNavigate?: () => void;
};

function PageControl({
  label,
  arrow,
  arrowFirst,
  href,
  rel,
  onNavigate,
}: PageControlProps) {
  const content = (
    <>
      {arrowFirst && <span aria-hidden="true">{arrow}&nbsp;</span>}
      {label}
      {!arrowFirst && <span aria-hidden="true">&nbsp;{arrow}</span>}
    </>
  );

  // Links cannot be natively disabled, so the unavailable control is a disabled button.
  if (href === null) {
    return (
      <button
        type="button"
        disabled
        className={`${disabledControlClassName} flex-1 sm:flex-none`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      rel={rel}
      onClick={onNavigate}
      className={`${secondaryControlClassName} flex-1 sm:flex-none`}
    >
      {content}
    </Link>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  hrefForPage,
  onNavigate,
}: PaginationProps) {
  return (
    <nav
      aria-label="Orders pagination"
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p className="text-sm text-gray-600">
        Page {page} of {totalPages} <span aria-hidden="true">·</span> {total}{' '}
        orders
      </p>

      <div className="flex w-full gap-3 sm:w-auto">
        <PageControl
          label="Previous"
          arrow="←"
          arrowFirst
          href={page > 1 ? hrefForPage(page - 1) : null}
          rel="prev"
          onNavigate={onNavigate}
        />
        <PageControl
          label="Next"
          arrow="→"
          arrowFirst={false}
          href={page < totalPages ? hrefForPage(page + 1) : null}
          rel="next"
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}
