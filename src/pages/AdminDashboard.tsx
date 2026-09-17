import { Navigate, useNavigate, useParams } from "react-router-dom";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { StudentsManagement } from "@/components/admin/StudentsManagement";
import { SchoolsManagement } from "@/components/admin/SchoolsManagement";
import { VideosManagement } from "@/components/admin/VideosManagement";
import { ExamsManagement } from "@/components/admin/ExamsManagement";
import { QuizzesManagement } from "@/components/admin/QuizzesManagement";
import { AdminAdviceManagement } from "@/components/admin/AdminAdviceManagement";
import { AdviceTipsManagement } from "@/components/admin/AdviceTipsManagement";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import { type AdminSection, isAdminSection } from "@/types/admin";

const SECTIONS: Record<AdminSection, () => JSX.Element> = {
  overview: AdminOverview,
  students: StudentsManagement,
  schools: SchoolsManagement,
  videos: VideosManagement,
  exams: ExamsManagement,
  quizzes: QuizzesManagement,
  advice: AdminAdviceManagement,
  tips: AdviceTipsManagement,
  subscriptions: SubscriptionManagement,
};

/**
 * The section is URL-backed (/admin/:section), so refresh and the browser Back
 * button work. It used to be local state, which reset to Overview on reload and
 * made Back leave /admin entirely.
 *
 * No ProtectedRoute here — App.tsx already wraps this route in one.
 */
const AdminDashboard = () => {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  if (!section) return <Navigate to="/admin/overview" replace />;
  if (!isAdminSection(section)) return <Navigate to="/admin/overview" replace />;

  const Section = SECTIONS[section];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar
          activeSection={section}
          onSectionChange={(next) => navigate(`/admin/${next}`)}
        />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <Section />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
