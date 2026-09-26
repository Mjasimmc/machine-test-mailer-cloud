import React, { useEffect, useState, useMemo } from 'react';
import { adminService } from '../../services/admin.service';
import { Role, UserDto, UserStatus } from '@saas/shared';
import {
  PageHeader,
  ContentContainer,
  Input,
  DataTable,
  Column,
  UserStatusBadge,
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  Alert,
} from '../../components';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suspension confirmation state
  const [userToSuspend, setUserToSuspend] = useState<UserDto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // User details modal state
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);

  const fetchUsers = async (query = '') => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getUsers(query);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle Confirm Suspend
  const handleConfirmSuspend = async () => {
    if (!userToSuspend) return;
    setIsProcessing(true);
    try {
      const updated = await adminService.suspendUser(userToSuspend.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setUserToSuspend(null);
    } catch (err: any) {
      setError(err.message || 'Failed to suspend user');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Unsuspend
  const handleUnsuspend = async (user: UserDto) => {
    try {
      const updated = await adminService.unsuspendUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: any) {
      setError(err.message || 'Failed to unsuspend user');
    }
  };

  const columns: Column<UserDto>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (user: UserDto) => {
          const isAdmin = user.role === Role.ADMIN;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setSelectedUser(user)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-primary)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                }}
                title="Click to view details"
              >
                {user.name}
              </button>
              {isAdmin && (
                <Badge variant="info" size="small">
                  Admin
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'email',
        header: 'Email',
        render: (user: UserDto) => (
          <span style={{ color: 'var(--color-text-secondary)' }}>{user.email}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (user: UserDto) => (
          <span id={`status-badge-${user.id}`}>
            <UserStatusBadge status={user.status} />
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (user: UserDto) => {
          const createdDate = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—';
          return <span style={{ color: 'var(--color-text-muted)' }}>{createdDate}</span>;
        },
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (user: UserDto) => {
          const isAdmin = user.role === Role.ADMIN;
          const isUserActive = user.status === UserStatus.ACTIVE;

          return (
            <div style={{ display: 'inline-flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setSelectedUser(user)}
              >
                View
              </Button>
              {!isAdmin && (
                <>
                  {isUserActive ? (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => setUserToSuspend(user)}
                      id={`suspend-btn-${user.id}`}
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleUnsuspend(user)}
                      id={`unsuspend-btn-${user.id}`}
                    >
                      Unsuspend
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <ContentContainer>
      <PageHeader
        title="Users"
        description="Manage registered users and account access"
      />

      {error && (
        <Alert variant="error" id="users-error-alert">
          {error}
        </Alert>
      )}

      <div style={{ maxWidth: '400px', marginBottom: 'var(--space-4)' }}>
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="search-users-input"
        />
      </div>

      <div id="users-table">
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          isLoading={loading && users.length === 0}
          emptyMessage="No users found"
        />
      </div>

      {/* Suspension Confirmation Dialog */}
      {userToSuspend && (
        <div id="suspend-modal">
          <ConfirmDialog
            isOpen={!!userToSuspend}
            onClose={() => setUserToSuspend(null)}
            onConfirm={handleConfirmSuspend}
            title="Suspend Account"
            confirmLabel={isProcessing ? 'Suspending...' : 'Yes, Suspend Account'}
            cancelLabel="Cancel"
            confirmVariant="danger"
            isLoading={isProcessing}
            message={
              <>
                Are you sure you want to suspend <strong>{userToSuspend.name}</strong> (
                {userToSuspend.email})?
                <br />
                <br />
                Their active session will be terminated <strong>immediately</strong> via real-time
                notification, and they will be redirected to the account suspended page.
              </>
            }
          />
        </div>
      )}

      {/* User Details Dialog */}
      {selectedUser && (
        <div id="user-details-modal">
          <Dialog
            isOpen={!!selectedUser}
            onClose={() => setSelectedUser(null)}
            title="User Details"
            footer={
              <Button
                variant="secondary"
                onClick={() => setSelectedUser(null)}
                id="close-details-btn"
              >
                Close
              </Button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label className="form-label">User ID</label>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                  {selectedUser.id}
                </div>
              </div>
              <div>
                <label className="form-label">Name</label>
                <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{selectedUser.name}</div>
              </div>
              <div>
                <label className="form-label">Email</label>
                <div style={{ color: 'var(--color-text-secondary)' }}>{selectedUser.email}</div>
              </div>
              <div>
                <label className="form-label">Role</label>
                <div>
                  <Badge variant={selectedUser.role === Role.ADMIN ? 'info' : 'neutral'}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="form-label">Status</label>
                <div>
                  <UserStatusBadge status={selectedUser.status} />
                </div>
              </div>
              <div>
                <label className="form-label">Created At</label>
                <div style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </Dialog>
        </div>
      )}
    </ContentContainer>
  );
};
