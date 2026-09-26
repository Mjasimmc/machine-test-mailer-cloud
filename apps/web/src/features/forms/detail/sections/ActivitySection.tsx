import React, { useState, useMemo } from 'react';
import { FormActivityDto, FormDto } from '@saas/shared';
import { Badge } from '../../../../components';

interface ActivitySectionProps {
  form: FormDto;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({ form }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const activities: FormActivityDto[] = form.activities || [];

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'form_created':
        return <span className="material-icon" style={{ fontSize: '18px' }}>add_circle</span>;
      case 'version_created':
        return <span className="material-icon" style={{ fontSize: '18px' }}>history</span>;
      case 'version_deployed':
        return <span className="material-icon" style={{ fontSize: '18px' }}>rocket_launch</span>;
      case 'submission_received':
        return <span className="material-icon" style={{ fontSize: '18px' }}>inbox</span>;
      case 'settings_updated':
        return <span className="material-icon" style={{ fontSize: '18px' }}>settings</span>;
      case 'field_updated':
        return <span className="material-icon" style={{ fontSize: '18px' }}>edit</span>;
      default:
        return <span className="material-icon" style={{ fontSize: '18px' }}>push_pin</span>;
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'version_deployed':
        return <Badge variant="success" size="small">DEPLOYMENT</Badge>;
      case 'version_created':
        return <Badge variant="info" size="small">VERSION</Badge>;
      case 'submission_received':
        return <Badge variant="info" size="small">SUBMISSION</Badge>;
      case 'settings_updated':
        return <Badge variant="warning" size="small">SETTINGS</Badge>;
      case 'form_created':
        return <Badge variant="neutral" size="small">CREATION</Badge>;
      default:
        return <Badge variant="neutral" size="small">EVENT</Badge>;
    }
  };

  const filteredActivities = useMemo(() => {
    if (filterType === 'all') return activities;
    return activities.filter((a) => {
      if (filterType === 'deployment') return a.type === 'version_deployed';
      if (filterType === 'version') return a.type === 'version_created';
      if (filterType === 'submission') return a.type === 'submission_received';
      if (filterType === 'settings') return a.type === 'settings_updated';
      return true;
    });
  }, [activities, filterType]);

  return (
    <div className="form-detail-activity" id="section-activity">
      {/* 1. Header with Filters */}
      <div className="form-detail-activity__header">
        <div>
          <h3 className="form-detail-activity__title">Activity & Audit Timeline</h3>
          <p className="form-detail-activity__subtitle">
            Immutable timeline of form modifications, drafts, deployments, submissions, and settings changes.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="form-detail-activity__filter-pills">
          <button
            type="button"
            className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All Events ({activities.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'deployment' ? 'active' : ''}`}
            onClick={() => setFilterType('deployment')}
          >
            Deployments
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'version' ? 'active' : ''}`}
            onClick={() => setFilterType('version')}
          >
            Versions
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'submission' ? 'active' : ''}`}
            onClick={() => setFilterType('submission')}
          >
            Submissions
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'settings' ? 'active' : ''}`}
            onClick={() => setFilterType('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      {/* 2. Timeline View */}
      {filteredActivities.length === 0 ? (
        <div className="form-detail-activity__empty">
          <span className="material-icon" style={{ fontSize: '36px', color: 'var(--color-text-muted)' }}>
            event_busy
          </span>
          <h4>No activities found</h4>
          <p>No logged events match the selected category filter.</p>
        </div>
      ) : (
        <div className="form-detail-activity__timeline">
          {filteredActivities.map((item, index) => (
            <div key={item.id || index} className="form-detail-activity__item">
              {/* Timeline Connector Line & Icon Node */}
              <div className="form-detail-activity__node">
                <div className="form-detail-activity__node-icon">
                  {getActivityIcon(item.type)}
                </div>
                {index < filteredActivities.length - 1 && (
                  <div className="form-detail-activity__line" />
                )}
              </div>

              {/* Activity Card */}
              <div className="form-detail-activity__content-card">
                <div className="form-detail-activity__card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="form-detail-activity__item-title">{item.title}</span>
                    {getActivityBadge(item.type)}
                  </div>
                  <span className="form-detail-activity__item-time">
                    {formatDate(item.timestamp)}
                  </span>
                </div>

                <div className="form-detail-activity__item-desc">
                  {item.description}
                </div>

                {item.versionNumber && (
                  <div className="form-detail-activity__item-submeta">
                    Target: <code>Version {item.versionNumber}</code>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
