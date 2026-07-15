import React, { useState, useEffect } from 'react';
import { 
  User, Plus, Edit2, Trash2, ShieldAlert, Check, X, 
  UserCheck, UserX, Key, UserPlus, RefreshCw, CheckCircle, MapPin
} from 'lucide-react';
import { SyncConfig, User as UserType } from '../types';
import { fetchUsers, createUser, updateUser, deleteUser } from '../utils/crmApi';

interface UserManagementProps {
  config: SyncConfig;
  currentUser: UserType;
}

export default function UserManagement({ config, currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [fullName, setFullName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Staff'>('Staff');
  const [status, setStatus] = useState<'Active' | 'Disabled'>('Active');

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchUsers(config);
      setUsers(data);
    } catch (err: any) {
      setError('Failed to fetch users. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [config]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFullName('');
    setLoginId('');
    setPassword('');
    setRole('Staff');
    setStatus('Active');
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: UserType) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setLoginId(user.loginId);
    setPassword(''); // Leave blank for no change
    setRole(user.role);
    setStatus(user.status);
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim() || !loginId.trim()) {
      setError('Full Name and Login ID are required.');
      return;
    }

    if (!editingUser && !password.trim()) {
      setError('Password is required for new users.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingUser) {
        // Update user
        const res = await updateUser(config, editingUser.id, fullName, loginId, password || undefined, role, status);
        if (res.success) {
          setSuccess(`User "${fullName}" updated successfully.`);
          setIsFormOpen(false);
          loadUsers();
        } else {
          setError(res.error || 'Failed to update user.');
        }
      } else {
        // Create user
        const res = await createUser(config, fullName, loginId, password, role, status);
        if (res.success) {
          setSuccess(`User "${fullName}" created successfully.`);
          setIsFormOpen(false);
          loadUsers();
        } else {
          setError(res.error || 'Failed to create user.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser.id) {
      setError('You cannot delete your own active administrator session.');
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to delete user "${name}"? This will irreversibly remove their access.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await deleteUser(config, id);
      if (res.success) {
        setSuccess(`User "${name}" deleted successfully.`);
        loadUsers();
      } else {
        setError(res.error || 'Failed to delete user.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-350" id="user-management-panel">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" /> User &amp; Credentials Directory
          </h1>
          <p className="text-xs text-slate-500">
            Manage agency staff, roles, status and dashboard accessibility permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> Add New User
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
          <CheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid View */}
      {isLoading && users.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-semibold animate-pulse">Loading credential indexes...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Login ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No user records located. Tap "Add New User" to register.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">{u.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{u.fullName} {u.id === currentUser.id && <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold py-0.5 px-1.5 rounded ml-1">You</span>}</td>
                      <td className="py-3 px-4 font-medium text-slate-600 font-mono">{u.loginId}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          u.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-semibold ${
                          u.status === 'Active' ? 'text-emerald-700' : 'text-slate-400'
                        }`}>
                          {u.status === 'Active' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-all inline-flex items-center"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.fullName)}
                          disabled={u.id === currentUser.id}
                          className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-100 transition-all disabled:opacity-40 inline-flex items-center"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex justify-between items-center">
              <h3 className="font-semibold text-sm">
                {editingUser ? `Edit User Credentials: ${editingUser.fullName}` : 'Create New User Credentials'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-white/80 hover:text-white font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Salim Rahman"
                  required
                />
              </div>

              {/* Login ID */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Login ID</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. salim_bd"
                  required
                  disabled={!!editingUser} // Prevent loginId edit to maintain link
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-700">
                    {editingUser ? 'New Password (Optional)' : 'Password'}
                  </label>
                  {editingUser && <span className="text-[10px] text-slate-400">Leave blank to keep unchanged</span>}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder={editingUser ? 'Enter new password if resetting' : 'At least 4 characters'}
                  required={!editingUser}
                />
              </div>

              {/* Grid Role & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">User Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Account Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    disabled={editingUser?.id === currentUser.id} // Cannot disable yourself
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  {isLoading ? 'Processing...' : editingUser ? 'Update Credentials' : 'Create Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
