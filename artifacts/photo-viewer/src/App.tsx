import { useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import GalleryPage from "@/pages/GalleryPage";
import AdminPage from "@/pages/AdminPage";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import { TopNav } from "@/components/TopNav";

type View = "gallery" | "admin";

function AppContent() {
  const { user, profile, loading, isAdmin } = useAuth();
  const [view, setView] = useState<View>("gallery");

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (!profile?.user_tag) return <ProfileSetupPage />;

  const safeView = view === "admin" && !isAdmin ? "gallery" : view;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <TopNav activeView={safeView} onNavigate={setView} />
      {safeView === "admin" ? (
        <AdminPage />
      ) : (
        <GalleryPage />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
