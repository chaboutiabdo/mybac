import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, Star, Award, FileText, Download, Eye, MessageSquare } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Alumni {
  id: string;
  name: string;
  bac_score: number;
  university: string;
  field_of_study: string;
  avatar_url?: string;
  advice: string;
  available_for_mentoring: boolean;
  linkedin_url?: string;
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

const Alumni = () => {
  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [alumniFiles, setAlumniFiles] = useState<AlumniFile[]>([]);
  const [alumniAdvice, setAlumniAdvice] = useState<AlumniAdvice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        .eq('available_for_mentoring', true)
        .order('bac_score', { ascending: false });

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
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlumniAdvice(data || []);
    } catch (error) {
      console.error('Error fetching alumni advice:', error);
    }
  };

  const handleViewProfile = (alumnus: Alumni) => {
    setSelectedAlumni(alumnus);
    setShowDetailsDialog(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getScoreColor = (score: number) => {
    if (score >= 18) return "text-success";
    if (score >= 16) return "text-warning";
    return "text-primary";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Alumni Mentorship
            </h1>
            <p className="text-muted-foreground text-lg">
              Learn from successful BAC graduates and get personalized guidance
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : alumni.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No alumni mentors available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alumni.map((alumnus) => (
                <Card key={alumnus.id} className="group hover:shadow-lg transition-all duration-300 border-primary/10 animate-fade-in hover:scale-105">
                  <CardHeader className="text-center space-y-4">
                    <Avatar className="h-20 w-20 mx-auto">
                      <AvatarImage src={alumnus.avatar_url || "/placeholder.svg"} alt={alumnus.name} />
                      <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-accent/20">
                        {alumnus.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <CardTitle className="text-xl">{alumnus.name}</CardTitle>
                      <CardDescription className="flex items-center justify-center gap-1 mt-2">
                        <GraduationCap className="h-4 w-4" />
                        Alumni Mentor
                      </CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">BAC Score:</span>
                        <Badge className={`${getScoreColor(alumnus.bac_score)} font-bold`}>
                          <Award className="h-3 w-3 mr-1" />
                          {alumnus.bac_score}/20
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">University:</div>
                        <div className="text-sm text-muted-foreground">{alumnus.university}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Field of Study:</div>
                        <div className="text-sm text-muted-foreground">{alumnus.field_of_study}</div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2">Advice:</div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {alumnus.advice}
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleViewProfile(alumnus)}
                      className="w-full gradient-primary text-white hover:scale-105 transition-all"
                      variant="default"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Files & Advice
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Files and Advice Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              {selectedAlumni?.name}'s Profile
            </DialogTitle>
            <DialogDescription>
              View files and advice from this successful graduate
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="advice" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="advice" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Advice
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Files
              </TabsTrigger>
            </TabsList>

            <TabsContent value="advice" className="space-y-4 mt-4">
              {alumniAdvice.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No advice available yet from this alumni.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alumniAdvice.map((advice) => (
                    <Card key={advice.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{advice.title}</h3>
                          {advice.is_featured && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3">{advice.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{advice.category}</Badge>
                          <span>•</span>
                          <span>{new Date(advice.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-4 mt-4">
              {alumniFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No files available yet from this alumni.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alumniFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{file.file_name}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatFileSize(file.file_size)}</span>
                                <span>•</span>
                                <span>{new Date(file.created_at).toLocaleDateString()}</span>
                              </div>
                              {file.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{file.description}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(file.file_path, '_blank')}
                            className="ml-2"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alumni;