// =============================================================================
// Pagination Component — G41 Shared UI Components
// Accessible pagination controls
// =============================================================================

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
  showFirstLast = false,
}) {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const delta = 1; // Pages around current page
    const left = currentPage - delta;
    const right = currentPage + delta;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // First page
        i === totalPages || // Last page
        (i >= left && i <= right) // Pages around current
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }

    return pages;
  };

  return (
    <nav
      className={`flex items-center justify-center gap-1 ${className}`}
      role="navigation"
      aria-label="Phân trang"
    >
      {/* First Page */}
      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronsLeft}
          onClick={() => onPageChange(1)}
          disabled={!hasPrevious}
          aria-label="Trang đầu tiên"
          className="w-9 h-9 p-0"
        />
      )}

      {/* Previous Page */}
      <Button
        variant="ghost"
        size="sm"
        icon={ChevronLeft}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevious}
        aria-label="Trang trước"
        className="w-9 h-9 p-0"
      />

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) =>
          page === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className="w-9 h-9 flex items-center justify-center text-text-secondary"
            >
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(page)}
              aria-label={`Trang ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
              className={`w-9 h-9 p-0 ${
                currentPage === page ? '' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {page}
            </Button>
          )
        )}
      </div>

      {/* Next Page */}
      <Button
        variant="ghost"
        size="sm"
        icon={ChevronRight}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
        aria-label="Trang sau"
        className="w-9 h-9 p-0"
      />

      {/* Last Page */}
      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronsRight}
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          aria-label="Trang cuối cùng"
          className="w-9 h-9 p-0"
        />
      )}
    </nav>
  );
}

// =============================================
// Pagination Info
// =============================================

export function PaginationInfo({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  className = '',
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <p className={`text-sm text-text-secondary ${className}`}>
      {totalItems > 0
        ? `Hiển thị ${start}–${end} của ${totalItems}`
        : 'Không có kết quả'}
    </p>
  );
}

export default Pagination;
