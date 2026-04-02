import { useState, useEffect, useRef } from "react";
import {
  Users, Images, Play, Plus, Trash2, Edit2, X, Check,
  ShieldCheck, ShieldOff, Loader2, UserPlus, Eye, EyeOff,
  KeyRound, MoreHorizontal, ArrowRightLeft, MonitorPlay, GripVertical,
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { Profile, useAuth } from "@/hooks/useAuth";
import { formatBytes } from "@/lib/utils";
import { useEffect as useReactEffect, useState as useReactState } from "react";
import { supabase } from "@/lib/supabase";
import { gcsPublicUrl, isGcsPath } from "@/lib/gcs";
import { useSlideshowConfig, Slideshow } from "@/hooks/useSlideshowConfig";

type Tab = "users" | "photos" | "slideshows";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const { profile } = useAuth();
  const {
    users, usersLoading,
    allPhotos, photosLoading,
    photoStats, userPhotoCounts,
    error,
    fetchUsers, createUser, updateUser, deleteUser,
    fetchAllPhotos, deleteAnyPhoto,
    resetUserPassword, fetchPhotoStats,
    fetchUserPhotoCounts, reassignPhotos,
  } = useAdmin();

  useEffect(() => {
    fetchUsers();
    fetchPhotoStats();
    fetchUserPhotoCounts();
  }, [fetchUsers, fetchPhotoStats, fetchUserPhotoCounts]);

  useEffect(() => {
    if (tab === "photos") fetchAllPhotos();
  }, [tab, fetchAllPhotos]);

  return (
    <div className="text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
            <TabBtn active={tab === "users"} onClick={() => setTab("users")} icon={<Users className="w-4 h-4" />} label="Users" />
            <TabBtn active={tab === "photos"} onClick={() => setTab("photos")} icon={<Images className="w-4 h-4" />} label="All Photos" />
            <TabBtn active={tab === "slideshows"} onClick={() => setTab("slideshows")} icon={<MonitorPlay className="w-4 h-4" />} label="Slideshows" />
          </div>
          {photoStats && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <Images className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-sm text-zinc-300 font-medium">{photoStats.total}</span>
                <span className="text-xs text-zinc-500">total photos</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <Play className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm text-zinc-300 font-medium">{photoStats.slideshow}</span>
                <span className="text-xs text-zinc-500">in slideshow</span>
              </div>
            </div>
          )}
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
            adminId={profile?.id ?? ""}
            userPhotoCounts={userPhotoCounts}
            onCreate={createUser}
            onUpdate={updateUser}
            onDelete={deleteUser}
            onResetPassword={resetUserPassword}
            onReassign={reassignPhotos}
          />
        )}

        {tab === "photos" && (
          <PhotosPanel
            photos={allPhotos}
            loading={photosLoading}
            onDelete={deleteAnyPhoto}
          />
        )}

        {tab === "slideshows" && (
          <SlideshowsPanel />
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
  adminId: string;
  userPhotoCounts: Record<string, number>;
  onCreate: (email: string, password: string, role: "user" | "admin") => Promise<{ error: string | null }>;
  onUpdate: (id: string, updates: { role?: "user" | "admin"; disabled?: boolean }) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
  onResetPassword: (email: string) => Promise<{ error: string | null }>;
  onReassign: (fromUserId: string, toUserId: string) => Promise<{ error: string | null }>;
}

function UsersPanel({ users, loading, adminId, userPhotoCounts, onCreate, onUpdate, onDelete, onResetPassword, onReassign }: UsersPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleUpdate = async (id: string) => {
    setSaving(true);
    setActionError(null);
    const { error } = await onUpdate(id, { role: editRole });
    if (error) setActionError(error);
    else setEditId(null);
    setSaving(false);
  };

  const handleDelete = async (id: string, email: string) => {
    setOpenMenuId(null);
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    setActionError(null);
    const { error } = await onDelete(id);
    if (error) setActionError(error);
  };

  const handleResetPassword = async (id: string, email: string) => {
    setOpenMenuId(null);
    if (!confirm(`Send a password reset link to "${email}"?`)) return;
    setActionError(null);
    setSuccessMsg(null);
    setResettingId(id);
    const { error } = await onResetPassword(email);
    setResettingId(null);
    if (error) setActionError(error);
    else setSuccessMsg(`Password reset link sent to ${email}.`);
  };

  const handleReassign = async (fromUserId: string, fromEmail: string, count: number) => {
    setOpenMenuId(null);
    if (!confirm(`Re-assign all ${count} photo${count !== 1 ? "s" : ""} from "${fromEmail}" to yourself?`)) return;
    setActionError(null);
    setSuccessMsg(null);
    setReassigningId(fromUserId);
    const { error } = await onReassign(fromUserId, adminId);
    setReassigningId(null);
    if (error) setActionError(error);
    else setSuccessMsg(`${count} photo${count !== 1 ? "s" : ""} from ${fromEmail} have been re-assigned to you.`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
          {actionError}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 text-sm text-emerald-400 flex items-center justify-between gap-2">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-400 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Student</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Role</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Photos</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const photoCount = userPhotoCounts[u.id] ?? 0;
                const isOpen = openMenuId === u.id;
                return (
                  <tr key={u.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-200">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-300 text-xs">
                      {u.student_name ?? <span className="text-zinc-600 italic">—</span>}
                    </td>
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
                    <td className="px-4 py-3 text-zinc-400 text-sm">
                      {photoCount > 0
                        ? <span className="font-medium text-zinc-300">{photoCount}</span>
                        : <span className="text-zinc-600">0</span>}
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
                          <div className="relative" ref={isOpen ? menuRef : undefined}>
                            {(resettingId === u.id || reassigningId === u.id) ? (
                              <Loader2 className="w-4 h-4 text-zinc-500 animate-spin mx-1.5" />
                            ) : (
                              <button
                                onClick={() => setOpenMenuId(isOpen ? null : u.id)}
                                className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                                title="Actions"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            )}
                            {isOpen && (
                              <div className="absolute right-0 top-full mt-1 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                                <button
                                  onClick={() => { setOpenMenuId(null); setEditId(u.id); setEditRole(u.role); }}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-zinc-500" /> Edit role
                                </button>
                                <button
                                  onClick={() => { setOpenMenuId(null); onUpdate(u.id, { disabled: !u.disabled }); }}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                  {u.disabled
                                    ? <><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Enable user</>
                                    : <><ShieldOff className="w-3.5 h-3.5 text-zinc-500" /> Disable user</>}
                                </button>
                                <button
                                  onClick={() => handleResetPassword(u.id, u.email)}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-zinc-500" /> Send password reset
                                </button>
                                {photoCount > 0 && u.id !== adminId && (
                                  <button
                                    onClick={() => handleReassign(u.id, u.email, photoCount)}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                                    Re-assign {photoCount} photo{photoCount !== 1 ? "s" : ""} to me
                                  </button>
                                )}
                                <div className="my-1 border-t border-zinc-800" />
                                <button
                                  onClick={() => handleDelete(u.id, u.email)}
                                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete user
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-50">
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
                src={photo.thumb_url ?? photo.url} alt={photo.title}
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
                  <p className="text-white/50 text-xs truncate">
                    {photo.user_tag ? `@${photo.user_tag}` : photo.owner_email}
                  </p>
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

// ---- SLIDESHOWS PANEL ----

interface SlideshowPhoto {
  id: string;
  title: string;
  storage_path: string;
  thumb_path: string | null;
  med_path: string | null;
  url: string;
  thumb_url: string;
  med_url: string;
}

function resolveUrl(path: string): string {
  if (isGcsPath(path)) return gcsPublicUrl(path);
  const { data } = supabase.storage.from("band-pics").getPublicUrl(path);
  return data.publicUrl;
}

function buildOrderedPhotos(ids: string[], map: Map<string, SlideshowPhoto>): SlideshowPhoto[] {
  const ordered: SlideshowPhoto[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const p = map.get(id);
    if (p) { ordered.push(p); seen.add(id); }
  }
  // Append any slideshow photos not in the saved order
  for (const p of map.values()) {
    if (!seen.has(p.id)) ordered.push(p);
  }
  return ordered;
}

function suggestShowName(shows: Slideshow[]): string {
  let max = 0;
  for (const s of shows) {
    const m = s.name.match(/^slideshow_(\d+)$/i);
    if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
  }
  return `slideshow_${max + 1}`;
}

function SlideshowsPanel() {
  const [loadingPhotos, setLoadingPhotos] = useReactState(true);
  const [photos, setPhotos] = useReactState<SlideshowPhoto[]>([]);
  const [error, setError] = useReactState<string | null>(null);

  const [editOrder, setEditOrder] = useReactState<SlideshowPhoto[]>([]);
  const [originalOrder, setOriginalOrder] = useReactState<SlideshowPhoto[]>([]);
  const [dragIndex, setDragIndex] = useReactState<number | null>(null);
  const [dragOver, setDragOver] = useReactState<number | null>(null);
  const [queuedRemoveIds, setQueuedRemoveIds] = useReactState<string[]>([]);
  const [isOverRemoveZone, setIsOverRemoveZone] = useReactState(false);

  const [currentShowName, setCurrentShowName] = useReactState<string>("");
  const [newShowName, setNewShowName] = useReactState<string>("");
  const [saveError, setSaveError] = useReactState<string | null>(null);
  const [deletingId, setDeletingId] = useReactState<string | null>(null);

  const photoMapRef = useRef<Map<string, SlideshowPhoto>>(new Map());
  const droppedInRemoveZoneRef = useRef(false);

  const {
    shows,
    currentShowId,
    loading: configLoading,
    saving,
    loadShows,
    createShow,
    deleteShow,
    selectShow,
    updateShow,
  } = useSlideshowConfig();

  const isLoading = loadingPhotos || configLoading;

  useReactEffect(() => {
    async function init() {
      setLoadingPhotos(true);
      setError(null);
      const [allShows, photosResult] = await Promise.all([
        loadShows(),
        supabase.from("photos").select("*").eq("slideshow", true),
      ]);

      if (photosResult.error) {
        setError(photosResult.error.message);
        setLoadingPhotos(false);
        return;
      }

      const map = new Map<string, SlideshowPhoto>();
      for (const p of (photosResult.data ?? []) as any[]) {
        map.set(p.id, {
          id: p.id,
          title: p.title,
          storage_path: p.storage_path,
          thumb_path: p.thumb_path ?? null,
          med_path: p.med_path ?? null,
          url: resolveUrl(p.storage_path),
          thumb_url: p.thumb_path ? gcsPublicUrl(p.thumb_path) : resolveUrl(p.storage_path),
          med_url: p.med_path ? gcsPublicUrl(p.med_path) : resolveUrl(p.storage_path),
        });
      }
      photoMapRef.current = map;

      const active = allShows.find((s) => s.id === currentShowId) ?? allShows[0] ?? null;
      if (active) {
        const ordered = buildOrderedPhotos(active.photo_ids, photoMapRef.current);
        setPhotos(ordered);
        setEditOrder(ordered);
        setOriginalOrder(ordered);
        setCurrentShowName(active.name);
      } else {
        const base = Array.from(photoMapRef.current.values());
        setPhotos(base);
        setEditOrder(base);
        setOriginalOrder(base);
        setCurrentShowName("");
      }
      setQueuedRemoveIds([]);

      setLoadingPhotos(false);
    }
    init();
  }, [loadShows, currentShowId]);

  const onDragStart = (i: number) => setDragIndex(i);
  const onDragEnter = (i: number) => setDragOver(i);
  const onDragEnd = () => {
    if (droppedInRemoveZoneRef.current) {
      droppedInRemoveZoneRef.current = false;
      setDragIndex(null);
      setDragOver(null);
      setIsOverRemoveZone(false);
      return;
    }
    if (dragIndex !== null && dragOver !== null && dragIndex !== dragOver) {
      setEditOrder((o) => {
        const a = [...o];
        const [item] = a.splice(dragIndex, 1);
        a.splice(dragOver, 0, item);
        return a;
      });
    }
    setDragIndex(null);
    setDragOver(null);
    setIsOverRemoveZone(false);
  };

  const queueForRemoval = (idx: number) => {
    const item = editOrder[idx];
    if (!item) return;
    setQueuedRemoveIds((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]));
  };

  const randomizeOrder = () => {
    setEditOrder((o) => {
      const a = [...o];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
  };

  const handleCreateNewFromCurrent = () => {
    const base = Array.from(photoMapRef.current.values());
    setPhotos(base);
    setEditOrder(base);
    setOriginalOrder(base);
    setCurrentShowName("");
    setNewShowName(suggestShowName(shows));
    setSaveError(null);
    setQueuedRemoveIds([]);
  };

  const handleLoadShow = (show: Slideshow) => {
    selectShow(show.id);
    const ordered = buildOrderedPhotos(show.photo_ids, photoMapRef.current);
    setPhotos(ordered);
    setEditOrder(ordered);
    setOriginalOrder(ordered);
    setCurrentShowName(show.name);
    setNewShowName(show.name);
    setSaveError(null);
    setQueuedRemoveIds([]);
  };

  const handleReset = () => {
    setEditOrder(originalOrder);
    setQueuedRemoveIds([]);
    setSaveError(null);
  };

  const applyQueuedRemovals = () => {
    if (queuedRemoveIds.length === 0) return;
    setEditOrder((order) => order.filter((p) => !queuedRemoveIds.includes(p.id)));
    setQueuedRemoveIds([]);
  };

  const handleSave = async () => {
    const trimmed = currentShowName.trim();
    if (!trimmed) {
      setSaveError("Enter a name for this show.");
      return;
    }
    setSaveError(null);
    if (currentShowId) {
      const { error } = await updateShow(currentShowId, {
        name: trimmed,
        photo_ids: editOrder.map((p) => p.id),
      });
      if (error) {
        setSaveError(error);
      } else {
        setOriginalOrder(editOrder);
      }
    } else {
      const { show, error } = await createShow(trimmed, editOrder.map((p) => p.id));
      if (error || !show) {
        setSaveError(error ?? "Unknown error");
      } else {
        setCurrentShowName(show.name);
        setNewShowName(show.name);
        setOriginalOrder(editOrder);
      }
    }
  };

  const handleSaveAsNew = async () => {
    const name = newShowName.trim();
    if (!name) {
      setSaveError("Enter a name for this show.");
      return;
    }
    setSaveError(null);
    const { show, error } = await createShow(name, editOrder.map((p) => p.id));
    if (error || !show) {
      setSaveError(error ?? "Unknown error");
      return;
    }
    setCurrentShowName(show.name);
    setNewShowName("");
    setOriginalOrder(editOrder);
  };

  const handleDeleteShow = async () => {
    if (!currentShowId) return;
    if (!confirm("Delete this show? This cannot be undone.")) return;
    setDeletingId(currentShowId);
    const { error } = await deleteShow(currentShowId);
    setDeletingId(null);
    if (error) {
      setSaveError(error);
      return;
    }
    // After delete, reset to base order
    const base = Array.from(photoMapRef.current.values());
    setPhotos(base);
    setEditOrder(base);
    setOriginalOrder(base);
    setCurrentShowName("");
    setNewShowName("");
    setQueuedRemoveIds([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Slideshow Builder
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} marked for slideshow
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span>Show:</span>
          <select
            value={currentShowId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const show = shows.find((s) => s.id === id) ?? null;
              if (show) {
                handleLoadShow(show);
              } else {
                handleCreateNewFromCurrent();
              }
            }}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100"
          >
            <option value="">(unsaved order)</option>
            {shows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-1 space-y-2">
          <label className="block text-xs text-zinc-400">Show name</label>
          <input
            type="text"
            value={currentShowName}
            onChange={(e) => { setCurrentShowName(e.target.value); setSaveError(null); }}
            placeholder="e.g. Championship 2026"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving || photos.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={handleCreateNewFromCurrent}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-100 border border-zinc-700 hover:bg-zinc-800"
            >
              Include all marked
            </button>
            <button
              onClick={randomizeOrder}
              disabled={editOrder.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-100 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40"
            >
              Shuffle order
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-100 border border-zinc-700 hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-2">
          <label className="block text-xs text-zinc-400">Save as new show</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newShowName}
              onChange={(e) => { setNewShowName(e.target.value); setSaveError(null); }}
              placeholder={suggestShowName(shows)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              onClick={handleSaveAsNew}
              disabled={saving || !newShowName.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save new
            </button>
          </div>
          <button
            onClick={handleDeleteShow}
            disabled={!currentShowId || deletingId === currentShowId}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-40"
          >
            {deletingId === currentShowId ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete show
          </button>
          {saveError && (
            <p className="text-xs text-red-400 pt-1">{saveError}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No photos are marked for slideshow yet. Toggle “Slideshow” on some photos in the Gallery view.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mt-4">
            {editOrder.map((p, i) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragEnter={() => onDragEnter(i)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`group relative aspect-square bg-zinc-800 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing ${
                  dragOver === i ? "ring-2 ring-emerald-400" : ""
                }`}
              >
                <img
                  src={p.thumb_url}
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="absolute inset-0 p-2.5 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/70">
                      <GripVertical className="w-3 h-3" />
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium truncate">{p.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className={`mt-4 rounded-xl border px-4 py-3 transition-colors ${
              isOverRemoveZone
                ? "border-red-500/60 bg-red-500/15"
                : "border-zinc-700 bg-zinc-900/60"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsOverRemoveZone(true);
            }}
            onDragLeave={() => setIsOverRemoveZone(false)}
            onDrop={(e) => {
              e.preventDefault();
              droppedInRemoveZoneRef.current = true;
              if (dragIndex !== null) queueForRemoval(dragIndex);
              setDragIndex(null);
              setDragOver(null);
              setIsOverRemoveZone(false);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-zinc-300">
                Drag tile here to queue removal from this show instance
                <span className="text-zinc-500 ml-1">(does not change photo slideshow flag)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">
                  Queued: {queuedRemoveIds.length}
                </span>
                <button
                  onClick={applyQueuedRemovals}
                  disabled={queuedRemoveIds.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-40"
                >
                  Remove queued from show
                </button>
                <button
                  onClick={() => setQueuedRemoveIds([])}
                  disabled={queuedRemoveIds.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Clear queue
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
