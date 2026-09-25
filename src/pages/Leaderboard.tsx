import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { useScopedLeaderboard, type LeaderboardEntry, type LeaderboardScope } from "@/hooks/useScopedLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { TONE_BG, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

// the podium keeps its own tones; the rest sit on white — same as the
// dashboard widget this page is the "view all" for
const PODIUM: Tone[] = ["peach", "lav", "pink"];

const Row = ({ entry, index, isMe }: { entry: LeaderboardEntry; index: number; isMe: boolean }) => (
  <li
    className={cn(
      "flex items-center gap-3 rounded-2xl p-3",
      isMe ? "bg-primary/10 ring-1 ring-primary/30" : "bg-card-raised"
    )}
  >
    <span
      className={cn(
        "tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        index < 3 ? TONE_BG[PODIUM[index]] : "bg-muted"
      )}
    >
      {index + 1}
    </span>
    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
      {entry.name}
      {isMe ? <span className="ms-1.5 text-[13px] text-muted-foreground">(أنت)</span> : null}
    </span>
    <span className="tabular shrink-0 text-[15px] font-semibold">
      {(entry.score ?? 0).toLocaleString("ar-DZ")}
      <span className="ms-1 text-sm font-normal text-muted-foreground">نقطة</span>
    </span>
  </li>
);

const ScopeList = ({ scope }: { scope: LeaderboardScope }) => {
  const { profile } = useAuth();
  const { rows, myRank, loading, error } = useScopedLeaderboard(scope);

  if (loading) return <Loading className="py-10" label="جارٍ تحميل الترتيب…" />;
  if (error) return <ErrorState className="py-10" description={error} />;

  if (rows && rows.length === 0) {
    if (scope === "school") {
      return (
        <EmptyState
          icon={Trophy}
          className="py-10"
          title="لم تُربط بثانوية بعد"
          description="إن كانت ثانويتك شريكة مع THE SMART، تواصل مع إدارتها لربط حسابك بها."
        />
      );
    }
    if (scope === "city") {
      return (
        <EmptyState
          icon={Trophy}
          className="py-10"
          title="لم تختر مدينتك بعد"
          description="أضِف مدينتك من الإعدادات لمقارنة ترتيبك مع طلاب مدينتك."
          action={
            <Button asChild variant="secondary">
              <Link to="/settings">اذهب إلى الإعدادات</Link>
            </Button>
          }
        />
      );
    }
    return <EmptyState icon={Trophy} className="py-10" title="لا يوجد طلاب بعد" />;
  }

  return (
    <>
      <ol className="mt-4 space-y-2">
        {(rows ?? []).map((entry, i) => (
          <Row key={entry.id ?? i} entry={entry} index={i} isMe={!!entry.id && entry.id === profile?.id} />
        ))}
      </ol>
      {/* only worth saying when it's not already obvious from the visible rows */}
      {myRank !== null && myRank > (rows?.length ?? 0) ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          ترتيبك: <span className="tabular font-semibold text-foreground">#{myRank}</span>
        </p>
      ) : null}
    </>
  );
};

const LeaderboardPage = () => {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="أفضل الطلاب" subtitle="قارن ترتيبك بزملائك — في الجزائر، في مدينتك، أو في ثانويتك." />

      {/* the leaderboard view leaves admins out, so an admin never finds themself */}
      {profile?.role === "admin" ? (
        <p className="rounded-2xl bg-card-raised p-3 text-sm text-muted-foreground">
          حسابات المشرفين لا تظهر في الترتيب — نقاطك محفوظة لكنها لا تُرتَّب.
        </p>
      ) : null}

      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">الكل</TabsTrigger>
          <TabsTrigger value="city" className="flex-1">مدينتي</TabsTrigger>
          <TabsTrigger value="school" className="flex-1">ثانويتي</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <ScopeList scope="all" />
        </TabsContent>
        <TabsContent value="city">
          <ScopeList scope="city" />
        </TabsContent>
        <TabsContent value="school">
          <ScopeList scope="school" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaderboardPage;
