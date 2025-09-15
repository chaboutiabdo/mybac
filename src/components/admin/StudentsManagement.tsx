import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Filter,
  UserPlus,
  Edit,
  Trash2,
  School,
  Trophy,
  Target,
  Clock,
  Eye
} from "lucide-react";
import { StudentApprovalDialog } from "./StudentApprovalDialog";
import { AddStudentDialog } from "./AddStudentDialog";
import { StudentActivityDialog } from "./StudentActivityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"profiles"> & {
  quizzesCompleted: number;
  lastActive: string;
  status: "active" | "inactive";
};

export function StudentsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load students from Supabase
  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load students",
          variant: "destructive",
        });
        return;
      }

      // Get real activity data for each student
      const studentsWithStats = await Promise.all(
        data?.map(async (profile) => {
          // Get quiz attempts count
          const { data: quizAttempts } = await supabase
            .from('quiz_attempts')
            .select('id')
            .eq('student_id', profile.user_id);

          // Get last activity from various activity logs
          const [videoActivity, examActivity, questionActivity] = await Promise.all([
            supabase.from('video_activity_logs').select('created_at').eq('student_id', profile.user_id).order('created_at', { ascending: false }).limit(1),
            supabase.from('exam_activity_logs').select('created_at').eq('student_id', profile.user_id).order('created_at', { ascending: false }).limit(1),
            supabase.from('student_questions_log').select('created_at').eq('student_id', profile.user_id).order('created_at', { ascending: false }).limit(1)
          ]);

          // Find most recent activity
          const activities = [
            ...(videoActivity.data || []),
            ...(examActivity.data || []),
            ...(questionActivity.data || [])
          ];
          
          const mostRecentActivity = activities.length > 0 
            ? activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            : null;

          const lastActive = mostRecentActivity ? mostRecentActivity.created_at : profile.updated_at;
          
          // Determine if student is active (activity within last 7 days)
          const isActive = mostRecentActivity 
            ? new Date(mostRecentActivity.created_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
            : false;

          return {
            ...profile,
            quizzesCompleted: quizAttempts?.length || 0,
            lastActive,
            status: isActive ? "active" as const : "inactive" as const,
          };
        }) || []
      );

      setStudents(studentsWithStats);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Mock pending students - TODO: implement proper pending system
  const pendingStudents: any[] = [];

  const schools = ["Lycée Mohamed Boudiaf", "Lycée Ibn Khaldoun", "Lycée El Houria"];

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = schoolFilter === "all" || 
                         (schoolFilter === "no-school" && !student.stream) ||
                         student.stream === schoolFilter;
    return matchesSearch && matchesSchool;
  });

  const filteredPendingStudents = pendingStudents;

  const activeStudents = students.filter(s => s.status === "active").length;
  const totalScore = students.reduce((sum, s) => sum + s.total_score, 0);
  const avgScore = students.length > 0 ? Math.round(totalScore / students.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-8 w-8" />
            Students Management
          </h1>
          <p className="text-muted-foreground">View and manage student accounts</p>
        </div>
        <AddStudentDialog>
          <Button className="gradient-primary text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </AddStudentDialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{activeStudents}</p>
                <p className="text-sm text-muted-foreground">Active Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">{avgScore}</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{pendingStudents.length}</p>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Students Management</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "approved" ? "default" : "outline"}
                onClick={() => setActiveTab("approved")}
                size="sm"
              >
                Approved Students ({students.length})
              </Button>
              <Button
                variant={activeTab === "pending" ? "default" : "outline"}
                onClick={() => setActiveTab("pending")}
                size="sm"
              >
                Pending Approvals ({pendingStudents.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by school" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="no-school">Independent Learners</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Students Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === "approved" ? (
                    <>
                      <TableHead>Student</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Quizzes</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Student</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading students...
                    </TableCell>
                  </TableRow>
                ) : activeTab === "approved" ? (
                  filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.stream ? (
                            <Badge variant="outline" className="text-xs">
                              {student.stream}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              No Stream
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {student.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {student.total_score.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell>{student.quizzesCompleted}</TableCell>
                        <TableCell>{new Date(student.lastActive).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={student.status === "active" ? "default" : "secondary"}
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsActivityDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  filteredPendingStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No pending students
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPendingStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.school ? (
                            <span>{student.school}</span>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Independent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {student.stream}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(student.registrationDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <StudentApprovalDialog student={student}>
                            <Button size="sm" className="gradient-primary text-white">
                              Review Application
                            </Button>
                          </StudentApprovalDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedStudent && (
        <StudentActivityDialog
          isOpen={isActivityDialogOpen}
          onOpenChange={setIsActivityDialogOpen}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
        />
      )}
    </div>
  );
}