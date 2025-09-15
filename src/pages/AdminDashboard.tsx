import { useState } from "react";
import { AdviceTipsManagement } from "@/components/admin/AdviceTipsManagement";
import { AdminAdviceManagement } from "@/components/admin/AdminAdviceManagement";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { SubscriptionManagement as SimpleSubscriptionManagement } from "@/components/admin/SimpleSubscriptionManagement";
import { SchoolsManagement } from "@/components/admin/SchoolsManagement";
import { StudentsManagement } from "@/components/admin/StudentsManagement";
import { ExamsManagement } from "@/components/admin/ExamsManagement";
import { SessionsManagement } from "@/components/admin/SessionsManagement";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AlumniManagement } from "@/components/admin/AlumniManagement";
import { VideosManagement } from "@/components/admin/VideosManagement";
import { QuizzesManagement } from "@/components/admin/QuizzesManagement";
import ProtectedRoute from "@/components/ProtectedRoute";

type AdminSection = "overview" | "schools" | "students" | "alumni" | "videos" | "exams" | "quizzes" | "sessions" | "settings" | "tips" | "subscriptions" | "advice";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return <AdminOverview />;
      case "schools":
        return <SchoolsManagement />;
      case "students":
        return <StudentsManagement />;
      case "alumni":
        return <AlumniManagement />;
      case "videos":
        return <VideosManagement />;
      case "exams":
        return <ExamsManagement />;
      case "quizzes":
        return <QuizzesManagement />;
      case "sessions":
        return <SessionsManagement />;
      case "settings":
        return <AdminSettings />;
      case "tips":
        return <AdviceTipsManagement />;
      case "subscriptions":
        return <SimpleSubscriptionManagement />;
      case "advice":
        return <AdminAdviceManagement />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
          <main className="flex-1 overflow-auto">
            <div className="container py-6">
              {renderActiveSection()}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default AdminDashboard;