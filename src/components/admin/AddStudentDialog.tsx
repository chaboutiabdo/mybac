import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Upload, Users, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddStudentDialogProps {
  children: React.ReactNode;
}

export function AddStudentDialog({ children }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [hasSchool, setHasSchool] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Student form state
  const [studentData, setStudentData] = useState({
    name: "",
    email: "",
    password: "",
    school: "",
    stream: "",
    phone: "",
    notes: ""
  });


  // Fetch real schools from Supabase
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError(null);
      const { data, error } = await supabase.from("schools").select("id, name");
      if (error) {
        setSchoolsError("Failed to load schools");
      } else if (data) {
        setSchools(data);
      }
      setSchoolsLoading(false);
    };
    fetchSchools();
  }, []);

  const streams = [
    "Sciences Expérimentales",
    "Mathématiques",
    "Technique Mathématiques",
    "Gestion Économie",
    "Lettres",
    "Informatique"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 1. Create user in Supabase Auth (optional, if using Supabase Auth)
    // 2. Insert into profiles table
    // 3. If hasSchool, insert into school_students
    try {
      // Insert into profiles
      // 1. Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: studentData.email,
        password: studentData.password,
        email_confirm: true
      });
      if (authError || !authUser?.user) {
        toast({ title: "Error", description: authError?.message || "Failed to create auth user.", variant: "destructive" });
        return;
      }
      const userId = authUser.user.id;
      // 2. Insert into profiles
      const { data: profile, error: profileError } = await supabase.from("profiles").insert({
        name: studentData.name,
        email: studentData.email,
        stream: studentData.stream,
        role: "student",
        user_id: userId,
        subscription_tier: "basic",
        total_score: 0,
      }).select().single();
      if (profileError || !profile) {
        toast({ title: "Error", description: profileError?.message || "Failed to add student.", variant: "destructive" });
        return;
      }
      // If hasSchool, link to school_students
      if (hasSchool && studentData.school) {
        // Find school id by name
        const { data: school } = await supabase.from("schools").select("id").eq("name", studentData.school).single();
        if (school) {
          await supabase.from("school_students").insert({
            school_id: school.id,
            student_id: profile.user_id,
            status: "active"
          });
        }
      }
      toast({
        title: "Student Added",
        description: `${studentData.name} has been successfully added to the system.`,
      });
      setOpen(false);
      // Reset form
      setStudentData({
        name: "",
        email: "",
        password: "",
        school: "",
        stream: "",
        phone: "",
        notes: ""
      });
      setHasSchool(false);
    } catch (err) {
      toast({ title: "Error", description: "Unexpected error.", variant: "destructive" });
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const processCsvFile = async () => {
    if (!csvFile) return;
    toast({ title: "CSV Upload Started", description: "Processing student data from CSV file..." });
    try {
      const text = await csvFile.text();
      const rows = text.split(/\r?\n/).filter(Boolean);
      if (rows.length < 2) throw new Error("CSV must have a header and at least one row");
      const headers = rows[0].split(",").map(h => h.trim());
      const students = rows.slice(1).map(row => {
        const values = row.split(",");
        const obj = {} as any;
        headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : ""; });
        return obj;
      });
      for (const student of students) {
        // Insert into profiles
        const userId = student.email;
        const { data: profile, error: profileError } = await supabase.from("profiles").insert({
          name: student.name,
          email: student.email,
          stream: student.stream,
          role: "student",
          user_id: userId,
        }).select().single();
        if (profileError || !profile) continue;
        // If school specified, link to school_students
        if (student.school) {
          const { data: school } = await supabase.from("schools").select("id").eq("name", student.school).single();
          if (school) {
            await supabase.from("school_students").insert({
              school_id: school.id,
              student_id: profile.user_id,
              status: "active"
            });
          }
        }
      }
      toast({ title: "CSV Upload Complete", description: "All students processed." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to process CSV.", variant: "destructive" });
    }
    setCsvFile(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Student
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Single Student
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              CSV Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={studentData.name}
                        onChange={(e) => setStudentData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter student's full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={studentData.email}
                        onChange={(e) => setStudentData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="student@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={studentData.password}
                        onChange={(e) => setStudentData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Temporary password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={studentData.phone}
                        onChange={(e) => setStudentData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+213 XXX XXX XXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stream">Stream *</Label>
                    <Select 
                      value={studentData.stream} 
                      onValueChange={(value) => setStudentData(prev => ({ ...prev, stream: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student's stream" />
                      </SelectTrigger>
                      <SelectContent>
                        {streams.map((stream) => (
                          <SelectItem key={stream} value={stream}>
                            {stream}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* School Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    School Information
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="has-school" className="text-sm font-normal">
                        Student has school
                      </Label>
                      <Switch
                        id="has-school"
                        checked={hasSchool}
                        onCheckedChange={setHasSchool}
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasSchool ? (
                    <div className="space-y-2">
                      <Label htmlFor="school">School</Label>
                      <Select
                        value={studentData.school}
                        onValueChange={(value) => setStudentData(prev => ({ ...prev, school: value }))}
                        disabled={schoolsLoading || !!schoolsError}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={schoolsLoading ? "Loading..." : (schoolsError ? schoolsError : "Select student's school")} />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school.id} value={school.name}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>This student will be registered as an independent learner</p>
                      <p className="text-sm">No school affiliation required</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={studentData.notes}
                      onChange={(e) => setStudentData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any additional information about the student..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-white">
                  Add Student
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  CSV File Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <Label htmlFor="csv-upload" className="text-base font-medium cursor-pointer">
                      Choose CSV File
                    </Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with student information
                    </p>
                    {csvFile && (
                      <p className="text-sm text-primary font-medium">
                        Selected: {csvFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Required columns:</strong> name, email, password, stream</p>
                    <p><strong>Optional columns:</strong> school, phone, notes</p>
                    <p><strong>Example:</strong></p>
                    <code className="block mt-2 p-2 bg-background rounded text-xs">
                      name,email,password,stream,school,phone<br/>
                      Ahmed Benali,ahmed@email.com,temp123,Sciences Expérimentales,Lycée Mohamed Boudiaf,+213123456789<br/>
                      Sara Amrani,sara@email.com,temp456,Mathématiques,,+213987654321
                    </code>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={processCsvFile} 
                    disabled={!csvFile}
                    className="gradient-primary text-white"
                  >
                    Upload Students
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}