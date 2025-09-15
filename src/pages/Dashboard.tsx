import Navigation from "@/components/layout/Navigation";
import StatsCard from "@/components/dashboard/StatsCard";
import UserProfile from "@/components/dashboard/UserProfile";
import QuickActions from "@/components/dashboard/QuickActions";
import Leaderboard from "@/components/dashboard/Leaderboard";
import AdviceTips from "@/components/dashboard/AdviceTips";
import AdminAdvice from "@/components/AdminAdvice";
import { BookOpen, Video, FileText, Trophy } from "lucide-react";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Dashboard = () => {
  const { user } = useAuth();
  const { trackStudentQuestion } = useActivityTracking();

  // Example of how to track activity when the user visits the dashboard
  useEffect(() => {
    if (user) {
      // Track that user visited dashboard (as a general activity)
      trackStudentQuestion(
        "User visited dashboard",
        "navigation",
        "general",
        "general"
      );
    }
  }, [user, trackStudentQuestion]);

  const stats = [
    {
      title: "Total Score",
      value: "2,847",
      icon: Trophy,
      color: "text-yellow-500" as const,
      bgColor: "bg-yellow-100" as const
    },
    {
      title: "Completed Quizzes",
      value: "45",
      icon: BookOpen,
      color: "text-blue-500" as const,
      bgColor: "bg-blue-100" as const
    },
    {
      title: "Videos Watched",
      value: "23",
      icon: Video,
      color: "text-green-500" as const,
      bgColor: "bg-green-100" as const
    },
    {
      title: "Exams Solved",
      value: "12",
      icon: FileText,
      color: "text-purple-500" as const,
      bgColor: "bg-purple-100" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Admin's Daily Advice */}
          <AdminAdvice />
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
              <p className="text-muted-foreground mt-1">
                تتبع تقدمك في التعلم وإنجازاتك
              </p>
            </div>
            <UserProfile />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column - Quick Actions */}
            <div className="lg:col-span-8 space-y-6">
              <QuickActions />
              <Leaderboard />
            </div>

            {/* Right Column - Tips */}
            <div className="lg:col-span-4">
              <AdviceTips />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;