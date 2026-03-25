export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-text-secondary">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 text-sm rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-text-secondary"
        >
          <span className="material-icons text-[18px]">chevron_left</span>
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="px-3 py-1 text-sm rounded-md hover:bg-slate-100 text-text-secondary">1</button>
            {start > 2 && <span className="text-text-secondary px-1">...</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 text-sm rounded-md font-medium ${
              p === page ? 'bg-primary text-white' : 'hover:bg-slate-100 text-text-secondary'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-text-secondary px-1">...</span>}
            <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 text-sm rounded-md hover:bg-slate-100 text-text-secondary">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 text-sm rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-text-secondary"
        >
          <span className="material-icons text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>
  )
}
