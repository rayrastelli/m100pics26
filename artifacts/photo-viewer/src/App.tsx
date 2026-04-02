import { useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AuthPage from "@/pages/AuthPage";
import GalleryPage from "@/pages/GalleryPage";
import AdminPage from "@/pages/AdminPage";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import SlideshowPage from "@/pages/SlideshowPage";
import ProfilePage from "@/pages/ProfilePage";
import HelpPage from "@/pages/HelpPage";
import SettingsPage from "@/pages/SettingsPage";
import { TopNav } from "@/components/TopNav";

type View = "gallery" | "slideshow" | "admin" | "profile" | "help" | "settings";
const APP_VERSION = "0.1.4";

function AppFooter() {
  return (
    <footer className="border-t border-zinc-800/70 bg-zinc-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-zinc-500">
        <span>Band Pics</span>
        <span className="ml-auto">v{APP_VERSION}</span>
      </div>
    </footer>
  );
}

function AppContent() {
  const { user, profile, loading, isAdmin } = useAuth();
  const [view, setView] = useState<View>("gallery");

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        </div>
        <AppFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1">
          <AuthPage />
        </div>
        <AppFooter />
      </div>
    );
  }

  if (!profile?.user_tag) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1">
          <ProfileSetupPage />
        </div>
        <AppFooter />
      </div>
    );
  }

  if (profile.disabled && !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex-1">
          <PendingApprovalPage />
        </div>
        <AppFooter />
      </div>
    );
  }

  const safeView = view === "admin" && !isAdmin ? "gallery" : view;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <TopNav activeView={safeView} onNavigate={setView} />
      <div className="flex-1">
        {safeView === "admin" ? (
          <AdminPage />
        ) : safeView === "profile" ? (
          <ProfilePage />
        ) : safeView === "settings" ? (
          <SettingsPage />
        ) : safeView === "help" ? (
          <HelpPage />
        ) : safeView === "slideshow" ? (
          <SlideshowPage />
        ) : (
          <GalleryPage />
        )}
      </div>
      <AppFooter />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
