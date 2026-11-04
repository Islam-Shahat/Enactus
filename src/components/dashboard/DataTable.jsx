import React from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import { useLanguage } from '../../context/LanguageContext';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  error = null,
  page = 1,
  pageSize = 10,
  totalCount = 0,
  onPageChange = null,
  searchValue = '',
  onSearchChange = null,
  searchPlaceholder = 'بحث...',
  filters = null,
  actions = null,
  onRowClick = null,
  sortBy = '',
  sortOrder = 'desc',
  onSortChange = null,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription = 'لم يتم العثور على أي نتائج مطابقة.',
}) {
  const { lang, dir } = useLanguage();
  const isAr = lang === 'ar';

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const fromIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIndex = Math.min(page * pageSize, totalCount);

  return (
    <div
      className="glass-panel datatable-container"
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 184, 0, 0.2)',
        background: 'rgba(15, 16, 24, 0.75)',
      }}
    >
      {/* Top Filter & Search Bar */}
      {(onSearchChange || filters || actions) && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 184, 0, 0.15)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
            {onSearchChange && (
              <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: dir === 'ltr' ? '10px' : 'auto',
                    right: dir === 'rtl' ? '10px' : 'auto',
                    color: '#ffb800',
                  }}
                />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    width: '100%',
                    padding: '0.45rem 1rem',
                    paddingInlineStart: '2.2rem',
                    borderRadius: '8px',
                    background: 'rgba(10, 11, 16, 0.7)',
                    border: '1px solid rgba(255, 184, 0, 0.25)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}
            {filters}
          </div>

          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{actions}</div>}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            color: '#fca5a5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={28} color="#ef4444" />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            {typeof error === 'string' ? error : error.message || 'حدث خطأ أثناء تحميل البيانات.'}
          </p>
        </div>
      )}

      {/* Main Table */}
      {!error && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: dir === 'rtl' ? 'right' : 'left',
              fontSize: '0.88rem',
            }}
          >
            <thead>
              <tr style={{ background: 'rgba(255, 184, 0, 0.06)', borderBottom: '1px solid rgba(255, 184, 0, 0.2)' }}>
                {columns.map((col) => {
                  const isCurrentSort = sortBy === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && onSortChange && onSortChange(col.key)}
                      style={{
                        padding: '0.85rem 1rem',
                        fontWeight: 700,
                        color: '#ffd54f',
                        cursor: col.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                        width: col.width || 'auto',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span style={{ color: isCurrentSort ? '#ffb800' : '#666' }}>
                            {isCurrentSort ? (
                              sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                            ) : (
                              <ArrowUpDown size={13} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: pageSize > 8 ? 8 : pageSize }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    {columns.map((c, cIdx) => (
                      <td key={`skel-td-${cIdx}`} style={{ padding: '0.9rem 1rem' }}>
                        <Skeleton height="18px" width={cIdx === 0 ? '120px' : '80px'} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '2rem 1rem' }}>
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={onRowClick ? 'clickable-row' : ''}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} style={{ padding: '0.85rem 1rem', color: '#e0e0ec', verticalAlign: 'middle' }}>
                        {col.render ? col.render(row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!error && totalCount > 0 && onPageChange && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid rgba(255, 184, 0, 0.15)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            fontSize: '0.82rem',
            color: '#a0a0b2',
          }}
        >
          <div>
            {isAr
              ? `عرض ${fromIndex} إلى ${toIndex} من إجمالي ${totalCount} عنصر`
              : `Showing ${fromIndex} to ${toIndex} of ${totalCount} items`}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.6rem',
                opacity: page <= 1 ? 0.4 : 1,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
              aria-label="Previous Page"
            >
              {dir === 'rtl' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <span style={{ padding: '0 0.5rem', fontWeight: 700, color: '#ffd54f' }}>
              {isAr ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
            </span>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.6rem',
                opacity: page >= totalPages ? 0.4 : 1,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
              aria-label="Next Page"
            >
              {dir === 'rtl' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

