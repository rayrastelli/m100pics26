import { useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import GalleryPage from "@/pages/GalleryPage";
import AdminPage from "@/pages/AdminPage";

type View = "gallery" | "admin";

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>("gallery");

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (view === "admin") {
    return <AdminPage onBack={() => setView("gallery")} />;
  }

  return <GalleryPage onAdminClick={() => setView("admin")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
