import type { FC } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Total row count — when given, a "X of N" summary is shown. */
  total?: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Compact windowed page list, e.g. 1 … 4 5 [6] 7 8 … 20 */
const pageWindow = (page: number, totalPages: number): number[] => {
  const span = 1;
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - span; p <= page + span; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  return Array.from(pages).sort((a, b) => a - b);
};

/**
 * Reusable server-side pagination control. Renders nothing when there is a
 * single page. Parent owns the page state and refetches on `onChange`.
 */
const Pagination: FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  onChange,
  className = "",
}) => {
  if (totalPages <= 1) return null;

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== page) onChange(next);
  };

  const window = pageWindow(page, totalPages);
  const btn =
    "min-w-[34px] h-[34px] px-2 rounded-md text-sm flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      {total !== undefined && (
        <span className="text-xs text-slate-500">
          Page {page} of {totalPages} · {total} total
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className={`${btn} bg-slate-800 hover:bg-slate-700`}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {window.map((p, i) => {
          const gap = i > 0 && p - window[i - 1] > 1;
          return (
            <span key={p} className="flex items-center">
              {gap && <span className="px-1 text-slate-600">…</span>}
              <button
                type="button"
                onClick={() => go(p)}
                className={`${btn} ${
                  p === page
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {p}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className={`${btn} bg-slate-800 hover:bg-slate-700`}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
