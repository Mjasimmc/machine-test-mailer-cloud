import React, { useEffect, useState, useMemo } from 'react';
import {
  FormDataColumnDto,
  FormDataRowDto,
  FormDataViewDto,
  FormDto,
} from '@saas/shared';
import { formsService } from '../../../../services/forms.service';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Spinner,
} from '../../../../components';

interface DataSectionProps {
  form: FormDto;
  onRefreshForm?: () => Promise<void>;
}

export const DataSection: React.FC<DataSectionProps> = ({ form }) => {
  const [dataView, setDataView] = useState<FormDataViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [versionFilter, setVersionFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selected Record Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<FormDataRowDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await formsService.getDataView(form.id);
      setDataView(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load submissions data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [form.id]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered and Sorted rows
  const filteredAndSortedRows = useMemo(() => {
    if (!dataView) return [];

    let rows = [...dataView.rows];

    // Filter by version
    if (versionFilter !== 'all') {
      const vNum = parseInt(versionFilter, 10);
      rows = rows.filter((r) => r.versionNumber === vNum);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((row) => {
        const timeMatch = row.submittedAt.toLowerCase().includes(q);
        const verMatch = row.versionNumber !== undefined && `v${row.versionNumber}`.includes(q);
        const dataMatch = Object.values(row.data).some((val) =>
          String(val ?? '').toLowerCase().includes(q),
        );
        return timeMatch || verMatch || dataMatch;
      });
    }

    // Sort rows
    rows.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'submittedAt') {
        valA = new Date(a.submittedAt).getTime();
        valB = new Date(b.submittedAt).getTime();
      } else if (sortField === 'versionNumber') {
        valA = a.versionNumber || 0;
        valB = b.versionNumber || 0;
      } else {
        valA = a.data[sortField] ?? '';
        valB = b.data[sortField] ?? '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [dataView, searchQuery, versionFilter, sortField, sortDirection]);

  // Paginated rows
  const totalRows = filteredAndSortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filteredAndSortedRows.slice(startIndex, startIndex + pageSize);

  const handleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(fieldKey);
      setSortDirection('asc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!dataView || dataView.rows.length === 0) return;

    const headers = ['#', 'Submitted At', 'Version', ...dataView.columns.map((c) => c.label || c.id)];
    const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',')];

    filteredAndSortedRows.forEach((row, idx) => {
      const rowValues = [
        idx + 1,
        formatDate(row.submittedAt),
        row.versionNumber ? `v${row.versionNumber}` : '—',
        ...dataView.columns.map((c) => {
          const val = row.data[c.id];
          return val !== undefined && val !== null ? String(val) : '';
        }),
      ];
      csvRows.push(rowValues.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${form.name.replace(/\s+/g, '_')}_submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (!dataView) return;
    const jsonBlob = new Blob([JSON.stringify(filteredAndSortedRows, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${form.name.replace(/\s+/g, '_')}_submissions.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error || !dataView) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <Alert variant="error">{error || 'Failed to load form submission data'}</Alert>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={loadData}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>refresh</span>
              Try Again
            </span>
          </Button>
        </div>
      </div>
    );
  }

  // Get unique versions available in data
  const availableVersions = Array.from(
    new Set(dataView.rows.map((r) => r.versionNumber).filter(Boolean)),
  ).sort((a: any, b: any) => b - a);

  return (
    <div className="form-detail-data" id="section-data">
      {/* 1. Submissions Header & Quick Controls */}
      <div className="form-detail-data__header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h3 className="form-detail-data__title">Submissions Dataset</h3>
            <Badge variant="neutral">
              {dataView.columns.length} Total Columns
            </Badge>
          </div>
          <p className="form-detail-data__subtitle">
            Consistent historical spreadsheet of all submitted records. Empty cells represent fields that did not exist in earlier versions.
          </p>
        </div>

        {/* Export & Refresh Actions */}
        <div className="form-detail-data__actions">
          <Button
            variant="secondary"
            size="small"
            onClick={loadData}
            id="data-refresh-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>refresh</span>
              Refresh
            </span>
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={handleExportCSV}
            disabled={filteredAndSortedRows.length === 0}
            id="data-export-csv-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>download</span>
              Export CSV
            </span>
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={handleExportJSON}
            disabled={filteredAndSortedRows.length === 0}
            id="data-export-json-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>data_object</span>
              Export JSON
            </span>
          </Button>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="form-detail-data__toolbar">
        <div className="form-detail-data__search-wrap">
          <input
            type="text"
            className="form-detail-data__search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search records across all fields and metadata..."
            id="search-data-input"
          />
        </div>

        <div className="form-detail-data__filter-group">
          <label htmlFor="version-filter-select" className="form-detail-data__filter-label">
            Filter Version:
          </label>
          <select
            id="version-filter-select"
            value={versionFilter}
            onChange={(e) => {
              setVersionFilter(e.target.value);
              setPage(1);
            }}
            className="form-detail-data__filter-select"
          >
            <option value="all">All Versions</option>
            {availableVersions.map((v) => (
              <option key={v} value={String(v)}>
                v{v} Only
              </option>
            ))}
          </select>

          <label htmlFor="page-size-select" className="form-detail-data__filter-label">
            Rows per page:
          </label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="form-detail-data__filter-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* 3. Excel-like Data Table with Horizontal Scroll */}
      <div className="form-detail-data__table-wrap" id="submissions-table-scroll-container">
        <table
          className="form-detail-data__table"
          id="submissions-excel-table"
          style={{
            minWidth: `${Math.max(760, 260 + dataView.columns.length * 170)}px`,
          }}
        >
          <thead>
            <tr>
              {/* Sticky # column */}
              <th className="sticky-col-idx" style={{ width: '45px', textAlign: 'center' }}>
                #
              </th>

              {/* Sticky Submitted At column */}
              <th
                className="sticky-col-date"
                onClick={() => handleSort('submittedAt')}
                style={{ cursor: 'pointer', width: '160px' }}
                title="Click to sort by date"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Submitted At</span>
                  <span>
                    {sortField === 'submittedAt' ? (
                      <span className="material-icon" style={{ fontSize: '14px' }}>
                        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    ) : (
                      <span className="material-icon" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                        unfold_more
                      </span>
                    )}
                  </span>
                </div>
              </th>

              {/* Version column */}
              <th
                onClick={() => handleSort('versionNumber')}
                style={{ cursor: 'pointer', width: '85px', textAlign: 'center' }}
                title="Click to sort by version"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span>Ver</span>
                  <span>
                    {sortField === 'versionNumber' ? (
                      <span className="material-icon" style={{ fontSize: '14px' }}>
                        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    ) : (
                      <span className="material-icon" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                        unfold_more
                      </span>
                    )}
                  </span>
                </div>
              </th>

              {/* Form Field Columns */}
              {dataView.columns.map((col: FormDataColumnDto) => (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.id)}
                  style={{ cursor: 'pointer', minWidth: '150px' }}
                  title={`Sort by ${col.label}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{col.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {sortField === col.id ? (
                        <span className="material-icon" style={{ fontSize: '14px' }}>
                          {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </th>
              ))}

              {/* Sticky Action column */}
              <th style={{ width: '80px', textAlign: 'center' }}>
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={dataView.columns.length + 4}
                  style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}
                >
                  {dataView.rows.length === 0
                    ? 'No submissions received for this form yet. Share the live form to begin collecting data.'
                    : 'No records match the current filter or search criteria.'}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    setSelectedRecord(row);
                    setIsDetailOpen(true);
                  }}
                  className="form-detail-data__row"
                >
                  <td className="sticky-col-idx" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {startIndex + idx + 1}
                  </td>
                  <td className="sticky-col-date" style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(row.submittedAt)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Badge variant={row.versionNumber === form.deployedVersion?.versionNumber ? 'success' : 'neutral'} size="small">
                      {row.versionNumber ? `v${row.versionNumber}` : '—'}
                    </Badge>
                  </td>

                  {dataView.columns.map((col) => {
                    const val = row.data[col.id];
                    const isPopulated = val !== undefined && val !== null && val !== '';
                    return (
                      <td
                        key={col.id}
                        className={`form-detail-data__cell ${!isPopulated ? 'cell-empty' : ''}`}
                        title={isPopulated ? String(val) : 'Field did not exist in this version'}
                      >
                        {isPopulated ? (
                          typeof val === 'boolean' ? (
                            <Badge variant={val ? 'success' : 'neutral'} size="small">
                              {val ? 'Yes' : 'No'}
                            </Badge>
                          ) : (
                            String(val)
                          )
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                    );
                  })}

                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="form-detail-data__view-btn"
                      onClick={() => {
                        setSelectedRecord(row);
                        setIsDetailOpen(true);
                      }}
                      id={`view-record-btn-${row.id}`}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Pagination Footer */}
      <div className="form-detail-data__pagination-bar">
        <div className="form-detail-data__pagination-info">
          Showing <strong>{totalRows === 0 ? 0 : startIndex + 1}</strong> to{' '}
          <strong>{Math.min(startIndex + pageSize, totalRows)}</strong> of{' '}
          <strong>{totalRows}</strong> records (Total: {dataView.totalCount})
        </div>

        <div className="form-detail-data__pagination-controls">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            id="pagination-prev-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-icon" style={{ fontSize: '14px' }}>arrow_back</span>
              Previous
            </span>
          </Button>

          <span className="form-detail-data__page-indicator">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="secondary"
            size="small"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            id="pagination-next-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Next
              <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
            </span>
          </Button>
        </div>
      </div>

      {/* 5. Record Detail Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedRecord ? `Submission Record Details` : 'Record Details'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="primary" onClick={() => setIsDetailOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        {selectedRecord && (
          <div className="form-detail-data__modal-content">
            {/* Metadata pills */}
            <div className="form-detail-data__modal-meta">
              <div className="form-detail-data__modal-meta-item">
                <span className="label">Submission ID:</span>
                <code>{selectedRecord.id}</code>
              </div>
              <div className="form-detail-data__modal-meta-item">
                <span className="label">Submitted At:</span>
                <strong>{formatDate(selectedRecord.submittedAt)}</strong>
              </div>
              <div className="form-detail-data__modal-meta-item">
                <span className="label">Form Version:</span>
                <Badge variant="info">
                  {selectedRecord.versionNumber ? `Version ${selectedRecord.versionNumber}` : 'Legacy'}
                </Badge>
              </div>
            </div>

            {/* Field values table */}
            <h4 style={{ margin: 'var(--space-4) 0 var(--space-2)', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Submitted Fields
            </h4>
            <div className="form-detail-data__modal-fields-table">
              {dataView.columns.map((col) => {
                const val = selectedRecord.data[col.id];
                const isPopulated = val !== undefined && val !== null && val !== '';
                return (
                  <div key={col.id} className="form-detail-data__modal-field-row">
                    <div className="form-detail-data__modal-field-label">
                      <span>{col.label}</span>
                    </div>
                    <div className="form-detail-data__modal-field-value">
                      {isPopulated ? (
                        typeof val === 'boolean' ? (
                          <Badge variant={val ? 'success' : 'neutral'}>
                            {val ? 'True / Yes' : 'False / No'}
                          </Badge>
                        ) : (
                          <span style={{ wordBreak: 'break-word' }}>{String(val)}</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          (empty / not provided)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
