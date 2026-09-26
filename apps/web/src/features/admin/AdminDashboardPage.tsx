import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { DashboardStats } from '@saas/shared';
import {
  PageHeader,
  ContentContainer,
  StatCard,
  Alert,
  Skeleton,
} from '../../components';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const data = await adminService.getStats();
        if (isMounted) {
          setStats(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load dashboard statistics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ContentContainer>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of platform users and metrics"
      />

      {error && (
        <Alert variant="error" id="dashboard-error-alert">
          {error}
        </Alert>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          <Skeleton height={140} />
          <Skeleton height={140} />
          <Skeleton height={140} />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Main Total Users Card as required */}
          <div id="total-users-card">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              icon="group"
              description="All registered platform accounts"
            />
          </div>

          <div id="active-users-card">
            <StatCard
              title="Active Users"
              value={stats?.activeUsers ?? 0}
              icon="check_circle"
              description="Users with active session access"
            />
          </div>

          <div id="suspended-users-card">
            <StatCard
              title="Suspended Users"
              value={stats?.suspendedUsers ?? 0}
              icon="block"
              description="Accounts restricted from logging in"
            />
          </div>
        </div>
      )}
    </ContentContainer>
  );
};
