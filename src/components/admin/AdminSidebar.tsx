import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminSection } from "@/types/admin";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  School,
  Users,
  FileText,
  GraduationCap,
  Shield,
  Video,
  BookOpen,
  Lightbulb,
  Pin,
  TrendingUp,
} from "lucide-react";

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

const menuItems: { id: AdminSection; title: string; icon: LucideIcon }[] = [
  { id: "overview", title: "نظرة عامة", icon: BarChart3 },
  { id: "students", title: "الطلاب", icon: Users },
  { id: "schools", title: "الثانويات", icon: School },
  { id: "videos", title: "الدروس", icon: Video },
  { id: "exams", title: "الامتحانات", icon: FileText },
  { id: "quizzes", title: "الاختبارات", icon: BookOpen },
  { id: "advice", title: "نصيحة اليوم", icon: Pin },
  { id: "tips", title: "النصائح", icon: Lightbulb },
  { id: "subscriptions", title: "الاشتراكات", icon: TrendingUp },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { state } = useSidebar();

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-gold/40 bg-accent-light">
            <Shield className="h-5 w-5 text-accent" strokeWidth={1.7} />
          </div>
          {state === "expanded" && (
            <div>
              <h2 className="font-display text-lg font-bold text-sidebar-accent-foreground">لوحة الإدارة</h2>
              <p className="text-sm text-sidebar-foreground/70">THE SMART</p>
            </div>
          )}
        </div>
        <SidebarTrigger className="ms-auto me-4" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-accent/80">الإدارة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    isActive={activeSection === item.id}
                    className={cn(
                      "h-11 w-full justify-start gap-3 text-base",
                      activeSection === item.id &&
                        "border-s-2 border-accent bg-sidebar-accent font-semibold text-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {state === "expanded" && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="px-4 py-3 text-sm text-sidebar-foreground/60">
            {state === "expanded" && (
                <>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-accent" />
                    <span>THE SMART — الإدارة</span>
                  </div>
                </>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}