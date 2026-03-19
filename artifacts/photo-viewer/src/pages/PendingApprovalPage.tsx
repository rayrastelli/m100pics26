import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PendingApprovalPage() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>

        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-2">
          Pending Approval
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-1">
          Your account is waiting for admin approval.
        </p>
        {profile?.student_name && (
          <p className="text-xs text-zinc-500 mb-1">
            Registered as <span className="text-zinc-300">{profile.student_name}</span>
          </p>
        )}
        <p className="text-xs text-zinc-600 mb-8">
          You'll be able to view and upload photos once an admin enables your account.
        </p>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
