import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  Brain,
  FileText,
  PlayCircle,
  User,
  Settings,
  Trophy,
  Menu,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserScore } from "@/hooks/useUserScore";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  const { score } = useUserScore();
  const { profile, user, signOut } = useAuth();

  const items = [
    { href: "/home", label: t("home"), icon: Home },
    { href: "/quizzes", label: t("quizzes"), icon: Brain },
    { href: "/exams", label: t("exams"), icon: FileText },
    { href: "/videos", label: t("videos"), icon: PlayCircle },
    { href: "/learn-ai", label: t("aiLearn"), icon: Brain },
  ];

  const isActive = (path: string) => location.pathname === path;

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "؟";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-gold/30 bg-gradient-to-b from-card-raised to-card shadow-raised">
      <div className="container flex h-[72px] items-center gap-7">
        {/* Wordmark. The old logo was h-16 inside an h-16 bar, filling it. */}
        <Link to="/home" className="flex shrink-0 items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-7 w-7" aria-hidden />
          <span className="text-[17px] font-bold tracking-tight">THE SMART</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex h-10 items-center rounded-md px-4 text-base transition-colors",
                isActive(item.href)
                  ? "bg-accent-light font-semibold text-accent shadow-[inset_0_0_0_1px_hsl(var(--border-gold)/0.45)]"
                  : "text-muted-foreground hover:bg-card-raised hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-border-gold/50 bg-accent-light px-3.5 py-1.5 sm:flex">
            <Trophy className="h-4 w-4 text-accent" aria-hidden />
            <span className="text-base font-semibold text-accent tabular">
              {score.toLocaleString("ar-DZ")}
            </span>
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-10 w-10 ring-1 ring-border-gold/40">
                  <AvatarFallback className="bg-primary-light text-sm font-semibold text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end" forceMount>
              <div className="px-2 py-1.5">
                <p className="truncate text-base font-medium">
                  {profile?.name || user?.email?.split("@")[0]}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {profile?.email || user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="me-2 h-4 w-4" />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="me-2 h-4 w-4" />
                  {t("settings")}
                </Link>
              </DropdownMenuItem>
              {/* Admins previously had no route into /admin except the login redirect. */}
              {profile?.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <ShieldCheck className="me-2 h-4 w-4" />
                    لوحة الإدارة
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Sign out used to live only inside /settings. */}
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="me-2 h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="القائمة">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
                <img src="/favicon.svg" alt="" className="h-6 w-6" aria-hidden />
                <span className="text-base font-bold tracking-tight">THE SMART</span>
              </div>
              <div className="flex flex-col p-2">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-md px-3 text-base transition-colors",
                      isActive(item.href)
                        ? "bg-accent-light font-semibold text-accent"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
