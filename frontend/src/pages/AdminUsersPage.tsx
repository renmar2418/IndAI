import { useState, useEffect } from "react";
import apiService from "../services/api";
import { useToast } from "../components/ToastProvider";
import type { User } from "../types";
import ConfirmationModal from "../components/ConfirmationModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<"user" | "admin">("user");
  const [isAdding, setIsAdding] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger"
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAdminUsers(page, searchQuery);
      setUsers(res.users);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error("Failed to load users:", err);
      showToast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, page]);

  const handleRoleChange = async (userId: number, newRole: "user" | "admin") => {
    try {
      await apiService.updateUserRole(userId, newRole);
      showToast(`User role updated to ${newRole}`, "success");
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to update user role";
      showToast(msg, "error");
      fetchUsers(); // Revert UI
    }
  };

  const handleDeleteUser = (userId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: "Are you sure you want to completely delete this user and all their scans? This cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        try {
          await apiService.deleteUser(userId);
          showToast("User deleted successfully", "success");
          fetchUsers(); 
        } catch (err: any) {
          const msg = err.response?.data?.error || "Failed to delete user";
          showToast(msg, "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) {
      showToast("Email is required", "error");
      return;
    }

    setIsAdding(true);
    try {
      await apiService.createAdminUser({ email: addEmail, display_name: addName, role: addRole });
      showToast("User created successfully", "success");
      setShowAddModal(false);
      setAddEmail("");
      setAddName("");
      setAddRole("user");
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to create user";
      showToast(msg, "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleImpersonate = (user: User) => {
    setConfirmModal({
      isOpen: true,
      title: "Impersonate User",
      message: `Are you sure you want to impersonate ${user.display_name || user.email}? You will be redirected to their dashboard.`,
      type: "info",
      onConfirm: async () => {
        try {
          const res = await apiService.impersonateUser(user.id);
          sessionStorage.setItem("indai_admin_token", localStorage.getItem("indai_token") || "");
          localStorage.setItem("indai_token", res.token);
          localStorage.setItem("indai_user", JSON.stringify(res.user));
          showToast(`Now impersonating ${res.user.email}`, "success");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1000);
        } catch (err: any) {
          const msg = err.response?.data?.error || "Failed to impersonate user";
          showToast(msg, "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div style={{ padding: 'var(--space-xl)' }}>
      <div style={{ width: '100%', maxWidth: '1800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--admin-text-primary)' }}>User Management</h1>
            <p style={{ color: 'var(--admin-text-secondary)', marginTop: '8px' }}>View, promote, and manage user accounts securely.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ 
              background: 'var(--admin-accent-primary)', color: '#fff', border: 'none', 
              padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(13, 110, 253, 0.2)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add User
          </button>
        </div>

        {/* Users Table */}
        <div style={{ background: 'var(--admin-bg-card)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--admin-text-primary)' }}>Directory</h2>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'var(--admin-bg-hover)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  color: 'var(--admin-text-primary)',
                  fontSize: '0.9rem',
                  width: '300px'
                }}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>User</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Joined</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Scans</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center' }}>
                      <div className="scan-spinner" style={{ width: 24, height: 24, borderWidth: 2, borderColor: 'var(--admin-accent-primary)', borderTopColor: 'transparent', margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--admin-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                            {u.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--admin-text-primary)' }}>{u.display_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <select 
                        value={u.role} 
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        style={{
                          background: u.role === 'admin' ? 'rgba(13, 110, 253, 0.1)' : 'var(--admin-bg-hover)',
                          color: u.role === 'admin' ? 'var(--admin-accent-primary)' : 'var(--admin-text-secondary)',
                          border: u.role === 'admin' ? '1px solid rgba(13, 110, 253, 0.3)' : '1px solid rgba(0,0,0,0.1)',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>
                      {(u as any).scan_count || 0}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => handleImpersonate(u)}
                            title="Login As User"
                            style={{
                              background: 'rgba(13, 110, 253, 0.1)',
                              border: 'none',
                              color: 'var(--admin-accent-primary)',
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'var(--admin-accent-primary)';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(13, 110, 253, 0.1)';
                              e.currentTarget.style.color = 'var(--admin-accent-primary)';
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          title="Delete User"
                          style={{
                            background: 'rgba(220, 53, 69, 0.1)',
                            border: 'none',
                            color: 'var(--admin-severity-danger)',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--admin-severity-danger)';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
                            e.currentTarget.style.color = 'var(--admin-severity-danger)';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--admin-text-secondary)' }}>
                      No users found matching "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>
              Showing Page {page} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ 
                  padding: '6px 12px', background: 'var(--admin-bg-hover)', color: 'var(--admin-text-primary)', 
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 
                }}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ 
                  padding: '6px 12px', background: 'var(--admin-bg-hover)', color: 'var(--admin-text-primary)', 
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => !isAdding && setShowAddModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px', backgroundColor: 'var(--admin-bg-card)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>Add New User</h2>
              <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--admin-text-secondary)' }}>Create a user or admin account.</p>
            </div>
            <form onSubmit={handleAddUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Email Address *</label>
                <input 
                  type="email" 
                  value={addEmail} 
                  onChange={e => setAddEmail(e.target.value)} 
                  required
                  placeholder="user@example.com"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--admin-bg-hover)', color: 'var(--admin-text-primary)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Display Name (Optional)</label>
                <input 
                  type="text" 
                  value={addName} 
                  onChange={e => setAddName(e.target.value)} 
                  placeholder="John Doe"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--admin-bg-hover)', color: 'var(--admin-text-primary)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '8px' }}>Role</label>
                <select 
                  value={addRole} 
                  onChange={e => setAddRole(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--admin-bg-hover)', color: 'var(--admin-text-primary)', fontSize: '0.95rem', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} disabled={isAdding} style={{ flex: 1, padding: '12px', background: 'var(--admin-bg-hover)', color: 'var(--admin-text-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isAdding} style={{ flex: 1, padding: '12px', background: 'var(--admin-accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: isAdding ? 0.7 : 1 }}>{isAdding ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
