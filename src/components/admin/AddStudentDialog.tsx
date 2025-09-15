import { useState } from "react";
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

  const schools = [
    "Lycée Mohamed Boudiaf",
    "Lycée Ibn Khaldoun", 
    "Lycée El Houria",
    "Lycée Ibn Sina",
    "Lycée Al Khawarizmi"
  ];

  const streams = [
    "Sciences Expérimentales",
    "Mathématiques",
    "Technique Mathématiques",
    "Gestion Économie",
    "Lettres",
    "Informatique"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add student creation logic when Supabase is connected
    console.log("Creating student:", { ...studentData, hasSchool });
    
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
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const processCsvFile = () => {
    if (!csvFile) return;
    
    // TODO: Process CSV file when Supabase is connected
    console.log("Processing CSV file:", csvFile.name);
    
    toast({
      title: "CSV Upload Started",
      description: "Processing student data from CSV file...",
    });
    
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
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student's school" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school} value={school}>
                              {school}
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