import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

// the leaderboard view drops NOT NULL, so these arrive nullable
interface LeaderboardEntry {
  id: string | null;
  name: string | null;
  score: number | null;
  avatar?: string;
  rank: number;
}

const Leaderboard = () => {
  const { t, isRTL } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // reads the `leaderboard` view, not `profiles` — the view exposes only
      // id/name/total_score, so ranking no longer requires read access to
      // every student's email
      const { data, error } = await supabase
        .from('leaderboard')
        .select('id, name, total_score')
        .limit(5);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      const leaderboardData = data.map((entry, index) => ({
        id: entry.id,
        name: entry.name,
        score: entry.total_score,
        rank: index + 1
      }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-warning" />;
      case 2:
        return <Medal className="h-5 w-5 text-muted-foreground" />;
      case 3:
        return <Award className="h-5 w-5 text-accent" />;
      default:
        return <span className="text-base font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-warning text-warning-foreground";
      case 2:
        return "bg-muted text-muted-foreground";
      case 3:
        return "bg-accent text-accent-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          {t("topStudents")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground">جارٍ التحميل…</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center text-muted-foreground">لا يوجد طلاب بعد</div>
        ) : (
          leaderboard.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-card-raised/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8">
                {getRankIcon(student.rank)}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={student.avatar} alt={student.name ?? undefined} />
                <AvatarFallback className="text-sm">
                  {(student.name ?? "?").split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium truncate">{student.name}</p>
              </div>
            </div>
            <Badge 
              className={`${getRankBadgeVariant(student.rank)} font-semibold`}
            >
              {(student.score ?? 0).toLocaleString()} {t("pts")}
            </Badge>
          </div>
        ))
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;