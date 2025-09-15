import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, total_score')
        .order('total_score', { ascending: false })
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
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
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
    <Card className={`gradient-card ${isRTL ? 'rtl' : 'ltr'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          {t("topStudents")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center text-muted-foreground">No students yet</div>
        ) : (
          leaderboard.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8">
                {getRankIcon(student.rank)}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={student.avatar} alt={student.name} />
                <AvatarFallback className="text-xs">
                  {student.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{student.name}</p>
              </div>
            </div>
            <Badge 
              className={`${getRankBadgeVariant(student.rank)} font-semibold`}
            >
              {student.score.toLocaleString()} {t("pts")}
            </Badge>
          </div>
        ))
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;