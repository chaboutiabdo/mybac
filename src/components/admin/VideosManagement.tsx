import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Video, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  Upload,
  Link,
  Play,
  BookOpen,
  GraduationCap,
  Clock,
  Eye,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type VideoItem = Tables<"videos">;

export function VideosManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "youtube" | "premium">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load videos from Supabase
  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load videos",
          variant: "destructive",
        });
        return;
      }

      setVideos(data || []);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Form state for video creation
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "youtube" as "youtube" | "premium",
    url: "",
    duration: "",
    subject: "",
    chapter: "",
  });

  const subjects = ["Mathématiques", "Physique", "Chimie", "SVT", "Histoire", "Géographie", "Français", "Anglais", "Arabe", "Philosophie"];
  const chapters = ["Introduction", "Chapitre 1", "Chapitre 2", "Chapitre 3", "Révisions", "Examens Blancs"];

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (video.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || video.subject === subjectFilter;
    const matchesType = activeTab === "all" || video.type === activeTab;
    return matchesSearch && matchesSubject && matchesType;
  });

  const handleCreateVideo = async () => {
    if (!formData.title || !formData.subject || !formData.chapter) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.url) {
      toast({
        title: "Error",
        description: "Please provide a valid video URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("videos")
        .insert({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          url: formData.url,
          duration: parseInt(formData.duration) || null,
          subject: formData.subject,
          chapter: formData.chapter,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create video",
          variant: "destructive",
        });
        return;
      }

      // Reload videos
      await loadVideos();
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        type: "youtube",
        url: "",
        duration: "",
        subject: "",
        chapter: "",
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Video created successfully",
      });
    } catch (error) {
      console.error("Error creating video:", error);
      toast({
        title: "Error",
        description: "Failed to create video",
        variant: "destructive",
      });
    }
  };

  const totalVideos = videos.length;
  const youtubeVideos = videos.filter(v => v.type === "youtube").length;
  const premiumVideos = videos.filter(v => v.type === "premium").length;
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const avgDuration = videos.length > 0 ? Math.round(videos.reduce((sum, v) => sum + (v.duration || 0), 0) / videos.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Video className="h-8 w-8" />
            Videos Management
          </h1>
          <p className="text-muted-foreground">Manage video content, subjects, and chapters</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Video</DialogTitle>
              <DialogDescription>
                Add a new video by providing a YouTube or premium video URL.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as "youtube" | "premium"})}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="youtube">YouTube Video</TabsTrigger>
                <TabsTrigger value="premium">Premium Video</TabsTrigger>
              </TabsList>
              
              <TabsContent value="youtube" className="space-y-4">
                <div>
                  <Label htmlFor="video-url">YouTube Video URL</Label>
                  <Input
                    id="video-url"
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="premium" className="space-y-4">
                <div>
                  <Label htmlFor="premium-url">Premium Video URL or File Path</Label>
                  <Input
                    id="premium-url"
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    placeholder="https://example.com/video.mp4 or /uploads/video.mp4"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <Label htmlFor="title">Video Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter video title"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Video description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="chapter">Chapter *</Label>
                <Select value={formData.chapter} onValueChange={(value) => setFormData({...formData, chapter: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter} value={chapter}>{chapter}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  placeholder="Duration in minutes"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVideo} className="gradient-primary text-white">
                Create Video
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalVideos}</p>
                <p className="text-sm text-muted-foreground">Total Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{youtubeVideos}</p>
                <p className="text-sm text-muted-foreground">YouTube</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold">{premiumVideos}</p>
                <p className="text-sm text-muted-foreground">Premium</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              <div>
                <p className="text-2xl font-bold">{avgDuration}min</p>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Videos List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Video Library</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                onClick={() => setActiveTab("all")}
                size="sm"
              >
                All Videos ({videos.length})
              </Button>
              <Button
                variant={activeTab === "youtube" ? "default" : "outline"}
                onClick={() => setActiveTab("youtube")}
                size="sm"
              >
                YouTube ({youtubeVideos})
              </Button>
              <Button
                variant={activeTab === "premium" ? "default" : "outline"}
                onClick={() => setActiveTab("premium")}
                size="sm"
              >
                Premium ({premiumVideos})
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
                placeholder="Search videos by title, description, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Videos Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading videos...
                    </TableCell>
                  </TableRow>
                ) : filteredVideos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No videos found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVideos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{video.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {video.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {video.subject}
                        </Badge>
                      </TableCell>
                      <TableCell>{video.chapter}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={video.type === "premium" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <div className="flex items-center gap-1">
                            {video.type === "premium" ? (
                              <Upload className="h-3 w-3" />
                            ) : (
                              <Link className="h-3 w-3" />
                            )}
                            {video.type}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.duration ? `${video.duration}min` : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {(video.views || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" title="Play video">
                            <Play className="h-4 w-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit video">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete video">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}