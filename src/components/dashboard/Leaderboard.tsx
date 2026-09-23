import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { TONE_BG, type Tone } from "@/lib/bac";
import { cn } from "@/lib/utils";

// the leaderboard view drops NOT NULL, so these arrive nullable
interface LeaderboardEntry {
  id: string | null;
  name: string | null;
  score: number | null;
}

// the podium keeps its own tones; the rest sit on white
const PODIUM: Tone[] = ["peach", "lav", "pink"];

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    // reads the `leaderboard` view, not `profiles`: the view exposes only
    // id/name/total_score, so ranking needs no access to anyone's email
    supabase
      .from("leaderboard")
      .select("id, name, total_score")
      .limit(5)
      .then(({ data, error }) => {
        if (error) console.error("Error fetching leaderboard:", error);
        setLeaderboard((data ?? []).map((e) => ({ id: e.id, name: e.name, score: e.total_score })));
      });
  }, []);

  return (
    <section className="flex h-full flex-col rounded-card bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tone-peach">
            <Trophy className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          </span>
          <h2 className="text-lg font-medium">أفضل الطلاب</h2>
        </div>
        <Link to="/leaderboard" className="text-[13px] text-muted-foreground hover:text-foreground">
          التفاصيل
        </Link>
      </div>

      <ol className="mt-4 flex flex-1 flex-col gap-2">
        {leaderboard === null ? (
          <li className="py-6 text-center text-muted-foreground">جارٍ التحميل…</li>
        ) : leaderboard.length === 0 ? (
          <li className="py-6 text-center text-muted-foreground">لا يوجد طلاب بعد</li>
        ) : (
          leaderboard.map((student, i) => (
            <li key={student.id ?? i} className="flex items-center gap-3 rounded-2xl bg-card-raised p-2.5">
              <span
                className={cn(
                  "tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  i < 3 ? TONE_BG[PODIUM[i]] : "bg-muted"
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{student.name}</span>
              <span className="tabular shrink-0 text-[15px] font-semibold">
                {(student.score ?? 0).toLocaleString("ar-DZ")}
                <span className="ms-1 text-sm font-normal text-muted-foreground">نقطة</span>
              </span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
};

export default Leaderboard;
