import { useEffect, useState } from "react";
import { CheckCircle2, Crown, Play, Video as VideoIcon, Youtube } from "lucide-react";
import { toast } from "sonner";

import FilterPills, { SUBJECT_OPTIONS, type PillOption } from "@/components/FilterPills";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Loading } from "@/components/ui/states";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TONE_BG, chapterLabel, chaptersFor, subjectLabel, subjectTone } from "@/lib/bac";
import { cn } from "@/lib/utils";

type Video = Tables<"videos">;

const TYPE_OPTIONS: PillOption[] = [
  { value: "youtube", label: "مجانية", tone: "sage", icon: Youtube },
  { value: "premium", label: "مميّزة", tone: "peach", icon: Crown },
];

/** YouTube video id from a watch or youtu.be URL, or null. */
const youtubeId = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.includes("youtube.com/watch?v=")) return url.split("v=")[1]?.split("&")[0] ?? null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1]?.split("?")[0] ?? null;
  return null;
};

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const Videos = () => {
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState("all");
  const [type, setType] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [watched, setWatched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { trackVideoActivity } = useActivityTracking();

  useEffect(() => {
    fetchVideos();
    if (user) fetchVideoProgress();
  }, [user]);

  const fetchVideos = async () => {
    const { data, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching videos:", error);
      toast.error("تعذّر تحميل الدروس");
    }
    setVideos(data ?? []);
    setLoading(false);
  };

  const fetchVideoProgress = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("video_progress").select("video_id, watched").eq("student_id", user.id);
    if (error) {
      console.error("Error fetching video progress:", error);
      return;
    }
    setWatched(Object.fromEntries((data ?? []).map((p) => [p.video_id, p.watched ?? false])));
  };

  const handleWatchVideo = async (video: Video) => {
    if (!user) return;

    try {
      await trackVideoActivity(video.id, "started", video.title, video.subject, video.chapter);
    } catch (error) {
      console.error("Error tracking video activity:", error);
    }

    try {
      // Free videos live on YouTube (`url`), premium ones in storage
      // (`file_path`). Checking `url` first used to send every premium video
      // to "not available", because its url is always empty.
      if (video.type === "youtube") {
        if (!video.url) throw new Error("no url");
        const id = youtubeId(video.url);
        window.open(id ? `https://www.youtube.com/watch?v=${id}` : video.url, "_blank", "noopener,noreferrer");
      } else {
        if (!video.file_path) throw new Error("no file");
        const { data } = await supabase.storage.from("videos").createSignedUrl(video.file_path, 3600);
        if (!data?.signedUrl) throw new Error("no signed url");
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error opening video:", error);
      toast.error("هذا الدرس غير متاح حالياً");
      return;
    }

    try {
      const { error } = await supabase
        .from("video_progress")
        .upsert(
          { student_id: user.id, video_id: video.id, watched: true, completed_at: new Date().toISOString() },
          { onConflict: "student_id,video_id" }
        );
      if (error) throw error;
      setWatched((prev) => ({ ...prev, [video.id]: true }));
      await trackVideoActivity(video.id, "completed", video.title, video.subject, video.chapter);
    } catch (error) {
      console.error("Error updating video progress:", error);
    }
  };

  const filtered = videos.filter(
    (v) =>
      (!subject || v.subject === subject) &&
      (chapter === "all" || v.chapter === chapter) &&
      (!type || v.type === type)
  );

  return (
    <div className="space-y-8">
      <PageHeader title="الدروس المرئية" subtitle="دروس مصوّرة مرتّبة حسب فصول المنهاج الرسمي" />

      <div className="space-y-3">
        <FilterPills
          label="المادة"
          options={SUBJECT_OPTIONS}
          value={subject}
          onChange={(s) => {
            setSubject(s);
            setChapter("all");
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <FilterPills label="النوع" options={TYPE_OPTIONS} value={type} onChange={setType} />
          </div>
          {subject && (
            <Select value={chapter} onValueChange={setChapter}>
              <SelectTrigger className="h-12 w-64 rounded-full" aria-label="الفصل">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفصول</SelectItem>
                {chaptersFor(subject).map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState icon={VideoIcon} title="لا توجد دروس تطابق اختيارك" description="غيّر المادة أو الفصل أو النوع." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((video, i) => {
            const id = youtubeId(video.url);
            return (
              <article
                key={video.id}
                className={cn(
                  "flex flex-col gap-4 rounded-card p-4 shadow-soft sm:flex-row",
                  TONE_BG[subjectTone(video.subject)],
                  filtered.length % 2 === 1 && i === filtered.length - 1 && "lg:col-span-2"
                )}
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-card-raised/60 sm:w-56">
                  {id ? (
                    <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Play className="h-8 w-8" fill="currentColor" strokeWidth={0} aria-hidden />
                    </div>
                  )}
                  {video.duration ? (
                    <span className="tabular absolute bottom-2 end-2 rounded-full bg-primary px-2 py-0.5 text-[13px] text-primary-foreground">
                      {formatDuration(video.duration)}
                    </span>
                  ) : null}
                  {watched[video.id] && (
                    <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[13px] text-primary-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      شاهدته
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-card-raised/70 px-2.5 py-1 text-[13px] backdrop-blur">
                      {subjectLabel(video.subject)}
                    </span>
                    {video.type === "premium" ? (
                      <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[13px] text-primary-foreground">
                        <Crown className="h-3 w-3 text-tone-peach" aria-hidden />
                        مميّز
                      </span>
                    ) : (
                      <span className="rounded-full bg-card-raised/70 px-2.5 py-1 text-[13px] backdrop-blur">مجاني</span>
                    )}
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-[19px] font-medium leading-snug">{video.title}</h2>
                  <p className="mt-1 text-[15px] text-foreground/70">
                    {video.chapter ? chapterLabel(video.chapter) : "درس عام"}
                  </p>
                  {/* Free users never see premium rows: RLS ("Premium users can
                      view premium videos") filters them out of the query. */}
                  <Button onClick={() => handleWatchVideo(video)} className="mt-4 self-start">
                    <Play aria-hidden />
                    {watched[video.id] ? "شاهد مرة أخرى" : "شاهد الدرس"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Videos;
