import { useState, useEffect } from "react";
import { MATH_CHAPTERS, PHYSICS_CHAPTERS } from "@/lib/bac";
import { Loading } from "@/components/ui/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle, Crown, Youtube, PlayCircle } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

// `watched` is derived client-side from video_progress, not a column
type Video = Tables<"videos"> & { watched?: boolean };

/** YouTube video id from a watch or youtu.be URL, or null. */
const youtubeId = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.includes("youtube.com/watch?v=")) return url.split("v=")[1]?.split("&")[0] ?? null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1]?.split("?")[0] ?? null;
  return null;
};

const thumbnailFor = (video: Video): string | null => {
  const id = youtubeId(video.url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
};

const Videos = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoProgress, setVideoProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { trackVideoActivity } = useActivityTracking();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchVideos();
    if (user) {
      fetchVideoProgress();
    }
  }, [user]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("خطأ", { description: "فشل في تحميل الفيديوهات" });
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("video_progress")
        .select("video_id, watched")
        .eq("student_id", user.id);

      if (error) throw error;

      const progressMap: Record<string, boolean> = {};
      data?.forEach((progress) => {
        progressMap[progress.video_id] = progress.watched ?? false;
      });
      setVideoProgress(progressMap);
    } catch (error) {
      console.error("Error fetching video progress:", error);
    }
  };

  const handleWatchVideo = async (video: Video) => {
    if (!user) return;

    console.log("User watching video:", video.title);

    // Track video activity first
    try {
      await trackVideoActivity(video.id, "started", video.title, video.subject, video.chapter);
    } catch (error) {
      console.error("Error tracking video activity:", error);
    }

    // Open video based on device and type
    if (video.url) {
      try {
        // For YouTube videos, create an embedded player or open in popup
        if (video.type === "youtube") {
          // Extract video ID from URL
          let videoId = "";
          if (video.url.includes("youtube.com/watch?v=")) {
            videoId = video.url.split("v=")[1]?.split("&")[0];
          } else if (video.url.includes("youtu.be/")) {
            videoId = video.url.split("youtu.be/")[1]?.split("?")[0];
          }

          if (videoId) {
            // Direct link to YouTube without embedding to avoid blocking
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
            window.open(youtubeUrl, "_blank", "noopener,noreferrer");
          } else {
            // Fallback: just open the URL
            window.open(video.url, "_blank", "noopener,noreferrer");
          }

          // Update video progress after opening
          try {
            const { error } = await supabase.from("video_progress").upsert(
              {
                student_id: user.id,
                video_id: video.id,
                watched: true,
                completed_at: new Date().toISOString(),
              },
              {
                onConflict: "student_id,video_id",
              },
            );

            if (error) throw error;

            // Update local state
            setVideoProgress((prev) => ({
              ...prev,
              [video.id]: true,
            }));

            // Track video completion for scoring
            console.log("Marking video as completed:", video.title);
            await trackVideoActivity(
              video.id,
              "completed",
              video.title,
              video.subject,
              video.chapter,
            );

            toast.success("نجح", { description: "تم فتح الفيديو وتتبع التقدم!" });
          } catch (error) {
            console.error("Error updating video progress:", error);
          }
        } else {
          // For premium videos, handle file storage
          const { data } = await supabase.storage
            .from("videos")
            .createSignedUrl(video.file_path || "", 3600);

          if (data?.signedUrl) {
            window.open(data.signedUrl, "_blank", "noopener,noreferrer");
          } else {
            throw new Error("Failed to get video URL");
          }
        }
      } catch (error) {
        console.error("Error opening video:", error);
        toast.error("خطأ", { description: "فشل في فتح الفيديو. يرجى المحاولة مرة أخرى." });
      }
    } else {
      toast.error("الفيديو غير متاح", { description: "هذا الفيديو غير متاح في الوقت الحالي." });
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "غير معروف";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const filteredVideos = videos.filter((video) => {
    return (
      (!selectedSubject || selectedSubject === "all" || video.subject === selectedSubject) &&
      (!selectedChapter || selectedChapter === "all" || video.chapter === selectedChapter) &&
      (!selectedType || selectedType === "all" || video.type === selectedType)
    );
  });

  return (
    <div className="pattern-field min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-[34px] font-bold tracking-tight">فيديوهات تعليمية</h1>
            <p className="text-lg text-muted-foreground">
              تعلم من محتوى فيديو منظم وشروحات الخبراء
            </p>
          </div>

          <Card className="border border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                <Play className="h-5 w-5 text-primary" />
                تصفية الفيديوهات
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  <SelectItem value="Math">الرياضيات</SelectItem>
                  <SelectItem value="Physics">الفيزياء</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedChapter}
                onValueChange={setSelectedChapter}
                disabled={!selectedSubject || selectedSubject === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفصل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفصول</SelectItem>
                  {selectedSubject === "Math" &&
                    MATH_CHAPTERS.map((chapter) => (
                      <SelectItem key={chapter.value} value={chapter.value}>
                        {chapter.label}
                      </SelectItem>
                    ))}
                  {selectedSubject === "Physics" &&
                    PHYSICS_CHAPTERS.map((chapter) => (
                      <SelectItem key={chapter.value} value={chapter.value}>
                        {chapter.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الفيديو" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="youtube">مجاني (يوتيوب)</SelectItem>
                  <SelectItem value="premium">مميز</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {loading ? (
            <Loading />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredVideos.map((video) => (
                <Card
                  key={video.id}
                  className="group transition-all duration-300 border-primary/10 overflow-hidden"
                >
                  <div className="relative">
                    {thumbnailFor(video) ? (
                      <img
                        src={thumbnailFor(video)!}
                        alt=""
                        loading="lazy"
                        className="h-32 w-full object-cover sm:h-40 md:h-48"
                      />
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center bg-surface-deep sm:h-40 md:h-48">
                        <PlayCircle className="h-10 w-10 text-muted-foreground" strokeWidth={1.3} aria-hidden />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-surface-deep/20 group-hover:bg-surface-deep/30 transition-colors duration-300" />
                    <div className="absolute top-2 end-2">
                      {video.type === "premium" ? (
                        <Badge variant="default" className="gap-1 text-primary-foreground text-sm">
                          <Crown className="h-3 w-3" />
                          مميز
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-background/80 gap-1 text-sm">
                          <Youtube className="h-3 w-3" />
                          مجاني
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-2 end-2">
                      <Badge
                        variant="secondary"
                        className="bg-surface-deep/85 text-primary-foreground text-sm"
                      >
                        {formatDuration(video.duration)}
                      </Badge>
                    </div>
                    {videoProgress[video.id] && (
                      <div className="absolute top-2 start-2">
                        <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-success bg-background rounded-full" />
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-3 p-3 md:p-6">
                    <CardTitle className="text-base md:text-xl line-clamp-2">
                      {video.title}
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base">
                      {video.subject} • {video.chapter || "عام"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 p-3 md:p-6">
                    <Button
                      onClick={() => handleWatchVideo(video)}
                      className={`w-full text-sm md:text-base ${video.type === "premium" ? "text-primary-foreground" : ""}`}
                      variant="default"
                      // No premium check needed: the "Premium users can view
                      // premium videos"RLS policy means type === 'premium'
                      // rows never reach a free user's query in the first place.
                    >
                      <Play className="h-3 w-3 md:h-4 md:w-4 me-2" />
                      {videoProgress[video.id] ? "شاهد مرة أخرى" : "شاهد الفيديو"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {filteredVideos.length === 0 && (
                <div className="col-span-full text-center py-8 md:py-12">
                  <p className="text-muted-foreground">لا توجد فيديوهات تطابق المرشحات المحددة.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Videos;
