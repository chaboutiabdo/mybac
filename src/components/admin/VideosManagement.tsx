import { useState, useEffect } from "react";
import { SUBJECTS, chapterLabel, chaptersFor, subjectLabel } from "@/lib/bac";
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
  Clock
} from "lucide-react";
import { toast } from "sonner";
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

  // Load videos from Supabase
  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("خطأ", { description: "تعذّر تحميل الدروس" });
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

  const subjects = SUBJECTS.map((s) => s.value);
  // chapters follow the chosen subject, from the real curriculum
  const chapters = chaptersFor(formData.subject);

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
      toast.error("خطأ", { description: "املأ كل الحقول المطلوبة" });
      return;
    }

    if (!formData.url) {
      toast.error("خطأ", { description: "أدخل رابط فيديو صالحاً" });
      return;
    }

    try {
      const { error } = await supabase
        .from("videos")
        .insert({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          // Playback reads `url` for youtube and `file_path` for premium.
          // Only `url` was ever written, so premium videos never opened.
          url: formData.type === "youtube" ? formData.url : null,
          file_path: formData.type === "premium" ? formData.url : null,
          // the field is labelled "minutes" but the column is seconds, so a
          // 15-minute video used to render as 0:15
          duration: formData.duration ? parseInt(formData.duration) * 60 : null,
          subject: formData.subject,
          chapter: formData.chapter,
        });

      if (error) {
        toast.error("خطأ", { description: "تعذّر إنشاء الدرس" });
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
      
      toast.success("تم", { description: "تمت إضافة الدرس" });
    } catch (error) {
      console.error("Error creating video:", error);
      toast.error("خطأ", { description: "تعذّر إنشاء الدرس" });
    }
  };

  const totalVideos = videos.length;
  const youtubeVideos = videos.filter(v => v.type === "youtube").length;
  const premiumVideos = videos.filter(v => v.type === "premium").length;
  const avgDuration = videos.length > 0 ? Math.round(videos.reduce((sum, v) => sum + (v.duration || 0), 0) / videos.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
            <Video className="h-8 w-8" />
            إدارة الدروس
          </h1>
          <p className="text-muted-foreground">الدروس المرئية حسب المواد والفصول</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-primary-foreground">
              <Plus className="h-4 w-4 me-2" />
              إضافة درس
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة درس جديد</DialogTitle>
              <DialogDescription>
                أضف درساً برابط يوتيوب أو برابط درس مميّز.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={formData.type} onValueChange={(value) => setFormData({...formData, type: value as "youtube" | "premium"})}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="youtube">درس يوتيوب</TabsTrigger>
                <TabsTrigger value="premium">درس مميّز</TabsTrigger>
              </TabsList>
              
              <TabsContent value="youtube" className="space-y-4">
                <div>
                  <Label htmlFor="video-url">رابط يوتيوب</Label>
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
                  <Label htmlFor="premium-url">رابط الدرس المميّز أو مسار الملف</Label>
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
                <Label htmlFor="title">عنوان الدرس *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="عنوان الدرس"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="وصف الدرس"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="subject">المادة *</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="chapter">الفصل *</Label>
                <Select value={formData.chapter} onValueChange={(value) => setFormData({...formData, chapter: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter.value} value={chapter.value}>{chapter.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">المدة (بالدقائق)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  placeholder="المدة بالدقائق"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVideo} className="text-primary-foreground">
                إضافة الدرس
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <div>
                <p className="text-3xl font-bold">{totalVideos}</p>
                <p className="text-base text-muted-foreground">إجمالي الدروس</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-success" />
              <div>
                <p className="text-3xl font-bold">{youtubeVideos}</p>
                <p className="text-base text-muted-foreground">يوتيوب</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <div>
                <p className="text-3xl font-bold">{premiumVideos}</p>
                <p className="text-base text-muted-foreground">مميّز</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              <div>
                <p className="text-3xl font-bold">{avgDuration} د</p>
                <p className="text-base text-muted-foreground">متوسط المدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Videos List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>مكتبة الدروس</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                onClick={() => setActiveTab("all")}
                size="sm"
              >
                كل الدروس ({videos.length})
              </Button>
              <Button
                variant={activeTab === "youtube" ? "default" : "outline"}
                onClick={() => setActiveTab("youtube")}
                size="sm"
              >
                يوتيوب ({youtubeVideos})
              </Button>
              <Button
                variant={activeTab === "premium" ? "default" : "outline"}
                onClick={() => setActiveTab("premium")}
                size="sm"
              >
                مميّزة ({premiumVideos})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالعنوان أو الوصف أو المادة…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder="المادة" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">كل المواد</SelectItem>
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
                  <TableHead>العنوان</TableHead>
                  <TableHead>المادة</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      جارٍ تحميل الدروس…
                    </TableCell>
                  </TableRow>
                ) : filteredVideos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      لا توجد دروس
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVideos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{video.title}</p>
                          <p className="text-base text-muted-foreground line-clamp-2">
                            {video.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-sm">
                          {subjectLabel(video.subject)}
                        </Badge>
                      </TableCell>
                      <TableCell>{chapterLabel(video.chapter)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={video.type === "premium" ? "default" : "secondary"}
                          className="text-sm"
                        >
                          <div className="flex items-center gap-1">
                            {video.type === "premium" ? (
                              <Upload className="h-3 w-3" />
                            ) : (
                              <Link className="h-3 w-3" />
                            )}
                            {video.type === "premium" ? "مميّز" : "يوتيوب"}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.duration ? `${video.duration} د` : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" title="تشغيل">
                            <Play className="h-4 w-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="sm" title="تعديل">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="حذف">
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