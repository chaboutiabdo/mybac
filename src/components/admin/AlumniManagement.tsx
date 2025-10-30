import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  GraduationCap, 
  Search, 
  Filter,
  UserPlus,
  Edit,
  Trash2,
  Upload,
  Download,
  Trophy,
  Users,
  Building,
  Target,
  FileText,
  Plus,
  Eye,
  Star,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Alumni {
  id: string;
  name: string;
  university: string;
  field_of_study: string;
  bac_score?: number;
  advice?: string;
  linkedin_url?: string;
  avatar_url?: string;
  available_for_mentoring: boolean;
  created_at: string;
}

interface AlumniFile {
  id: string;
  alumni_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string;
  uploaded_by: string;
  created_at: string;
}

interface AlumniAdvice {
  id: string;
  alumni_id: string;
  title: string;
  content: string;
  category: string;
  is_featured: boolean;
  created_at: string;
}

export function AlumniManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [alumniFiles, setAlumniFiles] = useState<AlumniFile[]>([]);
  const [alumniAdvice, setAlumniAdvice] = useState<AlumniAdvice[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for manual creation
  const [formData, setFormData] = useState({
    name: "",
    university: "",
    field_of_study: "",
    bac_score: "",
    advice: "",
    linkedin_url: "",
    avatar_url: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // File upload state
  const [fileUploadData, setFileUploadData] = useState({
    file: null as File | null,
    description: "",
    category: "general"
  });

  // Advice state
  const [adviceData, setAdviceData] = useState({
    title: "",
    content: "",
    category: "general",
    is_featured: false
  });

  const fields = ["Computer Science", "Engineering", "Medicine", "Economics", "Law", "Architecture", "Business", "Sciences"];

  useEffect(() => {
    fetchAlumni();
  }, []);

  useEffect(() => {
    if (selectedAlumni) {
      fetchAlumniFiles(selectedAlumni.id);
      fetchAlumniAdvice(selectedAlumni.id);
    }
  }, [selectedAlumni]);

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlumni(data || []);
    } catch (error) {
      console.error('Error fetching alumni:', error);
      toast({
        title: "Error",
        description: "Failed to load alumni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumniFiles = async (alumniId: string) => {
    try {
      const { data, error } = await supabase
        .from('alumni_files')
        .select('*')
        .eq('alumni_id', alumniId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlumniFiles(data || []);
    } catch (error) {
      console.error('Error fetching alumni files:', error);
    }
  };

  const fetchAlumniAdvice = async (alumniId: string) => {
    try {
      const { data, error } = await supabase
        .from('alumni_advice')
        .select('*')
        .eq('alumni_id', alumniId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlumniAdvice(data || []);
    } catch (error) {
      console.error('Error fetching alumni advice:', error);
    }
  };

  const filteredAlumni = alumni.filter(alumnus => {
    const matchesSearch = alumnus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alumnus.university.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesField = fieldFilter === "all" || alumnus.field_of_study === fieldFilter;
    return matchesSearch && matchesField;
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `alumni/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCreateAlumni = async () => {
    if (!formData.name || !formData.university || !formData.field_of_study) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      let avatarUrl = formData.avatar_url;

      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      const { data, error } = await supabase
        .from('alumni')
        .insert({
          name: formData.name,
          university: formData.university,
          field_of_study: formData.field_of_study,
          bac_score: formData.bac_score ? parseFloat(formData.bac_score) : null,
          advice: formData.advice,
          linkedin_url: formData.linkedin_url,
          avatar_url: avatarUrl,
          available_for_mentoring: true
        })
        .select()
        .single();

      if (error) throw error;

      setAlumni([data, ...alumni]);
      setFormData({
        name: "",
        university: "",
        field_of_study: "",
        bac_score: "",
        advice: "",
        linkedin_url: "",
        avatar_url: ""
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Alumni profile created successfully",
      });
    } catch (error) {
      console.error('Error creating alumni:', error);
      toast({
        title: "Error",
        description: "Failed to create alumni profile",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async () => {
    if (!fileUploadData.file || !selectedAlumni || !user) return;

    try {
      const fileExt = fileUploadData.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `alumni/${selectedAlumni.id}/${fileUploadData.category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('alumni-files')
        .upload(filePath, fileUploadData.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('alumni-files')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('alumni_files')
        .insert({
          alumni_id: selectedAlumni.id,
          file_name: fileUploadData.file.name,
          file_path: publicUrl,
          file_type: fileUploadData.file.type,
          file_size: fileUploadData.file.size,
          description: fileUploadData.description || null,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      setFileUploadData({ file: null, description: "", category: "general" });
      fetchAlumniFiles(selectedAlumni.id);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleAddAdvice = async () => {
    if (!adviceData.title || !adviceData.content || !selectedAlumni) return;

    try {
      const { error } = await supabase
        .from('alumni_advice')
        .insert({
          alumni_id: selectedAlumni.id,
          title: adviceData.title,
          content: adviceData.content,
          category: adviceData.category,
          is_featured: adviceData.is_featured
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advice added successfully",
      });

      setAdviceData({ title: "", content: "", category: "general", is_featured: false });
      fetchAlumniAdvice(selectedAlumni.id);
    } catch (error) {
      console.error('Error adding advice:', error);
      toast({
        title: "Error",
        description: "Failed to add advice",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('alumni_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      if (selectedAlumni) {
        fetchAlumniFiles(selectedAlumni.id);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdvice = async (adviceId: string) => {
    try {
      const { error } = await supabase
        .from('alumni_advice')
        .delete()
        .eq('id', adviceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Advice deleted successfully",
      });

      if (selectedAlumni) {
        fetchAlumniAdvice(selectedAlumni.id);
      }
    } catch (error) {
      console.error('Error deleting advice:', error);
      toast({
        title: "Error",
        description: "Failed to delete advice",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalAlumni = alumni.length;
  const avgScore = alumni.length > 0 ? Math.round(alumni.reduce((sum, a) => sum + (a.bac_score || 0), 0) / alumni.length) : 0;
  const uniqueUniversities = new Set(alumni.map(a => a.university)).size;
  const uniqueFields = new Set(alumni.map(a => a.field_of_study)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Alumni Management
          </h1>
          <p className="text-muted-foreground">Manage alumni profiles, files, and advice</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Alumni
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Alumni Profile</DialogTitle>
                <DialogDescription>
                  Add a new alumni profile with their academic and professional information.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="university">University *</Label>
                  <Input
                    id="university"
                    value={formData.university}
                    onChange={(e) => setFormData({...formData, university: e.target.value})}
                    placeholder="University name"
                  />
                </div>
                <div>
                  <Label htmlFor="field">Field of Study *</Label>
                  <Select value={formData.field_of_study} onValueChange={(value) => setFormData({...formData, field_of_study: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="score">BAC Score</Label>
                  <Input
                    id="score"
                    type="number"
                    step="0.1"
                    value={formData.bac_score}
                    onChange={(e) => setFormData({...formData, bac_score: e.target.value})}
                    placeholder="BAC score"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="avatar">Profile Picture</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        const reader = new FileReader();
                        reader.onload = () => {
                          setPreviewUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {previewUrl && (
                    <div className="mt-2">
                      <img src={previewUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="linkedIn">LinkedIn Profile</Label>
                  <Input
                    id="linkedIn"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                    placeholder="LinkedIn URL"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="advice">Advice for Students</Label>
                  <Textarea
                    id="advice"
                    value={formData.advice}
                    onChange={(e) => setFormData({...formData, advice: e.target.value})}
                    placeholder="Share your advice for current students..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlumni} className="gradient-primary text-white">
                  Create Alumni
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalAlumni}</p>
                <p className="text-sm text-muted-foreground">Total Alumni</p>
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
                <p className="text-sm text-muted-foreground">Avg BAC Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{uniqueUniversities}</p>
                <p className="text-sm text-muted-foreground">Universities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{uniqueFields}</p>
                <p className="text-sm text-muted-foreground">Fields of Study</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alumni List */}
      <Card>
        <CardHeader>
          <CardTitle>Alumni Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alumni by name or university..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={fieldFilter} onValueChange={setFieldFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                {fields.map((field) => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alumni Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlumni.map((alumnus) => (
                <Card key={alumnus.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={alumnus.avatar_url} alt={alumnus.name} />
                        <AvatarFallback>
                          {alumnus.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-semibold">{alumnus.name}</h3>
                          <p className="text-sm text-muted-foreground">{alumnus.university}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {alumnus.field_of_study}
                        </Badge>
                        {alumnus.bac_score && (
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-accent" />
                            <span className="text-xs font-medium">{alumnus.bac_score}</span>
                          </div>
                        )}
                        {alumnus.advice && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{alumnus.advice}</p>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs" 
                          onClick={() => {
                            setSelectedAlumni(alumnus);
                            setShowManageDialog(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          Manage Files & Advice
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredAlumni.length === 0 && (
                <div className="col-span-3 text-center py-12">
                  <p className="text-muted-foreground">No alumni found matching your criteria.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Manage {selectedAlumni?.name}
            </DialogTitle>
            <DialogDescription>
              Upload files and add advice for this alumni
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="files" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files">
                <FileText className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger value="advice">
                <Star className="h-4 w-4 mr-2" />
                Advice
              </TabsTrigger>
            </TabsList>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>File</Label>
                      <Input
                        type="file"
                        onChange={(e) => setFileUploadData({...fileUploadData, file: e.target.files?.[0] || null})}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={fileUploadData.category} onValueChange={(value) => setFileUploadData({...fileUploadData, category: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resume">Resume</SelectItem>
                          <SelectItem value="portfolio">Portfolio</SelectItem>
                          <SelectItem value="certificates">Certificates</SelectItem>
                          <SelectItem value="documents">Documents</SelectItem>
                          <SelectItem value="images">Images</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="File description..."
                      value={fileUploadData.description}
                      onChange={(e) => setFileUploadData({...fileUploadData, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleFileUpload} disabled={!fileUploadData.file} className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Files</CardTitle>
                </CardHeader>
                <CardContent>
                  {alumniFiles.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No files uploaded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {alumniFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">{file.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}
                              </p>
                              {file.description && (
                                <p className="text-xs text-muted-foreground mt-1">{file.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => window.open(file.file_path, '_blank')}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteFile(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advice Tab */}
            <TabsContent value="advice" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Advice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        placeholder="Advice title"
                        value={adviceData.title}
                        onChange={(e) => setAdviceData({...adviceData, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={adviceData.category} onValueChange={(value) => setAdviceData({...adviceData, category: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="study">Study Tips</SelectItem>
                          <SelectItem value="exam">Exam Preparation</SelectItem>
                          <SelectItem value="university">University Choice</SelectItem>
                          <SelectItem value="career">Career Guidance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      placeholder="Your advice content..."
                      value={adviceData.content}
                      onChange={(e) => setAdviceData({...adviceData, content: e.target.value})}
                      rows={6}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={adviceData.is_featured}
                      onChange={(e) => setAdviceData({...adviceData, is_featured: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="featured">Mark as featured</Label>
                  </div>
                  <Button onClick={handleAddAdvice} disabled={!adviceData.title || !adviceData.content} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Advice
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advice List</CardTitle>
                </CardHeader>
                <CardContent>
                  {alumniAdvice.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No advice added yet</p>
                  ) : (
                    <div className="space-y-4">
                      {alumniAdvice.map((advice) => (
                        <div key={advice.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{advice.title}</h4>
                                {advice.is_featured && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{advice.content}</p>
                              <p className="text-xs text-muted-foreground">
                                {advice.category} • {new Date(advice.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAdvice(advice.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}