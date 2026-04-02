import logoUrl from "@assets/m100_1773294651634.png";
import { Images, ShieldCheck, LogOut, User, MonitorPlay, CircleHelp, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemePicker } from "@/components/ThemePicker";

type ActiveView = "gallery" | "slideshow" | "admin" | "profile" | "help" | "settings";

interface TopNavProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

export function TopNav({ activeView, onNavigate }: TopNavProps) {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img src={logoUrl} alt="Marching Hundred" className="w-8 h-8 object-contain rounded" />
          <span className="font-semibold text-zinc-100 tracking-tight">Band Pics</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <NavLink
            label="Gallery"
            icon={<Images className="w-3.5 h-3.5" />}
            active={activeView === "gallery"}
            onClick={() => onNavigate("gallery")}
          />
          <NavLink
            label="Slideshow"
            icon={<MonitorPlay className="w-3.5 h-3.5" />}
            active={activeView === "slideshow"}
            onClick={() => onNavigate("slideshow")}
          />
          <NavLink
            label="Profile"
            icon={<User className="w-3.5 h-3.5" />}
            active={activeView === "profile"}
            onClick={() => onNavigate("profile")}
          />
          <NavLink
            label="Help"
            icon={<CircleHelp className="w-3.5 h-3.5" />}
            active={activeView === "help"}
            onClick={() => onNavigate("help")}
          />
          <NavLink
            label="Settings"
            icon={<Settings className="w-3.5 h-3.5" />}
            active={activeView === "settings"}
            onClick={() => onNavigate("settings")}
          />
          {isAdmin && (
            <NavLink
              label="Admin"
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              active={activeView === "admin"}
              onClick={() => onNavigate("admin")}
              accent
            />
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/60 rounded-lg border border-zinc-700/40">
            <User className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-300 max-w-[140px] truncate">
              {profile?.user_tag ? `@${profile.user_tag}` : profile?.email ?? ""}
            </span>
          </div>
          <ThemePicker />
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

interface NavLinkProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  accent?: boolean;
}

function NavLink({ label, icon, active, onClick, accent }: NavLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? accent
            ? "bg-amber-400/15 text-amber-300 border border-amber-400/25"
            : "bg-zinc-800 text-zinc-100"
          : accent
            ? "text-amber-400/70 hover:text-amber-300 hover:bg-amber-400/10"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
