import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FormDataViewDto } from '@saas/shared';
import { formsService } from '../../services/forms.service';
import {
  ContentContainer,
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Spinner,
  Alert,
} from '../../components';

export const FormDataPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dataView, setDataView] = useState<FormDataViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await formsService.getDataView(id);
      setDataView(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <ContentContainer>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
          <Spinner size="large" />
        </div>
      </ContentContainer>
    );
  }

  if (error || !dataView) {
    return (
      <ContentContainer>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert variant="error">
            {error || 'Failed to load form submission data'}
          </Alert>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/forms/${id}`)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icon" style={{ fontSize: '18px' }}>arrow_back</span>
            Back to Form Editor
          </span>
        </Button>
      </ContentContainer>
    );
  }

  // Filter rows by search query
  const filteredRows = dataView.rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.submittedAt.toLowerCase().includes(q) ||
      (row.versionNumber !== undefined && `v${row.versionNumber}`.includes(q)) ||
      Object.values(row.data).some((val) =>
        String(val ?? '').toLowerCase().includes(q),
      )
    );
  });

  return (
    <ContentContainer size="wide">
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Button
            variant="ghost"
            size="small"
            onClick={() => navigate(`/forms/${id}`)}
            id="back-to-editor-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>arrow_back</span>
              Back to Editor
            </span>
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <h1
                style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  margin: 0,
                  color: 'var(--color-text-primary)',
                }}
                id="form-data-title"
              >
                {dataView.formName}
              </h1>
              <Badge variant="info">Submissions Data</Badge>
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Single shared dataset containing {dataView.totalCount} total submissions across all versions
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="small" onClick={loadData} id="refresh-data-btn">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>refresh</span>
              Refresh
            </span>
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => navigate(`/forms/${id}`)}
            id="open-editor-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>edit</span>
              Edit Form
            </span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span>Excel-Like Submissions Table</span>
              <Badge variant="neutral" size="small">
                {dataView.columns.length} Total Historical Columns
              </Badge>
            </div>
          }
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search submissions..."
                id="search-submissions-input"
                style={{
                  padding: 'var(--space-1) var(--space-3)',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  minWidth: '200px',
                }}
              />
            </div>
          }
        />

        <CardContent style={{ padding: 0 }}>
          {/* Historical Column Preservation Notice */}
          <div
            style={{
              padding: 'var(--space-2) var(--space-4)',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderBottom: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              ℹ️ Columns represent all fields ever defined across any draft/deployed version. Empty cells indicate the field did not exist when that submission was collected.
            </span>
            <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
              Showing {filteredRows.length} of {dataView.totalCount} rows
            </span>
          </div>

          {/* Excel-like Data Table Container with Horizontal Scroll */}
          <div
            style={{
              width: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
            id="submissions-table-scroll-container"
          >
            <table
              id="submissions-excel-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 'var(--font-size-sm)',
                minWidth: `${Math.max(700, 260 + dataView.columns.length * 180)}px`,
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderBottom: '2px solid var(--color-border)',
                  }}
                >
                  {/* Row index column */}
                  <th
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      width: '50px',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-muted)',
                      textAlign: 'center',
                      borderRight: '1px solid var(--color-border)',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'var(--color-bg-tertiary)',
                      zIndex: 2,
                    }}
                  >
                    #
                  </th>

                  {/* Submission Timestamp */}
                  <th
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      width: '180px',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRight: '1px solid var(--color-border)',
                    }}
                  >
                    Submitted At
                  </th>

                  {/* Version Column */}
                  <th
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      width: '90px',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRight: '1px solid var(--color-border)',
                      textAlign: 'center',
                    }}
                  >
                    Version
                  </th>

                  {/* Dynamic Form Field Columns */}
                  {dataView.columns.map((col) => (
                    <th
                      key={col.id}
                      id={`col-header-${col.id}`}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                        borderRight: '1px solid var(--color-border)',
                        whiteSpace: 'nowrap',
                        minWidth: '160px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 'var(--font-weight-bold)' }}>{col.label}</span>
                        <Badge variant="neutral" size="small">
                          {col.type}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + dataView.columns.length}
                      style={{
                        padding: 'var(--space-12) var(--space-4)',
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {dataView.totalCount === 0
                        ? 'No submissions received yet. Once users submit the public form, their data will appear here in this single shared list.'
                        : 'No submissions match your search query.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      id={`data-row-${row.id}`}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background-color var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Row Index */}
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'center',
                          color: 'var(--color-text-muted)',
                          fontSize: 'var(--font-size-xs)',
                          borderRight: '1px solid var(--color-border)',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'var(--color-bg-secondary)',
                          zIndex: 1,
                        }}
                      >
                        {rowIndex + 1}
                      </td>

                      {/* Submitted At */}
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          borderRight: '1px solid var(--color-border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(row.submittedAt).toLocaleString()}
                      </td>

                      {/* Version Badge */}
                      <td
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'center',
                          borderRight: '1px solid var(--color-border)',
                        }}
                      >
                        {row.versionNumber !== undefined ? (
                          <Badge variant="neutral" size="small">
                            v{row.versionNumber}
                          </Badge>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                        )}
                      </td>

                      {/* Every Form Field Column */}
                      {dataView.columns.map((col) => {
                        const cellVal = row.data[col.id];
                        const isEmpty =
                          cellVal === undefined || cellVal === null || cellVal === '';

                        return (
                          <td
                            key={col.id}
                            id={`cell-${row.id}-${col.id}`}
                            style={{
                              padding: 'var(--space-3) var(--space-4)',
                              color: isEmpty
                                ? 'var(--color-text-muted)'
                                : 'var(--color-text-primary)',
                              borderRight: '1px solid var(--color-border)',
                              verticalAlign: 'top',
                            }}
                          >
                            {isEmpty ? (
                              <span
                                style={{
                                  fontSize: 'var(--font-size-xs)',
                                  color: 'var(--color-text-muted)',
                                  fontStyle: 'italic',
                                }}
                              >
                                (empty)
                              </span>
                            ) : typeof cellVal === 'boolean' ? (
                              cellVal ? (
                                <Badge variant="success" size="small">
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="neutral" size="small">
                                  No
                                </Badge>
                              )
                            ) : (
                              String(cellVal)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ContentContainer>
  );
};
