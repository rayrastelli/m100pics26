import { useState, useEffect } from "react";
import {
  Users, Images, ArrowLeft, Plus, Trash2, Edit2, X, Check,
  ShieldCheck, ShieldOff, Loader2, UserPlus, Eye, EyeOff
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { Profile } from "@/hooks/useAuth";
import { formatBytes } from "@/lib/utils";

interface AdminPageProps {
  onBack: () => void;
}

type Tab = "users" | "photos";

export default function AdminPage({ onBack }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>("users");
  const {
    users, usersLoading,
    allPhotos, photosLoading,
    error,
    fetchUsers, createUser, updateUser, deleteUser,
    fetchAllPhotos, deleteAnyPhoto,
  } = useAdmin();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (tab === "photos") fetchAllPhotos();
  }, [tab, fetchAllPhotos]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-5 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-zinc-100 tracking-tight">Admin Panel</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          <TabBtn active={tab === "users"} onClick={() => setTab("users")} icon={<Users className="w-4 h-4" />} label="Users" />
          <TabBtn active={tab === "photos"} onClick={() => setTab("photos")} icon={<Images className="w-4 h-4" />} label="All Photos" />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {tab === "users" && (
          <UsersPanel
            users={users}
            loading={usersLoading}
            onCreate={createUser}
            onUpdate={updateUser}
            onDelete={deleteUser}
          />
        )}

        {tab === "photos" && (
          <PhotosPanel
            photos={allPhotos}
            loading={photosLoading}
            onDelete={deleteAnyPhoto}
          />
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {icon} {label}
    </button>
  );
}

// ---- USERS PANEL ----

interface UsersPanelProps {
  users: Profile[];
  loading: boolean;
  onCreate: (email: string, password: string, role: "user" | "admin") => Promise<{ error: string | null }>;
  onUpdate: (id: string, updates: { role?: "user" | "admin"; disabled?: boolean }) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

function UsersPanel({ users, loading, onCreate, onUpdate, onDelete }: UsersPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleUpdate = async (id: string) => {
    setSaving(true);
    setActionError(null);
    const { error } = await onUpdate(id, { role: editRole });
    if (error) setActionError(error);
    else setEditId(null);
    setSaving(false);
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Disable user "${email}"? They will be blocked from the app.`)) return;
    setActionError(null);
    const { error } = await onDelete(id);
    if (error) setActionError(error);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {showCreate && (
        <CreateUserForm
          onSave={async (email, password, role) => {
            const { error } = await onCreate(email, password, role);
            if (error) return error;
            setShowCreate(false);
            return null;
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-200">{u.email}</td>
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as "user" | "admin")}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <RoleBadge role={u.role} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      u.disabled ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
                    }`}>
                      {u.disabled ? <><EyeOff className="w-3 h-3" /> Disabled</> : <><Eye className="w-3 h-3" /> Active</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {editId === u.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(u.id)}
                            disabled={saving}
                            className="p-1.5 rounded text-emerald-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 rounded text-zinc-500 hover:bg-zinc-700 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditId(u.id); setEditRole(u.role); }}
                            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                            title="Edit role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onUpdate(u.id, { disabled: !u.disabled })}
                            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                            title={u.disabled ? "Enable user" : "Disable user"}
                          >
                            {u.disabled ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.email)}
                            className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "user" | "admin" }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      role === "admin"
        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
        : "bg-zinc-700/60 text-zinc-400"
    }`}>
      {role === "admin" && <ShieldCheck className="w-3 h-3" />}
      {role}
    </span>
  );
}

function CreateUserForm({ onSave, onCancel }: {
  onSave: (email: string, password: string, role: "user" | "admin") => Promise<string | null>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await onSave(email, password, role);
    if (err) setError(err);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-zinc-200">New User</h3>
        <button type="button" onClick={onCancel} className="text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-9 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
              placeholder="min 6 characters"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Role</label>
        <div className="flex gap-2">
          {(["user", "admin"] as const).map((r) => (
            <button
              key={r} type="button" onClick={() => setRole(r)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                role === r
                  ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              {r === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-white transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {saving ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}

// ---- PHOTOS PANEL ----

interface PhotosPanelProps {
  photos: import("@/hooks/useAdmin").AdminPhoto[];
  loading: boolean;
  onDelete: (photo: import("@/hooks/useAdmin").AdminPhoto) => Promise<{ error: string | null }>;
}

function PhotosPanel({ photos, loading, onDelete }: PhotosPanelProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (photo: import("@/hooks/useAdmin").AdminPhoto) => {
    if (!confirm(`Delete "${photo.title}"?`)) return;
    setDeleting(photo.id);
    setActionError(null);
    const { error } = await onDelete(photo);
    if (error) setActionError(error);
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{photos.length} photo{photos.length !== 1 ? "s" : ""} across all users</p>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm">No photos uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {photos.map((photo, i) => (
            <div key={photo.id} className="group relative aspect-square bg-zinc-800 rounded-xl overflow-hidden">
              <img
                src={photo.url} alt={photo.title}
                className="h-full w-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                onClick={() => setLightboxIndex(i)}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="absolute inset-0 p-2.5 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(photo)}
                    disabled={deleting === photo.id}
                    className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-colors"
                  >
                    {deleting === photo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div>
                  <p className="text-white text-xs font-medium truncate">{photo.title}</p>
                  <p className="text-white/50 text-xs truncate">{photo.owner_email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/96 backdrop-blur-xl"
          onClick={() => setLightboxIndex(null)}>
          <button onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center max-w-4xl w-full mx-8" onClick={(e) => e.stopPropagation()}>
            <img src={photos[lightboxIndex].url} alt={photos[lightboxIndex].title}
              className="max-h-[78vh] max-w-full object-contain rounded-lg shadow-2xl" />
            <div className="mt-4 text-center space-y-1">
              <p className="text-zinc-100 font-medium">{photos[lightboxIndex].title}</p>
              <p className="text-zinc-500 text-xs">{photos[lightboxIndex].owner_email} · {formatBytes(photos[lightboxIndex].size)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
