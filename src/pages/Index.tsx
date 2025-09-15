import { Navigate } from "react-router-dom";
import Navigation from "@/components/layout/Navigation";
import StatsCard from "@/components/dashboard/StatsCard";
import Leaderboard from "@/components/dashboard/Leaderboard";
import UserProfile from "@/components/dashboard/UserProfile";
import AdviceTips from "@/components/dashboard/AdviceTips";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  FileText, 
  PlayCircle, 
  Trophy, 
  Target,
  TrendingUp,
  BookOpen,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const { t, isRTL } = useLanguage();
  
  return (
    <ProtectedRoute>
      <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6">
            {/* User Profile Section */}
            <UserProfile />
            
            {/* Stats Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title={t("totalScore")}
                value="1,250"
                subtitle={t("pointsEarned")}
                icon={Trophy}
                variant="accent"
                trend={{ value: `+125 ${t("thisWeek")}`, isPositive: true }}
              />
              <StatsCard
                title={t("quizzesCompleted")}
                value="47"
                subtitle={t("dailyAndPractice")}
                icon={Brain}
                variant="default"
                trend={{ value: `+5 ${t("thisWeek")}`, isPositive: true }}
              />
              <StatsCard
                title={t("examsSolved")}
                value="23"
                subtitle={t("pastBacPapers")}
                icon={FileText}
                variant="success"
              />
              <StatsCard
                title={t("studyStreak")}
                value="12"
                subtitle={t("daysInARow")}
                icon={Target}
                variant="warning"
              />
            </div>
            
            {/* Main Dashboard Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <QuickActions />
                <RecentActivity />
              </div>
              <div className="space-y-6">
                <Leaderboard />
                <AdviceTips />
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
