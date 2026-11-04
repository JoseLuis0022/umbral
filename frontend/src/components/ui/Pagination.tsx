import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './Button';

// Paginación compacta: en escritorio "‹ 1 2 3 … N ›", en móvil "‹ pág/total ›".
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageList(page, totalPages);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <IconButton aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={18} />
      </IconButton>

      <span className="flex items-center gap-1 font-ui text-13 tabular-nums text-text-2 md:hidden">
        {page}/{totalPages}
      </span>

      <div className="hidden items-center gap-1 md:flex">
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 font-ui text-13 text-text-3">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={cn(
                'h-8 min-w-8 rounded-control px-2 font-ui text-13 font-medium tabular-nums transition-colors duration-150',
                p === page ? 'bg-accent text-white' : 'text-text-2 hover:bg-accent-soft hover:text-accent-fg'
              )}
            >
              {p}
            </button>
          )
        )}
      </div>

      <IconButton aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={18} />
      </IconButton>
    </div>
  );
}

function getPageList(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, total - 1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}
