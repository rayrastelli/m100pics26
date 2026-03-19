import { useState } from "react";
import { AtSign, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileSetupPage() {
  const { updateUserTag, signOut } = useAuth();
  const [tag, setTag] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = tag.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;
    if (!studentName.trim()) { setError("Student name is required"); return; }
    setSaving(true);
    setError(null);
    const { error } = await updateUserTag(preview, studentName);
    if (error) setError(error);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 mb-5">
            <AtSign className="w-7 h-7 text-zinc-100" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Set up your account</h1>
          <p className="mt-1 text-sm text-zinc-400">Tell us who you are so the admin can approve you</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Student name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  maxLength={80}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                  placeholder="First and last name"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">User tag</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">@</span>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  required
                  maxLength={32}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                  placeholder="yourname"
                />
              </div>
              {tag && preview !== tag.trim() && (
                <p className="text-xs text-zinc-500 mt-1.5">Will be saved as <span className="text-zinc-300">@{preview}</span></p>
              )}
              <p className="text-xs text-zinc-600 mt-1.5">Letters, numbers, underscores only. Max 32 chars.</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !preview || !studentName.trim()}
              className="w-full bg-zinc-100 text-zinc-900 font-medium py-2.5 rounded-lg text-sm hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Continue"}
            </button>
          </form>

          <div className="pt-1 border-t border-zinc-800">
            <button
              onClick={signOut}
              className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-1"
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
