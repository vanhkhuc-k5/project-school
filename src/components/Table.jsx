// =============================================================================
// Table Component — G42 Responsive & Accessibility
// Accessible and responsive data table
// =============================================================================

import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Table({
  columns,
  data,
  emptyMessage = 'Không có dữ liệu',
  className = '',
  caption,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary" role="status">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-card border border-hairline ${className}`}>
      <table className="w-full min-w-[640px]">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <thead>
          <tr className="bg-surface-neutral border-b border-hairline">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                } ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-white">
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              className="hover:bg-surface-neutral/50 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm text-text-primary ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                  } ${col.className || ''}`}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// Sortable Header
// =============================================

export function SortableHeader({ column, sortKey, sortOrder, onSort, children }) {
  const isActive = sortKey === column.key;

  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer select-none hover:text-text-primary transition-colors ${
        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''
      }`}
      onClick={() => onSort(column.key)}
      aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean/50 rounded"
      >
        <span>{children}</span>
        <span className="inline-flex flex-col" aria-hidden="true">
          <ChevronUp
            className={`w-3 h-3 -mb-1 ${isActive && sortOrder === 'asc' ? 'text-ocean' : 'text-hairline'}`}
          />
          <ChevronDown
            className={`w-3 h-3 ${isActive && sortOrder === 'desc' ? 'text-ocean' : 'text-hairline'}`}
          />
        </span>
      </button>
    </th>
  );
}

// =============================================
// Simple Table for Dashboard
// =============================================

export function SimpleTable({ headers, rows, className = '', caption }) {
  return (
    <div className={`overflow-x-auto rounded-card border border-hairline ${className}`}>
      <table className="w-full min-w-[480px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-surface-neutral border-b border-hairline">
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-white">
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="hover:bg-surface-neutral/50 transition-colors"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-text-primary"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// Responsive Card Table
// For mobile: displays data as stacked cards
// =============================================

export function CardTable({ columns, data, emptyMessage = 'Không có dữ liệu', className = '' }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary" role="status">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`} role="list">
      {data.map((row, rowIndex) => (
        <div
          key={row.id || rowIndex}
          className="bg-white rounded-card border border-hairline p-4 space-y-3"
          role="listitem"
        >
          {columns.map((col) => (
            <div key={col.key} className="flex justify-between gap-4">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {col.header}
              </span>
              <span className="text-sm text-text-primary text-right">
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// =============================================
// Table with Pagination
// =============================================

export function PaginatedTable({
  columns,
  data,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  emptyMessage = 'Không có dữ liệu',
  className = '',
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-card border border-hairline">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-neutral border-b border-hairline">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider ${
                    col.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-surface-neutral/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-text-primary ${
                        col.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            {emptyMessage}
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <div
              key={row.id || rowIndex}
              className="bg-white rounded-card border border-hairline p-4 space-y-2"
            >
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between gap-4">
                  <span className="text-xs font-medium text-text-secondary">
                    {col.header}
                  </span>
                  <span className="text-sm text-text-primary text-right">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2"
          role="navigation"
          aria-label="Phân trang"
        >
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Trang trước"
            className="min-w-[44px] min-h-[44px]"
          />
          <span className="px-4 text-sm text-text-secondary">
            Trang {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronRight}
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Trang sau"
            className="min-w-[44px] min-h-[44px]"
          />
        </nav>
      )}
    </div>
  );
}

export default Table;
