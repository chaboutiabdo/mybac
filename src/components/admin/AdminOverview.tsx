import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  GraduationCap, 
  FileText, 
  Video,
  TrendingUp,
  Plus,
  Calendar,
  BookOpen,
  Upload
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { AddStudentDialog } from "./AddStudentDialog";
import { UploadExamDialog } from "./UploadExamDialog";
import { AddSolutionDialog } from "./AddSolutionDialog";
import { UploadQuizDialog } from "./UploadQuizDialog";

export function AdminOverview() {
  const [stats, setStats] = useState({
    students: 0,
    schools: 0,
    exams: 0,
    videos: 0
  });
  const [showUploadQuiz, setShowUploadQuiz] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [studentsResponse, schoolsResponse, examsResponse, videosResponse] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('schools').select('id', { count: 'exact' }),
        supabase.from('exams').select('id', { count: 'exact' }),
        supabase.from('videos').select('id', { count: 'exact' })
      ]);

      setStats({
        students: studentsResponse.count || 0,
        schools: schoolsResponse.count || 0,
        exams: examsResponse.count || 0,
        videos: videosResponse.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const recentActivities = [
    { action: "New student registered", user: "Ahmed Benali", time: "2 minutes ago" },
    { action: "Exam uploaded", user: "Admin", time: "1 hour ago" },
    { action: "School added", user: "Admin", time: "3 hours ago" },
    { action: "Student completed quiz", user: "Fatima Zohra", time: "5 hours ago" },
  ];

  const topSchools = [
    { name: "Lycée Mohamed Boudiaf", students: 245, completion: 87 },
    { name: "Lycée Ibn Khaldoun", students: 198, completion: 92 },
    { name: "Lycée El Houria", students: 156, completion: 79 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your platform.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={stats.students}
          subtitle="Active learners"
          icon={Users}
          variant="default"
        />
        <StatsCard
          title="Schools"
          value={stats.schools}
          subtitle="Registered schools"
          icon={GraduationCap}
          variant="success"
        />
        <StatsCard
          title="Exams Available"
          value={stats.exams}
          subtitle="BAC papers"
          icon={FileText}
          variant="accent"
        />
        <StatsCard
          title="Videos"
          value={stats.videos}
          subtitle="Educational content"
          icon={Video}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start justify-between space-x-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">by {activity.user}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Schools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Top Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSchools.map((school, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{school.name}</p>
                      <p className="text-xs text-muted-foreground">{school.students} students</p>
                    </div>
                    <Badge 
                      variant={school.completion >= 85 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {school.completion}% completion
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-success h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${school.completion}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AddStudentDialog>
              <Button 
                className="w-full h-20 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Student
              </Button>
            </AddStudentDialog>
            <UploadExamDialog>
              <Button 
                className="w-full h-20 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Exam
              </Button>
            </UploadExamDialog>
            <AddSolutionDialog examTitle="Select Exam">
              <Button 
                className="w-full h-20 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white"
              >
                <FileText className="h-5 w-5 mr-2" />
                Add Solution
              </Button>
            </AddSolutionDialog>
            <Button 
              className="w-full h-20 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              onClick={() => setShowUploadQuiz(true)}
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Practice Quiz
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Quiz Dialog */}
      <UploadQuizDialog
        isOpen={showUploadQuiz}
        onOpenChange={setShowUploadQuiz}
        onQuizUploaded={() => {
          setShowUploadQuiz(false);
          fetchStats();
        }}
      />
    </div>
  );
}