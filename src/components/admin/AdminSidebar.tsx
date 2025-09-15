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
  Settings,
  GraduationCap,
  Shield,
  Calendar,
  Video,
  BookOpen,
  Lightbulb,
  TrendingUp
} from "lucide-react";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: "overview" | "schools" | "students" | "alumni" | "videos" | "exams" | "quizzes" | "sessions" | "settings" | "tips") => void;
}

const menuItems = [
  { id: "overview", title: "Overview", icon: BarChart3 },
  { id: "schools", title: "Schools", icon: School },
  { id: "students", title: "Students", icon: Users },
  { id: "alumni", title: "Alumni", icon: GraduationCap },
  { id: "videos", title: "Videos", icon: Video },
  { id: "exams", title: "Exams", icon: FileText },
  { id: "quizzes", title: "Quizzes", icon: BookOpen },
  { id: "sessions", title: "Sessions", icon: Calendar },
  { id: "tips", title: "Advice Tips", icon: Lightbulb },
  { id: "subscriptions", title: "Subscriptions", icon: TrendingUp },
  { id: "settings", title: "Settings", icon: Settings },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { state } = useSidebar();

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">Admin Panel</h2>
              <p className="text-xs text-sidebar-foreground/60">BAC Learning Platform</p>
            </div>
          )}
        </div>
        <SidebarTrigger className="ml-auto mr-4" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSectionChange(item.id as any)}
                    isActive={activeSection === item.id}
                    className="w-full justify-start"
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
            <div className="px-4 py-3 text-xs text-sidebar-foreground/60">
            {state === "expanded" && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>BAC Admin v1.0</span>
                  </div>
                  <p>Manage your learning platform</p>
                </>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}