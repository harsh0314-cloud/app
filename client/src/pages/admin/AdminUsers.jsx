import { useEffect, useState } from 'react';
import api from '../../services/api';
import { UserPlus, Search, Shield, X, KeyRound, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { roleLabel } from '../../lib/permissions';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'SUPPORT', 'USER'];

export default function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [staffOnly, setStaffOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [matrix, setMatrix] = useState({ rolePermissions: {} });

  useEffect(() => { fetch(1); api.get('/admin/users/roles').then((r) => setMatrix(r.data)).catch(() => {}); }, [staffOnly, roleFilter]);

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (staffOnly) params.set('staff', 'true');
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (e) { toast.error(e.message || 'Failed to load users'); }
    finally { setLoading(false); }
  };

  const onDelete = async (u) => {
    if (!confirm(`Delete/deactivate ${u.email}?`)) return;
    try { await api.delete(`/admin/users/${u.id}`); toast.success('Done'); fetch(pagination.page); }
    catch (e) { toast.error(e.message || 'Delete failed'); }
  };

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team &amp; Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage staff accounts, roles and permissions.</p>
        </div>
        <button onClick={() => setCreating(true)} data-testid="user-add-btn" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-white text-sm hover:opacity-90">
          <UserPlus size={14}/> New user
        </button>
      </div>

      <div className="border border-border rounded-xl bg-white dark:bg-gray-800 p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetch(1)}
            placeholder="Search email or name…" data-testid="user-search-input"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} data-testid="user-role-filter" className="px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={staffOnly} onChange={(e) => setStaffOnly(e.target.checked)} data-testid="user-staff-only-toggle"/>
          Staff only
        </label>
        <button onClick={() => fetch(1)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Apply</button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Orders</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>}
              {users.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.id}`} className="border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                      <Shield size={10}/> {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{u._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => setEditing(u)} data-testid={`user-edit-${u.id}`} className="px-2 py-1 text-xs rounded border border-border hover:bg-gray-50 dark:hover:bg-gray-700">Edit</button>
                      <button onClick={() => setResetting(u)} data-testid={`user-reset-${u.id}`} className="px-2 py-1 text-xs rounded border border-border hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1"><KeyRound size={12}/> Reset</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => onDelete(u)} data-testid={`user-delete-${u.id}`} className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={12}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
          <span>{pagination.total.toLocaleString()} users</span>
          <div className="flex items-center gap-2">
            <button disabled={pagination.page <= 1} onClick={() => fetch(pagination.page - 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Prev</button>
            <span>Page {pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetch(pagination.page + 1)} className="px-2 py-1 border border-border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* Permission matrix (read-only) */}
      <div className="border border-border rounded-xl bg-white dark:bg-gray-800 p-4">
        <h2 className="text-sm font-semibold mb-3">Role permission matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr><th className="text-left px-2 py-1">Role</th><th className="text-left px-2 py-1">Permissions</th></tr>
            </thead>
            <tbody>
              {Object.entries(matrix.rolePermissions || {}).map(([role, perms]) => (
                <tr key={role} className="border-t border-border">
                  <td className="px-2 py-2 font-semibold">{roleLabel(role)}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {perms.includes('*') ? <em>All permissions</em> : perms.join(', ') || <em>None</em>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && <UserFormModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); fetch(pagination.page); }} />}
      {editing && <UserFormModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetch(pagination.page); }} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function UserFormModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    role: user?.role || 'STAFF',
    isActive: user?.isActive ?? true,
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        const patch = { firstName: form.firstName, lastName: form.lastName, phone: form.phone, role: form.role, isActive: form.isActive };
        await api.patch(`/admin/users/${user.id}`, patch);
      } else {
        if (!form.password || form.password.length < 8) { toast.error('Password ≥ 8 chars'); setSaving(false); return; }
        await api.post('/admin/users', form);
      }
      toast.success(isEdit ? 'User updated' : 'User created');
      onSaved();
    } catch (e) { toast.error(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()} data-testid="user-form-modal">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{isEdit ? 'Edit user' : 'New team member'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <Field label="Email">
            <input disabled={isEdit} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-form-email" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent disabled:opacity-60"/>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/></Field>
            <Field label="Last name"><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/></Field>
          </div>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="user-form-role" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent">
              {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </Field>
          {!isEdit && (
            <Field label="Password (≥ 8 chars)"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-form-password" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/></Field>
          )}
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}/>
            Active
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
          <button onClick={save} disabled={saving} data-testid="user-form-save" className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-foreground text-white disabled:opacity-50"><Save size={14}/> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pw.length < 8) return toast.error('Password ≥ 8 chars');
    setBusy(true);
    try { await api.post(`/admin/users/${user.id}/reset-password`, { password: pw }); toast.success('Password reset. Sessions revoked.'); onClose(); }
    catch (e) { toast.error(e.message || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Reset password for {user.email}</h3>
        <input type="password" placeholder="New password (≥ 8 chars)" value={pw} onChange={(e) => setPw(e.target.value)} data-testid="reset-password-input" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-transparent"/>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
          <button onClick={submit} disabled={busy} data-testid="reset-password-submit" className="px-4 py-2 text-sm rounded-lg bg-foreground text-white disabled:opacity-50">{busy ? 'Working…' : 'Reset'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs text-muted-foreground">
      <span className="block mb-1 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
