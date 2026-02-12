import React, { useState, useEffect } from 'react';
import {
  getUsers,
  deleteUser,
  resetUserPasskeys,
  getServices,
  updateService,
  deleteService,
  getInvites,
  createInvite,
  deleteInvite,
} from '../api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  credentialCount: number;
  createdAt: string;
}

interface Service {
  id: string;
  slug: string;
  displayName: string | null;
  iconUrl: string | null;
}

interface Invite {
  id: string;
  token: string;
  createdAt: string;
  usedAt: string | null;
  createdByUser?: { email: string };
  usedByUser?: { email: string } | null;
}

type TabType = 'users' | 'services' | 'invites';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#666',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
  },
  activeTab: {
    color: '#333',
    borderBottomColor: '#333',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '500',
    marginBottom: '0.25rem',
  },
  cardMeta: {
    color: '#666',
    fontSize: '0.875rem',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  button: {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  primaryButton: {
    background: '#333',
    color: '#fff',
  },
  dangerButton: {
    background: '#d32f2f',
    color: '#fff',
  },
  secondaryButton: {
    background: '#e0e0e0',
    color: '#333',
  },
  error: {
    color: '#d32f2f',
    background: '#ffebee',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  success: {
    color: '#2e7d32',
    background: '#e8f5e9',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: '#666',
    background: '#fff',
    borderRadius: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
    marginLeft: '0.5rem',
  },
  adminBadge: {
    background: '#e3f2fd',
    color: '#1565c0',
  },
  usedBadge: {
    background: '#e8f5e9',
    color: '#2e7d32',
  },
  inviteUrl: {
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    padding: '0.5rem',
    background: '#f5f5f5',
    borderRadius: '4px',
    marginTop: '0.5rem',
    wordBreak: 'break-all' as const,
  },
  editForm: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.875rem',
    flex: 1,
  },
};

export function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, servicesData, invitesData] = await Promise.all([
        getUsers(),
        getServices(),
        getInvites(),
      ]);
      setUsers(usersData.users);
      setServices(servicesData.services);
      setInvites(invitesData.invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}?`)) return;
    try {
      await deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      setSuccess(`User ${email} deleted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleResetPasskeys = async (id: string, email: string) => {
    if (!confirm(`Reset passkeys for ${email}? They will need to register a new passkey.`)) return;
    try {
      await resetUserPasskeys(id);
      setUsers(users.map((u) => (u.id === id ? { ...u, credentialCount: 0 } : u)));
      setSuccess(`Passkeys reset for ${email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset passkeys');
    }
  };

  const handleUpdateService = async (slug: string) => {
    try {
      await updateService(slug, { displayName: editValue });
      setServices(
        services.map((s) => (s.slug === slug ? { ...s, displayName: editValue } : s))
      );
      setEditingService(null);
      setSuccess('Service updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service');
    }
  };

  const handleDeleteService = async (slug: string) => {
    if (!confirm(`Delete service ${slug} and all its links?`)) return;
    try {
      await deleteService(slug);
      setServices(services.filter((s) => s.slug !== slug));
      setSuccess(`Service ${slug} deleted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  const handleCreateInvite = async () => {
    try {
      const { invite } = await createInvite();
      setInvites([invite, ...invites]);
      setSuccess('Invite created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Delete this invite?')) return;
    try {
      await deleteInvite(id);
      setInvites(invites.filter((i) => i.id !== id));
      setSuccess('Invite deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invite');
    }
  };

  const copyInviteUrl = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setSuccess('Invite URL copied to clipboard');
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Admin Panel</h1>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.tabs}>
        {(['users', 'services', 'invites'] as TabType[]).map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div>
          {users.length === 0 ? (
            <div style={styles.empty}>No users yet</div>
          ) : (
            users.map((user) => (
              <div key={user.id} style={styles.card}>
                <div style={styles.cardInfo}>
                  <div style={styles.cardTitle}>
                    {user.email}
                    {user.isAdmin && (
                      <span style={{ ...styles.badge, ...styles.adminBadge }}>Admin</span>
                    )}
                  </div>
                  <div style={styles.cardMeta}>
                    {user.credentialCount} passkey(s) · Joined{' '}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={styles.cardActions}>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={() => handleResetPasskeys(user.id, user.email)}
                  >
                    Reset Passkeys
                  </button>
                  {!user.isAdmin && (
                    <button
                      style={{ ...styles.button, ...styles.dangerButton }}
                      onClick={() => handleDeleteUser(user.id, user.email)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'services' && (
        <div>
          {services.length === 0 ? (
            <div style={styles.empty}>No services yet</div>
          ) : (
            services.map((service) => (
              <div key={service.id} style={styles.card}>
                <div style={styles.cardInfo}>
                  <div style={styles.cardTitle}>
                    {service.displayName || service.slug}
                  </div>
                  <div style={styles.cardMeta}>Slug: {service.slug}</div>
                  {editingService === service.slug && (
                    <div style={styles.editForm}>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Display name"
                        style={styles.input}
                      />
                      <button
                        style={{ ...styles.button, ...styles.primaryButton }}
                        onClick={() => handleUpdateService(service.slug)}
                      >
                        Save
                      </button>
                      <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={() => setEditingService(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div style={styles.cardActions}>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={() => {
                      setEditingService(service.slug);
                      setEditValue(service.displayName || '');
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.dangerButton }}
                    onClick={() => handleDeleteService(service.slug)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleCreateInvite}
            >
              Create Invite
            </button>
          </div>

          {invites.length === 0 ? (
            <div style={styles.empty}>No invites yet</div>
          ) : (
            invites.map((invite) => (
              <div key={invite.id} style={styles.card}>
                <div style={styles.cardInfo}>
                  <div style={styles.cardTitle}>
                    Invite
                    {invite.usedAt && (
                      <span style={{ ...styles.badge, ...styles.usedBadge }}>Used</span>
                    )}
                  </div>
                  <div style={styles.cardMeta}>
                    Created {new Date(invite.createdAt).toLocaleDateString()}
                    {invite.createdByUser && ` by ${invite.createdByUser.email}`}
                    {invite.usedByUser && ` · Used by ${invite.usedByUser.email}`}
                  </div>
                  {!invite.usedAt && (
                    <div style={styles.inviteUrl}>
                      {window.location.origin}/invite/{invite.token}
                    </div>
                  )}
                </div>
                <div style={styles.cardActions}>
                  {!invite.usedAt && (
                    <button
                      style={{ ...styles.button, ...styles.secondaryButton }}
                      onClick={() => copyInviteUrl(invite.token)}
                    >
                      Copy URL
                    </button>
                  )}
                  <button
                    style={{ ...styles.button, ...styles.dangerButton }}
                    onClick={() => handleDeleteInvite(invite.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
