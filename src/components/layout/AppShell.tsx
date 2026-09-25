import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, CircleHelp, FileText, House, ListChecks, LogOut, Settings, ShieldCheck, Sparkles, User, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * The app frame from the owner's mockup: a vertical icon rail on desktop —
 * first in the row, so on the right in RTL — and a bottom tab bar on phones,
 * which the desktop-only mockup has no answer for. Replaces the old top bar
 * that every page used to render for itself.
 */

interface NavItem {
  to: string;
  label: string;
  /** fits under an icon in the phone tab bar */
  short: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: "/home", label: "الرئيسية", short: "الرئيسية", icon: House },
  { to: "/exams", label: "مواضيع البكالوريا", short: "المواضيع", icon: FileText },
  { to: "/videos", label: "الدروس المرئية", short: "الدروس", icon: Video },
  { to: "/quizzes", label: "الاختبارات", short: "الاختبارات", icon: CircleHelp },
  // The hub for every OTHER practice mode (simulator, flashcards, mistakes,
  // revision) — quizzes got its own item back above, at the owner's request.
  { to: "/practice", label: "التدريب", short: "التدريب", icon: ListChecks },
  { to: "/learn-ai", label: "المعلّم الذكي", short: "المعلّم", icon: Sparkles },
  // Derived, never entered: every square comes from review_due_at /
  // next_review_at. Last because it plans the other six rather than
  // competing with them.
  { to: "/calendar", label: "التقويم", short: "التقويم", icon: CalendarDays },
];

function isActive(pathname: string, to: string) {
  if (pathname === to) return true;
  if (to === "/home") return pathname === "/dashboard";
  if (to === "/quizzes") return pathname.startsWith("/quiz/");
  if (to === "/practice") return pathname.startsWith("/exam-simulator");
  return false;
}

const tile = (active: boolean) =>
  cn(
    "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
    active ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card-raised"
  );

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={item.to} aria-label={item.label} aria-current={active ? "page" : undefined} className={tile(active)}>
          <item.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </Link>
      </TooltipTrigger>
      {/* the rail sits on the right, so its labels open towards the page */}
      <TooltipContent side="left">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function AccountMenu({ side }: { side: "left" | "top" }) {
  const { profile, user, signOut } = useAuth();
  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "؟";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="حسابي"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-tone-lav to-tone-pink text-sm font-semibold text-foreground/75 ring-2 ring-card focus-visible:outline-none focus-visible:ring-ring"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" side={side} align="end">
        <div className="px-3 py-2">
          <p className="truncate text-base font-medium">{profile?.name || user?.email?.split("@")[0]}</p>
          <p className="truncate text-sm text-muted-foreground">{profile?.email || user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User className="me-2 h-4 w-4" />
            الملف الشخصي
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="me-2 h-4 w-4" />
            الإعدادات
          </Link>
        </DropdownMenuItem>
        {profile?.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <ShieldCheck className="me-2 h-4 w-4" />
              لوحة الإدارة
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="me-2 h-4 w-4" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  // Seven destinations no longer fit a 360px tab bar, so it scrolls. Centre
  // the active tile: a student arriving by link would otherwise land on a bar
  // whose highlighted item is off-screen, and never think to swipe.
  const activeTab = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeTab.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  // Signed-out visitors are on their way to /login via ProtectedRoute; don't
  // flash the frame at them.
  if (!user) return <Outlet />;

  return (
    <>
      {/* 1920, not the mockup's 1440: on a 1920px screen 1440 left ~240px
          empty on each side. Still capped for ultra-wide monitors. */}
      <div className="mx-auto flex max-w-[1920px] gap-6 px-4 pb-28 pt-6 sm:px-6 lg:pb-8">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[88px] shrink-0 flex-col items-center gap-2 py-6 lg:flex">
          <Link to="/home" aria-label="THE SMART" className="mb-4">
            <img src="/favicon.svg" alt="" className="h-11 w-11" />
          </Link>
          <div className="mb-2 h-px w-8 bg-foreground/10" />
          <nav aria-label="التنقل" className="flex flex-col items-center gap-2">
            {NAV.map((item) => (
              <RailLink key={item.to} item={item} active={isActive(pathname, item.to)} />
            ))}
          </nav>
          <div className="flex-1" />
          <RailLink
            item={{ to: "/settings", label: "الإعدادات", short: "الإعدادات", icon: Settings }}
            active={pathname === "/settings"}
          />
          <AccountMenu side="left" />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* phones: the same destinations as a bottom tab bar */}
      <nav
        aria-label="التنقل"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {/* w-max lets the row outgrow a narrow phone; min-w-full keeps
            justify-around spreading it on a wide one. */}
        <div className="no-scrollbar mx-auto max-w-lg overflow-x-auto">
          <div className="flex w-max min-w-full items-center justify-around gap-3 px-2 py-2">
            {NAV.map((item) => {
              const active = isActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  ref={active ? activeTab : undefined}
                  aria-current={active ? "page" : undefined}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <span className={cn(tile(active), "h-10 w-10")}>
                    <item.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className={cn("text-[13px] leading-none", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {item.short}
                  </span>
                </Link>
              );
            })}
            <AccountMenu side="top" />
          </div>
        </div>
      </nav>
    </>
  );
}
