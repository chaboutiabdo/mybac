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
  Video,
  BookOpen,
  Layers,
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
  { id: "flashcards", title: "البطاقات", icon: Layers },
  { id: "advice", title: "نصيحة اليوم", icon: Pin },
  { id: "tips", title: "النصائح", icon: Lightbulb },
  { id: "subscriptions", title: "الاشتراكات", icon: TrendingUp },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { state } = useSidebar();

  return (
    // side="right": in RTL the space reserved for the sidebar is on the right,
    // so the default left-fixed panel covered the page content
    <Sidebar side="right" className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10 shrink-0" aria-hidden />
          {state === "expanded" && (
            <div>
              <h2 className="text-lg font-semibold">لوحة الإدارة</h2>
              <p className="text-sm text-sidebar-foreground/70">THE SMART</p>
            </div>
          )}
        </div>
        <SidebarTrigger className="ms-auto me-4" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[13px] text-muted-foreground">الإدارة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id)}
                    isActive={activeSection === item.id}
                    className={cn(
                      // the active item is an ink pill, like the student rail; it has to
                      // be set on data-[active=true], which the base styles also target
                      "h-11 w-full justify-start gap-3 rounded-2xl text-base data-[active=true]:bg-primary data-[active=true]:font-medium data-[active=true]:text-primary-foreground"
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
                    <GraduationCap className="h-4 w-4" />
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