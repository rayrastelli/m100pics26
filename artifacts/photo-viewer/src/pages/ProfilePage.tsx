import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Loader2, LockKeyhole, User, Tag } from "lucide-react";

export default function ProfilePage() {
  const { user, profile, updateUserTag } = useAuth();
  const [studentName, setStudentName] = useState(profile?.student_name ?? "");
  const [userTag, setUserTag] = useState(profile?.user_tag ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    const { error } = await updateUserTag(userTag || "", studentName || undefined);
    if (error) {
      setProfileError(error);
    } else {
      setProfileSuccess("Profile updated.");
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    setPassStatus(null);

    if (!newPassword || newPassword.length < 6) {
      setPassError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }

    setChangingPass(true);
    try {
      setPassStatus("Updating password...");
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Password update timed out. Please try again.")), 15000);
      });
      const { error } = await Promise.race([
        supabase.auth.updateUser({ password: newPassword }),
        timeout,
      ]);
      if (error) {
        if (/reauth/i.test(error.message)) {
          setPassError("Supabase requires recent re-authentication for password change. Sign out/in and try again.");
        } else {
          setPassError(error.message);
        }
      } else {
        setPassSuccess("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password.";
      setPassError(message);
    } finally {
      setChangingPass(false);
      setPassStatus(null);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Profile</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your account details and change your password.
        </p>
      </div>

      {/* Basic info */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-zinc-200">Account</h2>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-zinc-400">Email</span>
            <span className="font-medium text-zinc-100">{user.email}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-zinc-400">Role</span>
            <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {profile?.role ?? "user"}
            </span>
          </div>
        </div>
      </section>

      {/* Profile tag / student name */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-zinc-200">Profile Info</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Student name</label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="Student name"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">User tag (@handle)</label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-zinc-500">@</span>
                <input
                  value={userTag ?? ""}
                  onChange={(e) => setUserTag(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  placeholder="drumline2026"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Only letters, numbers, and underscores. This appears under your uploads.
              </p>
            </div>
          </div>
          {profileError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {profileError}
            </p>
          )}
          {profileSuccess && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {profileSuccess}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {savingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Save profile
            </button>
          </div>
        </form>
      </section>

      {/* Password change */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <LockKeyhole className="w-4 h-4 text-zinc-400" />
          <h2 className="text-base font-semibold text-zinc-200">Change password</h2>
        </div>
        <form
          onSubmit={handleChangePassword}
          className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Current password <span className="text-zinc-500">(optional)</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                placeholder="Repeat new password"
                required
                minLength={6}
              />
            </div>
          </div>
          {passError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {passError}
            </p>
          )}
          {changingPass && passStatus && (
            <p className="text-sm text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
              {passStatus}
            </p>
          )}
          {passSuccess && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {passSuccess}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPass}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {changingPass ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Update password
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

