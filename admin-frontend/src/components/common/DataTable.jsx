import { useState } from 'react'
import Pagination from './Pagination'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'

export default function DataTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon = 'inbox',
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
  sortBy,
  sortOrder,
  onSort
}) {
  const handleSort = (column) => {
    if (!column.sortable || !onSort) return
    const newOrder = sortBy === column.key && sortOrder === 'asc' ? 'desc' : 'asc'
    onSort(column.key, newOrder)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!data || data.length === 0) {
    return <EmptyState message={emptyMessage} icon={emptyIcon} />
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border-main">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-border-main">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer hover:text-text-primary select-none' : ''
                  } ${col.className || ''}`}
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortBy === col.key && (
                      <span className="material-icons text-[14px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-main">
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`bg-white hover:bg-slate-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-text-primary ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}
